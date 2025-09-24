import { WebClient } from '@slack/web-api';
import type { User, Project, Task, Client } from '@shared/schema';

export interface SlackConfig {
  botToken?: string;
  signingSecret?: string;
  appToken?: string;
  enabled: boolean;
  channels: {
    general?: string;
    projects?: string;
    alerts?: string;
    notifications?: string;
  };
  webhooks: {
    taskUpdates?: string;
    projectUpdates?: string;
    alerts?: string;
  };
}

export class SlackIntegration {
  private client: WebClient | null = null;
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
    if (config.enabled && config.botToken) {
      this.client = new WebClient(config.botToken);
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.client) {
      console.log('Slack integration disabled - no bot token provided');
      return false;
    }

    try {
      const auth = await this.client.auth.test();
      console.log('Slack integration initialized:', auth.team);
      return true;
    } catch (error) {
      console.error('Failed to initialize Slack integration:', error);
      return false;
    }
  }

  async sendProjectNotification(project: Project, message: string, type: 'created' | 'updated' | 'completed' | 'deleted') {
    if (!this.client) return;

    const channel = this.config.channels.projects || this.config.channels.general;
    if (!channel) return;

    const color = {
      created: '#36a64f',    // Green
      updated: '#ff9500',    // Orange
      completed: '#2eb886',  // Success green
      deleted: '#e01e5a'     // Red
    }[type];

    const emoji = {
      created: '🆕',
      updated: '🔄',
      completed: '✅',
      deleted: '🗑️'
    }[type];

    try {
      await this.client.chat.postMessage({
        channel,
        text: `${emoji} Project ${type}: ${project.name}`,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Project',
                value: project.name,
                short: true
              },
              {
                title: 'Status',
                value: project.status,
                short: true
              },
              {
                title: 'Message',
                value: message,
                short: false
              }
            ],
            footer: 'Business Platform',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack project notification:', error);
    }
  }

  async sendTaskNotification(task: Task, project: Project, user: User, type: 'assigned' | 'updated' | 'completed') {
    if (!this.client) return;

    const channel = this.config.channels.notifications || this.config.channels.general;
    if (!channel) return;

    const emoji = {
      assigned: '📋',
      updated: '🔄',
      completed: '✅'
    }[type];

    const color = {
      assigned: '#36a64f',
      updated: '#ff9500',
      completed: '#2eb886'
    }[type];

    try {
      await this.client.chat.postMessage({
        channel,
        text: `${emoji} Task ${type}: ${task.title}`,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Task',
                value: task.title,
                short: true
              },
              {
                title: 'Project',
                value: project.name,
                short: true
              },
              {
                title: 'Assignee',
                value: `${user.firstName} ${user.lastName}`,
                short: true
              },
              {
                title: 'Priority',
                value: task.priority,
                short: true
              },
              {
                title: 'Due Date',
                value: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set',
                short: true
              },
              {
                title: 'Status',
                value: task.status,
                short: true
              }
            ],
            footer: 'Business Platform',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack task notification:', error);
    }
  }

  async sendAlert(message: string, severity: 'info' | 'warning' | 'error') {
    if (!this.client) return;

    const channel = this.config.channels.alerts || this.config.channels.general;
    if (!channel) return;

    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨'
    }[severity];

    const color = {
      info: '#36a64f',
      warning: '#ff9500',
      error: '#e01e5a'
    }[severity];

    try {
      await this.client.chat.postMessage({
        channel,
        text: `${emoji} ${severity.toUpperCase()}: ${message}`,
        attachments: [
          {
            color,
            text: message,
            footer: 'Business Platform Alert',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  async sendDailyDigest(stats: {
    completedTasks: number;
    newProjects: number;
    overdueItems: number;
    teamActivity: string[];
  }) {
    if (!this.client) return;

    const channel = this.config.channels.general;
    if (!channel) return;

    try {
      await this.client.chat.postMessage({
        channel,
        text: '📊 Daily Business Digest',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📊 Daily Business Digest'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Tasks Completed:* ${stats.completedTasks}`
              },
              {
                type: 'mrkdwn',
                text: `*New Projects:* ${stats.newProjects}`
              },
              {
                type: 'mrkdwn',
                text: `*Overdue Items:* ${stats.overdueItems}`
              },
              {
                type: 'mrkdwn',
                text: `*Team Activity:* ${stats.teamActivity.length} updates`
              }
            ]
          },
          ...(stats.teamActivity.length > 0 ? [{
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*Recent Activity:*\n${stats.teamActivity.slice(0, 5).join('\n')}`
            }
          }] : []),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Generated on ${new Date().toLocaleDateString()} | Business Platform`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack daily digest:', error);
    }
  }

  // Webhook handlers
  async sendWebhookNotification(webhookUrl: string, payload: any) {
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  async sendTaskWebhook(task: Task, project: Project, action: string) {
    const webhookUrl = this.config.webhooks.taskUpdates;
    if (!webhookUrl) return;

    const payload = {
      text: `Task ${action}: ${task.title}`,
      attachments: [
        {
          color: action === 'completed' ? '#2eb886' : '#36a64f',
          fields: [
            { title: 'Task', value: task.title, short: true },
            { title: 'Project', value: project.name, short: true },
            { title: 'Status', value: task.status, short: true },
            { title: 'Priority', value: task.priority, short: true },
          ]
        }
      ]
    };

    await this.sendWebhookNotification(webhookUrl, payload);
  }

  async sendProjectWebhook(project: Project, action: string) {
    const webhookUrl = this.config.webhooks.projectUpdates;
    if (!webhookUrl) return;

    const payload = {
      text: `Project ${action}: ${project.name}`,
      attachments: [
        {
          color: '#36a64f',
          fields: [
            { title: 'Project', value: project.name, short: true },
            { title: 'Status', value: project.status, short: true },
            { title: 'Type', value: project.type, short: true },
          ]
        }
      ]
    };

    await this.sendWebhookNotification(webhookUrl, payload);
  }
}