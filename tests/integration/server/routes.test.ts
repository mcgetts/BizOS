import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '@server/routes';
import { TestDataFactory } from '../../setup';
import { storage } from '@server/storage';

// Create test app
let app: express.Application;
let server: any;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Mock authentication middleware for testing
  app.use('/api', (req: any, res, next) => {
    if (req.path === '/test/reset' || req.path === '/auth/dev-login') {
      return next();
    }

    // Mock authenticated user for all other API routes
    req.user = {
      claims: {
        sub: 'test-user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    req.currentUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin'
    };

    req.isAuthenticated = () => true;
    next();
  });

  server = await registerRoutes(app);
});

describe('API Routes - Test Reset Endpoint', () => {
  it('should reset test data in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const response = await request(app)
      .get('/api/test/reset')
      .expect(200);

    expect(response.body.message).toBe('Test data reset successfully');
    expect(response.body.cleared).toContain('clients');
    expect(response.body.cleared).toContain('projects');

    process.env.NODE_ENV = originalEnv;
  });

  it('should reject reset in non-development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await request(app)
      .get('/api/test/reset')
      .expect(403);

    process.env.NODE_ENV = originalEnv;
  });
});

describe('API Routes - Authentication', () => {
  it('should get current user', async () => {
    // Ensure test user exists
    await storage.upsertUser(TestDataFactory.user({
      id: 'test-user-123',
      email: 'test@example.com'
    }));

    const response = await request(app)
      .get('/api/auth/user')
      .expect(200);

    expect(response.body.email).toBe('test@example.com');
    expect(response.body.id).toBe('test-user-123');
  });
});

describe('API Routes - Client CRUD Operations', () => {
  let testClient: any;

  beforeEach(async () => {
    // Clean database before each test
    await request(app).get('/api/test/reset');
  });

  it('should create a new client', async () => {
    const clientData = {
      name: 'Test Client Corp',
      email: 'client@testcorp.com',
      phone: '+1234567890',
      address: '123 Test Street',
      status: 'lead',
      notes: 'Test client for API testing'
    };

    const response = await request(app)
      .post('/api/clients')
      .send(clientData)
      .expect(201);

    expect(response.body).toMatchObject({
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      status: clientData.status
    });

    testClient = response.body;
  });

  it('should get all clients', async () => {
    // Create test client first
    await storage.createClient(TestDataFactory.client({ name: 'Test Client 1' }));
    await storage.createClient(TestDataFactory.client({ name: 'Test Client 2' }));

    const response = await request(app)
      .get('/api/clients')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('should get client by id', async () => {
    const client = await storage.createClient(TestDataFactory.client());

    const response = await request(app)
      .get(`/api/clients/${client.id}`)
      .expect(200);

    expect(response.body.id).toBe(client.id);
    expect(response.body.name).toBe(client.name);
  });

  it('should update client', async () => {
    const client = await storage.createClient(TestDataFactory.client());

    const updateData = {
      name: 'Updated Client Name',
      status: 'qualified'
    };

    const response = await request(app)
      .put(`/api/clients/${client.id}`)
      .send(updateData)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
    expect(response.body.status).toBe(updateData.status);
  });

  it('should delete client', async () => {
    const client = await storage.createClient(TestDataFactory.client());

    await request(app)
      .delete(`/api/clients/${client.id}`)
      .expect(204);

    // Verify deletion
    await request(app)
      .get(`/api/clients/${client.id}`)
      .expect(404);
  });

  it('should return 404 for non-existent client', async () => {
    await request(app)
      .get('/api/clients/non-existent-id')
      .expect(404);
  });

  it('should validate client creation data', async () => {
    const invalidData = {
      // Missing required name field
      email: 'invalid@example.com'
    };

    await request(app)
      .post('/api/clients')
      .send(invalidData)
      .expect(400);
  });
});

describe('API Routes - Project CRUD Operations', () => {
  let testClient: any;

  beforeEach(async () => {
    await request(app).get('/api/test/reset');
    testClient = await storage.createClient(TestDataFactory.client());
  });

  it('should create a new project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project',
      clientId: testClient.id,
      status: 'planning',
      budget: '15000.00',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
    };

    const response = await request(app)
      .post('/api/projects')
      .send(projectData)
      .expect(201);

    expect(response.body).toMatchObject({
      name: projectData.name,
      clientId: projectData.clientId,
      status: projectData.status,
      budget: projectData.budget
    });
  });

  it('should get all projects', async () => {
    await storage.createProject(TestDataFactory.project(testClient.id, { name: 'Project 1' }));
    await storage.createProject(TestDataFactory.project(testClient.id, { name: 'Project 2' }));

    const response = await request(app)
      .get('/api/projects')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle project with invalid client id', async () => {
    const projectData = {
      name: 'Invalid Project',
      description: 'Project with invalid client',
      clientId: 'non-existent-client-id',
      status: 'planning'
    };

    await request(app)
      .post('/api/projects')
      .send(projectData)
      .expect(400);
  });
});

