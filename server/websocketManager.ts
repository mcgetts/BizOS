import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from './db';
import { notifications, insertNotificationSchema } from '../shared/schema';
import type { InsertNotification } from '../shared/schema';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'auth' | 'notification' | 'ping' | 'pong';
  userId?: string;
  data?: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  setup(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      console.log('WebSocket connection established');

      ws.isAlive = true;

      // Handle pong responses for keepalive
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });

    // Set up ping interval for keepalive
    const pingInterval = setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
          if (ws.isAlive === false) {
            console.log('Terminating dead WebSocket connection');
            return ws.terminate();
          }

          ws.isAlive = false;
          ws.ping();
        });
      }
    }, 30000); // Ping every 30 seconds

    this.wss.on('close', () => {
      clearInterval(pingInterval);
    });

    console.log('WebSocket server initialized');
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        if (message.userId) {
          ws.userId = message.userId;
          this.addClient(message.userId, ws);
          console.log(`WebSocket authenticated for user: ${message.userId}`);

          // Send authentication confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Authentication successful'
          }));

          // Send recent unread notifications
          await this.sendRecentNotifications(ws, message.userId);
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private addClient(userId: string, ws: AuthenticatedWebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);
  }

  private removeClient(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }
  }

  private async sendRecentNotifications(ws: AuthenticatedWebSocket, userId: string) {
    try {
      // Get recent unread notifications for the user
      const recentNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      for (const notification of recentNotifications) {
        ws.send(JSON.stringify({
          type: 'notification',
          id: notification.id,
          notificationType: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.createdAt,
          read: notification.read
        }));
      }
    } catch (error) {
      console.error('Error sending recent notifications:', error);
    }
  }

  async broadcastNotification(notification: InsertNotification) {
    try {
      // Save notification to database
      const [savedNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning();

      // Send to connected clients for this user
      const userClients = this.clients.get(notification.userId);
      if (userClients && userClients.size > 0) {
        const message = JSON.stringify({
          type: 'notification',
          id: savedNotification.id,
          notificationType: savedNotification.type,
          title: savedNotification.title,
          message: savedNotification.message,
          data: savedNotification.data,
          timestamp: savedNotification.createdAt,
          read: savedNotification.read
        });

        userClients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });

        console.log(`Notification sent to ${userClients.size} client(s) for user ${notification.userId}`);
      } else {
        console.log(`No connected clients for user ${notification.userId}, notification saved to database`);
      }

      return savedNotification;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  async broadcastToMultipleUsers(userIds: string[], notificationData: Omit<InsertNotification, 'userId'>) {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      userId
    }));

    const promises = notifications.map(notification => this.broadcastNotification(notification));
    return Promise.all(promises);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  getConnectionCount(): number {
    let total = 0;
    this.clients.forEach(userClients => {
      total += userClients.size;
    });
    return total;
  }

  isUserConnected(userId: string): boolean {
    const userClients = this.clients.get(userId);
    return !!(userClients && userClients.size > 0);
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();

// Import necessary functions for database operations
import { eq, desc } from 'drizzle-orm';