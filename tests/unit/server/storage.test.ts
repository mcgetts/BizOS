import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '@server/storage';
import { TestDataFactory, assertDatabaseState } from '../../setup';

describe('Storage Layer - User Operations', () => {
  it('should create and retrieve a user', async () => {
    const userData = TestDataFactory.user({ email: 'user1@test.com' });

    const createdUser = await storage.upsertUser(userData);
    expect(createdUser).toBeDefined();
    expect(createdUser.email).toBe('user1@test.com');
    expect(createdUser.firstName).toBe('Test');
    expect(createdUser.lastName).toBe('User');

    const retrievedUser = await storage.getUser(createdUser.id);
    expect(retrievedUser).toEqual(createdUser);
  });

  it('should update existing user on upsert', async () => {
    const userData = TestDataFactory.user({ email: 'user2@test.com' });
    const createdUser = await storage.upsertUser(userData);

    // Update the same user
    const updatedData = { ...userData, firstName: 'Updated' };
    const updatedUser = await storage.upsertUser(updatedData);

    expect(updatedUser.id).toBe(createdUser.id);
    expect(updatedUser.firstName).toBe('Updated');
  });

  it('should get all users', async () => {
    await storage.upsertUser(TestDataFactory.user({ email: 'user1@test.com' }));
    await storage.upsertUser(TestDataFactory.user({ email: 'user2@test.com' }));

    const users = await storage.getUsers();
    expect(users.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Storage Layer - Client Operations', () => {
  it('should create, read, update, and delete clients', async () => {
    // Create
    const clientData = TestDataFactory.client({ name: 'Test Corp' });
    const createdClient = await storage.createClient(clientData);

    expect(createdClient).toBeDefined();
    expect(createdClient.name).toBe('Test Corp');
    expect(createdClient.status).toBe('lead');

    await assertDatabaseState({ clients: 1 });

    // Read
    const retrievedClient = await storage.getClient(createdClient.id);
    expect(retrievedClient).toEqual(createdClient);

    const allClients = await storage.getClients();
    expect(allClients).toHaveLength(1);

    // Update
    const updatedClient = await storage.updateClient(createdClient.id, {
      name: 'Updated Corp',
      status: 'qualified'
    });
    expect(updatedClient.name).toBe('Updated Corp');
    expect(updatedClient.status).toBe('qualified');

    // Delete
    await storage.deleteClient(createdClient.id);
    const deletedClient = await storage.getClient(createdClient.id);
    expect(deletedClient).toBeUndefined();

    await assertDatabaseState({ clients: 0 });
  });

  it('should handle client status transitions', async () => {
    const clientData = TestDataFactory.client({ status: 'lead' });
    const client = await storage.createClient(clientData);

    // Test valid status transitions
    const validStatuses = ['lead', 'qualified', 'proposal', 'client', 'inactive'];

    for (const status of validStatuses) {
      const updated = await storage.updateClient(client.id, { status: status as any });
      expect(updated.status).toBe(status);
    }
  });
});

describe('Storage Layer - Project Operations', () => {
  let testClient: any;

  beforeEach(async () => {
    testClient = await storage.createClient(TestDataFactory.client());
  });

  it('should create project with client relationship', async () => {
    const projectData = TestDataFactory.project(testClient.id);
    const project = await storage.createProject(projectData);

    expect(project.clientId).toBe(testClient.id);
    expect(project.status).toBe('planning');
    expect(project.budget).toBe('10000.00');

    await assertDatabaseState({ projects: 1 });
  });

  it('should get projects by client', async () => {
    const project1 = await storage.createProject(TestDataFactory.project(testClient.id, { name: 'Project 1' }));
    const project2 = await storage.createProject(TestDataFactory.project(testClient.id, { name: 'Project 2' }));

    const clientProjects = await storage.getProjectsByClient(testClient.id);
    expect(clientProjects).toHaveLength(2);
    expect(clientProjects.map(p => p.name)).toContain('Project 1');
    expect(clientProjects.map(p => p.name)).toContain('Project 2');
  });

  it('should cascade delete when client is deleted', async () => {
    await storage.createProject(TestDataFactory.project(testClient.id));
    await assertDatabaseState({ projects: 1 });

    await storage.deleteClient(testClient.id);
    await assertDatabaseState({ projects: 0, clients: 0 });
  });

  it('should handle project status transitions', async () => {
    const project = await storage.createProject(TestDataFactory.project(testClient.id));

    const validStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];

    for (const status of validStatuses) {
      const updated = await storage.updateProject(project.id, { status: status as any });
      expect(updated.status).toBe(status);
    }
  });
});

describe('Storage Layer - Task Operations', () => {
  let testClient: any;
  let testProject: any;
  let testUser: any;

  beforeEach(async () => {
    testClient = await storage.createClient(TestDataFactory.client());
    testProject = await storage.createProject(TestDataFactory.project(testClient.id));
    testUser = await storage.upsertUser(TestDataFactory.user());
  });

  it('should create task with project and assignee relationships', async () => {
    const taskData = TestDataFactory.task(testProject.id, testUser.id);
    const task = await storage.createTask(taskData);

    expect(task.projectId).toBe(testProject.id);
    expect(task.assigneeId).toBe(testUser.id);
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');

    await assertDatabaseState({ tasks: 1 });
  });

  it('should get tasks by project', async () => {
    await storage.createTask(TestDataFactory.task(testProject.id, undefined, { title: 'Task 1' }));
    await storage.createTask(TestDataFactory.task(testProject.id, undefined, { title: 'Task 2' }));

    const projectTasks = await storage.getTasksByProject(testProject.id);
    expect(projectTasks).toHaveLength(2);
  });

  it('should get tasks by user', async () => {
    await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, { title: 'User Task 1' }));
    await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, { title: 'User Task 2' }));

    const userTasks = await storage.getTasksByUser(testUser.id);
    expect(userTasks).toHaveLength(2);
  });

  it('should handle task status workflow', async () => {
    const task = await storage.createTask(TestDataFactory.task(testProject.id));

    const statusFlow = ['todo', 'in_progress', 'review', 'completed'];

    for (const status of statusFlow) {
      const updated = await storage.updateTask(task.id, { status: status as any });
      expect(updated.status).toBe(status);
    }
  });

  it('should track time correctly', async () => {
    const task = await storage.createTask(TestDataFactory.task(testProject.id, undefined, {
      estimatedHours: 10,
      actualHours: 0
    }));

    const updated = await storage.updateTask(task.id, { actualHours: '8.00' });
    expect(updated.actualHours).toBe('8.00');
    expect(updated.estimatedHours).toBe(10);
  });
});

