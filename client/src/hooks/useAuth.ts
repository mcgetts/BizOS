import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh user data (changed from 5 minutes to prevent role caching issues)
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
