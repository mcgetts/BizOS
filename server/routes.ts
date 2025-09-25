import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
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
  projectActivity,
  insertProjectTemplateSchema,
  insertTaskTemplateSchema,
  insertTaskDependencySchema,
  insertProjectCommentSchema,
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
import passport from "passport";

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
    await db.insert(opportunityActivityHistory).values({
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Test reset endpoint - must be BEFORE auth setup to bypass authentication
  app.get('/api/test/reset', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Test reset endpoint only available in development' });
    }

    try {
      // Clear all database tables in reverse dependency order to avoid foreign key constraints
      await db.delete(timeEntries);
      await db.delete(clientInteractions);
      await db.delete(supportTickets);
      await db.delete(marketingCampaigns);
      await db.delete(knowledgeArticles);
      await db.delete(documents);
      await db.delete(expenses);
      await db.delete(invoices);
      await db.delete(tasks);
      await db.delete(projects);
      await db.delete(salesOpportunities);
      await db.delete(clients);
      await db.delete(companies);
      // Note: Not clearing users table to keep authentication working
      
      res.json({ 
        message: 'Test data reset successfully', 
        cleared: [
          'timeEntries', 'clientInteractions', 'supportTickets', 
          'marketingCampaigns', 'knowledgeArticles', 'documents', 
          'expenses', 'invoices', 'tasks', 'projects', 'clients'
        ]
      });
    } catch (error) {
      console.error("Error resetting test data:", error);
      res.status(500).json({ message: "Failed to reset test data" });
    }
  });

  // Auth middleware
  await setupAuth(app);

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

      if (req.user.isLocal) {
        // Local authentication user
        userId = req.user.id;
        user = await storage.getUser(userId);
      } else {
        // OAuth authentication user
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      }

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

      if (!token) {
        return res.status(400).json({ message: 'Verification token required' });
      }

      // Find user by verification token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }

      // Update user as verified
      await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null
        })
        .where(eq(users.id, user.id));

      res.json({ message: 'Email verified successfully! You can now log in.' });

    } catch (error) {
      console.error('Email verification error:', error);
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

      let userId: string;
      if (req.user.isLocal) {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
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
      await wsManager.broadcastToAllUsers('create', 'client', client);

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
      await wsManager.broadcastDataChange('update', 'client', client, req.user?.id);

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
        await wsManager.broadcastDataChange('delete', 'client', { id: req.params.id, ...client }, req.user?.id);
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
      await wsManager.broadcastToAllUsers('create', 'company', company);

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
      await wsManager.broadcastDataChange('update', 'company', company, req.user?.id);

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
        await wsManager.broadcastDataChange('delete', 'company', { id: req.params.id, ...company }, req.user?.id);
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

  app.post('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      console.log('Creating opportunity - Request body:', JSON.stringify(req.body, null, 2));

      const validatedData = insertSalesOpportunitySchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));

      const opportunity = await storage.createSalesOpportunity(validatedData);
      console.log('Created opportunity:', JSON.stringify(opportunity, null, 2));

      // Log activity history
      await logActivityHistory(
        opportunity.id,
        'opportunity_created',
        `Opportunity "${opportunity.title}" was created`,
        (req as any).user.claims.sub
      );

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
      const userId = (req as any).user.claims.sub;

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
          // Check if automatic project creation is enabled
          const autoProjectCreation = await storage.getSystemVariable('auto_create_project_from_won_opportunity');
          const isEnabled = autoProjectCreation?.value === 'true' || autoProjectCreation?.value === true;
          console.log(`📋 Auto-project creation setting: ${autoProjectCreation ? `${autoProjectCreation.key}=${autoProjectCreation.value}` : 'NOT FOUND'} (enabled: ${isEnabled})`);

          if (!isEnabled) {
            console.log('📋 Automatic project creation is disabled via system configuration');
          } else {
          try {
            // Get the full opportunity data with relations
            const opportunityData = await db.select({
              id: salesOpportunities.id,
              title: salesOpportunities.title,
              companyId: salesOpportunities.companyId,
              contactId: salesOpportunities.contactId,
              assignedTo: salesOpportunities.assignedTo,
              value: salesOpportunities.value,
              priority: salesOpportunities.priority,
              company: {
                id: companies.id,
                name: companies.name,
              },
              contact: {
                id: clients.id,
                firstName: clients.firstName,
                lastName: clients.lastName,
              }
            })
            .from(salesOpportunities)
            .leftJoin(companies, eq(salesOpportunities.companyId, companies.id))
            .leftJoin(clients, eq(salesOpportunities.contactId, clients.id))
            .where(eq(salesOpportunities.id, req.params.id))
            .limit(1);

            if (opportunityData.length > 0) {
              const opp = opportunityData[0];

              // Create the project
              const projectData = {
                name: `${opp.title} - Delivery Project`,
                description: `Project created from won opportunity: ${opp.title}`,
                companyId: opp.companyId,
                clientId: opp.contactId,
                opportunityId: req.params.id,
                managerId: opp.assignedTo,
                status: "planning" as const,
                priority: opp.priority || "medium" as const,
                budget: opp.value ? opp.value.toString() : null,
                actualCost: "0",
                progress: 0,
                startDate: new Date(),
                tags: ["auto-created", "from-opportunity"]
              };

              const newProject = await db.insert(projects).values(projectData).returning();

              if (newProject.length > 0) {
                const project = newProject[0];

                // Log activity in the opportunity
                await logActivityHistory(
                  req.params.id,
                  'project_created',
                  `Automatically created project: "${project.name}" (${project.id})`,
                  userId
                );

                // Log activity in the new project
                await db.insert(projectActivity).values({
                  projectId: project.id,
                  action: 'project_created',
                  details: `Project automatically created from won opportunity: "${opp.title}"`,
                  performedBy: userId
                });

                // Broadcast the new project creation to all users
                await wsManager.broadcastToAllUsers('create', 'project', project);

                console.log(`✅ Auto-created project ${project.id} from won opportunity ${req.params.id}`);
              }
            }
          } catch (error) {
            console.error("Error auto-creating project from won opportunity:", error);
            // Don't fail the opportunity update if project creation fails
          }
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
          (req as any).user.claims.sub
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
      const validatedData = insertOpportunityNextStepSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
        createdBy: req.user.claims.sub,
      });
      const nextStep = await db.insert(opportunityNextSteps).values(validatedData).returning();

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'next_step_added',
        `Added next step: "${nextStep[0].title}"`,
        (req as any).user.claims.sub
      );

      res.status(201).json(nextStep[0]);
    } catch (error) {
      console.error("Error creating next step:", error);
      res.status(400).json({ message: "Failed to create next step" });
    }
  });

  app.put('/api/opportunities/:opportunityId/next-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateOpportunityNextStepSchema.parse(req.body);
      const nextStep = await db.update(opportunityNextSteps)
        .set(validatedData)
        .where(and(
          eq(opportunityNextSteps.id, req.params.id),
          eq(opportunityNextSteps.opportunityId, req.params.opportunityId)
        ))
        .returning();

      if (!nextStep.length) {
        return res.status(404).json({ message: "Next step not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'next_step_updated',
        `Updated next step: "${nextStep[0].title}"`,
        (req as any).user.claims.sub
      );

      res.json(nextStep[0]);
    } catch (error) {
      console.error("Error updating next step:", error);
      res.status(400).json({ message: "Failed to update next step" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/next-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const result = await db.delete(opportunityNextSteps)
        .where(and(
          eq(opportunityNextSteps.id, req.params.id),
          eq(opportunityNextSteps.opportunityId, req.params.opportunityId)
        ))
        .returning();
      
      if (!result.length) {
        return res.status(404).json({ message: "Next step not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'next_step_deleted',
        `Deleted next step: "${result[0].title}"`,
        (req as any).user.claims.sub
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
      const validatedData = insertOpportunityCommunicationSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
        recordedBy: req.user.claims.sub,
      });
      const communication = await db.insert(opportunityCommunications).values(validatedData).returning();

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'communication_logged',
        `Logged ${communication[0].type}: "${communication[0].subject || 'Communication'}"`,
        (req as any).user.claims.sub
      );

      res.status(201).json(communication[0]);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(400).json({ message: "Failed to create communication" });
    }
  });

  app.put('/api/opportunities/:opportunityId/communications/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateOpportunityCommunicationSchema.parse(req.body);
      const communication = await db.update(opportunityCommunications)
        .set(validatedData)
        .where(and(
          eq(opportunityCommunications.id, req.params.id),
          eq(opportunityCommunications.opportunityId, req.params.opportunityId)
        ))
        .returning();

      if (!communication.length) {
        return res.status(404).json({ message: "Communication not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'communication_updated',
        `Updated ${communication[0].type}: "${communication[0].subject || 'Communication'}"`,
        (req as any).user.claims.sub
      );

      res.json(communication[0]);
    } catch (error) {
      console.error("Error updating communication:", error);
      res.status(400).json({ message: "Failed to update communication" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/communications/:id', isAuthenticated, async (req, res) => {
    try {
      const result = await db.delete(opportunityCommunications)
        .where(and(
          eq(opportunityCommunications.id, req.params.id),
          eq(opportunityCommunications.opportunityId, req.params.opportunityId)
        ))
        .returning();
      
      if (!result.length) {
        return res.status(404).json({ message: "Communication not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'communication_deleted',
        `Deleted ${result[0].type}: "${result[0].subject || 'Communication'}"`,
        (req as any).user.claims.sub
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

        const { description, communicationId, isPublic } = req.body;

        const newAttachment = await db.insert(opportunityFileAttachments).values({
          opportunityId: req.params.opportunityId,
          communicationId: communicationId || null,
          fileName: req.file.filename,
          originalFileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          filePath: req.file.path,
          uploadedBy: req.user.claims.sub,
          description: description || null,
          isPublic: isPublic === 'true',
        }).returning();

        // Log activity history
        await logActivityHistory(
          req.params.opportunityId,
          'file_attached',
          `Uploaded file: "${req.file.originalname}"${communicationId ? ' to communication' : ''}`,
          req.user.claims.sub
        );

        res.status(201).json(newAttachment[0]);
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

      // Delete from database
      await db.delete(opportunityFileAttachments)
        .where(eq(opportunityFileAttachments.id, req.params.id));

      // Delete physical file
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'file_removed',
        `Deleted file: "${file.originalFileName}"`,
        (req as any).user.claims.sub
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
      const validatedData = insertOpportunityStakeholderSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
        createdBy: req.user.claims.sub,
      });
      const stakeholder = await db.insert(opportunityStakeholders).values(validatedData).returning();

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'stakeholder_added',
        `Added stakeholder: "${stakeholder[0].name}" (${stakeholder[0].role || 'Unknown role'})`,
        (req as any).user.claims.sub
      );

      res.status(201).json(stakeholder[0]);
    } catch (error) {
      console.error("Error creating stakeholder:", error);
      res.status(400).json({ message: "Failed to create stakeholder" });
    }
  });

  app.put('/api/opportunities/:opportunityId/stakeholders/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateOpportunityStakeholderSchema.parse(req.body);
      const stakeholder = await db.update(opportunityStakeholders)
        .set(validatedData)
        .where(and(
          eq(opportunityStakeholders.id, req.params.id),
          eq(opportunityStakeholders.opportunityId, req.params.opportunityId)
        ))
        .returning();

      if (!stakeholder.length) {
        return res.status(404).json({ message: "Stakeholder not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'stakeholder_updated',
        `Updated stakeholder: "${stakeholder[0].name}" (${stakeholder[0].role || 'Unknown role'})`,
        (req as any).user.claims.sub
      );

      res.json(stakeholder[0]);
    } catch (error) {
      console.error("Error updating stakeholder:", error);
      res.status(400).json({ message: "Failed to update stakeholder" });
    }
  });

  app.delete('/api/opportunities/:opportunityId/stakeholders/:id', isAuthenticated, async (req, res) => {
    try {
      const result = await db.delete(opportunityStakeholders)
        .where(and(
          eq(opportunityStakeholders.id, req.params.id),
          eq(opportunityStakeholders.opportunityId, req.params.opportunityId)
        ))
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: "Stakeholder not found or does not belong to this opportunity" });
      }

      // Log activity history
      await logActivityHistory(
        req.params.opportunityId,
        'stakeholder_deleted',
        `Deleted stakeholder: "${result[0].name}" (${result[0].role || 'Unknown role'})`,
        (req as any).user.claims.sub
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
      await wsManager.broadcastToAllUsers('create', 'project', project);

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);

      // Broadcast the update to all connected clients, excluding the current user
      await wsManager.broadcastDataChange('update', 'project', project, req.user?.id);

      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Get project data before deletion for broadcasting
      const project = await storage.getProject(req.params.id);
      await storage.deleteProject(req.params.id);

      // Broadcast the deletion to all connected clients, excluding the current user
      if (project) {
        await wsManager.broadcastDataChange('delete', 'project', { id: req.params.id, ...project }, req.user?.id);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
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
      await wsManager.broadcastToAllUsers('create', 'task', task);

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
        const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
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
      await wsManager.broadcastDataChange('update', 'task', task, req.user?.id);

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
          const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
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
        await wsManager.broadcastDataChange('delete', 'task', { id: req.params.id, ...task }, req.user?.id);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Project Template routes
  app.get('/api/project-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await db.select().from(projectTemplates).where(eq(projectTemplates.isActive, true));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ message: "Failed to fetch project templates" });
    }
  });

  app.get('/api/project-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const template = await db.select().from(projectTemplates)
        .where(eq(projectTemplates.id, req.params.id))
        .limit(1);

      if (!template.length) {
        return res.status(404).json({ message: "Project template not found" });
      }

      const tasks = await db.select().from(taskTemplates)
        .where(eq(taskTemplates.projectTemplateId, req.params.id));

      res.json({ ...template[0], taskTemplates: tasks });
    } catch (error) {
      console.error("Error fetching project template:", error);
      res.status(500).json({ message: "Failed to fetch project template" });
    }
  });

  app.post('/api/project-templates', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProjectTemplateSchema.parse(req.body);
      const template = await db.insert(projectTemplates).values({
        ...validatedData,
        createdBy: req.user.id,
      }).returning();

      res.status(201).json(template[0]);
    } catch (error) {
      console.error("Error creating project template:", error);
      res.status(400).json({ message: "Failed to create project template" });
    }
  });

  app.put('/api/project-templates/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProjectTemplateSchema.parse(req.body);
      const result = await db.update(projectTemplates)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(projectTemplates.id, req.params.id))
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: "Project template not found" });
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Error updating project template:", error);
      res.status(400).json({ message: "Failed to update project template" });
    }
  });

  app.delete('/api/project-templates/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const result = await db.delete(projectTemplates)
        .where(eq(projectTemplates.id, req.params.id))
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: "Project template not found" });
      }

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
      const template = await db.select().from(projectTemplates)
        .where(eq(projectTemplates.id, templateId))
        .limit(1);

      if (!template.length) {
        return res.status(404).json({ message: "Project template not found" });
      }

      const taskTemplatesList = await db.select().from(taskTemplates)
        .where(eq(taskTemplates.projectTemplateId, templateId));

      // Create project from template
      const newProject = await db.insert(projects).values({
        ...validatedData,
        budget: validatedData.budget || template[0].defaultBudget,
        priority: validatedData.priority || template[0].defaultPriority,
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
      const dependencies = await db.select().from(taskDependencies)
        .where(eq(taskDependencies.taskId, req.params.id));
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching task dependencies:", error);
      res.status(500).json({ message: "Failed to fetch task dependencies" });
    }
  });

  app.get('/api/task-dependencies', isAuthenticated, async (req, res) => {
    try {
      const dependencies = await db.select().from(taskDependencies);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching task dependencies:", error);
      res.status(500).json({ message: "Failed to fetch task dependencies" });
    }
  });

  app.post('/api/task-dependencies', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTaskDependencySchema.parse(req.body);
      const dependency = await db.insert(taskDependencies).values(validatedData).returning();
      res.status(201).json(dependency[0]);
    } catch (error) {
      console.error("Error creating task dependency:", error);
      res.status(400).json({ message: "Failed to create task dependency" });
    }
  });

  app.delete('/api/task-dependencies/:id', isAuthenticated, async (req, res) => {
    try {
      await db.delete(taskDependencies).where(eq(taskDependencies.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task dependency:", error);
      res.status(500).json({ message: "Failed to delete task dependency" });
    }
  });

  // Project Comments routes
  app.get('/api/projects/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comments = await db.select().from(projectComments)
        .where(eq(projectComments.projectId, req.params.id))
        .orderBy(desc(projectComments.createdAt));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching project comments:", error);
      res.status(500).json({ message: "Failed to fetch project comments" });
    }
  });

  app.post('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProjectCommentSchema.parse(req.body);
      const comment = await db.insert(projectComments).values({
        ...validatedData,
        projectId: req.params.id,
        userId: req.user.id,
      }).returning();

      // Log activity
      await db.insert(projectActivity).values({
        projectId: req.params.id,
        userId: req.user.id,
        action: 'comment_added',
        entityType: 'comment',
        entityId: comment[0].id,
        details: { content: validatedData.content.substring(0, 100) + '...' }
      });

      // Get project details for notifications
      const project = await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1);
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
            data: { projectId: req.params.id, commentId: comment[0].id, commentBy: currentUser.id }
          });
        }

        // Notify client/primary contact if available
        if (project[0].clientId && project[0].clientId !== currentUser.id) {
          notifications.push({
            userId: project[0].clientId,
            type: 'comment_added',
            title: 'Project Update',
            message: `New comment added to project ${project[0].name}`,
            data: { projectId: req.params.id, commentId: comment[0].id, commentBy: currentUser.id }
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
      const allocation = await db.insert(resourceAllocations).values(validatedData).returning();
      res.status(201).json(allocation[0]);
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
      await db.delete(resourceAllocations).where(eq(resourceAllocations.id, req.params.id));
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
      const category = await db.insert(budgetCategories).values(validatedData).returning();
      res.status(201).json(category[0]);
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
      const budget = await db.insert(projectBudgets).values(validatedData).returning();
      res.status(201).json(budget[0]);
    } catch (error) {
      console.error("Error creating project budget:", error);
      res.status(400).json({ message: "Failed to create project budget" });
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

  // API 404 handler - catch any unmatched /api routes before SPA fallback
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
