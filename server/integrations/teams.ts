import axios from 'axios';
import type { User, Project, Task } from '@shared/schema';

export interface TeamsConfig {
  webhookUrl?: string;
  botFrameworkAppId?: string;
  botFrameworkAppPassword?: string;
  tenantId?: string;
  enabled: boolean;
  channels: {
    general?: string;
    projects?: string;
    alerts?: string;
    notifications?: string;
  };
  features: {
    sendProjectUpdates: boolean;
    sendTaskNotifications: boolean;
    sendDailyDigests: boolean;
    sendAlerts: boolean;
  };
}

export interface TeamsMessage {
  type: string;
  attachments: TeamsAttachment[];
}

export interface TeamsAttachment {
  contentType: string;
  contentUrl?: string;
  content: {
    type: string;
    body: TeamsElement[];
  };
}

export interface TeamsElement {
  type: string;
  text?: string;
  weight?: string;
  size?: string;
  color?: string;
  columns?: TeamsColumn[];
  items?: TeamsFactSet[];
}

export interface TeamsColumn {
  type: string;
  width: string;
  items: TeamsElement[];
}

export interface TeamsFactSet {
  type: string;
  facts: TeamsFact[];
}

export interface TeamsFact {
  title: string;
  value: string;
}

export class TeamsIntegration {
  private config: TeamsConfig;

  constructor(config: TeamsConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    if (!this.config.enabled || !this.config.webhookUrl) {
      console.log('Microsoft Teams integration disabled - no webhook URL provided');
      return false;
    }

    try {
      // Send a test message to verify the webhook
      const testMessage = this.createAdaptiveCard(
        'Microsoft Teams Integration',
        'Successfully connected to Business Platform',
        'Good',
        []
      );

      await this.sendMessage(testMessage);
      console.log('Microsoft Teams integration initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Microsoft Teams integration:', error);
      return false;
    }
  }

  async sendProjectNotification(
    project: Project,
    message: string,
    type: 'created' | 'updated' | 'completed' | 'deleted'
  ) {
    if (!this.config.enabled || !this.config.features.sendProjectUpdates) return;

    const color = {
      created: 'Good',
      updated: 'Warning',
      completed: 'Good',
      deleted: 'Attention'
    }[type];

    const emoji = {
      created: '🆕',
      updated: '🔄',
      completed: '✅',
      deleted: '🗑️'
    }[type];

    const facts = [
      { title: 'Project', value: project.name },
      { title: 'Status', value: project.status },
      { title: 'Type', value: project.type || 'Unknown' },
      { title: 'Message', value: message }
    ];

    if (project.startDate) {
      facts.push({ title: 'Start Date', value: new Date(project.startDate).toLocaleDateString() });
    }

    if (project.endDate) {
      facts.push({ title: 'End Date', value: new Date(project.endDate).toLocaleDateString() });
    }

    const adaptiveCard = this.createAdaptiveCard(
      `${emoji} Project ${type}: ${project.name}`,
      message,
      color,
      facts
    );

    try {
      await this.sendMessage(adaptiveCard);
    } catch (error) {
      console.error('Failed to send Teams project notification:', error);
    }
  }

  async sendTaskNotification(
    task: Task,
    project: Project,
    user: User,
    type: 'assigned' | 'updated' | 'completed'
  ) {
    if (!this.config.enabled || !this.config.features.sendTaskNotifications) return;

    const emoji = {
      assigned: '📋',
      updated: '🔄',
      completed: '✅'
    }[type];

    const color = {
      assigned: 'Good',
      updated: 'Warning',
      completed: 'Good'
    }[type];

    const facts = [
      { title: 'Task', value: task.title },
      { title: 'Project', value: project.name },
      { title: 'Assignee', value: `${user.firstName} ${user.lastName}` },
      { title: 'Priority', value: task.priority },
      { title: 'Status', value: task.status }
    ];

    if (task.dueDate) {
      facts.push({
        title: 'Due Date',
        value: new Date(task.dueDate).toLocaleDateString()
      });
    }

    if (task.description) {
      facts.push({ title: 'Description', value: task.description.substring(0, 100) + '...' });
    }

    const adaptiveCard = this.createAdaptiveCard(
      `${emoji} Task ${type}: ${task.title}`,
      `Task has been ${type} in ${project.name}`,
      color,
      facts
    );

    try {
      await this.sendMessage(adaptiveCard);
    } catch (error) {
      console.error('Failed to send Teams task notification:', error);
    }
  }

  async sendAlert(message: string, severity: 'info' | 'warning' | 'error') {
    if (!this.config.enabled || !this.config.features.sendAlerts) return;

    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨'
    }[severity];

    const color = {
      info: 'Good',
      warning: 'Warning',
      error: 'Attention'
    }[severity];

    const facts = [
      { title: 'Severity', value: severity.toUpperCase() },
      { title: 'Timestamp', value: new Date().toLocaleString() }
    ];

    const adaptiveCard = this.createAdaptiveCard(
      `${emoji} ${severity.toUpperCase()} Alert`,
      message,
      color,
      facts
    );

