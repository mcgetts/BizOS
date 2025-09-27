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
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();


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

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        isConnected,
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