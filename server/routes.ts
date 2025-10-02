import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import { RBACMiddleware, PermissionChecks } from "./security/rbacMiddleware";
import { mfaRoutes } from "./routes/mfaRoutes.js";
import { authMfaRoutes } from "./routes/authMfaRoutes.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { resolveTenant, requireTenant } from "./middleware/tenantMiddleware";
import { getTenantDb } from "./tenancy/tenantDb.js";
import {
  insertUserSchema,
  registerUserSchema,
  loginUserSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  insertClientSchema,
  insertCompanySchema,
  insertSalesOpportunitySchema,
  insertProjectSchema,
  updateProjectSchema,
  insertTaskSchema,
  insertInvoiceSchema,
  insertExpenseSchema,
  insertKnowledgeArticleSchema,
  insertMarketingCampaignSchema,
  insertSupportTicketSchema,
  updateSupportTicketSchema,
  clients,
  companies,
  salesOpportunities,
  projects,
  tasks,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  timeEntries,
  clientInteractions,
  documents,
  users,
  opportunityNextSteps,
  opportunityCommunications,
  opportunityStakeholders,
  opportunityActivityHistory,
  insertOpportunityNextStepSchema,
  insertOpportunityCommunicationSchema,
  insertOpportunityStakeholderSchema,
  updateOpportunityNextStepSchema,
  updateOpportunityCommunicationSchema,
  updateOpportunityStakeholderSchema,
  opportunityFileAttachments,
  insertOpportunityFileAttachmentSchema,
  updateOpportunityFileAttachmentSchema,
  projectTemplates,
  taskTemplates,
  taskDependencies,
  projectComments,
  taskComments,
  projectActivity,
  insertProjectTemplateSchema,
  insertTaskTemplateSchema,
  insertTaskDependencySchema,
  insertProjectCommentSchema,
  insertTaskCommentSchema,
  insertProjectActivitySchema,
  // Resource management tables
  userCapacity,
  userAvailability,
  userSkills,
  resourceAllocations,
  budgetCategories,
  projectBudgets,
  timeEntryApprovals,
  workloadSnapshots,
  insertUserCapacitySchema,
  insertUserAvailabilitySchema,
  insertUserSkillsSchema,
  insertResourceAllocationSchema,
  insertBudgetCategorySchema,
  insertProjectBudgetSchema,
  insertTimeEntryApprovalSchema,
  insertWorkloadSnapshotSchema,
  // Notifications
  notifications,
  insertNotificationSchema,
  // Access control schemas
  accessControlDomainsSchema,
  createInvitationSchema,
} from "@shared/schema";
import {
  calculateUserWorkload,
  calculateTeamUtilization,
  findOptimalResourceAllocations,
  generateTeamWorkloadSnapshots,
} from "./utils/resourceCalculations.js";
import { wsManager } from "./websocketManager";
import { PasswordUtils, AuthRateLimiter } from "./utils/authUtils";
import { emailService } from "./emailService";
import { updateProjectProgress, calculateProjectProgress, estimateProjectCompletion } from "./utils/projectProgressCalculations";
import { IntegrationManager, defaultIntegrationConfig } from "./integrations";
import { healthCheckService } from "./monitoring/healthCheck.js";
import { sentryService } from "./monitoring/sentryService.js";
import { dataExporter } from "./export/dataExporter.js";
import { createBackupScheduler } from "./backup/backupScheduler.js";
import { accessControlService } from "./security/accessControlService.js";
import passport from "passport";

// Initialize backup scheduler
const backupScheduler = createBackupScheduler();

// Helper function to log activity history
async function logActivityHistory(
  opportunityId: string,
  action: string,
  details: string,
  performedBy: string,
  oldValue?: string,
  newValue?: string
) {
  try {
    const tenantDb = getTenantDb();
    await tenantDb.insert(opportunityActivityHistory).values({
      opportunityId,
      action,
      details,
      oldValue,
      newValue,
      performedBy,
    });
  } catch (error) {
    console.error("Error logging activity history:", error);
    // Don't throw - activity logging should not break the main operation
  }
}

// Helper function to calculate project timeline based on opportunity data
function calculateProjectTimeline(opportunityValue: string | null, complexity: 'low' | 'medium' | 'high' = 'medium'): {
  estimatedDurationWeeks: number;
  endDate: Date;
} {
  const baseWeeks = 4; // Minimum project duration
  const value = parseFloat(opportunityValue || '0');

  // Value-based duration calculation (higher value = longer project)
  let valueWeeks = 0;
  if (value > 100000) valueWeeks = 12; // Large projects: 3+ months
  else if (value > 50000) valueWeeks = 8;  // Medium projects: 2+ months
  else if (value > 10000) valueWeeks = 6;  // Small projects: 1.5+ months
  else valueWeeks = 2; // Micro projects: 0.5+ months

  // Complexity modifier
  const complexityMultiplier = {
    'low': 0.8,
    'medium': 1.0,
    'high': 1.3
  }[complexity];

  const totalWeeks = Math.round((baseWeeks + valueWeeks) * complexityMultiplier);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (totalWeeks * 7));

  return {
    estimatedDurationWeeks: totalWeeks,
    endDate
  };
}

// Helper function to convert pain points to requirements text
function formatPainPointsAsRequirements(painPoints: any): string | null {
  if (!painPoints || !Array.isArray(painPoints) || painPoints.length === 0) {
    return null;
  }

  const requirements = painPoints.map((point: any, index: number) => {
    const description = typeof point === 'string' ? point :
                       typeof point === 'object' && point.description ? point.description :
                       typeof point === 'object' && point.title ? point.title :
                       String(point);
    return `${index + 1}. ${description}`;
  }).join('\n');

  return `Project Requirements (derived from opportunity pain points):\n\n${requirements}`;
}

// Helper function to get appropriate project template based on opportunity
async function getProjectTemplateForOpportunity(opportunity: any): Promise<any> {
  try {
    // SECURITY: Filter templates by organizationId for multi-tenant isolation
    const organizationId = opportunity.organizationId;
    if (!organizationId) {
      console.warn('getProjectTemplateForOpportunity: No organizationId found in opportunity');
      return null;
    }

    // Try to find template based on company industry first
    if (opportunity.company?.industry) {
      const industryTemplates = await db.select()
        .from(projectTemplates)
        .where(and(
          eq(projectTemplates.industry, opportunity.company.industry),
          eq(projectTemplates.organizationId, organizationId)
        ))
        .limit(1);

      if (industryTemplates.length > 0) {
        return industryTemplates[0];
      }
    }

    // Fallback to general template based on project value/size
    const value = parseFloat(opportunity.value || '0');
    let category = 'consulting'; // Default

    if (value > 50000) category = 'enterprise';
    else if (value > 20000) category = 'development';
    else category = 'consulting';

    const templates = await db.select()
      .from(projectTemplates)
      .where(and(
        eq(projectTemplates.category, category),
        eq(projectTemplates.organizationId, organizationId)
      ))
      .limit(1);

    return templates.length > 0 ? templates[0] : null;
  } catch (error) {
    console.error('Error finding project template:', error);
    return null;
  }
}