describe('Storage Layer - Financial Operations', () => {
  let testClient: any;
  let testProject: any;
  let testUser: any;

  beforeEach(async () => {
    testClient = await storage.createClient(TestDataFactory.client());
    testProject = await storage.createProject(TestDataFactory.project(testClient.id));
    testUser = await storage.upsertUser(TestDataFactory.user());
  });

  describe('Invoice Operations', () => {
    it('should create invoice with proper calculations', async () => {
      const invoiceData = TestDataFactory.invoice(testClient.id, testProject.id, {
        amount: '1000.00',
        tax: '100.00',
        total: '1100.00'
      });

      const invoice = await storage.createInvoice(invoiceData);

      expect(invoice.clientId).toBe(testClient.id);
      expect(invoice.projectId).toBe(testProject.id);
      expect(invoice.amount).toBe('1000.00');
      expect(invoice.tax).toBe('100.00');
      expect(invoice.total).toBe('1100.00');
      expect(invoice.status).toBe('draft');
    });

    it('should handle invoice status workflow', async () => {
      const invoice = await storage.createInvoice(TestDataFactory.invoice(testClient.id));

      const statusFlow = ['draft', 'sent', 'paid', 'overdue'];

      for (const status of statusFlow) {
        const updated = await storage.updateInvoice(invoice.id, { status: status as any });
        expect(updated.status).toBe(status);
      }
    });

    it('should generate unique invoice numbers', async () => {
      const invoice1 = await storage.createInvoice(TestDataFactory.invoice(testClient.id));
      const invoice2 = await storage.createInvoice(TestDataFactory.invoice(testClient.id));

      expect(invoice1.invoiceNumber).not.toBe(invoice2.invoiceNumber);
      expect(invoice1.invoiceNumber).toMatch(/^INV-/);
      expect(invoice2.invoiceNumber).toMatch(/^INV-/);
    });
  });

  describe('Expense Operations', () => {
    it('should create expense with project and user relationships', async () => {
      const expenseData = TestDataFactory.expense(testProject.id, testUser.id);
      const expense = await storage.createExpense(expenseData);

      expect(expense.projectId).toBe(testProject.id);
      expect(expense.userId).toBe(testUser.id);
      expect(expense.status).toBe('pending');
      expect(expense.category).toBe('office_supplies');
      expect(expense.amount).toBe('100.00');
    });

    it('should handle expense status workflow', async () => {
      const expense = await storage.createExpense(TestDataFactory.expense(testProject.id, testUser.id));

      const statusFlow = ['pending', 'approved', 'reimbursed', 'rejected'];

      for (const status of statusFlow) {
        const updated = await storage.updateExpense(expense.id, { status: status as any });
        expect(updated.status).toBe(status);
      }
    });

    it('should handle different expense categories', async () => {
      const categories = ['travel', 'meals', 'office_supplies', 'software', 'marketing', 'other'];

      for (const category of categories) {
        const expense = await storage.createExpense(
          TestDataFactory.expense(testProject.id, testUser.id, { category: category as any })
        );
        expect(expense.category).toBe(category);
      }
    });
  });
});

