import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

interface DataChangeMessage {
  type: 'data_change';
  operation: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: string;
}

/**
 * Hook that manages real-time data synchronization via WebSocket
 * Automatically invalidates React Query cache when server data changes
 */
export function useRealTimeSync() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        const port = window.location.port;

        let wsUrl = `${protocol}//${hostname}`;
        if (port && port !== '80' && port !== '443') {
          wsUrl += `:${port}`;
        }
        wsUrl += '/ws';

        console.log('Real-time sync connecting to:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Real-time sync WebSocket connected');

          // Send authentication message
          ws?.send(JSON.stringify({
            type: 'auth',
            userId: user.id
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle data change messages
            if (message.type === 'data_change') {
              handleDataChange(message as DataChangeMessage);
            }
          } catch (error) {
            console.error('Error parsing real-time sync message:', error);
          }
        };

        ws.onclose = () => {
          console.log('Real-time sync WebSocket disconnected');
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('Real-time sync WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to create real-time sync WebSocket connection:', error);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    const handleDataChange = (message: DataChangeMessage) => {
      const { operation, entity, data } = message;

      console.log(`Real-time sync: ${operation} ${entity}`, data);

      // Map entity names to their corresponding API endpoints
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
          invalidateRelatedQueries(entity, data, operation);
        });
      } else {
        console.warn(`Unknown entity type for real-time sync: ${entity}`);
      }
    };

    const invalidateRelatedQueries = (entity: string, data: any, operation: string) => {
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

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [isAuthenticated, user]);
}