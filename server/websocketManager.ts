import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from './db';
import { notifications, insertNotificationSchema, users } from '../shared/schema';
import { emailService } from './emailService.js';
import type { InsertNotification } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'auth' | 'notification' | 'ping' | 'pong' | 'data_change';
  userId?: string;
  data?: any;
}

interface DataChangeMessage {
  type: 'data_change';
  operation: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  userId?: string;
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

      // Get user details for email notifications
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, notification.userId))
        .limit(1);

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

      // Send email notification if user is offline or for important notifications
      const shouldSendEmail = !userClients || userClients.size === 0 ||
                             ['task_assigned', 'task_overdue', 'project_deadline'].includes(savedNotification.type);

      if (shouldSendEmail && user && user.email) {
        await this.sendEmailNotification(savedNotification, user);
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

  async broadcastDataChange(operation: 'create' | 'update' | 'delete', entity: string, data: any, excludeUserId?: string) {
    const message = JSON.stringify({
      type: 'data_change',
      operation,
      entity,
      data,
      timestamp: new Date().toISOString()
    });

    // Broadcast to all connected clients except the one who made the change
    for (const [userId, userClients] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;

      userClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }

    console.log(`Data change broadcasted: ${operation} ${entity} to ${this.getConnectionCount()} clients`);
  }

  async broadcastToAllUsers(operation: 'create' | 'update' | 'delete', entity: string, data: any) {
    const message = JSON.stringify({
      type: 'data_change',
      operation,
      entity,
      data,
      timestamp: new Date().toISOString()
    });

    // Broadcast to all connected clients
    for (const [userId, userClients] of this.clients.entries()) {
      userClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }

    console.log(`Data change broadcasted to all: ${operation} ${entity} to ${this.getConnectionCount()} clients`);
  }

  private async sendEmailNotification(notification: any, user: any) {
    try {
      if (!emailService.isEmailConfigured()) {
        console.log('Email service not configured, skipping email notification');
        return;
      }

      let emailNotification;
      const data = notification.data || {};

      switch (notification.type) {
        case 'task_assigned':
          emailNotification = emailService.createTaskAssignmentNotification(
            user.email,
            user.name,
            data.taskTitle || 'New Task',
            data.projectName || 'Unknown Project',
            data.dueDate
          );
          break;

        case 'task_status_changed':
          emailNotification = emailService.createTaskStatusChangeNotification(
            user.email,
            user.name,
            data.taskTitle || 'Task',
            data.oldStatus || 'Unknown',
            data.newStatus || 'Unknown',
            data.projectName || 'Unknown Project'
          );
          break;

        case 'project_comment':
          emailNotification = emailService.createProjectCommentNotification(
            user.email,
            user.name,
            data.projectName || 'Unknown Project',
            data.commenterName || 'Someone',
            data.commentText || notification.message
          );
          break;

        case 'task_overdue':
        case 'task_due_soon':
          const daysUntilDue = data.daysUntilDue || 0;
          emailNotification = emailService.createDeadlineReminderNotification(
            user.email,
            user.name,
            data.taskTitle || 'Task',
            data.projectName || 'Unknown Project',
            data.dueDate || new Date().toISOString(),
            daysUntilDue
          );
          break;

        default:
          // Generic notification email
          emailNotification = {
            to: user.email,
            subject: notification.title || 'Project Management Notification',
            text: `Hello ${user.name},\n\n${notification.message}\n\nBest regards,\nProject Management Team`,
            html: `
              <h3>${notification.title || 'Notification'}</h3>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>${notification.message}</p>
              <p>Best regards,<br>Project Management Team</p>
            `
          };
      }

      if (emailNotification) {
        await emailService.sendEmail(emailNotification);
        console.log(`Email notification sent to ${user.email} for notification type: ${notification.type}`);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();