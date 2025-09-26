import { SlackIntegration, type SlackConfig } from './slack';
import { GitHubIntegration, type GitHubConfig } from './github';
import { TeamsIntegration, type TeamsConfig } from './teams';
import type { User, Project, Task, Client } from '@shared/schema';

export interface IntegrationConfig {
  slack: SlackConfig;
  github: GitHubConfig;
  teams: TeamsConfig;
  features: {
    crossPlatformNotifications: boolean;
    autoSyncEnabled: boolean;
    webhookRetries: number;
    webhookTimeout: number;
  };
}

export interface IntegrationStats {
  slack: {
    enabled: boolean;
    messagessent: number;
    lastMessage?: Date;
    status: 'connected' | 'disconnected' | 'error';
  };
  github: {
    enabled: boolean;
    issuesCreated: number;
    lastSync?: Date;
    repositories: number;
    status: 'connected' | 'disconnected' | 'error';
  };
  teams: {
    enabled: boolean;
    messagessSent: number;
    lastMessage?: Date;
    status: 'connected' | 'disconnected' | 'error';
  };
}

export class IntegrationManager {
  private slack: SlackIntegration;
  private github: GitHubIntegration;
  private teams: TeamsIntegration;
  private config: IntegrationConfig;
  private stats: IntegrationStats;

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.slack = new SlackIntegration(config.slack);
    this.github = new GitHubIntegration(config.github);
    this.teams = new TeamsIntegration(config.teams);