describe('API Routes - Task CRUD Operations', () => {
  let testClient: any;
  let testProject: any;
  let testUser: any;

  beforeEach(async () => {
    await request(app).get('/api/test/reset');
    testClient = await storage.createClient(TestDataFactory.client());
    testProject = await storage.createProject(TestDataFactory.project(testClient.id));
    testUser = await storage.upsertUser(TestDataFactory.user());
  });

  it('should create a new task', async () => {
    const taskData = {
      title: 'Test Task',
      description: 'A test task',
      projectId: testProject.id,
      assigneeId: testUser.id,
      status: 'todo',
      priority: 'high',
      estimatedHours: '10.00',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await request(app)
      .post('/api/tasks')
      .send(taskData)
      .expect(201);

    expect(response.body).toMatchObject({
      title: taskData.title,
      projectId: taskData.projectId,
      assigneeId: taskData.assigneeId,
      status: taskData.status,
      priority: taskData.priority
    });
  });

  it('should update task status', async () => {
    const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));

    const updateData = {
      status: 'in_progress',
      actualHours: '2.00'
    };

    const response = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send(updateData)
      .expect(200);

    expect(response.body.status).toBe('in_progress');
    expect(response.body.actualHours).toBe('2.00');
  });
});

describe('API Routes - Financial Operations', () => {
  let testClient: any;
  let testProject: any;
  let testUser: any;

  beforeEach(async () => {
    await request(app).get('/api/test/reset');
    testClient = await storage.createClient(TestDataFactory.client());
    testProject = await storage.createProject(TestDataFactory.project(testClient.id));
    testUser = await storage.upsertUser(TestDataFactory.user());
  });

  describe('Invoice Operations', () => {
    it('should create a new invoice', async () => {
      const invoiceData = {
        clientId: testClient.id,
        projectId: testProject.id,
        amount: '2500.00',
        tax: '250.00',
        total: '2750.00',
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Test invoice for services'
      };

      const response = await request(app)
        .post('/api/invoices')
        .send(invoiceData)
        .expect(201);

      expect(response.body).toMatchObject({
        clientId: invoiceData.clientId,
        projectId: invoiceData.projectId,
        amount: invoiceData.amount,
        total: invoiceData.total,
        status: invoiceData.status
      });

      expect(response.body.invoiceNumber).toMatch(/^INV-/);
    });

    it('should get all invoices', async () => {
      await storage.createInvoice(TestDataFactory.invoice(testClient.id, testProject.id));
      await storage.createInvoice(TestDataFactory.invoice(testClient.id, testProject.id));

      const response = await request(app)
        .get('/api/invoices')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should update invoice status', async () => {
      const invoice = await storage.createInvoice(TestDataFactory.invoice(testClient.id, testProject.id));

      const response = await request(app)
        .put(`/api/invoices/${invoice.id}`)
        .send({ status: 'sent' })
        .expect(200);

      expect(response.body.status).toBe('sent');
    });
  });

  describe('Expense Operations', () => {
    it('should create a new expense', async () => {
      const expenseData = {
        description: 'Test office supplies',
        amount: '150.00',
        category: 'office_supplies',
        projectId: testProject.id,
        userId: testUser.id,
        status: 'pending',
        date: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/expenses')
        .send(expenseData)
        .expect(201);

      expect(response.body).toMatchObject({
        description: expenseData.description,
        amount: expenseData.amount,
        category: expenseData.category,
        status: expenseData.status
      });
    });

    it('should approve expense', async () => {
      const expense = await storage.createExpense(TestDataFactory.expense(testProject.id, testUser.id));

      const response = await request(app)
        .put(`/api/expenses/${expense.id}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.status).toBe('approved');
    });
  });
});

describe('API Routes - Support Operations', () => {
  let testClient: any;
  let testUser: any;

  beforeEach(async () => {
    await request(app).get('/api/test/reset');
    testClient = await storage.createClient(TestDataFactory.client());
    testUser = await storage.upsertUser(TestDataFactory.user());
  });

  it('should create support ticket', async () => {
    const ticketData = {
      title: 'Login Issues',
      description: 'User cannot log into the system',
      clientId: testClient.id,
      category: 'technical',
      priority: 'high'
    };

    const response = await request(app)
      .post('/api/support-tickets')
      .send(ticketData)
      .expect(201);

    expect(response.body).toMatchObject({
      title: ticketData.title,
      clientId: ticketData.clientId,
      category: ticketData.category,
      priority: ticketData.priority,
      status: 'open'
    });

    expect(response.body.ticketNumber).toMatch(/^ST-/);
  });

  it('should assign ticket to agent', async () => {
    const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));

    const response = await request(app)
      .put(`/api/support-tickets/${ticket.id}`)
      .send({
        assigneeId: testUser.id,
        status: 'in_progress'
      })
      .expect(200);

    expect(response.body.assigneeId).toBe(testUser.id);
    expect(response.body.status).toBe('in_progress');
  });

  it('should close ticket with rating', async () => {
    const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));

    const response = await request(app)
      .put(`/api/support-tickets/${ticket.id}`)
      .send({
        status: 'resolved',
        rating: 5,
        feedback: 'Great support!'
      })
      .expect(200);

    expect(response.body.status).toBe('resolved');
    expect(response.body.rating).toBe(5);
    expect(response.body.feedback).toBe('Great support!');
  });
});

describe('API Routes - Dashboard KPIs', () => {
  beforeEach(async () => {
    await request(app).get('/api/test/reset');

    // Create test data for KPIs
    const client = await storage.createClient(TestDataFactory.client());
    const project = await storage.createProject(TestDataFactory.project(client.id));
    const user = await storage.upsertUser(TestDataFactory.user());

    await storage.createInvoice(TestDataFactory.invoice(client.id, project.id, {
      status: 'paid',
      total: '5000.00'
    }));

    await storage.createTask(TestDataFactory.task(project.id, user.id));
  });

  it('should return dashboard KPIs', async () => {
    const response = await request(app)
      .get('/api/dashboard/kpis')
      .expect(200);

    expect(response.body).toHaveProperty('totalRevenue');
    expect(response.body).toHaveProperty('totalClients');
    expect(response.body).toHaveProperty('activeProjects');
    expect(response.body).toHaveProperty('teamMembers');

    expect(typeof response.body.totalRevenue).toBe('string');
    expect(typeof response.body.totalClients).toBe('number');
    expect(typeof response.body.activeProjects).toBe('number');
    expect(typeof response.body.teamMembers).toBe('number');

    expect(response.body.totalClients).toBeGreaterThan(0);
    expect(response.body.activeProjects).toBeGreaterThan(0);
    expect(response.body.teamMembers).toBeGreaterThan(0);
  });
});

describe('API Routes - Error Handling', () => {
  it('should handle validation errors properly', async () => {
    const invalidClientData = {
      // Missing required name field
      email: 'invalid@example.com'
    };

    const response = await request(app)
      .post('/api/clients')
      .send(invalidClientData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('should handle non-existent resource updates', async () => {
    await request(app)
      .put('/api/clients/non-existent-id')
      .send({ name: 'Updated Name' })
      .expect(400);
  });

  it('should handle database constraint violations', async () => {
    const projectWithInvalidClient = {
      name: 'Invalid Project',
      clientId: 'non-existent-client',
      status: 'planning'
    };

    await request(app)
      .post('/api/projects')
      .send(projectWithInvalidClient)
      .expect(400);
  });
});

describe('API Routes - Users', () => {
  beforeEach(async () => {
    await request(app).get('/api/test/reset');
    await storage.upsertUser(TestDataFactory.user({ email: 'user1@test.com' }));
    await storage.upsertUser(TestDataFactory.user({ email: 'user2@test.com' }));
  });

  it('should get all users', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });
});