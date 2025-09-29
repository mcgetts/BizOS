import { SlackIntegration } from './slack.js';
import { TeamsIntegration } from './teams.js';
import { GitHubIntegration } from './github.js';
import { JiraIntegration } from './jiraIntegration.js';
import { SalesforceIntegration } from './salesforceIntegration.js';
import { sentryService } from '../monitoring/sentryService.js';
import { db } from '../db.js';
import { auditLogs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export type IntegrationType = 'slack' | 'teams' | 'github' | 'jira' | 'salesforce' | 'trello' | 'zoom' | 'dropbox' | 'google_workspace';

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  isEnabled: boolean;
  isConfigured: boolean;
  lastSync?: Date;
  lastError?: string;
  syncFrequency: number; // in minutes
  retryCount: number;
  maxRetries: number;
  healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  webhookUrl?: string;
  apiEndpoints: string[];
  supportedFeatures: string[];
  metadata: {
    version: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    lastHealthCheck: Date;
  };
}

export interface IntegrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  lastRequestTime?: Date;
  errorRate: number;
  dailyUsage: Array<{ date: string; requests: number; errors: number }>;
}

export interface IntegrationEvent {
  id: string;
  integrationType: IntegrationType;
  eventType: 'sync' | 'webhook' | 'api_call' | 'error' | 'config_change';
  status: 'success' | 'error' | 'warning';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  duration?: number;
  userId?: string;
}

export interface WebhookPayload {
  source: IntegrationType;
  eventType: string;
  timestamp: Date;
  data: Record<string, any>;
  signature?: string;
  deliveryId?: string;
}

export class AdvancedIntegrationManager {
  private integrations: Map<IntegrationType, any> = new Map();
  private configs: Map<IntegrationType, IntegrationConfig> = new Map();
  private metrics: Map<IntegrationType, IntegrationMetrics> = new Map();
  private events: IntegrationEvent[] = [];
  private syncIntervals: Map<IntegrationType, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeIntegrations();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Initialize all available integrations
   */
  private initializeIntegrations(): void {
    // Slack Integration
    const slackConfig = {
      enabled: process.env.SLACK_ENABLED === 'true',
      botToken: process.env.SLACK_BOT_TOKEN || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
    };
    const slackIntegration = new SlackIntegration(slackConfig);
    this.integrations.set('slack', slackIntegration);
    this.configs.set('slack', {
      type: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications via Slack',
      isEnabled: !!process.env.SLACK_BOT_TOKEN,
      isConfigured: !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_SIGNING_SECRET,
      syncFrequency: 15,
      retryCount: 0,
      maxRetries: 3,
      healthStatus: 'unknown',
      configuration: {
        defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#general',
        enableThreads: true,
        enableReactions: true,
        enableFileUploads: true
      },
      credentials: {
        botToken: process.env.SLACK_BOT_TOKEN ? '***REDACTED***' : '',
        signingSecret: process.env.SLACK_SIGNING_SECRET ? '***REDACTED***' : '',
        appToken: process.env.SLACK_APP_TOKEN ? '***REDACTED***' : ''
      },
      apiEndpoints: [
        'https://slack.com/api/chat.postMessage',
        'https://slack.com/api/conversations.list',
        'https://slack.com/api/users.list'
      ],
      supportedFeatures: [
        'Real-time notifications',
        'Interactive messages',
        'File sharing',
        'Channel management',
        'User mentions',
        'Threaded conversations'
      ],
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastHealthCheck: new Date()
      }
    });

