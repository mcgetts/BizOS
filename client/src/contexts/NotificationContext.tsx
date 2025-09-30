import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { websocketService } from '@/services/websocketService';

export interface Notification {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'project_updated' | 'comment_added' | 'dependency_changed';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
  userId: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  isConnected: boolean;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch notifications from database on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/notifications?limit=50');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.map((n: any) => ({
            ...n,
            timestamp: new Date(n.createdAt)
          })));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    // Initialize WebSocket service with current auth state
    websocketService.initialize(user, isAuthenticated);

    // Listen for connection state changes
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    // Listen for notifications
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep only last 50 notifications

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    };

    websocketService.addConnectionListener(handleConnectionChange);
    websocketService.addNotificationListener(handleNotification);

    return () => {
      websocketService.removeConnectionListener(handleConnectionChange);
      websocketService.removeNotificationListener(handleNotification);
    };
  }, [isAuthenticated, user, toast]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id
              ? { ...notification, read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        );
        toast({
          title: 'Success',
          description: 'All notifications marked as read',
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({
          title: 'Success',
          description: 'Notification deleted',
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications([]);
        toast({
          title: 'Success',
          description: 'All notifications cleared',
        });
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear all notifications',
        variant: 'destructive',
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        isConnected,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}