    this.stats = {
      slack: { enabled: false, messagessSent: 0, status: 'disconnected' },
      github: { enabled: false, issuesCreated: 0, repositories: 0, status: 'disconnected' },
      teams: { enabled: false, messagessSent: 0, status: 'disconnected' }
    };
  }

  async initialize(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let slackConnected = false;
    let githubConnected = false;
    let teamsConnected = false;

    // Initialize Slack
    try {
      slackConnected = await this.slack.initialize();
      this.stats.slack.enabled = slackConnected;
      this.stats.slack.status = slackConnected ? 'connected' : 'disconnected';
      if (slackConnected) {
        console.log('✅ Slack integration initialized successfully');
      }
    } catch (error) {
      const message = `Slack initialization failed: ${error}`;
      errors.push(message);
      this.stats.slack.status = 'error';
      console.error('❌', message);
    }

    // Initialize GitHub
    try {
      githubConnected = await this.github.initialize();
      this.stats.github.enabled = githubConnected;
      this.stats.github.status = githubConnected ? 'connected' : 'disconnected';
      if (githubConnected) {
        console.log('✅ GitHub integration initialized successfully');
      }
    } catch (error) {
      const message = `GitHub initialization failed: ${error}`;
      errors.push(message);
      this.stats.github.status = 'error';
      console.error('❌', message);
    }

    // Initialize Teams
    try {
      teamsConnected = await this.teams.initialize();
      this.stats.teams.enabled = teamsConnected;
      this.stats.teams.status = teamsConnected ? 'connected' : 'disconnected';
      if (teamsConnected) {
        console.log('✅ Microsoft Teams integration initialized successfully');
      }
    } catch (error) {
      const message = `Teams initialization failed: ${error}`;
      errors.push(message);
      this.stats.teams.status = 'error';
      console.error('❌', message);
    }

    const success = slackConnected || githubConnected || teamsConnected;
    console.log(`🔗 Integration Manager initialized: ${errors.length === 0 ? 'All services connected' : `${errors.length} errors occurred`}`);

    return { success, errors };
  }

  // Project notifications
  async notifyProjectEvent(
    project: Project,
    message: string,
    type: 'created' | 'updated' | 'completed' | 'deleted'
  ) {
    const promises: Promise<void>[] = [];

    if (this.stats.slack.enabled) {
      promises.push(
        this.slack.sendProjectNotification(project, message, type)
          .then(() => {
            this.stats.slack.messagessSent++;
            this.stats.slack.lastMessage = new Date();
          })
          .catch(error => console.error('Slack project notification failed:', error))
      );
    }

    if (this.stats.teams.enabled) {
      promises.push(
        this.teams.sendProjectNotification(project, message, type)
          .then(() => {
            this.stats.teams.messagessSent++;
            this.stats.teams.lastMessage = new Date();
          })
          .catch(error => console.error('Teams project notification failed:', error))
      );
    }

    await Promise.allSettled(promises);
  }

  // Task notifications
  async notifyTaskEvent(
    task: Task,
    project: Project,
    user: User,
    type: 'assigned' | 'updated' | 'completed'
  ) {
    const promises: Promise<void>[] = [];

    // Send notifications to communication platforms
    if (this.stats.slack.enabled) {
      promises.push(
        this.slack.sendTaskNotification(task, project, user, type)
          .then(() => {
            this.stats.slack.messagessSent++;
            this.stats.slack.lastMessage = new Date();
          })
          .catch(error => console.error('Slack task notification failed:', error))
      );
    }

    if (this.stats.teams.enabled) {
      promises.push(
        this.teams.sendTaskNotification(task, project, user, type)
          .then(() => {
            this.stats.teams.messagessSent++;
            this.stats.teams.lastMessage = new Date();
          })
          .catch(error => console.error('Teams task notification failed:', error))
      );
    }

    // Create GitHub issue if task is created or updated
    if (this.stats.github.enabled && (type === 'assigned' || type === 'updated')) {
      promises.push(
        this.github.createIssueFromTask(task, project)
          .then(issueUrl => {
            if (issueUrl) {
              this.stats.github.issuesCreated++;
              console.log('Created GitHub issue:', issueUrl);
            }
          })
          .catch(error => console.error('GitHub issue creation failed:', error))
      );
    }

    await Promise.allSettled(promises);
  }

  // Alert notifications
  async sendAlert(message: string, severity: 'info' | 'warning' | 'error') {
    const promises: Promise<void>[] = [];

    if (this.stats.slack.enabled) {
      promises.push(
        this.slack.sendAlert(message, severity)
          .then(() => {
            this.stats.slack.messagessSent++;
            this.stats.slack.lastMessage = new Date();
          })
          .catch(error => console.error('Slack alert failed:', error))
      );
    }

    if (this.stats.teams.enabled) {
      promises.push(
        this.teams.sendAlert(message, severity)
          .then(() => {
            this.stats.teams.messagessSent++;
            this.stats.teams.lastMessage = new Date();
          })
          .catch(error => console.error('Teams alert failed:', error))
      );
    }

    await Promise.allSettled(promises);
  }

  // Daily digest
  async sendDailyDigest(stats: {
    completedTasks: number;
    newProjects: number;
    overdueItems: number;
    teamActivity: string[];
  }) {
    const promises: Promise<void>[] = [];

    if (this.stats.slack.enabled) {
      promises.push(
        this.slack.sendDailyDigest(stats)
          .then(() => {
            this.stats.slack.messagessSent++;
            this.stats.slack.lastMessage = new Date();
          })
          .catch(error => console.error('Slack digest failed:', error))
      );
    }

    if (this.stats.teams.enabled) {
      promises.push(
        this.teams.sendDailyDigest(stats)
          .then(() => {
            this.stats.teams.messagessSent++;
            this.stats.teams.lastMessage = new Date();
          })
          .catch(error => console.error('Teams digest failed:', error))
      );
    }

    await Promise.allSettled(promises);
  }

  // GitHub-specific methods
  async syncRepositoryData(owner: string, repo: string) {
    if (!this.stats.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    const data = await this.github.syncRepositoryData(owner, repo);
    this.stats.github.lastSync = new Date();
    return data;
  }

  async createProjectFromRepository(owner: string, repo: string) {
    if (!this.stats.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    return await this.github.createProjectFromRepository(owner, repo);
  }

  async getCommitActivity(owner: string, repo: string, since?: Date) {
    if (!this.stats.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    return await this.github.getCommitActivity(owner, repo, since);
  }

  async setupGitHubWebhook(owner: string, repo: string, callbackUrl: string) {
    if (!this.stats.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    return await this.github.createWebhook(owner, repo, callbackUrl);
  }

  // Webhook handlers
  handleGitHubWebhook(event: string, payload: any) {
    if (!this.stats.github.enabled) return null;

    const processed = this.github.handleWebhookEvent(event, payload);

    if (processed && this.config.features.crossPlatformNotifications) {
      // Send notifications to Slack/Teams about GitHub events
      this.notifyGitHubEvent(processed.type, processed.action, processed.data);
    }

    return processed;
  }

  private async notifyGitHubEvent(type: string, action: string, data: any) {
    const message = this.formatGitHubEventMessage(type, action, data);

    if (message) {
      const promises: Promise<void>[] = [];

      if (this.stats.slack.enabled) {
        promises.push(
          this.slack.sendAlert(message, 'info')
            .catch(error => console.error('Failed to send GitHub event to Slack:', error))
        );
      }

      if (this.stats.teams.enabled) {
        promises.push(
          this.teams.sendCustomMessage(`GitHub ${type} ${action}`, message, 'Good')
            .catch(error => console.error('Failed to send GitHub event to Teams:', error))
        );
      }

      await Promise.allSettled(promises);
    }
  }

  private formatGitHubEventMessage(type: string, action: string, data: any): string | null {
    switch (type) {
      case 'commit':
        return `📝 New commits pushed to ${data.repository}: ${data.commits.length} commits by ${data.pusher.name}`;

      case 'pull_request':
        return `🔀 Pull request ${action} in ${data.repository}: "${data.pullRequest.title}" by ${data.sender.login}`;

      case 'issue':
        return `🐛 Issue ${action} in ${data.repository}: "${data.issue.title}" by ${data.sender.login}`;

      case 'comment':
        return `💬 New comment on issue in ${data.repository}: "${data.issue.title}" by ${data.sender.login}`;

      default:
        return null;
    }
  }

  // Health checks
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      slack: { status: string; message: string };
      github: { status: string; message: string };
      teams: { status: string; message: string };
    };
  }> {
    const services = {
      slack: {
        status: this.stats.slack.status,
        message: this.stats.slack.enabled
          ? `Connected - ${this.stats.slack.messagessSent} messages sent`
          : 'Disabled or not configured'
      },
      github: {
        status: this.stats.github.status,
        message: this.stats.github.enabled
          ? `Connected - ${this.stats.github.issuesCreated} issues created`
          : 'Disabled or not configured'
      },
      teams: {
        status: this.stats.teams.status,
        message: this.stats.teams.enabled
          ? `Connected - ${this.stats.teams.messagessSent} messages sent`
          : 'Disabled or not configured'
      }
    };

    const enabledServices = Object.values(services).filter(s => s.status === 'connected').length;
    const errorServices = Object.values(services).filter(s => s.status === 'error').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (errorServices > 0) {
      overall = enabledServices > 0 ? 'degraded' : 'unhealthy';
    } else {
      overall = enabledServices > 0 ? 'healthy' : 'unhealthy';
    }

    return { overall, services };
  }

  // Statistics
  getStats(): IntegrationStats {
    return { ...this.stats };
  }

  // Update configuration
  async updateConfig(newConfig: Partial<IntegrationConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize services if their config changed
    if (newConfig.slack) {
      this.slack = new SlackIntegration(this.config.slack);
      await this.slack.initialize();
    }

    if (newConfig.github) {
      this.github = new GitHubIntegration(this.config.github);
      await this.github.initialize();
    }

    if (newConfig.teams) {
      this.teams = new TeamsIntegration(this.config.teams);
      await this.teams.initialize();
    }
  }

  // Batch operations
  async sendCrossplatformMessage(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info') {
    const promises: Promise<void>[] = [];

    if (this.stats.slack.enabled) {
      promises.push(
        this.slack.sendAlert(`${title}: ${message}`, type)
          .catch(error => console.error('Slack message failed:', error))
      );
    }

    if (this.stats.teams.enabled) {
      const teamsColor = type === 'error' ? 'Attention' : type === 'warning' ? 'Warning' : 'Good';
      promises.push(
        this.teams.sendCustomMessage(title, message, teamsColor)
          .catch(error => console.error('Teams message failed:', error))
      );
    }

    await Promise.allSettled(promises);
  }

  // Support ticket notifications
  async notifyTicketEvent(
    ticket: any,
    type: 'created' | 'updated' | 'escalated' | 'resolved' | 'sla_breach',
    metadata?: { escalationLevel?: number; reason?: string; assignedUser?: any }
  ) {
    const promises = [];

    const message = this.formatTicketEventMessage(ticket, type, metadata);
    if (!message) return;

    // Slack notification
    if (this.config.slack.enabled) {
      promises.push(
        this.slack.sendMessage(
          this.config.slack.channels.notifications || this.config.slack.channels.general,
          message,
          this.getTicketPriority(ticket.priority, type),
          {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            type,
            metadata
          }
        ).catch(error => {
          console.error('Failed to send Slack ticket notification:', error);
          this.stats.slack.status = 'error';
        })
      );
    }

    // Teams notification
    if (this.config.teams.enabled) {
      promises.push(
        this.teams.sendTicketNotification(ticket, type, metadata).catch(error => {
          console.error('Failed to send Teams ticket notification:', error);
          this.stats.teams.status = 'error';
        })
      );
    }

    await Promise.allSettled(promises);

    // Update stats
    this.stats.slack.lastMessage = new Date();
    this.stats.teams.lastMessage = new Date();
  }

  // Support escalation notifications (high priority)
  async notifyEscalation(
    ticket: any,
    escalationLevel: number,
    reason: string,
    assignedUser: any
  ) {
    await this.notifyTicketEvent(ticket, 'escalated', {
      escalationLevel,
      reason,
      assignedUser
    });
  }

  // SLA breach notifications (urgent)
  async notifySLABreach(ticket: any) {
    await this.notifyTicketEvent(ticket, 'sla_breach');
  }

  private formatTicketEventMessage(
    ticket: any,
    type: 'created' | 'updated' | 'escalated' | 'resolved' | 'sla_breach',
    metadata?: any
  ): string | null {
    const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support?ticket=${ticket.id}`;
    const priorityEmoji = this.getPriorityEmoji(ticket.priority);
    const statusEmoji = this.getStatusEmoji(type);

    switch (type) {
      case 'created':
        return `${statusEmoji} **New Support Ticket Created**\n` +
               `${priorityEmoji} **#${ticket.ticketNumber}** - ${ticket.title}\n` +
               `**Priority:** ${ticket.priority || 'Medium'} | **Category:** ${ticket.category || 'General'}\n` +
               `**Client:** ${ticket.clientName || 'Internal'}\n` +
               `[View Ticket](${ticketUrl})`;

      case 'escalated':
        return `🚨 **TICKET ESCALATED - Level ${metadata?.escalationLevel}**\n` +
               `${priorityEmoji} **#${ticket.ticketNumber}** - ${ticket.title}\n` +
               `**Assigned to:** ${metadata?.assignedUser?.firstName} ${metadata?.assignedUser?.lastName}\n` +
               `**Reason:** ${metadata?.reason}\n` +
               `**Action Required:** Immediate attention needed\n` +
               `[View Ticket](${ticketUrl})`;

      case 'sla_breach':
        return `⚠️ **SLA BREACH ALERT**\n` +
               `${priorityEmoji} **#${ticket.ticketNumber}** - ${ticket.title}\n` +
               `**Status:** ${ticket.status} | **Priority:** ${ticket.priority}\n` +
               `**Created:** ${new Date(ticket.createdAt).toLocaleString()}\n` +
               `**URGENT:** SLA has been breached - immediate action required\n` +
               `[Resolve Now](${ticketUrl})`;

      case 'resolved':
        return `✅ **Ticket Resolved**\n` +
               `${priorityEmoji} **#${ticket.ticketNumber}** - ${ticket.title}\n` +
               `**Resolution Time:** ${this.calculateResolutionTime(ticket)}\n` +
               `[View Details](${ticketUrl})`;

      case 'updated':
        return `📝 **Ticket Updated**\n` +
               `${priorityEmoji} **#${ticket.ticketNumber}** - ${ticket.title}\n` +
               `**Status:** ${ticket.status} | **Priority:** ${ticket.priority}\n` +
               `[View Ticket](${ticketUrl})`;

      default:
        return null;
    }
  }

  private getPriorityEmoji(priority?: string): string {
    switch (priority?.toLowerCase()) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🔵';
    }
  }

  private getStatusEmoji(type: string): string {
    switch (type) {
      case 'created': return '🎫';
      case 'escalated': return '🚨';
      case 'sla_breach': return '⚠️';
      case 'resolved': return '✅';
      case 'updated': return '📝';
      default: return '📋';
    }
  }

  private getTicketPriority(priority?: string, type?: string): 'low' | 'normal' | 'high' | 'urgent' {
    if (type === 'escalated' || type === 'sla_breach') return 'urgent';
    if (priority === 'urgent') return 'urgent';
    if (priority === 'high') return 'high';
    return 'normal';
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

// Default configuration
export const defaultIntegrationConfig: IntegrationConfig = {
  slack: {
    enabled: false,
    channels: {},
    webhooks: {}
  },
  github: {
    enabled: false,
    repositories: [],
    sync: {
      createIssuesFromTasks: false,
      createProjectsFromRepos: false,
      syncCommitsToTasks: false,
      syncPRsToTasks: false
    }
  },
  teams: {
    enabled: false,
    channels: {},
    features: {
      sendProjectUpdates: true,
      sendTaskNotifications: true,
      sendDailyDigests: true,
      sendAlerts: true
    }
  },
  features: {
    crossPlatformNotifications: true,
    autoSyncEnabled: true,
    webhookRetries: 3,
    webhookTimeout: 5000
  }
};

// Export integrations individually as well
export { SlackIntegration, GitHubIntegration, TeamsIntegration };
export type { SlackConfig, GitHubConfig, TeamsConfig };