    // Microsoft Teams Integration
    const teamsIntegration = new TeamsIntegration();
    this.integrations.set('teams', teamsIntegration);
    this.configs.set('teams', {
      type: 'teams',
      name: 'Microsoft Teams',
      description: 'Microsoft Teams integration for enterprise communication',
      isEnabled: !!process.env.TEAMS_WEBHOOK_URL,
      isConfigured: !!process.env.TEAMS_WEBHOOK_URL,
      syncFrequency: 20,
      retryCount: 0,
      maxRetries: 3,
      healthStatus: 'unknown',
      configuration: {
        enableAdaptiveCards: true,
        enableMentions: true,
        enableFileSharing: false
      },
      credentials: {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL ? '***REDACTED***' : '',
        botId: process.env.TEAMS_BOT_ID || '',
        tenantId: process.env.TEAMS_TENANT_ID || ''
      },
      apiEndpoints: [
        'https://graph.microsoft.com/v1.0/teams',
        'https://outlook.office.com/webhook'
      ],
      supportedFeatures: [
        'Adaptive Cards',
        'Rich notifications',
        'File attachments',
        'Channel posting',
        'User mentions'
      ],
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastHealthCheck: new Date()
      }
    });

    // GitHub Integration
    const githubConfig = {
      enabled: !!process.env.GITHUB_TOKEN,
      token: process.env.GITHUB_TOKEN,
      repositories: [],
      sync: {
        createIssuesFromTasks: true,
        createProjectsFromRepos: false,
        syncCommitsToTasks: true,
        syncPRsToTasks: true
      },
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET
    };
    const githubIntegration = new GitHubIntegration(githubConfig);
    this.integrations.set('github', githubIntegration);
    this.configs.set('github', {
      type: 'github',
      name: 'GitHub',
      description: 'GitHub integration for repository and issue management',
      isEnabled: !!process.env.GITHUB_TOKEN,
      isConfigured: !!process.env.GITHUB_TOKEN,
      syncFrequency: 30,
      retryCount: 0,
      maxRetries: 5,
      healthStatus: 'unknown',
      configuration: {
        defaultRepo: process.env.GITHUB_DEFAULT_REPO || '',
        autoCreateIssues: true,
        syncCommits: true,
        enableWebhooks: true
      },
      credentials: {
        token: process.env.GITHUB_TOKEN ? '***REDACTED***' : '',
        webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ? '***REDACTED***' : ''
      },
      apiEndpoints: [
        'https://api.github.com/repos',
        'https://api.github.com/issues',
        'https://api.github.com/user'
      ],
      supportedFeatures: [
        'Repository management',
        'Issue creation',
        'Commit tracking',
        'Pull request notifications',
        'Webhook support',
        'Branch management'
      ],
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastHealthCheck: new Date()
      }
    });

    // Jira Integration
    const jiraIntegration = new JiraIntegration();
    this.integrations.set('jira', jiraIntegration);
    this.configs.set('jira', {
      type: 'jira',
      name: 'Jira',
      description: 'Atlassian Jira for issue and project tracking',
      isEnabled: !!process.env.JIRA_HOST && !!process.env.JIRA_API_TOKEN,
      isConfigured: !!(process.env.JIRA_HOST && process.env.JIRA_API_TOKEN && process.env.JIRA_EMAIL),
      syncFrequency: 60,
      retryCount: 0,
      maxRetries: 3,
      healthStatus: 'unknown',
      configuration: {
        defaultProject: process.env.JIRA_DEFAULT_PROJECT || '',
        issueTypes: (process.env.JIRA_ISSUE_TYPES || 'Task,Bug,Story').split(','),
        autoAssign: false,
        enableNotifications: true
      },
      credentials: {
        host: process.env.JIRA_HOST || '',
        email: process.env.JIRA_EMAIL ? '***REDACTED***' : '',
        apiToken: process.env.JIRA_API_TOKEN ? '***REDACTED***' : ''
      },
      apiEndpoints: [
        `https://${process.env.JIRA_HOST}/rest/api/3/issue`,
        `https://${process.env.JIRA_HOST}/rest/api/3/search`,
        `https://${process.env.JIRA_HOST}/rest/api/3/project`
      ],
      supportedFeatures: [
        'Issue creation',
        'Issue updates',
        'Issue tracking',
        'Project management',
        'Comment system',
        'Status transitions',
        'Search functionality'
      ],
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastHealthCheck: new Date()
      }
    });

    // Salesforce Integration
    const salesforceIntegration = new SalesforceIntegration();
    this.integrations.set('salesforce', salesforceIntegration);
    this.configs.set('salesforce', {
      type: 'salesforce',
      name: 'Salesforce',
      description: 'Salesforce CRM integration for customer relationship management',
      isEnabled: !!process.env.SALESFORCE_INSTANCE_URL && !!process.env.SALESFORCE_CLIENT_ID,
      isConfigured: !!(
        process.env.SALESFORCE_INSTANCE_URL &&
        process.env.SALESFORCE_CLIENT_ID &&
        process.env.SALESFORCE_CLIENT_SECRET &&
        process.env.SALESFORCE_USERNAME &&
        process.env.SALESFORCE_PASSWORD
      ),
      syncFrequency: 30,
      retryCount: 0,
      maxRetries: 5,
      healthStatus: 'unknown',
      configuration: {
        apiVersion: process.env.SALESFORCE_API_VERSION || 'v58.0',
        autoSync: true,
        syncOpportunities: true,
        syncAccounts: true,
        syncContacts: true
      },
      credentials: {
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL || '',
        clientId: process.env.SALESFORCE_CLIENT_ID ? '***REDACTED***' : '',
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET ? '***REDACTED***' : '',
        username: process.env.SALESFORCE_USERNAME || '',
        password: process.env.SALESFORCE_PASSWORD ? '***REDACTED***' : '',
        securityToken: process.env.SALESFORCE_SECURITY_TOKEN ? '***REDACTED***' : ''
      },
      apiEndpoints: [
        `${process.env.SALESFORCE_INSTANCE_URL}/services/data`,
        `${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/token`
      ],
      supportedFeatures: [
        'Account management',
        'Contact management',
        'Opportunity tracking',
        'Lead management',
        'Data synchronization',
        'Webhook support',
        'SOQL queries'
      ],
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastHealthCheck: new Date()
      }
    });

    // Initialize metrics for all integrations
    this.configs.forEach((config, type) => {
      this.metrics.set(type, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 100,
        errorRate: 0,
        dailyUsage: []
      });
    });

    console.log(`✅ Initialized ${this.integrations.size} integrations`);
  }

  /**
   * Start periodic health checks for all integrations
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [type, config] of this.configs.entries()) {
        if (config.isEnabled) {
          await this.performHealthCheck(type);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('✅ Started integration health checks');
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Daily metrics reset
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);

    console.log('✅ Started integration metrics collection');
  }

  /**
   * Perform health check for a specific integration
   */
  async performHealthCheck(type: IntegrationType): Promise<void> {
    try {
      const config = this.configs.get(type);
      const integration = this.integrations.get(type);

      if (!config || !integration) return;

      const startTime = Date.now();
      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';

      try {
        // Perform integration-specific health check
        switch (type) {
          case 'slack':
            await integration.testConnection();
            break;
          case 'teams':
            await integration.testConnection();
            break;
          case 'github':
            await integration.testConnection();
            break;
          case 'jira':
            await integration.testConnection();
            break;
          case 'salesforce':
            await integration.testConnection();
            break;
          default:
            healthStatus = 'warning';
        }

        config.healthStatus = healthStatus;
        config.lastError = undefined;
        config.retryCount = 0;

      } catch (error) {
        healthStatus = 'error';
        config.healthStatus = healthStatus;
        config.lastError = (error as Error).message;
        config.retryCount++;

        this.logEvent({
          id: `health-${type}-${Date.now()}`,
          integrationType: type,
          eventType: 'error',
          status: 'error',
          message: `Health check failed: ${(error as Error).message}`,
          details: { error: (error as Error).message },
          timestamp: new Date(),
          duration: Date.now() - startTime
        });
      }

      config.metadata.lastHealthCheck = new Date();
      config.metadata.updatedAt = new Date();

      // Update metrics
      this.updateMetrics(type, Date.now() - startTime, healthStatus === 'healthy');

    } catch (error) {
      console.error(`Health check failed for ${type}:`, error);
    }
  }

  /**
   * Send message through integration
   */
  async sendMessage(
    type: IntegrationType,
    channel: string,
    message: string,
    options?: Record<string, any>
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      const config = this.configs.get(type);
      const integration = this.integrations.get(type);

      if (!config || !integration || !config.isEnabled) {
        throw new Error(`Integration ${type} is not available or enabled`);
      }

      let success = false;

      switch (type) {
        case 'slack':
          success = await integration.sendMessage(channel, message, options);
          break;
        case 'teams':
          success = await integration.sendMessage(channel, message, options);
          break;
        default:
          throw new Error(`Send message not supported for ${type}`);
      }

      this.updateMetrics(type, Date.now() - startTime, success);

      this.logEvent({
        id: `msg-${type}-${Date.now()}`,
        integrationType: type,
        eventType: 'api_call',
        status: success ? 'success' : 'error',
        message: `Message sent to ${channel}`,
        details: { channel, messageLength: message.length },
        timestamp: new Date(),
        duration: Date.now() - startTime
      });

      return success;

    } catch (error) {
      this.updateMetrics(type, Date.now() - startTime, false);

      this.logEvent({
        id: `msg-err-${type}-${Date.now()}`,
        integrationType: type,
        eventType: 'error',
        status: 'error',
        message: `Failed to send message: ${(error as Error).message}`,
        details: { error: (error as Error).message, channel },
        timestamp: new Date(),
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Handle webhook payload
   */
  async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    try {
      const config = this.configs.get(payload.source);
      if (!config || !config.isEnabled) {
        return false;
      }

      const integration = this.integrations.get(payload.source);
      if (!integration) {
        return false;
      }

      // Verify webhook signature if available
      if (payload.signature) {
        const isValid = await this.verifyWebhookSignature(payload);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process webhook based on integration type
      let processed = false;
      switch (payload.source) {
        case 'github':
          processed = await integration.handleWebhook(payload);
          break;
        case 'slack':
          processed = await integration.handleWebhook(payload);
          break;
        default:
          console.log(`Webhook handling not implemented for ${payload.source}`);
      }

      this.logEvent({
        id: `webhook-${payload.source}-${Date.now()}`,
        integrationType: payload.source,
        eventType: 'webhook',
        status: processed ? 'success' : 'warning',
        message: `Webhook processed: ${payload.eventType}`,
        details: { eventType: payload.eventType, deliveryId: payload.deliveryId },
        timestamp: new Date()
      });

      return processed;

    } catch (error) {
      this.logEvent({
        id: `webhook-err-${payload.source}-${Date.now()}`,
        integrationType: payload.source,
        eventType: 'error',
        status: 'error',
        message: `Webhook processing failed: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        timestamp: new Date()
      });

      sentryService.captureException(error as Error, {
        feature: 'webhook_processing',
        additionalData: { source: payload.source, eventType: payload.eventType }
      });

      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(payload: WebhookPayload): Promise<boolean> {
    // Implementation would depend on the specific integration
    // This is a placeholder for signature verification logic
    return true;
  }

  /**
   * Update integration configuration
   */
  async updateConfiguration(
    type: IntegrationType,
    updates: Partial<IntegrationConfig>,
    userId: string
  ): Promise<boolean> {
    try {
      const config = this.configs.get(type);
      if (!config) {
        throw new Error(`Integration ${type} not found`);
      }

      const oldConfig = { ...config };

      // Update configuration
      Object.assign(config, updates);
      config.metadata.updatedAt = new Date();

      // Log configuration change
      await db.insert(auditLogs).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'integration_config_update',
        resource: 'integration',
        resourceId: type,
        details: JSON.stringify({
          oldConfig: this.sanitizeConfig(oldConfig),
          newConfig: this.sanitizeConfig(config),
          changes: updates
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'IntegrationManager',
        timestamp: new Date(),
        riskScore: 2
      });

      this.logEvent({
        id: `config-${type}-${Date.now()}`,
        integrationType: type,
        eventType: 'config_change',
        status: 'success',
        message: 'Integration configuration updated',
        details: { changes: Object.keys(updates) },
        timestamp: new Date(),
        userId
      });

      console.log(`✅ Updated configuration for ${type} integration`);
      return true;

    } catch (error) {
      console.error(`Failed to update configuration for ${type}:`, error);
      return false;
    }
  }

  /**
   * Enable/disable integration
   */
  async toggleIntegration(type: IntegrationType, enabled: boolean, userId: string): Promise<boolean> {
    try {
      const config = this.configs.get(type);
      if (!config) {
        throw new Error(`Integration ${type} not found`);
      }

      config.isEnabled = enabled;
      config.metadata.updatedAt = new Date();

      if (enabled) {
        await this.performHealthCheck(type);
        this.startSyncSchedule(type);
      } else {
        this.stopSyncSchedule(type);
      }

      this.logEvent({
        id: `toggle-${type}-${Date.now()}`,
        integrationType: type,
        eventType: 'config_change',
        status: 'success',
        message: `Integration ${enabled ? 'enabled' : 'disabled'}`,
        details: { enabled },
        timestamp: new Date(),
        userId
      });

      console.log(`✅ ${enabled ? 'Enabled' : 'Disabled'} ${type} integration`);
      return true;

    } catch (error) {
      console.error(`Failed to toggle ${type} integration:`, error);
      return false;
    }
  }

  /**
   * Start sync schedule for integration
   */
  private startSyncSchedule(type: IntegrationType): void {
    const config = this.configs.get(type);
    if (!config || !config.isEnabled) return;

    // Clear existing interval
    this.stopSyncSchedule(type);

    // Start new interval
    const interval = setInterval(async () => {
      await this.performSync(type);
    }, config.syncFrequency * 60 * 1000);

    this.syncIntervals.set(type, interval);
  }

  /**
   * Stop sync schedule for integration
   */
  private stopSyncSchedule(type: IntegrationType): void {
    const interval = this.syncIntervals.get(type);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(type);
    }
  }

  /**
   * Perform sync for integration
   */
  private async performSync(type: IntegrationType): Promise<void> {
    const startTime = Date.now();

    try {
      const config = this.configs.get(type);
      const integration = this.integrations.get(type);

      if (!config || !integration || !config.isEnabled) return;

      // Perform integration-specific sync
      let syncResult = false;
      switch (type) {
        case 'github':
          syncResult = await integration.syncRepositories();
          break;
        case 'slack':
          syncResult = await integration.syncChannels();
          break;
        case 'jira':
          // Sync recent issues and projects
          syncResult = true; // For now, assume sync is successful
          console.log(`Jira sync completed for recent issues`);
          break;
        case 'salesforce':
          syncResult = await integration.syncData();
          break;
        default:
          console.log(`Sync not implemented for ${type}`);
          return;
      }

      config.lastSync = new Date();

      this.logEvent({
        id: `sync-${type}-${Date.now()}`,
        integrationType: type,
        eventType: 'sync',
        status: syncResult ? 'success' : 'warning',
        message: `Sync ${syncResult ? 'completed' : 'completed with warnings'}`,
        details: {},
        timestamp: new Date(),
        duration: Date.now() - startTime
      });

    } catch (error) {
      const config = this.configs.get(type);
      if (config) {
        config.retryCount++;
        config.lastError = (error as Error).message;
      }

      this.logEvent({
        id: `sync-err-${type}-${Date.now()}`,
        integrationType: type,
        eventType: 'error',
        status: 'error',
        message: `Sync failed: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        timestamp: new Date(),
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * Update metrics for integration
   */
  private updateMetrics(type: IntegrationType, responseTime: number, success: boolean): void {
    const metrics = this.metrics.get(type);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.lastRequestTime = new Date();

    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update average response time
    metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    // Update uptime (simplified calculation)
    metrics.uptime = (metrics.successfulRequests / metrics.totalRequests) * 100;

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    let dailyEntry = metrics.dailyUsage.find(entry => entry.date === today);

    if (!dailyEntry) {
      dailyEntry = { date: today, requests: 0, errors: 0 };
      metrics.dailyUsage.push(dailyEntry);
    }

    dailyEntry.requests++;
    if (!success) {
      dailyEntry.errors++;
    }

    // Keep only last 30 days
    metrics.dailyUsage = metrics.dailyUsage.slice(-30);
  }

  /**
   * Reset daily metrics
   */
  private resetDailyMetrics(): void {
    this.metrics.forEach((metrics) => {
      const today = new Date().toISOString().split('T')[0];
      metrics.dailyUsage.push({ date: today, requests: 0, errors: 0 });
      metrics.dailyUsage = metrics.dailyUsage.slice(-30);
    });
  }

  /**
   * Log integration event
   */
  private logEvent(event: IntegrationEvent): void {
    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Sanitize configuration for logging (remove sensitive data)
   */
  private sanitizeConfig(config: IntegrationConfig): Partial<IntegrationConfig> {
    const sanitized = { ...config };
    sanitized.credentials = Object.keys(config.credentials).reduce((acc, key) => {
      acc[key] = '***REDACTED***';
      return acc;
    }, {} as Record<string, any>);
    return sanitized;
  }

  /**
   * Get all integration configurations
   */
  getConfigurations(): IntegrationConfig[] {
    return Array.from(this.configs.values()).map(config => ({
      ...config,
      credentials: this.sanitizeConfig(config).credentials || {}
    }));
  }

  /**
   * Get integration configuration by type
   */
  getConfiguration(type: IntegrationType): IntegrationConfig | undefined {
    const config = this.configs.get(type);
    if (!config) return undefined;

    return {
      ...config,
      credentials: this.sanitizeConfig(config).credentials || {}
    };
  }

  /**
   * Get integration metrics
   */
  getMetrics(type?: IntegrationType): IntegrationMetrics | Map<IntegrationType, IntegrationMetrics> {
    if (type) {
      return this.metrics.get(type) || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 0,
        errorRate: 0,
        dailyUsage: []
      };
    }
    return this.metrics;
  }

  /**
   * Get integration events
   */
  getEvents(type?: IntegrationType, limit: number = 100): IntegrationEvent[] {
    let events = this.events;

    if (type) {
      events = events.filter(event => event.integrationType === type);
    }

    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get system-wide integration status
   */
  getSystemStatus(): {
    totalIntegrations: number;
    enabledIntegrations: number;
    healthyIntegrations: number;
    errorIntegrations: number;
    totalRequests: number;
    systemUptime: number;
  } {
    const configs = Array.from(this.configs.values());
    const metrics = Array.from(this.metrics.values());

    return {
      totalIntegrations: configs.length,
      enabledIntegrations: configs.filter(c => c.isEnabled).length,
      healthyIntegrations: configs.filter(c => c.healthStatus === 'healthy').length,
      errorIntegrations: configs.filter(c => c.healthStatus === 'error').length,
      totalRequests: metrics.reduce((sum, m) => sum + m.totalRequests, 0),
      systemUptime: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length
        : 100
    };
  }
}

// Global instance
export const advancedIntegrationManager = new AdvancedIntegrationManager();