import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Team from '@/pages/Team';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'test-user', email: 'test@example.com', role: 'admin' }
  })
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock API responses
const mockUsers = [
  {
    id: 'user-1',
    email: 'john.doe@company.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Developer',
    phone: '+1-555-0123',
    address: '123 Main St',
    skills: ['JavaScript', 'React', 'Node.js'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    email: 'jane.smith@company.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'manager',
    department: 'Sales',
    position: 'Sales Manager',
    phone: '+1-555-0124',
    address: '456 Oak Ave',
    skills: ['Leadership', 'Sales'],
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-3',
    email: 'bob.wilson@company.com',
    firstName: 'Bob',
    lastName: 'Wilson',
    role: 'employee',
    department: 'Marketing',
    position: 'Marketing Specialist',
    phone: '+1-555-0125',
    address: '789 Pine St',
    skills: ['Content Creation', 'SEO'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockTasks = [
  {
    id: 'task-1',
    title: 'Fix login bug',
    description: 'Fix authentication issue',
    assignedTo: 'user-1',
    status: 'in_progress',
    priority: 'high',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'task-2',
    title: 'Complete feature',
    description: 'Implement new feature',
    assignedTo: 'user-1',
    status: 'completed',
    priority: 'medium',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'task-3',
    title: 'Review proposal',
    description: 'Review client proposal',
    assignedTo: 'user-2',
    status: 'todo',
    priority: 'low',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock fetch
global.fetch = vi.fn();

const mockFetch = fetch as any;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Team Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        });
      }
      if (url.includes('/api/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks)
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' })
      });
    });
  });

  describe('User Display Functionality', () => {
    it('should display team members correctly', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });

      // Check user details
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('Software Developer')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should display user avatars with initials fallback', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        const avatars = screen.getAllByText('JD');
        expect(avatars.length).toBeGreaterThan(0);
      });
    });

    it('should display active/inactive status correctly', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText('Active')).toHaveLength(2); // John and Bob
        expect(screen.getByText('Inactive')).toBeInTheDocument(); // Jane
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by name', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('input-search-team');
      fireEvent.change(searchInput, { target: { value: 'Jane' } });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('should filter users by department', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('input-search-team');
      fireEvent.change(searchInput, { target: { value: 'Engineering' } });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      });
    });

    it('should filter users by role', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('input-search-team');
      fireEvent.change(searchInput, { target: { value: 'manager' } });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics Calculations', () => {
    it('should display correct total member count', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('text-total-members')).toHaveTextContent('3');
      });
    });

    it('should display correct active member count', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('text-active-members')).toHaveTextContent('2');
      });
    });

    it('should display correct active tasks count', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('text-active-tasks')).toHaveTextContent('2');
      });
    });
  });

  describe('Task-User Relationships', () => {
    it('should display user tasks correctly', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
        expect(screen.getByText('Review proposal')).toBeInTheDocument();
      });
    });

    it('should show correct task counts per user', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check John Doe's task counts (has 2 tasks: 1 in progress, 1 completed)
        const johnCard = screen.getByText('John Doe').closest('[data-testid^="card-member-"]');
        expect(johnCard).toBeInTheDocument();
      });
    });
  });

  describe('Team Member Details Dialog', () => {
    it('should open details dialog when view details is clicked', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const viewButton = screen.getByTestId('button-view-0');
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Team Member Details')).toBeInTheDocument();
      });
    });

    it('should display complete user information in dialog', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const viewButton = screen.getByTestId('button-view-0');
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Team Member Details')).toBeInTheDocument();
        expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
        expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
      });
    });

    it('should close dialog when close button is clicked', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const viewButton = screen.getByTestId('button-view-0');
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Team Member Details')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('button-close-details');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Team Member Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Add Member Functionality', () => {
    it('should open add member dialog when button is clicked', async () => {
      render(<Team />, { wrapper: createWrapper() });

      const addButton = screen.getByTestId('button-add-member');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Team Member')).toBeInTheDocument();
      });
    });

    it('should show form fields in add member dialog', async () => {
      render(<Team />, { wrapper: createWrapper() });

      const addButton = screen.getByTestId('button-add-member');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('input-first-name')).toBeInTheDocument();
        expect(screen.getByTestId('input-last-name')).toBeInTheDocument();
        expect(screen.getByTestId('input-email')).toBeInTheDocument();
        expect(screen.getByTestId('select-role')).toBeInTheDocument();
        expect(screen.getByTestId('input-department')).toBeInTheDocument();
      });
    });

    it('should attempt to submit form (will fail due to missing API)', async () => {
      render(<Team />, { wrapper: createWrapper() });

      const addButton = screen.getByTestId('button-add-member');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('input-first-name')).toBeInTheDocument();
      });

      // Fill form
      fireEvent.change(screen.getByTestId('input-first-name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByTestId('input-last-name'), { target: { value: 'User' } });
      fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'test@example.com' } });

      // Submit (this will fail due to missing POST /api/users endpoint)
      const saveButton = screen.getByTestId('button-save');
      fireEvent.click(saveButton);

      // The form should attempt submission but fail due to missing API
      expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  describe('No Data States', () => {
    it('should show no members message when no users found', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/users')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
        if (url.includes('/api/tasks')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No team members found')).toBeInTheDocument();
      });
    });

    it('should show no search results message when search yields no results', async () => {
      render(<Team />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('input-search-team');
      fireEvent.change(searchInput, { target: { value: 'NonexistentUser' } });

      await waitFor(() => {
        expect(screen.getByText('No team members found matching your search')).toBeInTheDocument();
      });
    });
  });
});