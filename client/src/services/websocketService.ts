import { queryClient } from '@/lib/queryClient';
import type { Notification } from '@/contexts/NotificationContext';

interface WebSocketMessage {
  type: 'auth' | 'notification' | 'data_change' | 'auth_success' | 'pong' | 'error';
  userId?: string;
  organizationId?: string;
  data?: any;
  id?: string;
  notificationType?: string;
  title?: string;
  message?: string;
  timestamp?: string;
  read?: boolean;
  operation?: 'create' | 'update' | 'delete';
  entity?: string;
}

interface DataChangeMessage {
  type: 'data_change';
  operation: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: string;
}

type ConnectionStateListener = (isConnected: boolean) => void;
type NotificationListener = (notification: Notification) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private user: any = null;
  private isAuthenticated = false;
  
  private connectionListeners: Set<ConnectionStateListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  
  private isConnected = false;

  initialize(user: any, isAuthenticated: boolean) {
    this.user = user;
    this.isAuthenticated = isAuthenticated;
    
    if (isAuthenticated && user) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  private connect = () => {
    if (!this.isAuthenticated || !this.user) return;

    try {
      // Clear any existing reconnection timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const port = window.location.port;

      let wsUrl = `${protocol}//${hostname}`;
      if (port && port !== '80' && port !== '443') {
        wsUrl += `:${port}`;
      }
      wsUrl += '/ws';

      console.log('WebSocket service connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket service connected');
        this.isConnected = true;
        this.notifyConnectionListeners(true);

        // Send authentication message with organizationId for multi-tenant support
        this.ws?.send(JSON.stringify({
          type: 'auth',
          userId: this.user.id,
          organizationId: this.user.defaultOrganizationId
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket service disconnected');
        this.isConnected = false;
        this.notifyConnectionListeners(false);

        // Attempt to reconnect after 3 seconds if still authenticated
        if (this.isAuthenticated && this.user) {
          this.reconnectTimeout = setTimeout(this.connect, 3000);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket service error:', error);
        this.isConnected = false;
        this.notifyConnectionListeners(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
      
      // Retry after 5 seconds
      if (this.isAuthenticated && this.user) {
        this.reconnectTimeout = setTimeout(this.connect, 5000);
      }
    }
  };

  private handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'auth_success':
        console.log('WebSocket authentication successful');
        break;

      case 'notification':
        if (message.id && message.title && message.message) {
          const notification: Notification = {
            id: message.id,
            type: message.notificationType as any || 'task_created',
            title: message.title,
            message: message.message,
            data: message.data,
            timestamp: new Date(message.timestamp || Date.now()),
            read: message.read || false,
            userId: this.user?.id || ''
          };
          this.notifyNotificationListeners(notification);
        }
        break;

      case 'data_change':
        this.handleDataChange(message as DataChangeMessage);
        break;

      case 'pong':
        // Handle pong response for keepalive
        break;

      case 'error':
        console.error('WebSocket server error:', message.message);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  private handleDataChange = (message: DataChangeMessage) => {
    const { operation, entity, data } = message;

    console.log(`WebSocket data change: ${operation} ${entity}`, data);

    // Map entity names to their corresponding API endpoints for cache invalidation
    const entityToQueryKey: Record<string, string[]> = {
      'project': ['/api/projects'],
      'task': ['/api/tasks'],
      'client': ['/api/clients'],
      'company': ['/api/companies'],
      'user': ['/api/users'],
      'invoice': ['/api/invoices'],
      'expense': ['/api/expenses'],
      'ticket': ['/api/support/tickets'],
      'knowledge': ['/api/knowledge'],
      'opportunity': ['/api/opportunities'],
      'project_template': ['/api/project-templates'],
      'notification': ['/api/notifications']
    };

    // Get the query keys to invalidate
    const queryKeys = entityToQueryKey[entity];

    if (queryKeys) {
      queryKeys.forEach(queryKey => {
        // Invalidate the main entity list
        queryClient.invalidateQueries({ queryKey: [queryKey] });

        // For specific operations, also invalidate related queries
        if (operation === 'update' || operation === 'delete') {
          // Invalidate specific item queries if they exist
          if (data?.id) {
            queryClient.invalidateQueries({ queryKey: [queryKey, data.id] });
          }
        }

        // Invalidate related entity queries
        this.invalidateRelatedQueries(entity, data, operation);
      });
    } else {
      console.warn(`Unknown entity type for real-time sync: ${entity}`);
    }
  };

  private invalidateRelatedQueries = (entity: string, data: any, operation: string) => {
    // Invalidate related queries based on entity relationships
    switch (entity) {
      case 'task':
        if (data?.projectId) {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', data.projectId, 'tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] }); // For project task counts
        }
        break;

      case 'project':
        // Invalidate task queries that might be filtered by project
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', data.id, 'comments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/projects', data.id, 'activity'] });
        }
        break;

      case 'client':
        // Invalidate projects that might reference this client
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
        break;

      case 'company':
        // Invalidate clients and projects that might reference this company
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
        break;

      case 'opportunity':
        // Invalidate companies and clients
        queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        break;
    }
  };

  private disconnect = () => {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.notifyConnectionListeners(false);
  };

  // Connection state management
  addConnectionListener(listener: ConnectionStateListener) {
    this.connectionListeners.add(listener);
    // Immediately notify the current state
    listener(this.isConnected);
  }

  removeConnectionListener(listener: ConnectionStateListener) {
    this.connectionListeners.delete(listener);
  }

  private notifyConnectionListeners(isConnected: boolean) {
    this.connectionListeners.forEach(listener => listener(isConnected));
  }

  // Notification management
  addNotificationListener(listener: NotificationListener) {
    this.notificationListeners.add(listener);
  }

  removeNotificationListener(listener: NotificationListener) {
    this.notificationListeners.delete(listener);
  }

  private notifyNotificationListeners(notification: Notification) {
    this.notificationListeners.forEach(listener => listener(notification));
  }

  // Public API
  getConnectionState(): boolean {
    return this.isConnected;
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, cannot send message:', message);
    }
  }

  cleanup() {
    this.disconnect();
    this.connectionListeners.clear();
    this.notificationListeners.clear();
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();