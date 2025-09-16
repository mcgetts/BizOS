import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { ThemeProvider } from 'next-themes';
import { createMockQueryClient, TestUtils } from '../../frontend-setup';

// Mock providers wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createMockQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Router>
          {children}
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };

// Test utilities for form interactions
export const FormTestUtils = {
  // Fill out form inputs
  fillInput: async (input: HTMLElement, value: string) => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, value);
  },

  // Select option from dropdown
  selectOption: async (select: HTMLElement, optionText: string) => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(select);
    await user.selectOptions(select, optionText);
  },

  // Submit form
  submitForm: async (form: HTMLElement) => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(form.querySelector('button[type="submit"]') as HTMLElement);
  }
};

// Mock API responses for components
export const MockAPIResponses = {
  // Mock successful responses
  clients: {
    getAll: () => [TestUtils.mockClient],
    getById: (id: string) => ({ ...TestUtils.mockClient, id }),
    create: (data: any) => ({ ...TestUtils.mockClient, ...data, id: 'new-client-id' }),
    update: (id: string, data: any) => ({ ...TestUtils.mockClient, id, ...data }),
    delete: () => ({ success: true })
  },

  projects: {
    getAll: () => [TestUtils.mockProject],
    getById: (id: string) => ({ ...TestUtils.mockProject, id }),
    create: (data: any) => ({ ...TestUtils.mockProject, ...data, id: 'new-project-id' }),
    update: (id: string, data: any) => ({ ...TestUtils.mockProject, id, ...data }),
    delete: () => ({ success: true })
  },

  tasks: {
    getAll: () => [TestUtils.mockTask],
    getById: (id: string) => ({ ...TestUtils.mockTask, id }),
    create: (data: any) => ({ ...TestUtils.mockTask, ...data, id: 'new-task-id' }),
    update: (id: string, data: any) => ({ ...TestUtils.mockTask, id, ...data }),
    delete: () => ({ success: true })
  },

  users: {
    getAll: () => [TestUtils.mockUser],
    current: () => TestUtils.mockUser
  },

  dashboard: {
    kpis: () => TestUtils.mockKPIs
  },

  invoices: {
    getAll: () => [TestUtils.mockInvoice],
    getById: (id: string) => ({ ...TestUtils.mockInvoice, id }),
    create: (data: any) => ({ ...TestUtils.mockInvoice, ...data, id: 'new-invoice-id' }),
    update: (id: string, data: any) => ({ ...TestUtils.mockInvoice, id, ...data })
  }
};

// Component testing helpers
export const ComponentTestHelpers = {
  // Wait for loading states to complete
  waitForLoadingToComplete: async () => {
    const { waitForElementToBeRemoved, screen } = await import('@testing-library/react');
    try {
      await waitForElementToBeRemoved(() => screen.queryByText('Loading...'), { timeout: 3000 });
    } catch {
      // Loading element might not exist or might already be gone
    }
  },

  // Check if element has specific class
  hasClass: (element: HTMLElement, className: string) => {
    return element.classList.contains(className);
  },

  // Get element by test id
  getByTestId: (testId: string) => {
    const { screen } = require('@testing-library/react');
    return screen.getByTestId(testId);
  },

  // Query element by test id (returns null if not found)
  queryByTestId: (testId: string) => {
    const { screen } = require('@testing-library/react');
    return screen.queryByTestId(testId);
  },

  // Mock user interactions
  userEvent: async () => {
    const { userEvent } = await import('@testing-library/user-event');
    return userEvent.setup();
  }
};

// Page-specific test helpers
export const PageTestHelpers = {
  // Dashboard page helpers
  dashboard: {
    getKPICard: (metric: string) => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId(`kpi-${metric}`);
    },
    getQuickActionButton: (action: string) => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId(`quick-action-${action}`);
    }
  },

  // Clients page helpers
  clients: {
    getClientRow: (clientId: string) => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId(`client-row-${clientId}`);
    },
    getAddClientButton: () => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId('add-client-button');
    },
    getSearchInput: () => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId('client-search-input');
    },
    getStatusFilter: () => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId('client-status-filter');
    }
  },

  // Projects page helpers
  projects: {
    getProjectCard: (projectId: string) => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId(`project-card-${projectId}`);
    },
    getCreateProjectButton: () => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId('create-project-button');
    }
  },

  // Finance page helpers
  finance: {
    getInvoiceRow: (invoiceId: string) => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId(`invoice-row-${invoiceId}`);
    },
    getCreateInvoiceButton: () => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId('create-invoice-button');
    },
    getTotalRevenue: () => {
      const { screen } = require('@testing-library/react');
      return screen.getByTestId('total-revenue');
    }
  }
};

// Mock navigation functions
export const mockNavigation = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn()
};

// Setup mock for wouter navigation
export const setupNavigationMock = () => {
  vi.mock('wouter', async () => {
    const actual = await vi.importActual('wouter');
    return {
      ...actual,
      useLocation: () => ['/', mockNavigation.push],
      useRoute: () => [false, {}],
      Router: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    };
  });
};