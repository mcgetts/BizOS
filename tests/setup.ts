import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '@server/db';
import {
  users, clients, companies, projects, tasks, invoices, expenses,
  knowledgeArticles, marketingCampaigns, supportTickets,
  timeEntries, clientInteractions, documents, salesOpportunities,
  opportunityNextSteps, opportunityCommunications, opportunityStakeholders
} from '@shared/schema';

// Test database cleanup utilities
export async function cleanupDatabase() {
  // Clean tables in reverse dependency order to avoid foreign key constraints
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

  // Clean up opportunity-related tables first (in dependency order)
  await db.delete(opportunityNextSteps);
  await db.delete(opportunityCommunications);
  await db.delete(opportunityStakeholders);
  await db.delete(salesOpportunities);

  await db.delete(clients);
  await db.delete(companies);
  // Note: Keep users for authentication tests
}

// Global test setup
beforeAll(async () => {
  // Ensure we're in test mode
  process.env.NODE_ENV = 'test';

  // Verify database connection
  try {
    await db.select().from(users).limit(1);
    console.log('✅ Database connection established for testing');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
});

beforeEach(async () => {
  // Clean database before each test for isolation
  await cleanupDatabase();
});

afterAll(async () => {
  // Final cleanup
  await cleanupDatabase();
});

// Test data factories
export const TestDataFactory = {
  user: (overrides = {}) => ({
    id: `test-user-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'employee' as const,
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  client: (overrides = {}) => ({
    id: `test-client-${Date.now()}`,
    name: `Test Client ${Date.now()}`,
    email: `client${Date.now()}@example.com`,
    phone: '+1234567890',
    address: '123 Test St',
    status: 'lead' as const,
    notes: 'Test client notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  project: (clientId: string, overrides = {}) => ({
    id: `test-project-${Date.now()}`,
    name: `Test Project ${Date.now()}`,
    description: 'Test project description',
    clientId,
    status: 'planning' as const,
    budget: '10000.00',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  task: (projectId: string, assigneeId?: string, overrides = {}) => ({
    id: `test-task-${Date.now()}`,
    title: `Test Task ${Date.now()}`,
    description: 'Test task description',
    projectId,
    assigneeId: assigneeId || null,
    status: 'todo' as const,
    priority: 'medium' as const,
    estimatedHours: '8.00',
    actualHours: '0.00',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  invoice: (clientId: string, projectId?: string, overrides = {}) => ({
    id: `test-invoice-${Date.now()}`,
    invoiceNumber: `INV-${Date.now()}`,
    clientId,
    projectId: projectId || null,
    amount: '1000.00',
    tax: '100.00',
    total: '1100.00',
    status: 'draft' as const,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    description: 'Test invoice',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  expense: (projectId?: string, userId?: string, overrides = {}) => ({
    id: `test-expense-${Date.now()}`,
    description: 'Test expense',
    amount: '100.00',
    category: 'office_supplies' as const,
    projectId: projectId || null,
    userId: userId || null,
    receiptUrl: null,
    billable: false,
    reimbursed: false,
    date: new Date(),
    createdAt: new Date(),
    ...overrides
  }),

  supportTicket: (clientId?: string, overrides = {}) => ({
    id: `test-ticket-${Date.now()}`,
    title: 'Test Support Ticket',
    description: 'Test ticket description',
    clientId: clientId || null,
    status: 'open' as const,
    priority: 'medium' as const,
    category: 'technical' as const,
    assigneeId: null,
    rating: null,
    feedback: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })
};

// Database assertion helpers
export async function assertDatabaseState(expectations: {
  clients?: number;
  projects?: number;
  tasks?: number;
  invoices?: number;
  expenses?: number;
  supportTickets?: number;
}) {
  const counts = {
    clients: expectations.clients !== undefined ? (await db.select().from(clients)).length : null,
    projects: expectations.projects !== undefined ? (await db.select().from(projects)).length : null,
    tasks: expectations.tasks !== undefined ? (await db.select().from(tasks)).length : null,
    invoices: expectations.invoices !== undefined ? (await db.select().from(invoices)).length : null,
    expenses: expectations.expenses !== undefined ? (await db.select().from(expenses)).length : null,
    supportTickets: expectations.supportTickets !== undefined ? (await db.select().from(supportTickets)).length : null,
  };

  Object.entries(expectations).forEach(([table, expected]) => {
    const actual = counts[table as keyof typeof counts];
    if (actual !== expected) {
      throw new Error(`Expected ${expected} ${table}, but found ${actual}`);
    }
  });
}