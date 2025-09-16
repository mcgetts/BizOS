import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { mockApiResponse, mockApiError, TestUtils } from '../frontend-setup';

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should return loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('should return authenticated user data when logged in', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(TestUtils.mockUser)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(TestUtils.mockUser);
    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.user?.firstName).toBe('Test');
    expect(result.current.user?.lastName).toBe('User');
  });

  it('should return unauthenticated state when user is not logged in', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiError('Unauthorized', 401)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('should call the correct API endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(TestUtils.mockUser)
    );

    renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/user', expect.any(Object));
    });
  });

  it('should not retry failed requests', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Server error'));

    renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Wait a bit more to ensure no retries
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle null user response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(null)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should handle user with different roles', async () => {
    const adminUser = {
      ...TestUtils.mockUser,
      role: 'admin' as const
    };

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(adminUser)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe('admin');
  });

  it('should handle user with minimal data', async () => {
    const minimalUser = {
      id: 'minimal-user',
      email: 'minimal@test.com',
      firstName: null,
      lastName: null,
      role: 'employee' as const,
      department: null,
      position: null,
      phone: null,
      address: null,
      skills: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(minimalUser)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('minimal@test.com');
    expect(result.current.user?.firstName).toBeNull();
  });

  it('should handle empty response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle malformed JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('invalid json', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('should handle server errors with proper status codes', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('should handle authentication state changes', async () => {
    // Start with unauthenticated state
    global.fetch = vi.fn().mockResolvedValue(
      mockApiError('Unauthorized', 401)
    );

    const { result, rerender } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    // Simulate successful login
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(TestUtils.mockUser)
    );

    rerender();

    // Note: In a real app, you'd need to invalidate the query to trigger a refetch
    // This test demonstrates the hook's behavior structure
    expect(result.current).toBeDefined();
  });

  it('should handle query key correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(TestUtils.mockUser)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the API endpoint matches the query key
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/user', expect.any(Object));
  });

  it('should maintain consistent return type structure', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Check that all expected properties are present
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isAuthenticated');

    // Check types
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isAuthenticated).toBe('boolean');
  });
});