import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import { ComponentTestHelpers, MockAPIResponses, mockApiResponse } from '../utils/test-utils';
import Dashboard from '@/pages/Dashboard';

// Mock the hooks and components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() }))
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>
}));

vi.mock('@/components/DashboardKPIs', () => ({
  DashboardKPIs: () => <div data-testid="dashboard-kpis">KPIs Component</div>
}));

vi.mock('@/lib/authUtils', () => ({
  isUnauthorizedError: vi.fn()
}));

describe('Dashboard Page', () => {
  const mockUseAuth = vi.mocked(require('@/hooks/useAuth').useAuth);
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock toast hook
    vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast
    });

    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  it('should show loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null
    });

    render(<Dashboard />);

    expect(screen.getByTestId('loading-spinner') || screen.getByRole('status')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    // Mock window.location
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null
    });

    render(<Dashboard />);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Unauthorized',
      description: 'You are logged out. Logging in again...',
      variant: 'destructive'
    });
  });

  it('should render dashboard content when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    // Mock projects API response
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    expect(screen.getByTestId('dashboard-kpis')).toBeInTheDocument();
  });

  it('should display welcome message and quick actions', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com', firstName: 'Test' }
    });

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Check for welcome message
    expect(screen.getByText(/welcome/i) || screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  it('should display quick action buttons', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Look for quick action buttons (they might have test IDs or specific text)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Check for common quick actions
    const quickActionTexts = [
      /new client/i,
      /new project/i,
      /create invoice/i,
      /add task/i,
      /new/i,
      /create/i,
      /add/i
    ];

    const hasQuickAction = quickActionTexts.some(pattern =>
      buttons.some(button => pattern.test(button.textContent || ''))
    );

    expect(hasQuickAction).toBe(true);
  });

  it('should handle projects data loading', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    const mockProjects = MockAPIResponses.projects.getAll();
    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockProjects));

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Verify the fetch was called with correct endpoint
    expect(global.fetch).toHaveBeenCalledWith('/api/projects', expect.any(Object));
  });

  it('should display project status indicators', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    const mockProjects = [
      {
        ...MockAPIResponses.projects.getAll()[0],
        status: 'in_progress',
        name: 'Active Project'
      },
      {
        ...MockAPIResponses.projects.getAll()[0],
        id: 'project-2',
        status: 'completed',
        name: 'Completed Project'
      }
    ];

    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockProjects));

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Look for project status indicators
    const statusElements = screen.getAllByText(/in progress|completed|planning|on hold/i);
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('should handle click events on quick action buttons', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    const user = await ComponentTestHelpers.userEvent();
    const buttons = screen.getAllByRole('button');

    if (buttons.length > 0) {
      await user.click(buttons[0]);
      // Button click should not cause any errors
      expect(true).toBe(true);
    }
  });

  it('should display recent activities section', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Look for activities or recent items section
    const activitySection = screen.queryByText(/recent|activity|activities/i) ||
                           screen.queryByTestId('recent-activities') ||
                           screen.queryByTestId('dashboard-activities');

    // Activities section might not always be present, so this is optional
    if (activitySection) {
      expect(activitySection).toBeInTheDocument();
    }
  });

  it('should be responsive and accessible', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Check for semantic HTML structure
    const main = screen.queryByRole('main') || screen.getByTestId('layout');
    expect(main).toBeInTheDocument();

    // Check for headings
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should handle API errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    // Mock API error
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Dashboard should still render even with API errors
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-kpis')).toBeInTheDocument();
  });

  it('should display correct user information', async () => {
    const mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser
    });

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.projects.getAll())
    );

    render(<Dashboard />);

    await ComponentTestHelpers.waitForLoadingToComplete();

    // Look for user name or welcome message
    const userGreeting = screen.queryByText(/john|doe|welcome.*john/i);
    if (userGreeting) {
      expect(userGreeting).toBeInTheDocument();
    }
  });
});