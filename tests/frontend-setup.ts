import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock environment variables
beforeAll(() => {
  // Mock window.matchMedia (used by some UI components)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver (used by some UI components)
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver (used by some UI components)
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();

  // Mock CSS properties that might be used by components
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '0',
    }),
  });
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Helper function to mock successful API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
};

// Helper function to mock API errors
export const mockApiError = (message = 'API Error', status = 500) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
    text: () => Promise.resolve(JSON.stringify({ message })),
  } as Response);
};

// Test utilities for common patterns
export const TestUtils = {
  // Mock user data
  mockUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin' as const,
    department: 'Engineering',
    position: 'Developer',
    phone: '+1234567890',
    address: '123 Test St',
    skills: ['JavaScript', 'React'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Mock client data
  mockClient: {
    id: 'test-client-123',
    name: 'Test Client Corp',
    email: 'client@test.com',
    phone: '+1234567890',
    address: '456 Client Ave',
    status: 'lead' as const,
    notes: 'Test client notes',
    contactPerson: 'John Doe',
    website: 'https://testclient.com',
    industry: 'Technology',
    size: 'medium' as const,
    source: 'referral' as const,
    lastContactDate: new Date('2024-01-01'),
    nextFollowUpDate: new Date('2024-01-15'),
    totalValue: '50000.00',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Mock project data
  mockProject: {
    id: 'test-project-123',
    name: 'Test Project',
    description: 'A test project',
    clientId: 'test-client-123',
    status: 'in_progress' as const,
    priority: 'high' as const,
    budget: '25000.00',
    spent: '5000.00',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-01'),
    progress: 25,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Mock task data
  mockTask: {
    id: 'test-task-123',
    title: 'Test Task',
    description: 'A test task',
    projectId: 'test-project-123',
    assigneeId: 'test-user-123',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    estimatedHours: '8.00',
    actualHours: '4.00',
    dueDate: new Date('2024-01-15'),
    completedDate: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Mock invoice data
  mockInvoice: {
    id: 'test-invoice-123',
    invoiceNumber: 'INV-2024-001',
    clientId: 'test-client-123',
    projectId: 'test-project-123',
    amount: '5000.00',
    tax: '500.00',
    total: '5500.00',
    status: 'sent' as const,
    dueDate: new Date('2024-02-01'),
    description: 'Test invoice',
    lineItems: [
      {
        description: 'Development services',
        quantity: 40,
        rate: '125.00',
        amount: '5000.00'
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Mock dashboard KPIs
  mockKPIs: {
    totalRevenue: '125000.00',
    totalClients: 15,
    activeProjects: 8,
    teamMembers: 12,
    completedTasks: 45,
    pendingInvoices: 6,
    revenueGrowth: 12.5,
    clientGrowth: 8.3
  }
};

// Mock React Query client for testing
export const createMockQueryClient = () => {
  const { QueryClient } = require('@tanstack/react-query');
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
};