    try {
      await this.sendMessage(adaptiveCard);
    } catch (error) {
      console.error('Failed to send Teams alert:', error);
    }
  }

  async sendDailyDigest(stats: {
    completedTasks: number;
    newProjects: number;
    overdueItems: number;
    teamActivity: string[];
  }) {
    if (!this.config.enabled || !this.config.features.sendDailyDigests) return;

    const facts = [
      { title: 'Tasks Completed', value: stats.completedTasks.toString() },
      { title: 'New Projects', value: stats.newProjects.toString() },
      { title: 'Overdue Items', value: stats.overdueItems.toString() },
      { title: 'Team Updates', value: stats.teamActivity.length.toString() }
    ];

    // Create a more detailed digest with activity list
    const elements: TeamsElement[] = [
      {
        type: 'TextBlock',
        text: '📊 Daily Business Digest',
        weight: 'Bolder',
        size: 'Large'
      },
      {
        type: 'TextBlock',
        text: `Summary for ${new Date().toLocaleDateString()}`,
        color: 'Dark'
      },
      {
        type: 'FactSet',
        items: [
          {
            type: 'FactSet',
            facts: facts
          }
        ]
      }
    ];

    // Add recent activity if available
    if (stats.teamActivity.length > 0) {
      elements.push({
        type: 'TextBlock',
        text: 'Recent Team Activity:',
        weight: 'Bolder'
      });

      elements.push({
        type: 'TextBlock',
        text: stats.teamActivity.slice(0, 5).join('\n'),
        color: 'Dark'
      });
    }

    const message: TeamsMessage = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          body: elements
        }
      }]
    };

    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to send Teams daily digest:', error);
    }
  }

  async sendCustomMessage(title: string, text: string, color: 'Good' | 'Warning' | 'Attention' = 'Good') {
    if (!this.config.enabled) return;

    const adaptiveCard = this.createAdaptiveCard(title, text, color, []);

    try {
      await this.sendMessage(adaptiveCard);
    } catch (error) {
      console.error('Failed to send Teams custom message:', error);
    }
  }

  async sendRichMessage(elements: TeamsElement[]) {
    if (!this.config.enabled) return;

    const message: TeamsMessage = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          body: elements
        }
      }]
    };

    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to send Teams rich message:', error);
    }
  }

  // Helper method to create adaptive cards
  private createAdaptiveCard(
    title: string,
    text: string,
    color: 'Good' | 'Warning' | 'Attention',
    facts: TeamsFact[]
  ): TeamsMessage {
    const elements: TeamsElement[] = [
      {
        type: 'TextBlock',
        text: title,
        weight: 'Bolder',
        size: 'Medium'
      },
      {
        type: 'TextBlock',
        text: text,
        color: 'Dark'
      }
    ];

    if (facts.length > 0) {
      elements.push({
        type: 'FactSet',
        items: [
          {
            type: 'FactSet',
            facts: facts
          }
        ]
      });
    }

    // Add footer with timestamp
    elements.push({
      type: 'TextBlock',
      text: `Generated on ${new Date().toLocaleString()} | Business Platform`,
      size: 'Small',
      color: 'Dark'
    });

    return {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          body: elements
        }
      }]
    };
  }

  // Send message to Teams webhook
  private async sendMessage(message: TeamsMessage): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    try {
      const response = await axios.post(this.config.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Teams webhook returned status: ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Teams webhook error: ${error.response?.data || error.message}`);
      }
      throw error;
    }
  }

  // Create a simple text message (legacy format)
  async sendSimpleMessage(text: string): Promise<void> {
    if (!this.config.enabled || !this.config.webhookUrl) return;

    const message = {
      text: text
    };

    try {
      await axios.post(this.config.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to send simple Teams message:', error);
    }
  }

  // Utility method to format user mentions (if bot framework is configured)
  private formatUserMention(user: User): string {
    // In a full Teams bot implementation, you'd use the user's Azure AD object ID
    return `@${user.firstName} ${user.lastName}`;
  }

  // Get webhook health status
  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    if (!this.config.enabled) {
      return { status: 'unhealthy', message: 'Teams integration is disabled' };
    }

    if (!this.config.webhookUrl) {
      return { status: 'unhealthy', message: 'Teams webhook URL is not configured' };
    }

    try {
      const testMessage = {
        text: 'Health check from Business Platform'
      };

      await axios.post(this.config.webhookUrl, testMessage, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      return { status: 'healthy', message: 'Teams integration is working correctly' };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Teams integration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send support ticket notification to Teams
   */
  async sendTicketNotification(
    ticket: any,
    type: 'created' | 'updated' | 'escalated' | 'resolved' | 'sla_breach',
    metadata?: { escalationLevel?: number; reason?: string; assignedUser?: any }
  ): Promise<void> {
    if (!this.config.enabled || !this.config.webhookUrl) {
      console.log('Teams ticket notifications disabled or webhook URL not configured');
      return;
    }

    const card = this.createTicketAdaptiveCard(ticket, type, metadata);

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`Teams ticket notification sent: ${type} for ticket #${ticket.ticketNumber}`);
    } catch (error) {
      console.error('Failed to send Teams ticket notification:', error);
      throw error;
    }
  }

  private createTicketAdaptiveCard(
    ticket: any,
    type: 'created' | 'updated' | 'escalated' | 'resolved' | 'sla_breach',
    metadata?: any
  ) {
    const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support?ticket=${ticket.id}`;
    const priorityColor = this.getPriorityColor(ticket.priority, type);
    const typeEmoji = this.getTicketTypeEmoji(type);

    const baseCard = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'Container',
                style: 'emphasis',
                items: [
                  {
                    type: 'ColumnSet',
                    columns: [
                      {
                        type: 'Column',
                        width: 'auto',
                        items: [
                          {
                            type: 'TextBlock',
                            text: typeEmoji,
                            size: 'Large'
                          }
                        ]
                      },
                      {
                        type: 'Column',
                        width: 'stretch',
                        items: [
                          {
                            type: 'TextBlock',
                            text: this.getTicketTitle(type, ticket, metadata),
                            weight: 'Bolder',
                            size: 'Medium',
                            color: priorityColor
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                type: 'FactSet',
                facts: this.getTicketFacts(ticket, type, metadata)
              }
            ],
            actions: [
              {
                type: 'Action.OpenUrl',
                title: type === 'sla_breach' ? 'Resolve Now' : 'View Ticket',
                url: ticketUrl
              }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.3'
          }
        }
      ]
    };

    // Add description for new tickets
    if (type === 'created' && ticket.description) {
      baseCard.attachments[0].content.body.push({
        type: 'TextBlock',
        text: ticket.description.substring(0, 200) + (ticket.description.length > 200 ? '...' : ''),
        wrap: true,
        isSubtle: true
      });
    }

    return baseCard;
  }

  private getTicketTitle(type: string, ticket: any, metadata?: any): string {
    switch (type) {
      case 'created':
        return `New Support Ticket: #${ticket.ticketNumber}`;
      case 'escalated':
        return `ESCALATED Level ${metadata?.escalationLevel}: #${ticket.ticketNumber}`;
      case 'sla_breach':
        return `SLA BREACH ALERT: #${ticket.ticketNumber}`;
      case 'resolved':
        return `Ticket Resolved: #${ticket.ticketNumber}`;
      case 'updated':
        return `Ticket Updated: #${ticket.ticketNumber}`;
      default:
        return `Support Ticket: #${ticket.ticketNumber}`;
    }
  }

  private getTicketFacts(ticket: any, type: string, metadata?: any) {
    const facts = [
      { title: 'Title', value: ticket.title },
      { title: 'Priority', value: ticket.priority || 'Medium' },
      { title: 'Category', value: ticket.category || 'General' },
      { title: 'Status', value: ticket.status || 'Open' }
    ];

    if (ticket.clientName) {
      facts.push({ title: 'Client', value: ticket.clientName });
    }

    if (type === 'escalated' && metadata) {
      if (metadata.assignedUser) {
        facts.push({
          title: 'Assigned To',
          value: `${metadata.assignedUser.firstName} ${metadata.assignedUser.lastName}`
        });
      }
      if (metadata.reason) {
        facts.push({ title: 'Escalation Reason', value: metadata.reason });
      }
    }

    if (type === 'sla_breach') {
      const hoursElapsed = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60));
      facts.push({ title: 'Time Elapsed', value: `${hoursElapsed} hours` });
    }

    if (type === 'resolved' && ticket.resolvedAt) {
      const resolutionTime = this.calculateResolutionTime(ticket);
      facts.push({ title: 'Resolution Time', value: resolutionTime });
    }

    facts.push({ title: 'Created', value: new Date(ticket.createdAt).toLocaleString() });

    return facts;
  }

  private getPriorityColor(priority?: string, type?: string): string {
    if (type === 'escalated' || type === 'sla_breach') return 'Attention';
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'Attention';
      case 'high': return 'Warning';
      case 'medium': return 'Accent';
      case 'low': return 'Good';
      default: return 'Default';
    }
  }

  private getTicketTypeEmoji(type: string): string {
    switch (type) {
      case 'created': return '🎫';
      case 'escalated': return '🚨';
      case 'sla_breach': return '⚠️';
      case 'resolved': return '✅';
      case 'updated': return '📝';
      default: return '📋';
    }
  }

  private calculateResolutionTime(ticket: any): string {
    if (!ticket.resolvedAt || !ticket.createdAt) return 'Unknown';

    const created = new Date(ticket.createdAt);
    const resolved = new Date(ticket.resolvedAt);
    const diffMs = resolved.getTime() - created.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

// Export default configuration
export const defaultTeamsConfig: TeamsConfig = {
  enabled: false,
  channels: {
    general: 'General',
    projects: 'Projects',
    alerts: 'Alerts',
    notifications: 'Notifications'
  },
  features: {
    sendProjectUpdates: true,
    sendTaskNotifications: true,
    sendDailyDigests: true,
    sendAlerts: true
  }
};