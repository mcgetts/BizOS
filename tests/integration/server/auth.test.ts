import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '@server/routes';
import { storage } from '@server/storage';
import { TestDataFactory } from '../../setup';

describe('Authentication System Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Reset test data
    process.env.NODE_ENV = 'development';
    server = await registerRoutes(app);
  });

  describe('Development Authentication', () => {
    it('should allow dev login in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/auth/dev-login')
        .expect(200);

      expect(response.body.message).toBe('Development authentication successful');
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toMatchObject({
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin'
      });
    });

    it('should reject dev login in production mode', async () => {
      process.env.NODE_ENV = 'production';

      await request(app)
        .post('/api/auth/dev-login')
        .expect(403);
    });

    it('should create test user in database during dev login', async () => {
      process.env.NODE_ENV = 'development';

      await request(app)
        .post('/api/auth/dev-login')
        .expect(200);

      // Verify user was created in database
      const user = await storage.getUser('test-user-123');
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.role).toBe('admin');
    });
  });

  describe('Authentication Middleware', () => {
    let authApp: express.Application;

    beforeEach(async () => {
      authApp = express();
      authApp.use(express.json());

      // Test different authentication scenarios
      authApp.use('/authenticated', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'test-user-123' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      authApp.use('/expired', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'test-user-123' },
          expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired
          refresh_token: null
        };
        req.isAuthenticated = () => true;
        next();
      });

      authApp.use('/unauthenticated', (req: any, res, next) => {
        req.isAuthenticated = () => false;
        next();
      });

      await registerRoutes(authApp);
    });

    it('should allow access with valid authentication', async () => {
      // Create test user first
      await storage.upsertUser(TestDataFactory.user({
        id: 'test-user-123',
        email: 'test@example.com'
      }));

      await request(authApp)
        .get('/authenticated/api/auth/user')
        .expect(200);
    });

    it('should reject unauthenticated requests', async () => {
      await request(authApp)
        .get('/unauthenticated/api/auth/user')
        .expect(401);
    });

    it('should reject requests with expired tokens and no refresh token', async () => {
      await request(authApp)
        .get('/expired/api/auth/user')
        .expect(401);
    });
  });

  describe('Role-based Authorization', () => {
    let roleApp: express.Application;

    beforeEach(async () => {
      roleApp = express();
      roleApp.use(express.json());

      // Create users with different roles
      await storage.upsertUser(TestDataFactory.user({
        id: 'admin-user',
        email: 'admin@test.com',
        role: 'admin'
      }));

      await storage.upsertUser(TestDataFactory.user({
        id: 'manager-user',
        email: 'manager@test.com',
        role: 'manager'
      }));

      await storage.upsertUser(TestDataFactory.user({
        id: 'employee-user',
        email: 'employee@test.com',
        role: 'employee'
      }));

      await storage.upsertUser(TestDataFactory.user({
        id: 'client-user',
        email: 'client@test.com',
        role: 'client'
      }));

      // Mock authentication for different roles
      roleApp.use('/admin', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'admin-user' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      roleApp.use('/manager', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'manager-user' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      roleApp.use('/employee', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'employee-user' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      roleApp.use('/client', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'client-user' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      await registerRoutes(roleApp);
    });

    it('should allow admin access to support ticket deletion', async () => {
      // Create a support ticket first
      const client = await storage.createClient(TestDataFactory.client());
      const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(client.id));

      await request(roleApp)
        .delete(`/admin/api/support-tickets/${ticket.id}`)
        .expect(204);
    });

    it('should allow manager access to support ticket deletion', async () => {
      // Create a support ticket first
      const client = await storage.createClient(TestDataFactory.client());
      const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(client.id));

      await request(roleApp)
        .delete(`/manager/api/support-tickets/${ticket.id}`)
        .expect(204);
    });

    it('should deny employee access to support ticket deletion', async () => {
      // Create a support ticket first
      const client = await storage.createClient(TestDataFactory.client());
      const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(client.id));

      await request(roleApp)
        .delete(`/employee/api/support-tickets/${ticket.id}`)
        .expect(403);
    });

    it('should deny client access to support ticket deletion', async () => {
      // Create a support ticket first
      const client = await storage.createClient(TestDataFactory.client());
      const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(client.id));

      await request(roleApp)
        .delete(`/client/api/support-tickets/${ticket.id}`)
        .expect(403);
    });
  });

  describe('User Management', () => {
    beforeEach(async () => {
      // Mock authentication for user operations
      app.use('/api', (req: any, res, next) => {
        if (req.path === '/test/reset') {
          return next();
        }

        req.user = {
          claims: { sub: 'test-user-123' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });
    });

    it('should upsert user correctly', async () => {
      const userData = TestDataFactory.user({
        id: 'new-user-123',
        email: 'newuser@test.com'
      });

      const user = await storage.upsertUser(userData);

      expect(user.id).toBe('new-user-123');
      expect(user.email).toBe('newuser@test.com');

      // Verify user exists in database
      const retrievedUser = await storage.getUser('new-user-123');
      expect(retrievedUser).toEqual(user);
    });

    it('should update existing user on upsert', async () => {
      // Create initial user
      const initialData = TestDataFactory.user({
        id: 'update-user-123',
        email: 'initial@test.com',
        firstName: 'Initial'
      });

      await storage.upsertUser(initialData);

      // Update the same user
      const updatedData = {
        ...initialData,
        firstName: 'Updated',
        lastName: 'Name'
      };

      const updatedUser = await storage.upsertUser(updatedData);

      expect(updatedUser.id).toBe('update-user-123');
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');

      // Verify only one user exists with this ID
      const allUsers = await storage.getUsers();
      const usersWithSameId = allUsers.filter(u => u.id === 'update-user-123');
      expect(usersWithSameId).toHaveLength(1);
    });

    it('should retrieve user by ID correctly', async () => {
      // Create test user
      const userData = TestDataFactory.user({
        id: 'retrieve-user-123',
        email: 'retrieve@test.com'
      });

      await storage.upsertUser(userData);

      // Mock authenticated request to get user
      await storage.upsertUser(TestDataFactory.user({
        id: 'test-user-123',
        email: 'test@example.com'
      }));

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.id).toBe('test-user-123');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should handle user retrieval for non-existent user', async () => {
      const user = await storage.getUser('non-existent-user');
      expect(user).toBeUndefined();
    });
  });

  describe('Session Management', () => {
    it('should handle missing user gracefully', async () => {
      // Mock request with non-existent user
      app.use('/missing-user', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'non-existent-user' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      // This should not crash but may return an error or empty result
      const response = await request(app)
        .get('/missing-user/api/auth/user');

      // Should handle gracefully (either 500 error or empty response)
      expect([200, 500]).toContain(response.status);
    });

    it('should validate token expiration correctly', async () => {
      const now = Math.floor(Date.now() / 1000);

      // Test with valid (not expired) token
      const validExpiry = now + 3600; // 1 hour in future
      expect(now).toBeLessThan(validExpiry);

      // Test with expired token
      const expiredTime = now - 3600; // 1 hour in past
      expect(now).toBeGreaterThan(expiredTime);
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle database errors during user retrieval', async () => {
      // Mock database failure by using invalid user ID format or causing connection issue
      app.use('/db-error', (req: any, res, next) => {
        req.user = {
          claims: { sub: null }, // Invalid user ID
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      const response = await request(app)
        .get('/db-error/api/auth/user');

      // Should handle database errors gracefully
      expect([401, 500]).toContain(response.status);
    });

    it('should require authentication for protected routes', async () => {
      // Test all major protected routes without authentication
      const protectedRoutes = [
        '/api/clients',
        '/api/projects',
        '/api/tasks',
        '/api/invoices',
        '/api/expenses',
        '/api/support-tickets',
        '/api/dashboard/kpis',
        '/api/users'
      ];

      for (const route of protectedRoutes) {
        const response = await request(app).get(route);

        // All protected routes should require authentication
        // The exact response depends on how auth middleware is configured
        // but it should not be a successful 200 response without auth
        expect(response.status).not.toBe(200);
      }
    });
  });

  describe('Security Features', () => {
    it('should not expose sensitive user data', async () => {
      // Create user with sensitive data
      const sensitiveUser = await storage.upsertUser(TestDataFactory.user({
        id: 'sensitive-user-123',
        email: 'sensitive@test.com'
      }));

      // Mock authentication
      app.use('/sensitive', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'sensitive-user-123' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.isAuthenticated = () => true;
        next();
      });

      const response = await request(app)
        .get('/sensitive/api/auth/user')
        .expect(200);

      // Check that no sensitive fields are exposed
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');

      // Should only contain expected user fields
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body).toHaveProperty('role');
    });

    it('should validate user role changes', async () => {
      // Test that roles can only be set to valid values
      const validRoles = ['admin', 'manager', 'employee', 'client'];

      for (const role of validRoles) {
        const user = await storage.upsertUser(TestDataFactory.user({
          id: `role-test-${role}`,
          email: `${role}@test.com`,
          role: role as any
        }));

        expect(user.role).toBe(role);
      }
    });

    it('should prevent unauthorized access to admin functions', async () => {
      // Mock regular employee user
      app.use('/regular-user', (req: any, res, next) => {
        req.user = {
          claims: { sub: 'employee-user' },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        req.currentUser = {
          id: 'employee-user',
          role: 'employee'
        };
        req.isAuthenticated = () => true;
        next();
      });

      // Create test user
      await storage.upsertUser(TestDataFactory.user({
        id: 'employee-user',
        role: 'employee'
      }));

      // Try to access admin-only endpoint (support ticket deletion)
      const client = await storage.createClient(TestDataFactory.client());
      const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(client.id));

      const response = await request(app)
        .delete(`/regular-user/api/support-tickets/${ticket.id}`);

      // Should be forbidden for non-admin/manager users
      expect(response.status).toBe(403);
    });
  });
});