describe('Storage Layer - Support Operations', () => {
  let testClient: any;
  let testUser: any;

  beforeEach(async () => {
    testClient = await storage.createClient(TestDataFactory.client());
    testUser = await storage.upsertUser(TestDataFactory.user());
  });

  it('should create support ticket with unique ticket number', async () => {
    const ticketData = TestDataFactory.supportTicket(testClient.id);
    const ticket = await storage.createSupportTicket(ticketData);

    expect(ticket.clientId).toBe(testClient.id);
    expect(ticket.ticketNumber).toMatch(/^ST-/);
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('medium');
    expect(ticket.category).toBe('technical');
  });

  it('should generate unique ticket numbers', async () => {
    const ticket1 = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));
    const ticket2 = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));

    expect(ticket1.ticketNumber).not.toBe(ticket2.ticketNumber);
    expect(ticket1.ticketNumber).toMatch(/^ST-\d+/);
    expect(ticket2.ticketNumber).toMatch(/^ST-\d+/);
  });

  it('should handle ticket status workflow', async () => {
    const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));

    const statusFlow = ['open', 'in_progress', 'resolved', 'closed'];

    for (const status of statusFlow) {
      const updated = await storage.updateSupportTicket(ticket.id, { status: status as any });
      expect(updated.status).toBe(status);
    }
  });

  it('should handle ticket assignment', async () => {
    const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));

    const assigned = await storage.updateSupportTicket(ticket.id, {
      assigneeId: testUser.id,
      status: 'in_progress'
    });

    expect(assigned.assigneeId).toBe(testUser.id);
    expect(assigned.status).toBe('in_progress');
  });

  it('should handle customer feedback and rating', async () => {
    const ticket = await storage.createSupportTicket(TestDataFactory.supportTicket(testClient.id));

    const withFeedback = await storage.updateSupportTicket(ticket.id, {
      status: 'resolved',
      rating: 5,
      feedback: 'Excellent support!'
    });

    expect(withFeedback.rating).toBe(5);
    expect(withFeedback.feedback).toBe('Excellent support!');
    expect(withFeedback.status).toBe('resolved');
  });
});

describe('Storage Layer - Dashboard KPIs', () => {
  let testClient: any;
  let testProject: any;
  let testUser: any;

  beforeEach(async () => {
    testClient = await storage.createClient(TestDataFactory.client());
    testProject = await storage.createProject(TestDataFactory.project(testClient.id));
    testUser = await storage.upsertUser(TestDataFactory.user());

    // Create some test data
    await storage.createInvoice(TestDataFactory.invoice(testClient.id, testProject.id, {
      amount: '1000.00',
      status: 'paid'
    }));
    await storage.createInvoice(TestDataFactory.invoice(testClient.id, testProject.id, {
      amount: '500.00',
      status: 'sent'
    }));
    await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));
  });

  it('should calculate dashboard KPIs correctly', async () => {
    const kpis = await storage.getDashboardKPIs();

    expect(kpis).toBeDefined();
    expect(typeof kpis.totalRevenue).toBe('string');
    expect(typeof kpis.totalClients).toBe('number');
    expect(typeof kpis.activeProjects).toBe('number');
    expect(typeof kpis.teamMembers).toBe('number');

    // Verify calculated values
    expect(parseInt(kpis.totalRevenue)).toBeGreaterThan(0);
    expect(kpis.totalClients).toBeGreaterThanOrEqual(1);
    expect(kpis.activeProjects).toBeGreaterThanOrEqual(1);
    expect(kpis.teamMembers).toBeGreaterThanOrEqual(1);
  });
});

describe('Storage Layer - Error Handling', () => {
  it('should handle non-existent record retrieval gracefully', async () => {
    const nonExistentId = 'non-existent-id';

    const client = await storage.getClient(nonExistentId);
    expect(client).toBeUndefined();

    const project = await storage.getProject(nonExistentId);
    expect(project).toBeUndefined();

    const task = await storage.getTask(nonExistentId);
    expect(task).toBeUndefined();
  });

  it('should handle invalid update operations', async () => {
    const nonExistentId = 'non-existent-id';

    await expect(
      storage.updateClient(nonExistentId, { name: 'Updated' })
    ).rejects.toThrow();

    await expect(
      storage.updateProject(nonExistentId, { name: 'Updated' })
    ).rejects.toThrow();
  });

  it('should handle foreign key constraint violations', async () => {
    const nonExistentClientId = 'non-existent-client-id';

    await expect(
      storage.createProject(TestDataFactory.project(nonExistentClientId))
    ).rejects.toThrow();
  });
});