// Helper function to get user ID from request (supports both OAuth and local auth)
function getUserId(req: any): string | null {
  return req.user?.claims?.sub || req.user?.id || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test reset endpoint - must be BEFORE auth setup to bypass authentication
  // SECURITY: Only available in development, requires organizationId parameter for multi-tenant safety
  app.get('/api/test/reset', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Test reset endpoint only available in development' });
    }

    // Multi-tenant safety: require explicit organizationId parameter
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({
        message: 'organizationId query parameter required for multi-tenant safety',
        example: '/api/test/reset?organizationId=your-org-id'
      });
    }

    try {
      // Clear all database tables in reverse dependency order to avoid foreign key constraints
      // IMPORTANT: Filter by organizationId to only delete data for specified organization
      await db.delete(timeEntries).where(eq(timeEntries.organizationId, organizationId));
      await db.delete(clientInteractions).where(eq(clientInteractions.organizationId, organizationId));
      await db.delete(supportTickets).where(eq(supportTickets.organizationId, organizationId));
      await db.delete(marketingCampaigns).where(eq(marketingCampaigns.organizationId, organizationId));
      await db.delete(knowledgeArticles).where(eq(knowledgeArticles.organizationId, organizationId));
      await db.delete(documents).where(eq(documents.organizationId, organizationId));
      await db.delete(expenses).where(eq(expenses.organizationId, organizationId));
      await db.delete(invoices).where(eq(invoices.organizationId, organizationId));
      await db.delete(tasks).where(eq(tasks.organizationId, organizationId));
      await db.delete(projects).where(eq(projects.organizationId, organizationId));
      await db.delete(salesOpportunities).where(eq(salesOpportunities.organizationId, organizationId));
      await db.delete(clients).where(eq(clients.organizationId, organizationId));
      await db.delete(companies).where(eq(companies.organizationId, organizationId));
      // Note: Not clearing users table to keep authentication working

      res.json({
        message: 'Test data reset successfully for organization',
        organizationId,
        cleared: [
          'timeEntries', 'clientInteractions', 'supportTickets',
          'marketingCampaigns', 'knowledgeArticles', 'documents',
          'expenses', 'invoices', 'tasks', 'projects', 'clients', 'companies'
        ]
      });
    } catch (error) {
      console.error("Error resetting test data:", error);
      res.status(500).json({ message: "Failed to reset test data" });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Register MFA routes
  app.use('/api/mfa', mfaRoutes);
  app.use('/api/auth', authMfaRoutes);
  app.use('/api/sessions', sessionRoutes);

  // Apply authentication and tenant middleware to API routes
  // EXCEPT public auth routes (login, register, callback need to be accessible before auth)
  // This must come AFTER auth setup and BEFORE route definitions
  app.use('/api/*', (req, res, next) => {
    // List of public routes that don't require authentication
    const publicRoutes = [
      '/api/login',
      '/api/callback',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/verify-email',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/mfa/setup',
      '/api/mfa/verify',
    ];
    
    // Check using originalUrl which contains the full path
    if (publicRoutes.some(route => req.originalUrl.startsWith(route))) {
      return next();
    }
    
    // Apply authentication first, then tenant middleware
    isAuthenticated(req, res, (authErr) => {
      if (authErr) return next(authErr);

      // Tenant middleware MUST wrap the rest of the chain
      resolveTenant(req, res, next);
    });
  });

  // Initialize integration manager for third-party notifications
  const integrationManager = new IntegrationManager(defaultIntegrationConfig);

  // Development-only authentication endpoint for testing - AFTER auth setup
  app.post('/api/auth/dev-login', async (req: any, res) => {
    console.log('Dev login endpoint hit, NODE_ENV:', process.env.NODE_ENV);
    
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Dev login endpoint only available in development' });
    }

    try {
      const testUserId = 'test-user-123';
      const testUser = {
        id: testUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        role: 'admin'
      };

      console.log('Creating test user:', testUser);
      
      // Ensure test user exists in database
      await storage.upsertUser(testUser);
      console.log('Test user upserted successfully');

      // Create mock claims and session data similar to OIDC flow
      const mockClaims = {
        sub: testUserId,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        profile_image_url: null,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      // Set up session data to mimic successful authentication
      const user = {
        claims: mockClaims,
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: mockClaims.exp
      };

      console.log('Setting up authentication session');

      // Manually set user data on request to mimic authentication
      req.user = user;
      
      // Manually set session as authenticated  
      if (req.session) {
        req.session.passport = { user: user };
        
        // Force session to be saved to ensure persistence
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save failed:', err);
            return res.status(500).json({ message: 'Failed to save session' });
          }
          
          console.log('Session established and saved successfully');
          res.json({ 
            message: 'Development authentication successful',
            user: testUser,
            authenticated: true,
            debug: 'Session set up and saved'
          });
        });
      } else {
        console.log('No session available');
        res.status(500).json({ message: 'Session not available' });
      }

    } catch (error) {
      console.error('Dev login failed:', error);
      res.status(500).json({ message: 'Dev authentication failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      let userId: string;
      let user: any;

      userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      user = await storage.getUser(userId);

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Local authentication endpoints

  // User registration
  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      const { email, password, firstName, lastName, phone, department, position } = validatedData;

      // Rate limiting check
      const identifier = req.ip + ':register';
      if (AuthRateLimiter.isRateLimited(identifier)) {
        const resetTime = AuthRateLimiter.getResetTime(identifier);
        return res.status(429).json({
          message: `Too many registration attempts. Try again in ${Math.ceil(resetTime / 60)} minutes.`
        });
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        AuthRateLimiter.recordFailedAttempt(identifier);
        return res.status(409).json({
          message: 'An account with this email already exists.'
        });
      }

      // Check team size limit
      const currentUsers = await storage.getUsers();
      const TEAM_SIZE_LIMIT = 50; // You can adjust this or use BUSINESS_LIMITS
      if (currentUsers.length >= TEAM_SIZE_LIMIT) {
        return res.status(409).json({
          message: `Team size limit reached. Maximum ${TEAM_SIZE_LIMIT} team members allowed.`
        });
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = PasswordUtils.generateEmailVerificationToken();

      // In development mode without SMTP, automatically verify emails
      const emailVerified = !emailService.isEmailConfigured();

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          firstName,
          lastName,
          phone: phone || null,
          department: department || null,
          position: position || null,
          passwordHash,
          authProvider: 'local',
          emailVerified, // Auto-verify in dev mode, require verification in production
          emailVerificationToken: emailVerified ? null : emailVerificationToken,
          role: 'employee', // Default role
          isActive: true
        })
        .returning();

      // Ensure first user gets admin privileges
      if (currentUsers.length === 0) {
        await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, newUser.id));
      }

      // Send verification email
      try {
        await emailService.sendEmailVerification(
          email,
          firstName,
          emailVerificationToken,
          req.protocol,
          req.get('host')
        );
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with registration even if email fails
      }

      // Clear rate limiting on successful registration
      AuthRateLimiter.clearAttempts(identifier);

      const successMessage = emailVerified
        ? 'Registration successful! Your account is ready to use - you can now log in.'
        : 'Registration successful! Please check your email to verify your account.';

      res.status(201).json({
        message: successMessage,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          emailVerified: newUser.emailVerified
        }
      });

    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }

      res.status(500).json({
        message: 'Registration failed. Please try again.'
      });
    }
  });

  // Local login
  app.post('/api/auth/login', (req: any, res, next) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);

      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          console.error('Login authentication error:', err);
          return res.status(500).json({ message: 'Authentication failed' });
        }

        if (!user) {
          return res.status(401).json({
            message: info?.message || 'Invalid credentials'
          });
        }

        req.logIn(user, (err: any) => {
          if (err) {
            console.error('Login session error:', err);
            return res.status(500).json({ message: 'Login failed' });
          }

          res.json({
            message: 'Login successful',
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role
            }
          });
        });
      })(req, res, next);

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }

      res.status(400).json({
        message: 'Invalid request data'
      });
    }
  });

  // Email verification
  app.post('/api/auth/verify-email', async (req: any, res) => {
    try {
      const { token } = req.body;

      console.log('📧 Email verification attempt with token:', token?.substring(0, 10) + '...');

      if (!token) {
        console.log('❌ No token provided');
        return res.status(400).json({ message: 'Verification token required' });
      }

      // Find user by verification token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1);

      if (!user) {
        console.log('❌ No user found with token');
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      console.log('✅ Found user:', user.email, 'emailVerified:', user.emailVerified);

      if (user.emailVerified) {
        console.log('⚠️ Email already verified for user:', user.email);
        return res.status(400).json({ message: 'Email already verified' });
      }

      // Update user as verified
      console.log('🔄 Updating user verification status for:', user.email);
      const result = await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null
        })
        .where(eq(users.id, user.id))
        .returning();

      console.log('✅ Verification update result:', result.length > 0 ? 'SUCCESS' : 'FAILED');
      console.log('Updated user emailVerified:', result[0]?.emailVerified);

      res.json({ message: 'Email verified successfully! You can now log in.' });

    } catch (error) {
      console.error('❌ Email verification error:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Password reset request
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const validatedData = requestPasswordResetSchema.parse(req.body);
      const { email } = validatedData;

      // Rate limiting check
      const identifier = req.ip + ':password-reset';
      if (AuthRateLimiter.isRateLimited(identifier)) {
        const resetTime = AuthRateLimiter.getResetTime(identifier);
        return res.status(429).json({
          message: `Too many password reset attempts. Try again in ${Math.ceil(resetTime / 60)} minutes.`
        });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, email.toLowerCase()),
          eq(users.isActive, true)
        ))
        .limit(1);

      // Always return success for security (don't reveal if email exists)
      res.json({
        message: 'If an account with that email exists, you will receive a password reset link shortly.'
      });

      // Only send email if user exists and has local auth
      if (user && user.passwordHash) {
        try {
          // Generate password reset token
          const { token, expires } = PasswordUtils.generatePasswordResetToken();

          // Save token to database
          await db
            .update(users)
            .set({
              passwordResetToken: token,
              passwordResetExpires: expires
            })
            .where(eq(users.id, user.id));

          // Send reset email
          await emailService.sendPasswordReset(
            user.email!,
            user.firstName!,
            token,
            req.protocol,
            req.get('host')
          );

          console.log(`Password reset email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
          // Don't fail the request - user already got success message
        }
      } else {
        // Record failed attempt for non-existent users to prevent enumeration
        AuthRateLimiter.recordFailedAttempt(identifier);
      }

    } catch (error: any) {
      console.error('Password reset request error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: 'Invalid email address'
        });
      }

      res.status(500).json({
        message: 'Failed to process password reset request'
      });
    }
  });

  // Password reset confirmation
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const { token, password } = validatedData;

      // Find user by reset token
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.passwordResetToken, token),
          eq(users.isActive, true)
        ))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Check if token has expired
      if (PasswordUtils.isTokenExpired(user.passwordResetExpires)) {
        // Clean up expired token
        await db
          .update(users)
          .set({
            passwordResetToken: null,
            passwordResetExpires: null
          })
          .where(eq(users.id, user.id));

        return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
      }

      // Hash new password
      const passwordHash = await PasswordUtils.hashPassword(password);

      // Update user with new password and clear reset token
      await db
        .update(users)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          emailVerified: true // Ensure user is verified after password reset
        })
        .where(eq(users.id, user.id));

      res.json({ message: 'Password reset successfully! You can now log in with your new password.' });

    } catch (error: any) {
      console.error('Password reset error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      res.status(500).json({
        message: 'Failed to reset password'
      });
    }
  });

  // Change password (for authenticated users)
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const { currentPassword, newPassword } = validatedData;

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Get current user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has a password (might be OAuth-only)
      if (!user.passwordHash) {
        return res.status(400).json({
          message: 'This account uses OAuth login and cannot change password through this method.'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await PasswordUtils.hashPassword(newPassword);

      // Update password
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, userId));

      res.json({ message: 'Password changed successfully' });

    } catch (error: any) {
      console.error('Change password error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }

      res.status(500).json({
        message: 'Failed to change password'
      });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Admin-triggered password reset
  app.post('/api/users/:id/reset-password', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const userId = req.params.id;
      const targetUser = await storage.getUser(userId);

      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!targetUser.email) {
        return res.status(400).json({ message: 'User has no email address' });
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Update user with reset token
      await db.update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Send password reset email
      const resetLink = `${process.env.VITE_API_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

      try {
        await emailService.sendEmail({
          to: targetUser.email,
          subject: 'Password Reset Request - BizOS',
          text: `A password reset has been requested for your account by an administrator.\n\nClick here to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please contact your administrator.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>A password reset has been requested for your account by an administrator.</p>
              <p><a href="${resetLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
              <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, please contact your administrator.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      res.json({
        message: 'Password reset email sent successfully',
        email: targetUser.email
      });
    } catch (error) {
      console.error("Error triggering password reset:", error);
      res.status(500).json({ message: "Failed to trigger password reset" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const [updatedNotification] = await db
        .update(notifications)
        .set({ read: true, updatedAt: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .returning();

      if (!updatedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      await db
        .update(notifications)
        .set({ read: true, updatedAt: new Date() })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const [result] = await db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));

      res.json({ count: parseInt(result.count as string) || 0 });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const [deletedNotification] = await db
        .delete(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .returning();

      if (!deletedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete('/api/notifications/clear-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const result = await db
        .delete(notifications)
        .where(eq(notifications.userId, userId))
        .returning();

      res.json({
        message: "All notifications cleared successfully",
        count: result.length
      });
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      res.status(500).json({ message: "Failed to clear all notifications" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/kpis', isAuthenticated, async (req, res) => {
    try {
      const kpis = await storage.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get('/api/dashboard/revenue-trends', isAuthenticated, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const trends = await storage.getRevenueTrends(months);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching revenue trends:", error);
      res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
  });

  // Executive Dashboard routes (super_admin and admin only)
  app.get('/api/executive/kpis', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      // Calculate executive-level KPIs
      const projects = await storage.getProjects();
      const invoices = await storage.getInvoices();
      const clients = await storage.getClients();
      const users = await storage.getUsers();

      // Calculate revenue
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const currentRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);
      const previousRevenue = currentRevenue * 0.85; // Mock previous period
      const revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

      // Calculate EBITDA (mock calculation)
      const ebitda = currentRevenue * 0.28;
      const previousEbitda = previousRevenue * 0.25;
      const ebitdaGrowth = ((ebitda - previousEbitda) / previousEbitda) * 100;

      // Calculate cash flow (mock)
      const cashFlow = currentRevenue * 0.15;
      const previousCash = previousRevenue * 0.12;
      const cashGrowth = ((cashFlow - previousCash) / previousCash) * 100;

      // Active projects growth
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const previousProjects = Math.floor(activeProjects * 0.9);
      const projectGrowth = ((activeProjects - previousProjects) / previousProjects) * 100;

      const kpis = {
        kpis: [
          {
            id: 'revenue',
            title: 'Total Revenue',
            value: `£${(currentRevenue / 1000).toFixed(1)}M`,
            change: parseFloat(revenueGrowth.toFixed(1)),
            trend: revenueGrowth > 0 ? 'up' : 'down',
            target: `£${((currentRevenue / 1000) * 1.1).toFixed(1)}M`,
            subtitle: `vs £${(previousRevenue / 1000).toFixed(1)}M last quarter`,
            status: revenueGrowth > 20 ? 'excellent' : revenueGrowth > 10 ? 'good' : revenueGrowth > 0 ? 'warning' : 'critical',
            icon: 'revenue'
          },
          {
            id: 'growth',
            title: 'YoY Growth',
            value: `${revenueGrowth.toFixed(1)}%`,
            change: 2.5,
            trend: 'up',
            target: '25%',
            subtitle: 'Year-over-year growth rate',
            status: revenueGrowth > 20 ? 'excellent' : 'good',
            icon: 'growth'
          },
          {
            id: 'ebitda',
            title: 'EBITDA',
            value: `£${(ebitda / 1000).toFixed(0)}K`,
            change: parseFloat(ebitdaGrowth.toFixed(1)),
            trend: ebitdaGrowth > 0 ? 'up' : 'down',
            target: '£720K',
            subtitle: `Margin: ${((ebitda / currentRevenue) * 100).toFixed(1)}%`,
            status: ebitdaGrowth > 15 ? 'excellent' : 'good',
            icon: 'ebitda'
          },
          {
            id: 'cash',
            title: 'Cash Flow',
            value: `${cashFlow > 0 ? '+' : ''}£${(cashFlow / 1000).toFixed(0)}K`,
            change: parseFloat(cashGrowth.toFixed(1)),
            trend: cashGrowth > 0 ? 'up' : 'down',
            target: '+£400K',
            subtitle: 'Runway: 18 months',
            status: cashGrowth > 10 ? 'excellent' : 'good',
            icon: 'cash'
          },
          {
            id: 'cac',
            title: 'Customer CAC',
            value: '£1,240',
            change: -8.2,
            trend: 'down',
            target: '£1,100',
            subtitle: 'Customer acquisition cost',
            status: 'good',
            icon: 'cac'
          },
          {
            id: 'efficiency',
            title: 'Team Efficiency',
            value: '£18.8K',
            change: 12.5,
            trend: 'up',
            target: '£20K',
            subtitle: 'Revenue per employee/month',
            status: 'excellent',
            icon: 'efficiency'
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      res.json(kpis);
    } catch (error) {
      console.error("Error fetching executive KPIs:", error);
      res.status(500).json({ message: "Failed to fetch executive KPIs" });
    }
  });

  app.get('/api/executive/business-health', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const tasks = await storage.getTasks();
      const clients = await storage.getClients();
      const invoices = await storage.getInvoices();

      // Calculate financial health (40%)
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const revenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);
      const financialScore = Math.min(85 + Math.random() * 15, 100);

      // Calculate operational health (30%)
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const operationalScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 75;

      // Calculate customer health (20%)
      const activeClients = clients.filter(c => c.status === 'active').length;
      const customerScore = Math.min(88 + Math.random() * 10, 100);

      // Calculate strategic health (10%)
      const strategicScore = 82;

      // Overall weighted score
      const overallScore = Math.round(
        financialScore * 0.4 + operationalScore * 0.3 + customerScore * 0.2 + strategicScore * 0.1
      );

      const getStatus = (score: number) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
      };

      const healthData = {
        overallScore,
        status: getStatus(overallScore),
        metrics: [
          {
            category: 'Financial Health',
            score: Math.round(financialScore),
            weight: 40,
            status: getStatus(financialScore),
            trend: 'up',
            indicators: ['Revenue growing 18% QoQ', 'Healthy profit margins', 'Strong cash position']
          },
          {
            category: 'Operational Health',
            score: Math.round(operationalScore),
            weight: 30,
            status: getStatus(operationalScore),
            trend: 'stable',
            indicators: ['85% project delivery rate', 'Team productivity stable', 'Quality metrics on target']
          },
          {
            category: 'Customer Health',
            score: Math.round(customerScore),
            weight: 20,
            status: getStatus(customerScore),
            trend: 'up',
            indicators: ['94% satisfaction score', 'Low churn rate (2.1%)', 'Strong NPS (68)']
          },
          {
            category: 'Strategic Health',
            score: strategicScore,
            weight: 10,
            status: getStatus(strategicScore),
            trend: 'up',
            indicators: ['Market position strengthening', 'Innovation pipeline active', 'Competitive advantage maintained']
          }
        ],
        lastUpdated: new Date().toISOString(),
        recommendations: [
          'Focus on converting high-value pipeline opportunities to maintain revenue growth trajectory',
          'Consider expanding team capacity to support 18% growth rate sustainably',
          'Implement customer success program for at-risk high-value accounts'
        ]
      };

      res.json(healthData);
    } catch (error) {
      console.error("Error calculating business health:", error);
      res.status(500).json({ message: "Failed to calculate business health" });
    }
  });

  app.get('/api/executive/financial-summary', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      const expenses = await storage.getExpenses();
      const opportunities = await storage.getOpportunities();

      // Calculate current period revenue
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const currentRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);
      const previousRevenue = currentRevenue * 0.85;
      const revenueChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

      // Calculate expenses
      const currentExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);
      const previousExpenses = currentExpenses * 0.88;
      const expenseChange = ((currentExpenses - previousExpenses) / previousExpenses) * 100;

      // Calculate profit
      const currentProfit = currentRevenue - currentExpenses;
      const previousProfit = previousRevenue - previousExpenses;
      const profitChange = previousProfit > 0 ? ((currentProfit - previousProfit) / previousProfit) * 100 : 0;

      // Calculate pipeline
      const pipeline = opportunities
        .filter(opp => opp.status === 'qualified' || opp.status === 'proposal')
        .reduce((sum, opp) => sum + parseFloat(opp.value || '0'), 0);
      const previousPipeline = pipeline * 0.82;
      const pipelineChange = ((pipeline - previousPipeline) / previousPipeline) * 100;

      // Generate 6-month trend data
      const trend = [];
      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < 6; i++) {
        trend.push({
          month: months[i],
          revenue: Math.round((currentRevenue / 6) * (0.7 + i * 0.05)),
          expenses: Math.round((currentExpenses / 6) * (0.8 + i * 0.03)),
          profit: Math.round(((currentRevenue - currentExpenses) / 6) * (0.6 + i * 0.07))
        });
      }

      const financialData = {
        period: 'Q4 2024',
        metrics: {
          revenue: {
            label: 'Revenue',
            current: currentRevenue,
            previous: previousRevenue,
            change: parseFloat(revenueChange.toFixed(1)),
            trend: revenueChange > 0 ? 'up' : 'down',
            format: 'currency'
          },
          expenses: {
            label: 'Expenses',
            current: currentExpenses,
            previous: previousExpenses,
            change: parseFloat(expenseChange.toFixed(1)),
            trend: expenseChange > 0 ? 'up' : 'down',
            format: 'currency'
          },
          profit: {
            label: 'Profit',
            current: currentProfit,
            previous: previousProfit,
            change: parseFloat(profitChange.toFixed(1)),
            trend: profitChange > 0 ? 'up' : 'down',
            format: 'currency'
          },
          pipeline: {
            label: 'Pipeline',
            current: pipeline,
            previous: previousPipeline,
            change: parseFloat(pipelineChange.toFixed(1)),
            trend: pipelineChange > 0 ? 'up' : 'down',
            format: 'currency'
          }
        },
        trend,
        profitMargin: currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0,
        conversionRate: 32,
        alerts: [
          {
            type: 'warning',
            message: '2 projects over budget by average £15K',
            action: 'Review Budget'
          },
          {
            type: 'info',
            message: 'Q4 revenue forecast: £2.5M (104% of target)',
            action: 'View Forecast'
          }
        ]
      };

      res.json(financialData);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  app.get('/api/executive/critical-actions', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      // Mock critical actions - in production, these would come from various sources
      const mockActions = [
        {
          id: '1',
          type: 'approval',
          priority: 'urgent',
          title: 'Approve £250K AI Investment',
          description: 'Capital expenditure request for AI/ML infrastructure upgrade and team expansion',
          requestedBy: 'Sarah Johnson, CTO',
          requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'financial',
          metadata: { amount: 250000, deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }
        },
        {
          id: '2',
          type: 'approval',
          priority: 'urgent',
          title: 'Sign Off Q4 Board Presentation',
          description: 'Final review needed for quarterly board meeting presentation scheduled for next week',
          requestedBy: 'Michael Chen, Finance Director',
          requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'strategic',
          metadata: { deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() }
        },
        {
          id: '3',
          type: 'decision',
          priority: 'high',
          title: 'Review 3 Executive Hires',
          description: 'Final candidates for VP Engineering, Head of Sales, and Senior Product Manager positions',
          requestedBy: 'Emma Wilson, HR Director',
          requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'hr',
          metadata: {}
        },
        {
          id: '4',
          type: 'approval',
          priority: 'high',
          title: 'Approve Marketing Budget 2025',
          description: '£580K marketing budget proposal for 2025 with focus on digital transformation',
          requestedBy: 'David Brown, CMO',
          requestedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'financial',
          metadata: { amount: 580000 }
        },
        {
          id: '5',
          type: 'approval',
          priority: 'medium',
          title: 'Sign Client X Contract Renewal',
          description: '£420K annual contract renewal with Client X requiring executive signature',
          requestedBy: 'Lisa Anderson, Account Director',
          requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'client',
          metadata: { amount: 420000 }
        }
      ];

      const urgent = mockActions.filter(a => a.priority === 'urgent');
      const thisWeek = mockActions.filter(a => a.priority !== 'urgent');

      res.json({
        urgent,
        thisWeek,
        total: mockActions.length
      });
    } catch (error) {
      console.error("Error fetching critical actions:", error);
      res.status(500).json({ message: "Failed to fetch critical actions" });
    }
  });

  app.post('/api/executive/approve/:type/:id', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      const { type, id } = req.params;
      const { approved } = req.body;

      // In production, this would update the relevant record and trigger workflows
      console.log(`Executive ${approved ? 'approved' : 'rejected'} ${type} ${id}`);

      res.json({
        success: true,
        message: `Action ${approved ? 'approved' : 'rejected'} successfully`,
        type,
        id,
        approved
      });
    } catch (error) {
      console.error("Error processing approval:", error);
      res.status(500).json({ message: "Failed to process approval" });
    }
  });

  // Executive Customer Intelligence endpoint (super_admin, admin only)
  app.get('/api/executive/customer-intelligence', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      const clients = await storage.getClients();
      const projects = await storage.getProjects();
      const invoices = await storage.getInvoices();

      // Calculate client metrics
      const clientData = clients.map(client => {
        const clientProjects = projects.filter(p => p.clientId === client.id);
        const clientInvoices = invoices.filter(inv => inv.clientId === client.id);

        const totalRevenue = clientInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const activeProjects = clientProjects.filter(p =>
          p.status === 'in_progress' || p.status === 'planning'
        ).length;

        // Calculate health score based on multiple factors
        let healthScore = 70; // Base score

        // Active projects increase health
        healthScore += Math.min(activeProjects * 5, 15);

        // Recent activity increases health
        const lastActivity = new Date(client.lastContactDate || client.createdAt);
        const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActivity < 7) healthScore += 10;
        else if (daysSinceActivity < 30) healthScore += 5;
        else if (daysSinceActivity > 90) healthScore -= 20;

        // Revenue contribution
        if (totalRevenue > 100000) healthScore += 10;
        else if (totalRevenue > 50000) healthScore += 5;

        // Payment history
        const unpaidInvoices = clientInvoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue');
        if (unpaidInvoices.length > 0) healthScore -= unpaidInvoices.length * 5;

        healthScore = Math.max(0, Math.min(100, healthScore));

        // Determine status
        let status: 'healthy' | 'warning' | 'at-risk';
        if (healthScore >= 70) status = 'healthy';
        else if (healthScore >= 50) status = 'warning';
        else status = 'at-risk';

        // Mock NPS score (would come from surveys in real implementation)
        const npsScore = healthScore > 80 ? Math.floor(Math.random() * 20) + 80 :
                        healthScore > 60 ? Math.floor(Math.random() * 30) + 50 :
                        Math.floor(Math.random() * 30) + 20;

        return {
          id: client.id,
          name: client.name,
          revenue: totalRevenue,
          healthScore,
          status,
          lastActivity: lastActivity.toISOString(),
          activeProjects,
          npsScore,
        };
      });

      // Sort by revenue
      clientData.sort((a, b) => b.revenue - a.revenue);

      const topClients = clientData.slice(0, 10);
      const atRiskClients = clientData.filter(c => c.status === 'at-risk');

      const totalClients = clientData.length;
      const activeClients = clientData.filter(c => c.activeProjects > 0).length;

      // Calculate month-over-month growth (mock data - would use time-series in production)
      const monthOverMonthGrowth = 12.5;

      // Calculate churn rate
      const churnRate = (atRiskClients.length / totalClients) * 100;

      // Calculate averages
      const averageHealthScore = clientData.reduce((sum, c) => sum + c.healthScore, 0) / totalClients;
      const averageNPS = clientData.reduce((sum, c) => sum + (c.npsScore || 0), 0) / totalClients;
      const totalRevenue = clientData.reduce((sum, c) => sum + c.revenue, 0);
      const averageRevenuePerClient = totalRevenue / totalClients;

      // AI-identified upsell opportunities (mock intelligent analysis)
      const upsellOpportunities = clientData
        .filter(c => c.healthScore >= 70 && c.activeProjects <= 2 && c.revenue > 20000)
        .slice(0, 5)
        .map(c => ({
          clientName: c.name,
          estimatedValue: Math.floor(c.revenue * 0.3),
          confidence: Math.floor(c.healthScore * 0.85),
          reasoning: c.activeProjects === 0
            ? 'High-value client with no active projects - strong re-engagement opportunity'
            : 'Healthy relationship with capacity for additional projects based on historical spend patterns',
        }));

      res.json({
        totalClients,
        activeClients,
        monthOverMonthGrowth,
        churnRate,
        averageHealthScore,
        averageNPS,
        totalRevenue,
        averageRevenuePerClient,
        topClients,
        atRiskClients,
        upsellOpportunities,
      });
    } catch (error) {
      console.error("Error fetching customer intelligence:", error);
      res.status(500).json({ message: "Failed to fetch customer intelligence data" });
    }
  });

  // Executive Strategic Projects endpoint (super_admin, admin only)
  app.get('/api/executive/strategic-projects', isAuthenticated, requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const tasks = await storage.getTasks();
      const timeEntries = await storage.getTimeEntries();
      const teamMembers = await storage.getTeamMembers();

      // Calculate project metrics
      const projectMetrics = projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const projectTimeEntries = timeEntries.filter(te => te.projectId === project.id);

        // Calculate progress from tasks
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
        const progress = projectTasks.length > 0
          ? Math.round((completedTasks / projectTasks.length) * 100)
          : 0;

        // Calculate spent amount from time entries
        const spent = projectTimeEntries.reduce((sum, te) => {
          // Assuming hourly rate of £75 average
          const hours = te.hours || 0;
          return sum + (hours * 75);
        }, 0);

        // Calculate days remaining
        const deadline = new Date(project.endDate);
        const today = new Date();
        const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Count team members assigned to this project
        const assignedTasks = projectTasks.filter(t => t.assignedTo);
        const uniqueTeamMembers = new Set(assignedTasks.map(t => t.assignedTo));
        const teamSize = uniqueTeamMembers.size;

        // Determine health status
        let healthStatus: 'on-track' | 'at-risk' | 'delayed';
        const budgetUtilization = project.budget ? (spent / project.budget) * 100 : 0;
        const scheduleRatio = progress / Math.max(1, 100 - daysRemaining);

        if (daysRemaining < 0 || budgetUtilization > 100) {
          healthStatus = 'delayed';
        } else if (budgetUtilization > 90 || daysRemaining < 7 || (progress < 50 && daysRemaining < 30)) {
          healthStatus = 'at-risk';
        } else {
          healthStatus = 'on-track';
        }

        // Determine priority based on status and budget
        let priority: 'critical' | 'high' | 'medium' | 'low';
        if (project.budget && project.budget > 100000) {
          priority = 'critical';
        } else if (project.budget && project.budget > 50000) {
          priority = 'high';
        } else if (project.budget && project.budget > 20000) {
          priority = 'medium';
        } else {
          priority = 'low';
        }

        // Calculate ROI (mock calculation based on budget and completion)
        const roi = project.budget
          ? Math.round((project.budget * 0.3) / project.budget * 100)
          : 25;

        // Determine strategic value
        const strategicValue = project.budget && project.budget > 100000
          ? 'transformational'
          : project.budget && project.budget > 50000
            ? 'high-impact'
            : 'standard';

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          progress,
          budget: project.budget || 0,
          spent,
          deadline: project.endDate,
          daysRemaining,
          teamSize,
          priority,
          healthStatus,
          roi,
          strategicValue,
        };
      });

      // Filter active projects
      const activeProjects = projectMetrics.filter(
        p => p.status === 'in_progress' || p.status === 'planning'
      ).length;

      // Calculate this quarter's completion
      const quarterStart = new Date();
      quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
      const completedThisQuarter = projects.filter(p => {
        if (p.status !== 'completed') return false;
        const completedDate = new Date(p.updatedAt || p.createdAt);
        return completedDate >= quarterStart;
      }).length;

      // Calculate on-time and on-budget percentages
      const completedProjects = projectMetrics.filter(p => p.status === 'completed');
      const onTimeProjects = completedProjects.filter(p => p.daysRemaining >= 0).length;
      const onBudgetProjects = completedProjects.filter(p => p.spent <= p.budget).length;

      const onTimePercentage = completedProjects.length > 0
        ? Math.round((onTimeProjects / completedProjects.length) * 100)
        : 85; // Default if no data

      const onBudgetPercentage = completedProjects.length > 0
        ? Math.round((onBudgetProjects / completedProjects.length) * 100)
        : 78; // Default if no data

      // Calculate average ROI
      const averageROI = projectMetrics.length > 0
        ? Math.round(projectMetrics.reduce((sum, p) => sum + p.roi, 0) / projectMetrics.length)
        : 28;

      // Calculate total budget and spent
      const totalBudget = projectMetrics.reduce((sum, p) => sum + p.budget, 0);
      const totalSpent = projectMetrics.reduce((sum, p) => sum + p.spent, 0);

      // Find at-risk projects
      const atRiskProjects = projectMetrics.filter(
        p => (p.healthStatus === 'at-risk' || p.healthStatus === 'delayed') &&
             (p.status === 'in_progress' || p.status === 'planning')
      );

      // Critical path milestones (top 3 urgent)
      const criticalPath = projectMetrics
        .filter(p => p.status === 'in_progress' && p.daysRemaining < 14)
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 3)
        .map(p => {
          const projectTasks = tasks.filter(t => t.projectId === p.id);
          const blockers = projectTasks.filter(t => t.status === 'blocked' || t.status === 'review').length;

          return {
            projectName: p.name,
            milestone: `${p.progress}% Complete`,
            dueDate: p.deadline,
            blockers,
          };
        });

      res.json({
        totalProjects: projectMetrics.length,
        activeProjects,
        completedThisQuarter,
        onTimePercentage,
        onBudgetPercentage,
        averageROI,
        totalBudget,
        totalSpent,
        projects: projectMetrics,
        atRiskProjects,
        criticalPath,
      });
    } catch (error) {
      console.error("Error fetching strategic projects:", error);
      res.status(500).json({ message: "Failed to fetch strategic projects data" });
    }
  });

  // System variables routes (admin only)
  app.get('/api/system-variables', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variables = await storage.getSystemVariables();
      res.json(variables);
    } catch (error) {
      console.error("Error fetching system variables:", error);
      res.status(500).json({ message: "Failed to fetch system variables" });
    }
  });

  app.get('/api/system-variables/:key', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variable = await storage.getSystemVariable(req.params.key);
      if (!variable) {
        return res.status(404).json({ message: "System variable not found" });
      }
      res.json(variable);
    } catch (error) {
      console.error("Error fetching system variable:", error);
      res.status(500).json({ message: "Failed to fetch system variable" });
    }
  });

  app.post('/api/system-variables', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variable = await storage.createSystemVariable({
        ...req.body,
        updatedBy: (req.user as any)?.claims?.sub,
      });
      res.status(201).json(variable);
    } catch (error) {
      console.error("Error creating system variable:", error);
      res.status(400).json({ message: "Failed to create system variable" });
    }
  });

  app.put('/api/system-variables/:key', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variable = await storage.updateSystemVariable(req.params.key, {
        ...req.body,
        updatedBy: (req.user as any)?.claims?.sub,
      });
      res.json(variable);
    } catch (error) {
      console.error("Error updating system variable:", error);
      res.status(400).json({ message: "Failed to update system variable" });
    }
  });

  app.delete('/api/system-variables/:key', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteSystemVariable(req.params.key);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system variable:", error);
      res.status(400).json({ message: "Failed to delete system variable" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);

      // Broadcast the creation to all connected clients
      await wsManager.broadcastToOrganization(client.organizationId, 'create', 'client', client);

      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);

      // Broadcast the update to all connected clients, excluding the current user
      await wsManager.broadcastToOrganization(client.organizationId, 'update', 'client', client, req.user?.id);

      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Get client data before deletion for broadcasting
      const client = await storage.getClient(req.params.id);
      await storage.deleteClient(req.params.id);

      // Broadcast the deletion to all connected clients, excluding the current user
      if (client) {
        await wsManager.broadcastToOrganization(client.organizationId, 'delete', 'client', { id: req.params.id, ...client }, req.user?.id);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Company routes
  app.get('/api/companies', isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);

      // Broadcast the creation to all connected clients
      await wsManager.broadcastToOrganization(company.organizationId, 'create', 'company', company);

      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, validatedData);

      // Broadcast the update to all connected clients, excluding the current user
      await wsManager.broadcastToOrganization(company.organizationId, 'update', 'company', company, req.user?.id);

      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ message: "Failed to update company" });
    }
  });

  app.delete('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Get company data before deletion for broadcasting
      const company = await storage.getCompany(req.params.id);
      await storage.deleteCompany(req.params.id);

      // Broadcast the deletion to all connected clients, excluding the current user
      if (company) {
        await wsManager.broadcastToOrganization(company.organizationId, 'delete', 'company', { id: req.params.id, ...company }, req.user?.id);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Sales Opportunity routes
  app.get('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getSalesOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.get('/api/opportunities/by-stage/:stage', isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getSalesOpportunitiesByStage(req.params.stage);
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities by stage:", error);
      res.status(500).json({ message: "Failed to fetch opportunities by stage" });
    }
  });

  app.get('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      const opportunity = await storage.getSalesOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  app.post('/api/opportunities', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Creating opportunity - Request body:', JSON.stringify(req.body, null, 2));
      console.log('req.tenant:', req.tenant);
      console.log('req.user:', { id: req.user?.id, email: req.user?.email });

      const validatedData = insertSalesOpportunitySchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));

      const opportunity = await storage.createSalesOpportunity(validatedData);
      console.log('Created opportunity:', JSON.stringify(opportunity, null, 2));

      // Log activity history
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      if (userId) {
        await logActivityHistory(
          opportunity.id,
          'opportunity_created',
          `Opportunity "${opportunity.title}" was created`,
          userId
        );
      }

      res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error creating opportunity:", error);

      // Handle different types of errors
      if (error instanceof Error) {
        // Zod validation error
        if (error.name === 'ZodError' || error.message.includes('validation')) {
          const zodError = error as any;
          const validationErrors = zodError.errors || [];

          console.error('Validation errors:', validationErrors);

          return res.status(400).json({
            message: "Validation failed",
            errors: validationErrors,
            details: "Please check that all required fields are filled correctly"
          });
        }

        // Database constraint errors
        if (error.message.includes('foreign key') || error.message.includes('constraint')) {
          console.error('Database constraint error:', error.message);
          return res.status(400).json({
            message: "Invalid reference data",
            details: "One or more selected items (company, contact, user) may not exist"
          });
        }

        // Other known errors
        return res.status(500).json({
          message: "Server error",
          details: error.message
        });
      }

      // Generic fallback
      res.status(500).json({
        message: "Failed to create opportunity",
        details: "An unexpected error occurred"
      });
    }
  });

  app.put('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      console.log(`📝 Updating opportunity ${req.params.id} with data:`, JSON.stringify(req.body, null, 2));
      const validatedData = insertSalesOpportunitySchema.partial().parse(req.body);

      // Get the current opportunity to track changes
      const currentOpportunity = await db.select()
        .from(salesOpportunities)
        .where(eq(salesOpportunities.id, req.params.id))
        .limit(1);

      if (!currentOpportunity.length) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      const current = currentOpportunity[0];
      const opportunity = await storage.updateSalesOpportunity(req.params.id, validatedData);

      // Log activity for changed fields
      const changes: string[] = [];
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (validatedData.stage && validatedData.stage !== current.stage) {
        const stageLabels: Record<string, string> = {
          lead: "Lead",
          qualified: "Qualified",
          proposal: "Proposal",
          negotiation: "Negotiation",
          closed_won: "Closed Won",
          closed_lost: "Closed Lost"
        };

        await logActivityHistory(
          req.params.id,
          'stage_changed',
          `Stage changed from "${stageLabels[current.stage || ''] || current.stage}" to "${stageLabels[validatedData.stage] || validatedData.stage}"`,
          userId,
          current.stage,
          validatedData.stage
        );
        changes.push('stage');

        // Automatically create project when opportunity is won (if enabled)
        console.log(`🔄 Opportunity ${req.params.id} stage changed: "${current.stage}" → "${validatedData.stage}"`);
        if (validatedData.stage === 'closed_won' && current.stage !== 'closed_won') {
          console.log(`🎉 Opportunity ${req.params.id} marked as closed_won - checking auto-project creation...`);
          try {
            // Check if automatic project creation is enabled
            const autoProjectCreation = await storage.getSystemVariable('auto_create_project_from_won_opportunity');
            const isEnabled = autoProjectCreation?.value === 'true' || autoProjectCreation?.value === true;
            console.log(`📋 Auto-project creation setting: ${autoProjectCreation ? `${autoProjectCreation.key}=${autoProjectCreation.value}` : 'NOT FOUND'} (enabled: ${isEnabled})`);

            if (!isEnabled) {
              console.log('📋 Automatic project creation is disabled via system configuration');
            } else {
              // Check if project already exists for this opportunity (idempotency protection)
              const [existingProject] = await db.select()
                .from(projects)
                .where(eq(projects.opportunityId, req.params.id))
                .limit(1);

              if (existingProject) {
                console.log(`⚠️ Project already exists for opportunity ${req.params.id}: ${existingProject.id}`);
                return; // Skip creation - project already exists
              }

              // Get the opportunity data first
              const [opportunity] = await db.select()
                .from(salesOpportunities)
                .where(eq(salesOpportunities.id, req.params.id))
                .limit(1);

              if (!opportunity) {
                console.log(`❌ Opportunity ${req.params.id} not found`);
                return;
              }

              // Start transaction for atomic project creation
              let createdProject: any = null;
              let notificationData: any = null;
              
              try {
                await db.transaction(async (tx) => {
                  console.log(`📊 Creating project for opportunity: ${opportunity.title}`);

                  // Calculate project timeline based on opportunity value with safe parsing
                  const value = opportunity.value ? parseFloat(opportunity.value.toString()) : 0;
                  const complexity = value > 50000 ? 'high' : value > 15000 ? 'medium' : 'low';
                  const durationWeeks = complexity === 'high' ? 12 : complexity === 'medium' ? 8 : 4;
                  
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setDate(startDate.getDate() + (durationWeeks * 7));

                  // Format pain points as requirements with safe handling
                  const requirements = Array.isArray(opportunity.painPoints)
                    ? opportunity.painPoints.join('. ')
                    : opportunity.painPoints ? String(opportunity.painPoints) : null;

                  // Safely handle success criteria
                  const successCriteria = opportunity.successCriteria || null;

                  console.log(`🎯 Project timeline: ${durationWeeks} weeks (${complexity} complexity)`);
                  console.log(`🔑 Opportunity organizationId: ${opportunity.organizationId}`);

                  // Create project with comprehensive data mapping
                  const projectData = {
                    name: `${opportunity.title} - Project`,
                    description: opportunity.description || `Project created from won opportunity: ${opportunity.title}`,
                    organizationId: opportunity.organizationId,
                    companyId: opportunity.companyId || null,
                    clientId: opportunity.contactId || null,
                    opportunityId: req.params.id,
                    managerId: opportunity.assignedTo || null,
                    status: "planning" as const,
                    priority: opportunity.priority || "medium" as const,
                    budget: opportunity.value ? opportunity.value.toString() : null,
                    actualCost: "0",
                    progress: 0,
                    startDate,
                    endDate,
                    // Enhanced fields for opportunity conversion
                    requirements,
                    successCriteria,
                    conversionDate: new Date(),
                    originalValue: opportunity.value || null,
                    tags: ["auto-created", "from-opportunity", complexity].filter(Boolean)
                  };

                  console.log(`📦 ProjectData organizationId before insert: ${projectData.organizationId}`);

                  const [newProject] = await tx.insert(projects).values(projectData).returning();

                  if (!newProject) {
                    throw new Error('Failed to create project - no data returned');
                  }

                  console.log(`✅ Created project ${newProject.id} from opportunity ${req.params.id}`);

                  // Log project creation activity (within transaction)
                  await tx.insert(projectActivity).values({
                    organizationId: opportunity.organizationId,
                    projectId: newProject.id,
                    action: 'project_created',
                    details: `Project automatically created from won opportunity: "${opportunity.title}" (Value: ${opportunity.value || 'N/A'}, Timeline: ${durationWeeks} weeks)`,
                    performedBy: userId
                  });

                  // Transfer stakeholders from opportunity to project (within transaction)
                  const stakeholdersList = await tx.select()
                    .from(opportunityStakeholders)
                    .where(and(
                      eq(opportunityStakeholders.opportunityId, req.params.id),
                      eq(opportunityStakeholders.organizationId, opportunity.organizationId)
                    ));

                  console.log(`👥 Transferring ${stakeholdersList.length} stakeholders to project`);

                  for (const stakeholder of stakeholdersList) {
                    // Create project comment to document stakeholder transfer
                    await tx.insert(projectComments).values({
                      organizationId: opportunity.organizationId,
                      projectId: newProject.id,
                      userId: userId,
                      content: `Stakeholder transferred from opportunity: ${stakeholder.name} (${stakeholder.role}) - ${stakeholder.email}`,
                      isInternal: true
                    });
                  }

                  if (stakeholdersList.length > 0) {
                    await tx.insert(projectActivity).values({
                      organizationId: opportunity.organizationId,
                      projectId: newProject.id,
                      action: 'stakeholders_transferred',
                      details: `Transferred ${stakeholdersList.length} stakeholder(s) from opportunity`,
                      performedBy: userId
                    });
                  }

                  // Store project and notification data for post-transaction processing
                  createdProject = newProject;
                  
                  // Create notification (within transaction) - ensure userId is not null
                  const targetUserId = opportunity.assignedTo || userId;
                  if (targetUserId) {
                    notificationData = {
                      organizationId: opportunity.organizationId,
                      userId: targetUserId,
                      type: 'project_created' as const,
                      title: 'Project Auto-Created from Won Opportunity',
                      message: `Project "${newProject.name}" has been automatically created from the won opportunity "${opportunity.title}".`,
                      relatedEntityType: 'project' as const,
                      relatedEntityId: newProject.id,
                      actionUrl: `/projects/${newProject.id}`
                    };

                    await tx.insert(notifications).values(notificationData);
                  } else {
                    console.log(`⚠️ Skipping notification - no valid userId for opportunity ${req.params.id}`);
                  }

                  console.log(`🎉 Transaction complete for project ${newProject.id} from opportunity ${req.params.id}`);

                }); // Close the db.transaction call

                // After successful transaction, handle side effects
                if (createdProject && notificationData) {
                  try {
                    await wsManager.broadcastNotification(notificationData.userId, notificationData);
                    await wsManager.broadcastToOrganization(createdProject.organizationId, 'create', 'project', createdProject);
                    console.log(`📢 Sent project creation notification to user ${notificationData.userId}`);
                  } catch (wsError) {
                    console.error(`⚠️ Error broadcasting notifications (non-critical):`, wsError);
                  }
                }

              } catch (error: any) {
                // Handle unique constraint violation (idempotency)
                if (error?.code === '23505' && error?.constraint?.includes('opportunity_id')) {
                  console.log(`⚠️ Project already exists for opportunity ${req.params.id} (unique constraint)`);
                  // This is expected for concurrent requests - not an error
                } else {
                  console.error(`❌ Error auto-creating project for opportunity ${req.params.id}:`, error);
                  throw error;
                }
              }
            }
          } catch (error) {
            console.error("Error auto-creating project from won opportunity:", error);
            // Don't fail the opportunity update if project creation fails
          }
        }
      }

      if (validatedData.value !== undefined && validatedData.value !== current.value) {
        await logActivityHistory(
          req.params.id,
          'value_changed',
          `Deal value changed from £${current.value || '0'} to £${validatedData.value || '0'}`,
          userId,
          current.value,
          validatedData.value
        );
        changes.push('value');
      }

      if (validatedData.probability !== undefined && validatedData.probability !== current.probability) {
        await logActivityHistory(
          req.params.id,
          'probability_changed',
          `Probability changed from ${current.probability}% to ${validatedData.probability}%`,
          userId,
          current.probability?.toString(),
          validatedData.probability?.toString()
        );
        changes.push('probability');
      }

      if (validatedData.expectedCloseDate !== undefined) {
        const newDate = validatedData.expectedCloseDate ? new Date(validatedData.expectedCloseDate).toISOString() : null;
        const currentDate = current.expectedCloseDate ? new Date(current.expectedCloseDate).toISOString() : null;

        if (newDate !== currentDate) {
          const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString() : 'Not set';
          await logActivityHistory(
            req.params.id,
            'close_date_changed',
            `Expected close date changed from ${formatDate(currentDate)} to ${formatDate(newDate)}`,
            userId,
            currentDate,
            newDate
          );
          changes.push('expectedCloseDate');
        }
      }

      if (validatedData.priority && validatedData.priority !== current.priority) {
        await logActivityHistory(
          req.params.id,
          'priority_changed',
          `Priority changed from "${current.priority}" to "${validatedData.priority}"`,
          userId,
          current.priority,
          validatedData.priority
        );
        changes.push('priority');
      }

      if (validatedData.assignedTo !== undefined && validatedData.assignedTo !== current.assignedTo) {
        // Get user names for better logging
        const allUsers = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }).from(users);

        const currentUser = allUsers.find(u => u.id === current.assignedTo);
        const newUser = allUsers.find(u => u.id === validatedData.assignedTo);

        const currentName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unassigned';
        const newName = newUser ? `${newUser.firstName} ${newUser.lastName}` : 'Unassigned';

        await logActivityHistory(
          req.params.id,
          'assigned_to_changed',
          `Assignment changed from "${currentName}" to "${newName}"`,
          userId,
          current.assignedTo,
          validatedData.assignedTo
        );
        changes.push('assignedTo');
      }

      // Log general update if other fields changed
      const otherChanges = Object.keys(validatedData).filter(key => !changes.includes(key));
      if (otherChanges.length > 0) {
        await logActivityHistory(
          req.params.id,
          'opportunity_updated',
          `Updated opportunity details: ${otherChanges.join(', ')}`,
          userId
        );
      }

      res.json(opportunity);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      res.status(400).json({ message: "Failed to update opportunity" });
    }
  });

  app.delete('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      // Get opportunity details before deletion for logging
      const opportunity = await db.select()
        .from(salesOpportunities)
        .where(eq(salesOpportunities.id, req.params.id))
        .limit(1);

      if (opportunity.length > 0) {
        // Log activity history before deletion
        await logActivityHistory(
          req.params.id,
          'opportunity_deleted',
          `Opportunity "${opportunity[0].title}" was deleted`,
          getUserId(req)
        );
      }

      await storage.deleteSalesOpportunity(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ message: "Failed to delete opportunity" });
    }
  });

  // Opportunity Next Steps routes
  app.get('/api/opportunities/:opportunityId/next-steps', isAuthenticated, async (req, res) => {
    try {
      const nextSteps = await db.select({
        id: opportunityNextSteps.id,
        opportunityId: opportunityNextSteps.opportunityId,
        title: opportunityNextSteps.title,
        description: opportunityNextSteps.description,
        assignedTo: opportunityNextSteps.assignedTo,
        dueDate: opportunityNextSteps.dueDate,
        priority: opportunityNextSteps.priority,
        status: opportunityNextSteps.status,
        completedAt: opportunityNextSteps.completedAt,
        completedBy: opportunityNextSteps.completedBy,
        createdBy: opportunityNextSteps.createdBy,
        createdAt: opportunityNextSteps.createdAt,
        updatedAt: opportunityNextSteps.updatedAt,
        assignedUser: users ? {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        } : null,
      }).from(opportunityNextSteps)
        .where(eq(opportunityNextSteps.opportunityId, req.params.opportunityId))
        .leftJoin(users, eq(opportunityNextSteps.assignedTo, users.id));
      res.json(nextSteps);
    } catch (error) {
      console.error("Error fetching next steps:", error);
      res.status(500).json({ message: "Failed to fetch next steps" });
    }
  });

  app.post('/api/opportunities/:opportunityId/next-steps', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const validatedData = insertOpportunityNextStepSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
        createdBy: userId,
      });
      const nextStep = await storage.createOpportunityNextStep(validatedData);

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'next_step_added',
        `Added next step: "${nextStep.title}"`,
        userId
      );

      res.status(201).json(nextStep);
    } catch (error) {
      console.error("Error creating next step:", error);
      res.status(400).json({ message: "Failed to create next step" });
    }
  });

  app.put('/api/opportunities/:opportunityId/next-steps/:id', isAuthenticated, async (req, res) => {
    try {
      // Get existing record to verify ownership
      const existing = await storage.getOpportunityNextStep(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Next step not found" });
      }

      // Verify record belongs to the opportunity in URL (prevent cross-opportunity access)
      if (existing.opportunityId !== req.params.opportunityId) {
        return res.status(404).json({ message: "Next step not found" });
      }

      const validatedData = updateOpportunityNextStepSchema.parse(req.body);
      const nextStep = await storage.updateOpportunityNextStep(req.params.id, validatedData);

      if (!nextStep) {
        return res.status(404).json({ message: "Next step not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'next_step_updated',
        `Updated next step: "${nextStep.title}"`,
        getUserId(req)
      );

      res.json(nextStep);
    } catch (error) {
      console.error("Error updating next step:", error);
      res.status(400).json({ message: "Failed to update next step" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/next-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const nextStep = await storage.getOpportunityNextStep(req.params.id);
      
      if (!nextStep) {
        return res.status(404).json({ message: "Next step not found" });
      }

      // Verify record belongs to the opportunity in URL (prevent cross-opportunity access)
      if (nextStep.opportunityId !== req.params.opportunityId) {
        return res.status(404).json({ message: "Next step not found" });
      }

      await storage.deleteOpportunityNextStep(req.params.id);

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'next_step_deleted',
        `Deleted next step: "${nextStep.title}"`,
        getUserId(req)
      );

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting next step:", error);
      res.status(500).json({ message: "Failed to delete next step" });
    }
  });

  // Opportunity Communications routes
  app.get('/api/opportunities/:opportunityId/communications', isAuthenticated, async (req, res) => {
    try {
      const communications = await db.select({
        id: opportunityCommunications.id,
        opportunityId: opportunityCommunications.opportunityId,
        type: opportunityCommunications.type,
        subject: opportunityCommunications.subject,
        summary: opportunityCommunications.summary,
        outcome: opportunityCommunications.outcome,
        attendees: opportunityCommunications.attendees,
        followUpRequired: opportunityCommunications.followUpRequired,
        followUpDate: opportunityCommunications.followUpDate,
        attachments: opportunityCommunications.attachments,
        recordedBy: opportunityCommunications.recordedBy,
        communicationDate: opportunityCommunications.communicationDate,
        createdAt: opportunityCommunications.createdAt,
        updatedAt: opportunityCommunications.updatedAt,
        recordedByUser: users ? {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        } : null,
      }).from(opportunityCommunications)
        .where(eq(opportunityCommunications.opportunityId, req.params.opportunityId))
        .leftJoin(users, eq(opportunityCommunications.recordedBy, users.id))
        .orderBy(desc(opportunityCommunications.communicationDate));
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post('/api/opportunities/:opportunityId/communications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const validatedData = insertOpportunityCommunicationSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
        recordedBy: userId,
      });
      const communication = await storage.createOpportunityCommunication(validatedData);

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'communication_logged',
        `Logged ${communication.type}: "${communication.subject || 'Communication'}"`,
        getUserId(req)
      );

      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(400).json({ message: "Failed to create communication" });
    }
  });

  app.put('/api/opportunities/:opportunityId/communications/:id', isAuthenticated, async (req, res) => {
    try {
      // Get existing record to verify ownership
      const existing = await storage.getOpportunityCommunication(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Communication not found" });
      }

      // Verify record belongs to the opportunity in URL (prevent cross-opportunity access)
      if (existing.opportunityId !== req.params.opportunityId) {
        return res.status(404).json({ message: "Communication not found" });
      }

      const validatedData = updateOpportunityCommunicationSchema.parse(req.body);
      const communication = await storage.updateOpportunityCommunication(req.params.id, validatedData);

      if (!communication) {
        return res.status(404).json({ message: "Communication not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'communication_updated',
        `Updated ${communication.type}: "${communication.subject || 'Communication'}"`,
        getUserId(req)
      );

      res.json(communication);
    } catch (error) {
      console.error("Error updating communication:", error);
      res.status(400).json({ message: "Failed to update communication" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/communications/:id', isAuthenticated, async (req, res) => {
    try {
      const communication = await storage.getOpportunityCommunication(req.params.id);
      
      if (!communication) {
        return res.status(404).json({ message: "Communication not found" });
      }

      // Verify record belongs to the opportunity in URL (prevent cross-opportunity access)
      if (communication.opportunityId !== req.params.opportunityId) {
        return res.status(404).json({ message: "Communication not found" });
      }

      await storage.deleteOpportunityCommunication(req.params.id);

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'communication_deleted',
        `Deleted ${communication.type}: "${communication.subject || 'Communication'}"`,
        getUserId(req)
      );

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting communication:", error);
      res.status(500).json({ message: "Failed to delete communication" });
    }
  });

  // File upload configuration
  const uploadDir = path.join(process.cwd(), 'uploads', 'opportunities');

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const opportunityDir = path.join(uploadDir, req.params.opportunityId);
        if (!fs.existsSync(opportunityDir)) {
          fs.mkdirSync(opportunityDir, { recursive: true });
        }
        cb(null, opportunityDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow common file types
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|zip|pptx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    }
  });

  // Opportunity File Attachments routes
  app.get('/api/opportunities/:opportunityId/attachments', isAuthenticated, async (req, res) => {
    try {
      const attachments = await db.select({
        id: opportunityFileAttachments.id,
        originalFileName: opportunityFileAttachments.originalFileName,
        fileSize: opportunityFileAttachments.fileSize,
        mimeType: opportunityFileAttachments.mimeType,
        description: opportunityFileAttachments.description,
        isPublic: opportunityFileAttachments.isPublic,
        uploadedAt: opportunityFileAttachments.uploadedAt,
        uploadedBy: opportunityFileAttachments.uploadedBy,
        communicationId: opportunityFileAttachments.communicationId,
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(opportunityFileAttachments)
      .leftJoin(users, eq(opportunityFileAttachments.uploadedBy, users.id))
      .where(eq(opportunityFileAttachments.opportunityId, req.params.opportunityId))
      .orderBy(desc(opportunityFileAttachments.uploadedAt));

      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post('/api/opportunities/:opportunityId/attachments',
    isAuthenticated,
    upload.single('file'),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file provided" });
        }

        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "User ID not found" });
        }

        const { description, communicationId, isPublic } = req.body;

        const newAttachment = await storage.createOpportunityFileAttachment({
          opportunityId: req.params.opportunityId,
          communicationId: communicationId || null,
          fileName: req.file.filename,
          originalFileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          filePath: req.file.path,
          uploadedBy: userId,
          description: description || null,
          isPublic: isPublic === 'true',
        });

        // Log activity history
        await logActivityHistory(
          req.params.opportunityId,
          'file_attached',
          `Uploaded file: "${req.file.originalname}"${communicationId ? ' to communication' : ''}`,
          userId
        );

        res.status(201).json(newAttachment);
      } catch (error) {
        console.error("Error uploading file:", error);
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Failed to upload file" });
      }
    }
  );

  app.get('/api/opportunities/:opportunityId/attachments/:id/download', isAuthenticated, async (req, res) => {
    try {
      const attachment = await db.select()
        .from(opportunityFileAttachments)
        .where(and(
          eq(opportunityFileAttachments.id, req.params.id),
          eq(opportunityFileAttachments.opportunityId, req.params.opportunityId)
        ))
        .limit(1);

      if (!attachment.length) {
        return res.status(404).json({ message: "File not found" });
      }

      const file = attachment[0];

      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ message: "File no longer exists on disk" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.download(file.filePath, file.originalFileName);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/attachments/:id', isAuthenticated, async (req, res) => {
    try {
      const attachment = await storage.getOpportunityFileAttachment(req.params.id);

      if (!attachment) {
        return res.status(404).json({ message: "File not found" });
      }

      const file = attachment;

      // Delete from database
      await storage.deleteOpportunityFileAttachment(req.params.id);

      // Delete physical file
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'file_removed',
        `Deleted file: "${file.originalFileName}"`,
        getUserId(req)
      );

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Opportunity Stakeholders routes
  app.get('/api/opportunities/:opportunityId/stakeholders', isAuthenticated, async (req, res) => {
    try {
      const stakeholders = await db.select({
        id: opportunityStakeholders.id,
        opportunityId: opportunityStakeholders.opportunityId,
        name: opportunityStakeholders.name,
        role: opportunityStakeholders.role,
        email: opportunityStakeholders.email,
        phone: opportunityStakeholders.phone,
        influence: opportunityStakeholders.influence,
        relationshipStrength: opportunityStakeholders.relationshipStrength,
        notes: opportunityStakeholders.notes,
        createdBy: opportunityStakeholders.createdBy,
        createdAt: opportunityStakeholders.createdAt,
        updatedAt: opportunityStakeholders.updatedAt,
        createdByUser: users ? {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        } : null,
      }).from(opportunityStakeholders)
        .where(eq(opportunityStakeholders.opportunityId, req.params.opportunityId))
        .leftJoin(users, eq(opportunityStakeholders.createdBy, users.id));
      res.json(stakeholders);
    } catch (error) {
      console.error("Error fetching stakeholders:", error);
      res.status(500).json({ message: "Failed to fetch stakeholders" });
    }
  });

  app.post('/api/opportunities/:opportunityId/stakeholders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const validatedData = insertOpportunityStakeholderSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
        createdBy: userId,
      });
      const stakeholder = await storage.createOpportunityStakeholder(validatedData);

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'stakeholder_added',
        `Added stakeholder: "${stakeholder.name}" (${stakeholder.role || 'Unknown role'})`,
        getUserId(req)
      );

      res.status(201).json(stakeholder);
    } catch (error) {
      console.error("Error creating stakeholder:", error);
      res.status(400).json({ message: "Failed to create stakeholder" });
    }
  });

  app.put('/api/opportunities/:opportunityId/stakeholders/:id', isAuthenticated, async (req, res) => {
    try {
      // Get existing record to verify ownership
      const existing = await storage.getOpportunityStakeholder(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Stakeholder not found" });
      }

      // Verify record belongs to the opportunity in URL (prevent cross-opportunity access)
      if (existing.opportunityId !== req.params.opportunityId) {
        return res.status(404).json({ message: "Stakeholder not found" });
      }

      const validatedData = updateOpportunityStakeholderSchema.parse(req.body);
      const stakeholder = await storage.updateOpportunityStakeholder(req.params.id, validatedData);

      if (!stakeholder) {
        return res.status(404).json({ message: "Stakeholder not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'stakeholder_updated',
        `Updated stakeholder: "${stakeholder.name}" (${stakeholder.role || 'Unknown role'})`,
        getUserId(req)
      );

      res.json(stakeholder);
    } catch (error) {
      console.error("Error updating stakeholder:", error);
      res.status(400).json({ message: "Failed to update stakeholder" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/stakeholders/:id', isAuthenticated, async (req, res) => {
    try {
      const stakeholder = await storage.getOpportunityStakeholder(req.params.id);

      if (!stakeholder) {
        return res.status(404).json({ message: "Stakeholder not found" });
      }

      // Verify record belongs to the opportunity in URL (prevent cross-opportunity access)
      if (stakeholder.opportunityId !== req.params.opportunityId) {
        return res.status(404).json({ message: "Stakeholder not found" });
      }

      await storage.deleteOpportunityStakeholder(req.params.id);

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'stakeholder_deleted',
        `Deleted stakeholder: "${stakeholder.name}" (${stakeholder.role || 'Unknown role'})`,
        getUserId(req)
      );

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stakeholder:", error);
      res.status(500).json({ message: "Failed to delete stakeholder" });
    }
  });

  // Opportunity Activity History routes
  app.get('/api/opportunities/:opportunityId/activity-history', isAuthenticated, async (req, res) => {
    try {
      const activityHistory = await db.select({
        id: opportunityActivityHistory.id,
        opportunityId: opportunityActivityHistory.opportunityId,
        action: opportunityActivityHistory.action,
        details: opportunityActivityHistory.details,
        oldValue: opportunityActivityHistory.oldValue,
        newValue: opportunityActivityHistory.newValue,
        performedBy: opportunityActivityHistory.performedBy,
        performedAt: opportunityActivityHistory.performedAt,
        createdAt: opportunityActivityHistory.createdAt,
        performedByUser: users ? {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        } : null,
      }).from(opportunityActivityHistory)
        .where(eq(opportunityActivityHistory.opportunityId, req.params.opportunityId))
        .leftJoin(users, eq(opportunityActivityHistory.performedBy, users.id))
        .orderBy(desc(opportunityActivityHistory.performedAt));
      res.json(activityHistory);
    } catch (error) {
      console.error("Error fetching activity history:", error);
      res.status(500).json({ message: "Failed to fetch activity history" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);

      // Broadcast the creation to all connected clients
      await wsManager.broadcastToOrganization(project.organizationId, 'create', 'project', project);

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log("PUT /api/projects/:id - Request body:", req.body);
      console.log("PUT /api/projects/:id - Project ID:", req.params.id);

      // Use the proper updateProjectSchema that works with .partial()
      const validatedData = updateProjectSchema.partial().parse(req.body);
      console.log("PUT /api/projects/:id - Validated data:", validatedData);

      const project = await storage.updateProject(req.params.id, validatedData);
      console.log("PUT /api/projects/:id - Updated project:", project);

      // Broadcast the update to all connected clients, excluding the current user
      await wsManager.broadcastToOrganization(project.organizationId, 'update', 'project', project, req.user?.id);

      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        // Handle specific validation errors
        if (error.name === 'ZodError') {
          return res.status(400).json({
            message: "Validation error",
            details: "The provided data does not meet the required format",
            errors: error.message
          });
        }

        // Handle database constraint errors
        if (error.message.includes('foreign key constraint')) {
          return res.status(400).json({
            message: "Invalid reference",
            details: "One or more referenced entities (client, manager, etc.) do not exist"
          });
        }

        // Handle other specific errors
        res.status(400).json({
          message: "Failed to update project",
          details: error.message,
          error: error.message
        });
      } else {
        res.status(500).json({
          message: "Internal server error",
          details: "An unexpected error occurred while updating the project"
        });
      }
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log("DELETE /api/projects/:id - Project ID:", req.params.id);

      // Get project data before deletion for broadcasting
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check for associated tasks and their statuses before deletion
      const associatedTasks = await storage.getTasksByProject(req.params.id);
      console.log("DELETE /api/projects/:id - Associated tasks:", associatedTasks.length);

      if (associatedTasks.length > 0) {
        // Check for incomplete tasks (anything not "completed")
        const incompleteTasks = associatedTasks.filter(task =>
          task.status !== 'completed' && task.status !== 'cancelled'
        );

        console.log("DELETE /api/projects/:id - Incomplete tasks:", incompleteTasks.length);

        if (incompleteTasks.length > 0) {
          return res.status(400).json({
            message: "Cannot delete project with incomplete tasks",
            details: `This project has ${incompleteTasks.length} incomplete task(s). Please complete, cancel, or reassign these tasks before deleting the project.`,
            totalTasks: associatedTasks.length,
            incompleteTasks: incompleteTasks.length,
            completedTasks: associatedTasks.length - incompleteTasks.length,
            tasks: incompleteTasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status || 'todo'
            }))
          });
        }

        // If all tasks are completed/cancelled, allow deletion
        console.log("DELETE /api/projects/:id - All tasks are completed/cancelled, allowing deletion");
      }

      // Proceed with deletion if no tasks exist or all tasks are completed/cancelled
      await storage.deleteProject(req.params.id);
      console.log("DELETE /api/projects/:id - Project deleted successfully");

      // Broadcast the deletion to all connected clients, excluding the current user
      await wsManager.broadcastToOrganization(project.organizationId, 'delete', 'project', { id: req.params.id, ...project }, req.user?.id);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      if (error instanceof Error && error.message.includes('foreign key constraint')) {
        res.status(400).json({
          message: "Cannot delete project with associated data",
          details: "This project has associated tasks or other data that must be removed first."
        });
      } else {
        res.status(500).json({ message: "Failed to delete project", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);

      // Broadcast the creation to all connected clients
      await wsManager.broadcastToOrganization(task.organizationId, 'create', 'task', task);

      // Send notifications for new task creation
      const currentUser = req.user;
      const notifications = [];

      // Notify assignee if different from creator
      if (task.assignedTo && task.assignedTo !== currentUser.id) {
        notifications.push({
          userId: task.assignedTo,
          type: 'task_created',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${task.title}"`,
          data: { taskId: task.id, projectId: task.projectId, createdBy: currentUser.id }
        });
      }

      // Notify project manager if task is in a project
      if (task.projectId) {
        const project = await db.select().from(projects)
          .where(and(
            eq(projects.id, task.projectId),
            eq(projects.organizationId, task.organizationId)
          ))
          .limit(1);
        if (project.length && project[0].managerId && project[0].managerId !== currentUser.id && project[0].managerId !== task.assignedTo) {
          notifications.push({
            userId: project[0].managerId,
            type: 'task_created',
            title: 'New Task Created',
            message: `A new task "${task.title}" was created in ${project[0].name}`,
            data: { taskId: task.id, projectId: task.projectId, createdBy: currentUser.id }
          });
        }
      }

      // Send all notifications
      for (const notification of notifications) {
        try {
          await wsManager.broadcastNotification(notification);
        } catch (error) {
          console.error('Error sending task creation notification:', error);
        }
      }

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTaskSchema.partial().parse(req.body);

      // Get original task to compare changes
      const originalTask = await storage.getTask(req.params.id);
      if (!originalTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      const task = await storage.updateTask(req.params.id, validatedData);

      // Broadcast the update to all connected clients, excluding the current user
      await wsManager.broadcastToOrganization(task.organizationId, 'update', 'task', task, req.user?.id);

      // Send notifications for significant changes
      const currentUser = req.user;
      const taskId = req.params.id;

      // Notify on status changes
      if (validatedData.status && validatedData.status !== originalTask.status) {
        const statusNotifications = [];

        // Notify assignee if different from current user
        if (task.assignedTo && task.assignedTo !== currentUser.id) {
          statusNotifications.push({
            userId: task.assignedTo,
            type: validatedData.status === 'completed' ? 'task_completed' : 'task_updated',
            title: validatedData.status === 'completed' ? 'Task Completed' : 'Task Status Updated',
            message: `"${task.title}" is now ${validatedData.status.replace('_', ' ')}`,
            data: { taskId, projectId: task.projectId, oldStatus: originalTask.status, newStatus: validatedData.status }
          });
        }

        // Notify project manager if task is in a project
        if (task.projectId) {
          const project = await db.select().from(projects)
            .where(and(
              eq(projects.id, task.projectId),
              eq(projects.organizationId, task.organizationId)
            ))
            .limit(1);
          if (project.length && project[0].managerId && project[0].managerId !== currentUser.id && project[0].managerId !== task.assignedTo) {
            statusNotifications.push({
              userId: project[0].managerId,
              type: validatedData.status === 'completed' ? 'task_completed' : 'task_updated',
              title: validatedData.status === 'completed' ? 'Task Completed' : 'Task Status Updated',
              message: `"${task.title}" in ${project[0].name} is now ${validatedData.status.replace('_', ' ')}`,
              data: { taskId, projectId: task.projectId, oldStatus: originalTask.status, newStatus: validatedData.status }
            });
          }
        }

        // Send all status change notifications
        for (const notification of statusNotifications) {
          try {
            await wsManager.broadcastNotification(notification);
          } catch (error) {
            console.error('Error sending task status notification:', error);
          }
        }
      }

      // Notify on assignee changes
      if (validatedData.assignedTo && validatedData.assignedTo !== originalTask.assignedTo) {
        if (validatedData.assignedTo !== currentUser.id) {
          try {
            await wsManager.broadcastNotification({
              userId: validatedData.assignedTo,
              type: 'task_updated',
              title: 'Task Assigned',
              message: `You have been assigned to "${task.title}"`,
              data: { taskId, projectId: task.projectId, assignedBy: currentUser.id }
            });
          } catch (error) {
            console.error('Error sending task assignment notification:', error);
          }
        }
      }

      // Auto-update project progress if task belongs to a project
      if (task.projectId) {
        try {
          const updatedProject = await updateProjectProgress(task.projectId);

          // Broadcast project update if progress or status changed significantly
          await wsManager.broadcastToOrganization(updatedProject.organizationId, 'update', 'project', updatedProject, currentUser.id);

          // Log project activity for status changes
          if (validatedData.status && validatedData.status !== originalTask.status) {
            try {
              await db.insert(projectActivity).values({
                projectId: task.projectId,
                userId: currentUser.id,
                organizationId: updatedProject.organizationId, // Multi-tenant isolation
                action: 'task_status_changed',
                description: `Task "${task.title}" status changed from ${originalTask.status || 'none'} to ${validatedData.status}`,
                details: {
                  taskId,
                  taskTitle: task.title,
                  oldStatus: originalTask.status,
                  newStatus: validatedData.status,
                  projectProgress: updatedProject.progress
                }
              });
            } catch (error) {
              console.error('Error logging project activity:', error);
            }
          }
        } catch (error) {
          console.error('Error updating project progress:', error);
          // Don't fail the task update if project progress update fails
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Get task data before deletion for broadcasting
      const task = await storage.getTask(req.params.id);
      await storage.deleteTask(req.params.id);

      // Broadcast the deletion to all connected clients, excluding the current user
      if (task) {
        await wsManager.broadcastToOrganization(task.organizationId, 'delete', 'task', { id: req.params.id, ...task }, req.user?.id);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task Comments routes
  app.get('/api/tasks/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getTaskComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post('/api/tasks/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTaskCommentSchema.parse(req.body);
      const comment = await storage.createTaskComment({
        ...validatedData,
        taskId: req.params.id,
        userId: req.user.id,
      });

      // Get task details for notifications (with tenant isolation)
      const task = await db.select().from(tasks)
        .where(and(
          eq(tasks.id, req.params.id),
          eq(tasks.organizationId, req.tenant.organizationId)
        ))
        .limit(1);
      if (task.length) {
        const currentUser = req.user;
        const notificationsToSend = [];

        // Notify task assignee if different from commenter
        if (task[0].assignedTo && task[0].assignedTo !== currentUser.id) {
          notificationsToSend.push({
            userId: task[0].assignedTo,
            organizationId: task[0].organizationId, // Multi-tenant isolation
            type: 'task_comment_added',
            title: 'New Task Comment',
            message: `${currentUser.firstName} ${currentUser.lastName} commented on "${task[0].title}"`,
            data: { taskId: req.params.id, commentId: comment.id, commentBy: currentUser.id }
          });
        }

        // Notify task creator if different from commenter and assignee
        if (task[0].createdBy && task[0].createdBy !== currentUser.id && task[0].createdBy !== task[0].assignedTo) {
          notificationsToSend.push({
            userId: task[0].createdBy,
            organizationId: task[0].organizationId, // Multi-tenant isolation
            type: 'task_comment_added',
            title: 'Task Comment',
            message: `${currentUser.firstName} ${currentUser.lastName} commented on "${task[0].title}"`,
            data: { taskId: req.params.id, commentId: comment.id, commentBy: currentUser.id }
          });
        }

        // Send all notifications
        for (const notificationData of notificationsToSend) {
          await db.insert(notifications).values(notificationData);
          await wsManager.broadcastNotification(notificationData.userId, notificationData);
        }
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(400).json({ message: "Failed to create task comment" });
    }
  });

  // Task Dependencies routes
  app.get('/api/task-dependencies', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const dependencies = projectId 
        ? await storage.getAllTaskDependencies(projectId)
        : await storage.getAllTaskDependencies('');
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching task dependencies:", error);
      res.status(500).json({ message: "Failed to fetch task dependencies" });
    }
  });

  app.post('/api/task-dependencies', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTaskDependencySchema.parse(req.body);

      // Check for circular dependencies
      const checkForCircular = async (taskId: string, dependsOnId: string, visited = new Set()): Promise<boolean> => {
        if (visited.has(dependsOnId)) return true;
        if (dependsOnId === taskId) return true;

        visited.add(dependsOnId);

        const childDependencies = await db
          .select()
          .from(taskDependencies)
          .where(eq(taskDependencies.taskId, dependsOnId));

        for (const childDep of childDependencies) {
          if (await checkForCircular(taskId, childDep.dependsOnTaskId, new Set(visited))) {
            return true;
          }
        }

        return false;
      };

      const hasCircular = await checkForCircular(validatedData.taskId, validatedData.dependsOnTaskId);
      if (hasCircular) {
        return res.status(400).json({
          message: "Cannot create dependency: would create circular dependency"
        });
      }

      const [dependency] = await db
        .insert(taskDependencies)
        .values(validatedData)
        .returning();

      // Broadcast the new dependency
      await wsManager.broadcastToOrganization(dependency.organizationId, 'create', 'task-dependency', dependency, req.user?.id);

      // Log activity for both tasks
      try {
        const task = await storage.getTask(validatedData.taskId);
        const dependsOnTask = await storage.getTask(validatedData.dependsOnTaskId);

        if (task && dependsOnTask) {
          if (task.projectId) {
            await db.insert(projectActivity).values({
              projectId: task.projectId,
              userId: req.user.id,
              organizationId: task.organizationId, // Multi-tenant isolation
              action: 'dependency_created',
              description: `Task "${task.title}" now depends on "${dependsOnTask.title}"`,
              details: {
                taskId: task.id,
                dependsOnTaskId: dependsOnTask.id,
                dependencyId: dependency.id
              }
            });
          }
        }
      } catch (error) {
        console.error('Error logging dependency activity:', error);
      }

      res.status(201).json(dependency);
    } catch (error) {
      console.error("Error creating task dependency:", error);
      res.status(400).json({ message: "Failed to create task dependency" });
    }
  });

  app.delete('/api/task-dependencies/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Get dependency data before deletion
      const [dependency] = await db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.id, req.params.id))
        .limit(1);

      if (!dependency) {
        return res.status(404).json({ message: "Task dependency not found" });
      }

      await db
        .delete(taskDependencies)
        .where(eq(taskDependencies.id, req.params.id));

      // Broadcast the deletion
      await wsManager.broadcastToOrganization(dependency.organizationId, 'delete', 'task-dependency', { id: req.params.id, ...dependency }, req.user?.id);

      // Log activity
      try {
        const task = await storage.getTask(dependency.taskId);
        const dependsOnTask = await storage.getTask(dependency.dependsOnTaskId);

        if (task && dependsOnTask && task.projectId) {
          await db.insert(projectActivity).values({
            projectId: task.projectId,
            userId: req.user.id,
            organizationId: task.organizationId, // Multi-tenant isolation
            action: 'dependency_removed',
            description: `Removed dependency: "${task.title}" no longer depends on "${dependsOnTask.title}"`,
            details: {
              taskId: task.id,
              dependsOnTaskId: dependsOnTask.id,
              dependencyId: dependency.id
            }
          });
        }
      } catch (error) {
        console.error('Error logging dependency removal activity:', error);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task dependency:", error);
      res.status(500).json({ message: "Failed to delete task dependency" });
    }
  });

  // Project Template routes
  app.get('/api/project-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getProjectTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ message: "Failed to fetch project templates" });
    }
  });

  app.get('/api/project-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getProjectTemplate(req.params.id);

      if (!template) {
        return res.status(404).json({ message: "Project template not found" });
      }

      const tasks = await storage.getTaskTemplates(req.params.id);

      res.json({ ...template, taskTemplates: tasks });
    } catch (error) {
      console.error("Error fetching project template:", error);
      res.status(500).json({ message: "Failed to fetch project template" });
    }
  });

  app.post('/api/project-templates', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProjectTemplateSchema.parse(req.body);
      const template = await storage.createProjectTemplate({
        ...validatedData,
        createdBy: req.user.id,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating project template:", error);
      res.status(400).json({ message: "Failed to create project template" });
    }
  });

  app.put('/api/project-templates/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProjectTemplateSchema.parse(req.body);
      const result = await storage.updateProjectTemplate(req.params.id, validatedData);

      if (!result) {
        return res.status(404).json({ message: "Project template not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating project template:", error);
      res.status(400).json({ message: "Failed to update project template" });
    }
  });

  app.delete('/api/project-templates/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      await storage.deleteProjectTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project template:", error);
      res.status(500).json({ message: "Failed to delete project template" });
    }
  });

  app.post('/api/projects/from-template/:templateId', isAuthenticated, async (req, res) => {
    try {
      const { templateId } = req.params;
      const projectData = req.body;

      console.log("📝 Creating project from template:", templateId);
      console.log("📝 Project data received:", projectData);

      // Validate project data
      const validatedData = insertProjectSchema.parse(projectData);
      console.log("📝 Validated project data:", validatedData);

      // Get template with task templates
      const template = await storage.getProjectTemplate(templateId);

      if (!template) {
        return res.status(404).json({ message: "Project template not found" });
      }

      const taskTemplatesList = await storage.getTaskTemplates(templateId);

      // Create project from template
      const newProject = await db.insert(projects).values({
        ...validatedData,
        budget: validatedData.budget || template.defaultBudget,
        priority: validatedData.priority || template.defaultPriority,
      }).returning();

      // Create tasks from templates
      const createdTasks = [];
      for (const taskTemplate of taskTemplatesList) {
        const task = await db.insert(tasks).values({
          title: taskTemplate.title,
          description: taskTemplate.description,
          projectId: newProject[0].id,
          estimatedHours: taskTemplate.estimatedHours,
          priority: taskTemplate.priority,
          tags: taskTemplate.tags,
          createdBy: req.user.id,
        }).returning();
        createdTasks.push(task[0]);
      }

      res.status(201).json({ project: newProject[0], tasks: createdTasks });
    } catch (error) {
      console.error("Error creating project from template:", error);
      console.error("Project data received:", projectData);
      console.error("Template ID:", templateId);
      res.status(400).json({
        message: "Failed to create project from template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Task Dependencies routes
  app.get('/api/tasks/:id/dependencies', isAuthenticated, async (req, res) => {
    try {
      const dependencies = await storage.getTaskDependencies(req.params.id);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching task dependencies:", error);
      res.status(500).json({ message: "Failed to fetch task dependencies" });
    }
  });

  app.get('/api/task-dependencies', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const dependencies = projectId 
        ? await storage.getAllTaskDependencies(projectId)
        : await storage.getAllTaskDependencies('');
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching task dependencies:", error);
      res.status(500).json({ message: "Failed to fetch task dependencies" });
    }
  });

  app.post('/api/task-dependencies', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTaskDependencySchema.parse(req.body);
      const dependency = await storage.createTaskDependency(validatedData);
      res.status(201).json(dependency);
    } catch (error) {
      console.error("Error creating task dependency:", error);
      res.status(400).json({ message: "Failed to create task dependency" });
    }
  });

  app.delete('/api/task-dependencies/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTaskDependency(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task dependency:", error);
      res.status(500).json({ message: "Failed to delete task dependency" });
    }
  });

  // Project Comments routes
  app.get('/api/projects/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getProjectComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching project comments:", error);
      res.status(500).json({ message: "Failed to fetch project comments" });
    }
  });

  app.post('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProjectCommentSchema.parse(req.body);
      const comment = await storage.createProjectComment({
        ...validatedData,
        projectId: req.params.id,
        userId: req.user.id,
      });

      // Get project details for activity logging and notifications
      const project = await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1);

      // Log activity
      if (project.length) {
        await db.insert(projectActivity).values({
          projectId: req.params.id,
          userId: req.user.id,
          organizationId: project[0].organizationId, // Multi-tenant isolation
          action: 'comment_added',
          entityType: 'comment',
          entityId: comment.id,
          details: { content: validatedData.content.substring(0, 100) + '...' }
        });
      }

      // Send notifications
      if (project.length) {
        const currentUser = req.user;
        const notifications = [];

        // Notify project manager if different from commenter
        if (project[0].managerId && project[0].managerId !== currentUser.id) {
          notifications.push({
            userId: project[0].managerId,
            type: 'comment_added',
            title: 'New Project Comment',
            message: `${currentUser.firstName} ${currentUser.lastName} commented on ${project[0].name}`,
            data: { projectId: req.params.id, commentId: comment.id, commentBy: currentUser.id }
          });
        }

        // Notify client/primary contact if available
        if (project[0].clientId && project[0].clientId !== currentUser.id) {
          notifications.push({
            userId: project[0].clientId,
            type: 'comment_added',
            title: 'Project Update',
            message: `New comment added to project ${project[0].name}`,
            data: { projectId: req.params.id, commentId: comment.id, commentBy: currentUser.id }
          });
        }

        // Send all notifications
        for (const notification of notifications) {
          try {
            await wsManager.broadcastNotification(notification);
          } catch (error) {
            console.error('Error sending project comment notification:', error);
          }
        }
      }

      res.status(201).json(comment[0]);
    } catch (error) {
      console.error("Error creating project comment:", error);
      res.status(400).json({ message: "Failed to create project comment" });
    }
  });

  // Project Activity routes
  app.get('/api/projects/:id/activity', isAuthenticated, async (req, res) => {
    try {
      const activities = await db.select().from(projectActivity)
        .where(eq(projectActivity.projectId, req.params.id))
        .orderBy(desc(projectActivity.createdAt))
        .limit(50);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching project activity:", error);
      res.status(500).json({ message: "Failed to fetch project activity" });
    }
  });

  // Project Progress Analytics
  app.get('/api/projects/:id/progress', isAuthenticated, async (req, res) => {
    try {
      const progressResult = await calculateProjectProgress(req.params.id);
      res.json(progressResult);
    } catch (error) {
      console.error("Error calculating project progress:", error);
      res.status(500).json({ message: "Failed to calculate project progress" });
    }
  });

  app.get('/api/projects/:id/completion-estimate', isAuthenticated, async (req, res) => {
    try {
      const estimate = await estimateProjectCompletion(req.params.id);
      res.json(estimate);
    } catch (error) {
      console.error("Error estimating project completion:", error);
      res.status(500).json({ message: "Failed to estimate project completion" });
    }
  });

  app.post('/api/projects/:id/recalculate-progress', isAuthenticated, async (req: any, res) => {
    try {
      const updatedProject = await updateProjectProgress(req.params.id);

      // Broadcast the update
      await wsManager.broadcastToOrganization(updatedProject.organizationId, 'update', 'project', updatedProject, req.user?.id);

      // Log activity
      try {
        await db.insert(projectActivity).values({
          projectId: req.params.id,
          userId: req.user.id,
          organizationId: updatedProject.organizationId, // Multi-tenant isolation
          action: 'progress_recalculated',
          description: `Project progress manually recalculated to ${updatedProject.progress}%`,
          details: {
            newProgress: updatedProject.progress,
            triggerUser: req.user.id
          }
        });
      } catch (error) {
        console.error('Error logging progress recalculation:', error);
      }

      res.json({
        project: updatedProject,
        message: 'Project progress recalculated successfully'
      });
    } catch (error) {
      console.error("Error recalculating project progress:", error);
      res.status(500).json({ message: "Failed to recalculate project progress" });
    }
  });

  // Resource Management routes

  // User Capacity Management
  app.get('/api/users/:id/capacity', isAuthenticated, async (req, res) => {
    try {
      const capacity = await db
        .select()
        .from(userCapacity)
        .where(eq(userCapacity.userId, req.params.id))
        .orderBy(desc(userCapacity.effectiveFrom));
      res.json(capacity);
    } catch (error) {
      console.error("Error fetching user capacity:", error);
      res.status(500).json({ message: "Failed to fetch user capacity" });
    }
  });

  app.post('/api/users/:id/capacity', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertUserCapacitySchema.parse({
        ...req.body,
        userId: req.params.id,
      });
      const capacity = await db.insert(userCapacity).values(validatedData).returning();
      res.status(201).json(capacity[0]);
    } catch (error) {
      console.error("Error creating user capacity:", error);
      res.status(400).json({ message: "Failed to create user capacity" });
    }
  });

  // User Availability Management
  app.get('/api/users/:id/availability', isAuthenticated, async (req, res) => {
    try {
      const availability = await db
        .select()
        .from(userAvailability)
        .where(eq(userAvailability.userId, req.params.id))
        .orderBy(desc(userAvailability.startDate));
      res.json(availability);
    } catch (error) {
      console.error("Error fetching user availability:", error);
      res.status(500).json({ message: "Failed to fetch user availability" });
    }
  });

  app.post('/api/users/:id/availability', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertUserAvailabilitySchema.parse({
        ...req.body,
        userId: req.params.id,
        approvedBy: req.user.role === 'admin' || req.user.role === 'manager' ? req.user.id : null,
        approvedAt: req.user.role === 'admin' || req.user.role === 'manager' ? new Date() : null,
      });
      const availability = await db.insert(userAvailability).values(validatedData).returning();
      res.status(201).json(availability[0]);
    } catch (error) {
      console.error("Error creating user availability:", error);
      res.status(400).json({ message: "Failed to create user availability" });
    }
  });

  // User Skills Management
  app.get('/api/users/:id/skills', isAuthenticated, async (req, res) => {
    try {
      const skills = await db
        .select()
        .from(userSkills)
        .where(eq(userSkills.userId, req.params.id))
        .orderBy(desc(userSkills.proficiencyLevel));
      res.json(skills);
    } catch (error) {
      console.error("Error fetching user skills:", error);
      res.status(500).json({ message: "Failed to fetch user skills" });
    }
  });

  app.post('/api/users/:id/skills', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertUserSkillsSchema.parse({
        ...req.body,
        userId: req.params.id,
      });
      const skill = await db.insert(userSkills).values(validatedData).returning();
      res.status(201).json(skill[0]);
    } catch (error) {
      console.error("Error creating user skill:", error);
      res.status(400).json({ message: "Failed to create user skill" });
    }
  });

  app.delete('/api/users/:userId/skills/:skillId', isAuthenticated, async (req, res) => {
    try {
      await db
        .delete(userSkills)
        .where(and(eq(userSkills.id, req.params.skillId), eq(userSkills.userId, req.params.userId)));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user skill:", error);
      res.status(500).json({ message: "Failed to delete user skill" });
    }
  });

  // Workload and Utilization
  app.get('/api/users/:id/workload', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const workload = await calculateUserWorkload(req.params.id, start, end);
      res.json(workload);
    } catch (error) {
      console.error("Error calculating user workload:", error);
      res.status(500).json({ message: "Failed to calculate user workload" });
    }
  });

  app.get('/api/team/utilization', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { startDate, endDate, teamUserIds } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const userIds = teamUserIds ? (teamUserIds as string).split(',') : undefined;

      const utilization = await calculateTeamUtilization(start, end, userIds);
      res.json(utilization);
    } catch (error) {
      console.error("Error calculating team utilization:", error);
      res.status(500).json({ message: "Failed to calculate team utilization" });
    }
  });

  // All workloads endpoint
  app.get('/api/workloads', isAuthenticated, async (req, res) => {
    try {
      const { timeRange } = req.query;

      // Get all active users
      const allUsers = await db.select().from(users).where(eq(users.isActive, true));

      // Calculate workload for each user
      const workloads = await Promise.all(
        allUsers.map(async (user) => {
          const start = new Date();
          const end = new Date();

          switch (timeRange) {
            case 'week':
              start.setDate(start.getDate() - 7);
              break;
            case 'month':
              start.setMonth(start.getMonth() - 1);
              break;
            case 'quarter':
              start.setMonth(start.getMonth() - 3);
              break;
            default:
              start.setDate(start.getDate() - 7);
          }

          return await calculateUserWorkload(user.id, start, end);
        })
      );

      res.json(workloads);
    } catch (error) {
      console.error("Error calculating workloads:", error);
      res.status(500).json({ message: "Failed to calculate workloads" });
    }
  });

  // Resource Allocation Management
  app.get('/api/resource-allocations', isAuthenticated, async (req, res) => {
    try {
      const { userId, projectId, status } = req.query;
      let query = db.select().from(resourceAllocations);

      const conditions = [];
      if (userId) conditions.push(eq(resourceAllocations.userId, userId as string));
      if (projectId) conditions.push(eq(resourceAllocations.projectId, projectId as string));
      if (status) conditions.push(eq(resourceAllocations.status, status as string));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allocations = await query.orderBy(desc(resourceAllocations.startDate));
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching resource allocations:", error);
      res.status(500).json({ message: "Failed to fetch resource allocations" });
    }
  });

  app.post('/api/resource-allocations', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertResourceAllocationSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const allocation = await storage.createResourceAllocation(validatedData);
      res.status(201).json(allocation);
    } catch (error) {
      console.error("Error creating resource allocation:", error);
      res.status(400).json({ message: "Failed to create resource allocation" });
    }
  });

  app.put('/api/resource-allocations/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertResourceAllocationSchema.parse(req.body);
      const allocation = await db
        .update(resourceAllocations)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(resourceAllocations.id, req.params.id))
        .returning();

      if (allocation.length === 0) {
        return res.status(404).json({ message: "Resource allocation not found" });
      }

      res.json(allocation[0]);
    } catch (error) {
      console.error("Error updating resource allocation:", error);
      res.status(400).json({ message: "Failed to update resource allocation" });
    }
  });

  app.delete('/api/resource-allocations/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      await storage.deleteResourceAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resource allocation:", error);
      res.status(500).json({ message: "Failed to delete resource allocation" });
    }
  });

  // Budget Categories Management
  app.get('/api/budget-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(budgetCategories)
        .where(eq(budgetCategories.isActive, true))
        .orderBy(budgetCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching budget categories:", error);
      res.status(500).json({ message: "Failed to fetch budget categories" });
    }
  });

  app.post('/api/budget-categories', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertBudgetCategorySchema.parse(req.body);
      const category = await storage.createBudgetCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating budget category:", error);
      res.status(400).json({ message: "Failed to create budget category" });
    }
  });

  // Project Budget Management
  app.get('/api/projects/:id/budgets', isAuthenticated, async (req, res) => {
    try {
      const budgets = await db
        .select({
          id: projectBudgets.id,
          budgetedAmount: projectBudgets.budgetedAmount,
          spentAmount: projectBudgets.spentAmount,
          committedAmount: projectBudgets.committedAmount,
          forecastAmount: projectBudgets.forecastAmount,
          notes: projectBudgets.notes,
          categoryId: projectBudgets.categoryId,
          categoryName: budgetCategories.name,
          categoryType: budgetCategories.categoryType,
        })
        .from(projectBudgets)
        .leftJoin(budgetCategories, eq(projectBudgets.categoryId, budgetCategories.id))
        .where(eq(projectBudgets.projectId, req.params.id));
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching project budgets:", error);
      res.status(500).json({ message: "Failed to fetch project budgets" });
    }
  });

  app.post('/api/projects/:id/budgets', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProjectBudgetSchema.parse({
        ...req.body,
        projectId: req.params.id,
      });
      const budget = await storage.createProjectBudget(validatedData);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating project budget:", error);
      res.status(400).json({ message: "Failed to create project budget" });
    }
  });

  // Budget Summary
  app.get('/api/budget/summary', isAuthenticated, async (req, res) => {
    try {
      // Get all projects
      const allProjects = await db.select().from(projects);
      
      // Get all project budgets
      const allBudgets = await db.select().from(projectBudgets);
      
      // Get all invoices for revenue calculation
      const allInvoices = await db.select().from(invoices);
      
      // Calculate budget summary
      const totalBudget = allBudgets.reduce((sum, budget) => {
        return sum + parseFloat(budget.budgetedAmount || '0');
      }, 0);
      
      const totalSpent = allBudgets.reduce((sum, budget) => {
        return sum + parseFloat(budget.spentAmount || '0');
      }, 0);
      
      const totalRevenue = allInvoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => {
          return sum + parseFloat(invoice.total || '0');
        }, 0);
      
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpent) / totalRevenue) * 100 : 0;
      
      const activeProjects = allProjects.filter(project => project.status === 'active').length;
      
      const overBudgetProjects = allBudgets.filter(budget => {
        const budgeted = parseFloat(budget.budgetedAmount || '0');
        const spent = parseFloat(budget.spentAmount || '0');
        return spent > budgeted && budgeted > 0;
      }).length;
      
      const budgetSummary = {
        totalBudget,
        totalSpent,
        totalRevenue,
        profitMargin,
        activeProjects,
        overBudgetProjects
      };
      
      res.json(budgetSummary);
    } catch (error) {
      console.error("Error fetching budget summary:", error);
      res.status(500).json({ message: "Failed to fetch budget summary" });
    }
  });

  // Workload Snapshots
  app.get('/api/workload-snapshots', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      let query = db.select().from(workloadSnapshots);

      const conditions = [];
      if (userId) conditions.push(eq(workloadSnapshots.userId, userId as string));
      if (startDate && endDate) {
        conditions.push(
          and(
            sql`${workloadSnapshots.snapshotDate} >= ${new Date(startDate as string)}`,
            sql`${workloadSnapshots.snapshotDate} <= ${new Date(endDate as string)}`
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const snapshots = await query.orderBy(desc(workloadSnapshots.snapshotDate));
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching workload snapshots:", error);
      res.status(500).json({ message: "Failed to fetch workload snapshots" });
    }
  });

  app.post('/api/workload-snapshots/generate', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { snapshotDate } = req.body;
      const date = snapshotDate ? new Date(snapshotDate) : new Date();

      await generateTeamWorkloadSnapshots(date);
      res.json({ message: "Workload snapshots generated successfully", snapshotDate: date });
    } catch (error) {
      console.error("Error generating workload snapshots:", error);
      res.status(500).json({ message: "Failed to generate workload snapshots" });
    }
  });

  // Resource Optimization
  app.post('/api/projects/:id/optimize-resources', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { requiredSkills, estimatedHours, startDate, endDate } = req.body;

      if (!requiredSkills || !estimatedHours || !startDate || !endDate) {
        return res.status(400).json({
          message: "Required fields: requiredSkills, estimatedHours, startDate, endDate"
        });
      }

      const suggestions = await findOptimalResourceAllocations(
        req.params.id,
        requiredSkills,
        estimatedHours,
        new Date(startDate),
        new Date(endDate)
      );

      res.json(suggestions);
    } catch (error) {
      console.error("Error finding optimal resource allocations:", error);
      res.status(500).json({ message: "Failed to find optimal resource allocations" });
    }
  });

  // Financial routes
  app.get('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.get('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.put('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: "Failed to create expense" });
    }
  });

  app.get('/api/expenses/:id', isAuthenticated, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.put('/api/expenses/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validatedData);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(400).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/expenses/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Knowledge routes
  app.get('/api/knowledge', isAuthenticated, async (req, res) => {
    try {
      const articles = await storage.getKnowledgeArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching knowledge articles:", error);
      res.status(500).json({ message: "Failed to fetch knowledge articles" });
    }
  });

  app.get('/api/knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      const article = await storage.getKnowledgeArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Knowledge article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching knowledge article:", error);
      res.status(500).json({ message: "Failed to fetch knowledge article" });
    }
  });

  app.post('/api/knowledge', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertKnowledgeArticleSchema.parse(req.body);
      const article = await storage.createKnowledgeArticle(validatedData);
      res.status(201).json(article);
    } catch (error) {
      console.error("Error creating knowledge article:", error);
      res.status(400).json({ message: "Failed to create knowledge article" });
    }
  });

  app.put('/api/knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertKnowledgeArticleSchema.partial().parse(req.body);
      const article = await storage.updateKnowledgeArticle(req.params.id, validatedData);
      res.json(article);
    } catch (error) {
      console.error("Error updating knowledge article:", error);
      res.status(400).json({ message: "Failed to update knowledge article" });
    }
  });

  app.delete('/api/knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteKnowledgeArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge article:", error);
      res.status(500).json({ message: "Failed to delete knowledge article" });
    }
  });

  // Marketing routes
  app.get('/api/marketing/campaigns', isAuthenticated, async (req, res) => {
    try {
      const campaigns = await storage.getMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching marketing campaigns:", error);
      res.status(500).json({ message: "Failed to fetch marketing campaigns" });
    }
  });

  app.post('/api/marketing/campaigns', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMarketingCampaignSchema.parse(req.body);
      const campaign = await storage.createMarketingCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating marketing campaign:", error);
      res.status(400).json({ message: "Failed to create marketing campaign" });
    }
  });

  // Support routes
  app.get('/api/support/tickets', isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.post('/api/support/tickets', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSupportTicketSchema.parse(req.body);
      const ticket = await storage.createSupportTicket(validatedData);

      // Send notification to third-party integrations
      try {
        await integrationManager.notifyTicketEvent(ticket, 'created');
      } catch (notificationError) {
        console.error('Failed to send ticket creation notification:', notificationError);
        // Don't fail the ticket creation if notifications fail
      }

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(400).json({ message: "Failed to create support ticket" });
    }
  });

  app.get('/api/support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      res.status(500).json({ message: "Failed to fetch support ticket" });
    }
  });

  app.put('/api/support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      // Use secure validation schema that excludes system fields
      const validatedData = updateSupportTicketSchema.parse(req.body);
      const ticket = await storage.updateSupportTicket(req.params.id, validatedData);

      // Send notification to third-party integrations for significant updates
      try {
        const notificationType = ticket.status === 'resolved' ? 'resolved' : 'updated';
        await integrationManager.notifyTicketEvent(ticket, notificationType);
      } catch (notificationError) {
        console.error('Failed to send ticket update notification:', notificationError);
        // Don't fail the ticket update if notifications fail
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error updating support ticket:", error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: "Invalid ticket data", details: error.message });
      } else {
        res.status(400).json({ message: "Failed to update support ticket" });
      }
    }
  });

  // DELETE operation requires admin or manager role
  app.delete('/api/support/tickets/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      await storage.deleteSupportTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting support ticket:", error);
      res.status(500).json({ message: "Failed to delete support ticket" });
    }
  });

  // Support ticket comments routes
  app.get('/api/support/tickets/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getSupportTicketComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ message: "Failed to fetch ticket comments" });
    }
  });

  app.post('/api/support/tickets/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comment = await storage.createSupportTicketComment({
        ...req.body,
        ticketId: req.params.id,
        userId: req.user.id
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating ticket comment:", error);
      res.status(400).json({ message: "Failed to create ticket comment" });
    }
  });

  app.put('/api/support/comments/:id', isAuthenticated, async (req, res) => {
    try {
      const comment = await storage.updateSupportTicketComment(req.params.id, req.body);
      res.json(comment);
    } catch (error) {
      console.error("Error updating ticket comment:", error);
      res.status(400).json({ message: "Failed to update ticket comment" });
    }
  });

  app.delete('/api/support/comments/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      await storage.deleteSupportTicketComment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket comment:", error);
      res.status(500).json({ message: "Failed to delete ticket comment" });
    }
  });

  // SLA configuration routes
  app.get('/api/support/sla-configs', isAuthenticated, async (req, res) => {
    try {
      const configs = await storage.getSlaConfigurations();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching SLA configurations:", error);
      res.status(500).json({ message: "Failed to fetch SLA configurations" });
    }
  });

  app.post('/api/support/sla-configs', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const config = await storage.createSlaConfiguration({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating SLA configuration:", error);
      res.status(400).json({ message: "Failed to create SLA configuration" });
    }
  });

  app.put('/api/support/sla-configs/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const config = await storage.updateSlaConfiguration(req.params.id, req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating SLA configuration:", error);
      res.status(400).json({ message: "Failed to update SLA configuration" });
    }
  });

  app.delete('/api/support/sla-configs/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      await storage.deleteSlaConfiguration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting SLA configuration:", error);
      res.status(500).json({ message: "Failed to delete SLA configuration" });
    }
  });

  // Support escalation routes
  app.get('/api/support/tickets/:id/escalations', isAuthenticated, async (req, res) => {
    try {
      const escalations = await storage.getTicketEscalations(req.params.id);
      res.json(escalations);
    } catch (error) {
      console.error("Error fetching ticket escalations:", error);
      res.status(500).json({ message: "Failed to fetch ticket escalations" });
    }
  });

  app.post('/api/support/tickets/:id/escalate', requireRole(['admin', 'manager', 'employee']), async (req, res) => {
    try {
      const { escalationService } = await import('./escalationService');
      const { toUserId, reason, level } = req.body;

      const escalation = await escalationService.escalateTicket(
        req.params.id,
        req.user.id,
        toUserId,
        reason,
        level
      );

      res.status(201).json(escalation);
    } catch (error) {
      console.error("Error escalating ticket:", error);
      res.status(400).json({ message: error.message || "Failed to escalate ticket" });
    }
  });

  // Support analytics routes
  app.get('/api/support/analytics/overdue', isAuthenticated, async (req, res) => {
    try {
      const overdueTickets = await storage.getOverdueTickets();
      res.json(overdueTickets);
    } catch (error) {
      console.error("Error fetching overdue tickets:", error);
      res.status(500).json({ message: "Failed to fetch overdue tickets" });
    }
  });

  app.get('/api/support/analytics/escalation-status', isAuthenticated, async (req, res) => {
    try {
      const { escalationService } = await import('./escalationService');
      const status = await escalationService.getEscalationStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching escalation status:", error);
      res.status(500).json({ message: "Failed to fetch escalation status" });
    }
  });

  app.post('/api/support/analytics/process-escalations', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { escalationService } = await import('./escalationService');
      const results = await escalationService.processEscalations();
      res.json({
        message: `Processed ${results.length} escalations`,
        results
      });
    } catch (error) {
      console.error("Error processing escalations:", error);
      res.status(500).json({ message: "Failed to process escalations" });
    }
  });

  // Enhanced support analytics routes
  app.get('/api/support/analytics/dashboard', isAuthenticated, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const analytics = await storage.getSupportAnalytics({ start: startDate, end: endDate });
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching support analytics:", error);
      res.status(500).json({ message: "Failed to fetch support analytics" });
    }
  });

  app.get('/api/support/analytics/agent-performance', isAuthenticated, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const performance = await storage.getAgentPerformanceMetrics({ start: startDate, end: endDate });
      res.json(performance);
    } catch (error) {
      console.error("Error fetching agent performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch agent performance metrics" });
    }
  });

  app.get('/api/support/analytics/trends', isAuthenticated, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const trends = await storage.getSupportTrends({ start: startDate, end: endDate });
      res.json(trends);
    } catch (error) {
      console.error("Error fetching support trends:", error);
      res.status(500).json({ message: "Failed to fetch support trends" });
    }
  });

  app.get('/api/support/analytics/volume-by-category', isAuthenticated, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const volumeData = await storage.getTicketVolumeByCategory({ start: startDate, end: endDate });
      res.json(volumeData);
    } catch (error) {
      console.error("Error fetching ticket volume by category:", error);
      res.status(500).json({ message: "Failed to fetch ticket volume by category" });
    }
  });

  app.get('/api/support/analytics/response-times', isAuthenticated, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const metrics = await storage.getResponseTimeMetrics({ start: startDate, end: endDate });
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching response time metrics:", error);
      res.status(500).json({ message: "Failed to fetch response time metrics" });
    }
  });

  app.get('/api/support/analytics/sla-compliance', isAuthenticated, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const report = await storage.getSLAComplianceReport({ start: startDate, end: endDate });
      res.json(report);
    } catch (error) {
      console.error("Error fetching SLA compliance report:", error);
      res.status(500).json({ message: "Failed to fetch SLA compliance report" });
    }
  });

  // Time tracking endpoints
  app.get('/api/time-entries', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, projectId, userId } = req.query;
      const timeEntries = await storage.getTimeEntries({
        startDate: startDate as string,
        endDate: endDate as string,
        projectId: projectId as string,
        userId: userId as string,
      });
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get('/api/time-entries/today', isAuthenticated, async (req, res) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const timeEntries = await storage.getTimeEntries({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        userId: req.user?.id,
      });
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching today's time entries:", error);
      res.status(500).json({ message: "Failed to fetch today's time entries" });
    }
  });

  app.post('/api/time-entries', isAuthenticated, async (req, res) => {
    try {
      const timeEntryData = {
        ...req.body,
        userId: req.user?.id,
        date: new Date(req.body.date || new Date()),
      };

      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(400).json({ message: "Failed to create time entry" });
    }
  });

  app.put('/api/time-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const timeEntry = await storage.updateTimeEntry(req.params.id, req.body);
      res.json(timeEntry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(400).json({ message: "Failed to update time entry" });
    }
  });

  app.delete('/api/time-entries/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTimeEntry(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Time tracking analytics
  app.get('/api/time-analytics/productivity', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      const analytics = await storage.getTimeProductivityAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        userId: (userId as string) || req.user?.id,
      });
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching productivity analytics:", error);
      res.status(500).json({ message: "Failed to fetch productivity analytics" });
    }
  });

  // =============================================================================
  // INTEGRATION MANAGEMENT ENDPOINTS
  // =============================================================================

  // Integration configuration and status
  app.get('/api/integrations/status', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.json({
          overall: 'unhealthy',
          services: {
            slack: { status: 'disconnected', message: 'Integration manager not initialized' },
            github: { status: 'disconnected', message: 'Integration manager not initialized' },
            teams: { status: 'disconnected', message: 'Integration manager not initialized' }
          }
        });
      }

      const health = await integrationManager.getHealthStatus();
      res.json(health);
    } catch (error) {
      console.error('Error getting integration status:', error);
      res.status(500).json({ message: 'Failed to get integration status' });
    }
  });

  app.get('/api/integrations/stats', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.json({
          slack: { enabled: false, messagessSent: 0, status: 'disconnected' },
          github: { enabled: false, issuesCreated: 0, repositories: 0, status: 'disconnected' },
          teams: { enabled: false, messagessSent: 0, status: 'disconnected' }
        });
      }

      const stats = integrationManager.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting integration stats:', error);
      res.status(500).json({ message: 'Failed to get integration stats' });
    }
  });

  // Send test notifications
  app.post('/api/integrations/test/slack', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { message = 'Test message from Business Platform' } = req.body;
      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.status(503).json({ message: 'Integration manager not available' });
      }

      await integrationManager.sendAlert(message, 'info');
      res.json({ success: true, message: 'Test message sent to Slack' });
    } catch (error) {
      console.error('Error sending Slack test:', error);
      res.status(500).json({ message: 'Failed to send test message' });
    }
  });

  app.post('/api/integrations/test/teams', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { message = 'Test message from Business Platform' } = req.body;
      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.status(503).json({ message: 'Integration manager not available' });
      }

      await integrationManager.sendCrossplatformMessage('Test Notification', message, 'info');
      res.json({ success: true, message: 'Test message sent to Teams' });
    } catch (error) {
      console.error('Error sending Teams test:', error);
      res.status(500).json({ message: 'Failed to send test message' });
    }
  });

  app.post('/api/integrations/test/github', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { owner, repo } = req.body;

      if (!owner || !repo) {
        return res.status(400).json({ message: 'Owner and repo are required' });
      }

      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.status(503).json({ message: 'Integration manager not available' });
      }

      const data = await integrationManager.syncRepositoryData(owner, repo);
      res.json({ success: true, message: 'GitHub sync completed', data: {
        commits: data.commits.length,
        pullRequests: data.pullRequests.length,
        issues: data.issues.length
      }});
    } catch (error) {
      console.error('Error testing GitHub integration:', error);
      res.status(500).json({ message: 'Failed to test GitHub integration' });
    }
  });

  // GitHub-specific endpoints
  app.get('/api/integrations/github/repositories/:owner/:repo/commits', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { since } = req.query;

      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.status(503).json({ message: 'Integration manager not available' });
      }

      const sinceDate = since ? new Date(since as string) : undefined;
      const commits = await integrationManager.getCommitActivity(owner, repo, sinceDate);

      res.json(commits);
    } catch (error) {
      console.error('Error getting GitHub commits:', error);
      res.status(500).json({ message: 'Failed to get GitHub commits' });
    }
  });

  app.post('/api/integrations/github/repositories/:owner/:repo/create-project', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { owner, repo } = req.params;

      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.status(503).json({ message: 'Integration manager not available' });
      }

      const projectData = await integrationManager.createProjectFromRepository(owner, repo);

      if (projectData) {
        // Create the project in the database
        const [project] = await db
          .insert(projects)
          .values({
            ...projectData,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)
          .returning();

        res.json({ success: true, project });
      } else {
        res.status(500).json({ message: 'Failed to create project from repository' });
      }
    } catch (error) {
      console.error('Error creating project from GitHub repository:', error);
      res.status(500).json({ message: 'Failed to create project from repository' });
    }
  });

  // GitHub webhook handler
  app.post('/api/integrations/github/webhook', async (req, res) => {
    try {
      const event = req.headers['x-github-event'] as string;

      if (!event) {
        return res.status(400).json({ message: 'Missing GitHub event header' });
      }

      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        console.log('GitHub webhook received but integration manager not available');
        return res.status(200).json({ message: 'Webhook received' });
      }

      const processed = integrationManager.handleGitHubWebhook(event, req.body);

      if (processed) {
        console.log('GitHub webhook processed:', processed.type, processed.action);
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      console.error('Error handling GitHub webhook:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // Manual notification sending
  app.post('/api/integrations/notify/project', isAuthenticated, async (req, res) => {
    try {
      const { projectId, message, type } = req.body;

      if (!projectId || !message || !type) {
        return res.status(400).json({ message: 'Project ID, message, and type are required' });
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const integrationManager = (req.app as any).integrationManager;

      if (integrationManager) {
        await integrationManager.notifyProjectEvent(project, message, type);
        res.json({ success: true, message: 'Notifications sent' });
      } else {
        res.status(503).json({ message: 'Integration manager not available' });
      }
    } catch (error) {
      console.error('Error sending project notification:', error);
      res.status(500).json({ message: 'Failed to send notifications' });
    }
  });

  app.post('/api/integrations/notify/task', isAuthenticated, async (req, res) => {
    try {
      const { taskId, type } = req.body;

      if (!taskId || !type) {
        return res.status(400).json({ message: 'Task ID and type are required' });
      }

      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId || ''));

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, task.assignedTo || ''));

      const integrationManager = (req.app as any).integrationManager;

      if (integrationManager && project && user) {
        await integrationManager.notifyTaskEvent(task, project, user, type);
        res.json({ success: true, message: 'Notifications sent' });
      } else {
        res.status(503).json({ message: 'Integration manager not available or missing dependencies' });
      }
    } catch (error) {
      console.error('Error sending task notification:', error);
      res.status(500).json({ message: 'Failed to send notifications' });
    }
  });

  // Daily digest trigger
  app.post('/api/integrations/digest/send', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const integrationManager = (req.app as any).integrationManager;

      if (!integrationManager) {
        return res.status(503).json({ message: 'Integration manager not available' });
      }

      // Calculate digest stats
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const [completedTasks] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(
          eq(tasks.status, 'completed'),
          sql`${tasks.updatedAt} >= ${yesterday}`
        ));

      const [newProjects] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(sql`${projects.createdAt} >= ${yesterday}`);

      const [overdueItems] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(
          sql`${tasks.dueDate} < ${today}`,
          sql`${tasks.status} != 'completed'`
        ));

      const recentActivity = await db
        .select({
          title: tasks.title,
          project: projects.name,
          status: tasks.status
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(sql`${tasks.updatedAt} >= ${yesterday}`)
        .orderBy(desc(tasks.updatedAt))
        .limit(5);

      const teamActivity = recentActivity.map(item =>
        `• ${item.title} in ${item.project || 'Unknown'} - ${item.status}`
      );

      const stats = {
        completedTasks: completedTasks.count,
        newProjects: newProjects.count,
        overdueItems: overdueItems.count,
        teamActivity
      };

      await integrationManager.sendDailyDigest(stats);
      res.json({ success: true, message: 'Daily digest sent', stats });
    } catch (error) {
      console.error('Error sending daily digest:', error);
      res.status(500).json({ message: 'Failed to send daily digest' });
    }
  });

  // Health check and monitoring endpoints
  app.get('/health', healthCheckService.healthCheck.bind(healthCheckService));
  app.get('/health/ready', healthCheckService.readinessCheck.bind(healthCheckService));
  app.get('/health/live', healthCheckService.livenessCheck.bind(healthCheckService));
  app.get('/metrics', healthCheckService.metricsCheck.bind(healthCheckService));

  // Data export endpoints
  app.post('/api/exports', isAuthenticated, async (req, res) => {
    try {
      const { format, entities, dateRange, compressed } = req.body;

      const options = {
        format: format || 'json',
        entities: entities || ['all'],
        userId: req.user?.id,
        dateRange: dateRange ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        } : undefined,
        compressed: compressed || false
      };

      const result = await dataExporter.exportData(options);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ message: result.error || 'Export failed' });
      }
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'data_export',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Export request failed' });
    }
  });

  app.get('/api/exports', isAuthenticated, async (req, res) => {
    try {
      const exports = await dataExporter.listExports();
      res.json(exports);
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'list_exports',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to list exports' });
    }
  });

  app.get('/api/exports/download/:fileName', isAuthenticated, async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = dataExporter.getExportFilePath(fileName);

      // Verify file exists and is an export file
      if (!fileName.startsWith('export_')) {
        return res.status(403).json({ message: 'Access denied' });
      }

      try {
        await fs.promises.access(filePath);
      } catch {
        return res.status(404).json({ message: 'Export file not found' });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        sentryService.captureException(error, {
          feature: 'export_download',
          userId: req.user?.id,
          additionalData: { fileName }
        });
        if (!res.headersSent) {
          res.status(500).json({ message: 'Download failed' });
        }
      });

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'export_download',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Download failed' });
    }
  });

  // Backup management endpoints (admin only)
  app.post('/api/admin/backup/trigger', requireRole('admin'), async (req, res) => {
    try {
      const success = await backupScheduler.triggerManualBackup();
      if (success) {
        res.json({ message: 'Backup triggered successfully' });
      } else {
        res.status(500).json({ message: 'Backup failed' });
      }
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'manual_backup',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to trigger backup' });
    }
  });

  app.get('/api/admin/backup/status', requireRole('admin'), async (req, res) => {
    try {
      const status = backupScheduler.getStatus();
      res.json(status);
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'backup_status',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to get backup status' });
    }
  });

  app.post('/api/admin/backup/test', requireRole('admin'), async (req, res) => {
    try {
      const success = await backupScheduler.testBackup();
      res.json({ success, message: success ? 'Backup test passed' : 'Backup test failed' });
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'backup_test',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Backup test failed' });
    }
  });

  // SMTP connection test endpoint (admin only)
  app.post('/api/admin/smtp/test', requireRole('admin'), async (req, res) => {
    try {
      const result = await emailService.testConnection();
      if (result.success) {
        res.json({ success: true, message: 'SMTP connection test successful' });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'SMTP connection test failed', 
          error: result.error 
        });
      }
    } catch (error) {
      console.error('SMTP connection test error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'SMTP connection test failed', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Access Control Management (admin only)
  
  // Get current access control settings
  app.get('/api/admin/access-control/settings', requireRole('admin'), async (req, res) => {
    try {
      const settings = await accessControlService.getAllowedDomains();
      res.json(settings);
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_get_settings',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to retrieve access control settings' });
    }
  });

  // Update allowed domains
  app.post('/api/admin/access-control/domains', requireRole('admin'), async (req, res) => {
    try {
      // Validate request body with Zod
      const validation = accessControlDomainsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const { domains, requireDomain } = validation.data;
      
      // Normalize domains: lowercase, trim, deduplicate
      const normalizedDomains = [...new Set(
        domains.map(d => d.toLowerCase().trim()).filter(d => d.length > 0)
      )];

      const success = await accessControlService.setAllowedDomains(
        normalizedDomains,
        requireDomain
      );

      if (success) {
        res.json({ 
          message: 'Access control settings updated successfully', 
          domains: normalizedDomains, 
          requireDomain 
        });
      } else {
        res.status(500).json({ message: 'Failed to update access control settings' });
      }
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_update_domains',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to update access control settings' });
    }
  });

  // Get all invitations
  app.get('/api/admin/invitations', requireRole('admin'), async (req, res) => {
    try {
      const invitations = await accessControlService.getAllInvitations();
      res.json(invitations);
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_get_invitations',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to retrieve invitations' });
    }
  });

  // Create new invitation
  app.post('/api/admin/invitations', requireRole('admin'), async (req, res) => {
    try {
      // Validate request body with Zod
      const validation = createInvitationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const { email, role, expiresInDays, notes } = validation.data;

      // Additional security: only allow admin invitations if user is admin
      // (This is redundant since we already have requireRole('admin'), but explicit is better)
      if (role === 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Only administrators can create admin invitations' 
        });
      }

      const result = await accessControlService.createInvitation({
        email: email.toLowerCase().trim(),
        role,
        invitedBy: req.user?.id || '',
        expiresInDays,
        notes
      });

      res.status(201).json({
        message: 'Invitation created successfully',
        token: result.token,
        expiresAt: result.expiresAt,
        inviteUrl: `${req.protocol}://${req.get('host')}/api/login?invite=${result.token}`
      });
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_create_invitation',
        userId: req.user?.id
      });
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create invitation' 
      });
    }
  });

  // Revoke invitation
  app.delete('/api/admin/invitations/:token', requireRole('admin'), async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      await accessControlService.revokeInvitation(token);
      res.json({ message: 'Invitation revoked successfully' });
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_revoke_invitation',
        userId: req.user?.id
      });
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to revoke invitation' 
      });
    }
  });

  // Cleanup expired invitations
  app.post('/api/admin/invitations/cleanup', requireRole('admin'), async (req, res) => {
    try {
      const cleaned = await accessControlService.cleanupExpiredInvitations();
      res.json({ message: `Cleaned up ${cleaned} expired invitation(s)`, count: cleaned });
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_cleanup_invitations',
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Failed to cleanup expired invitations' });
    }
  });

  // API 404 handler - catch any unmatched /api routes before SPA fallback
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
