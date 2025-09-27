import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for real-time data synchronization via WebSocket
 * This hook is now handled by the consolidated WebSocket service
 * and doesn't need to create its own connection
 */
export function useRealTimeSync() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Real-time sync is now handled by the consolidated WebSocket service
    // in the NotificationContext, so this hook just ensures compatibility
    // for components that still call it
    if (isAuthenticated && user) {
      console.log('Real-time sync initialized via consolidated WebSocket service');
    }
  }, [isAuthenticated, user]);
}