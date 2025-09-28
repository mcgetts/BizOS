import axios from 'axios';
import { emailService } from '../emailService.js';
import { sentryService } from './sentryService.js';

interface UptimeCheck {
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  interval: number; // in seconds
  expectedStatus?: number;
  expectedResponse?: string;
  headers?: Record<string, string>;
  body?: any;
}

interface UptimeStatus {
  isUp: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

interface UptimeMetrics {
  uptime: number; // percentage
  avgResponseTime: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  lastCheck: Date;
  currentStatus: 'up' | 'down' | 'degraded';
}

interface AlertConfig {
  enabled: boolean;
  emailRecipients: string[];
  webhookUrl?: string;
  slackWebhook?: string;
  cooldownMinutes: number; // minimum time between alerts
}

export class UptimeMonitor {
  private checks: Map<string, UptimeCheck> = new Map();
  private status: Map<string, UptimeStatus[]> = new Map();
  private intervals: Map<string, NodeJS.Timer> = new Map();
  private alertConfig: AlertConfig;
  private lastAlertTime: Map<string, Date> = new Map();

  constructor(alertConfig: AlertConfig) {
    this.alertConfig = alertConfig;
  }

  /**
   * Add a new uptime check
   */
  addCheck(name: string, check: UptimeCheck): void {
    this.checks.set(name, check);
    this.status.set(name, []);

    // Start monitoring
    this.startMonitoring(name);

    console.log(`Added uptime check: ${name} -> ${check.url}`);
  }

  /**
   * Remove an uptime check
   */
  removeCheck(name: string): void {
    this.stopMonitoring(name);
    this.checks.delete(name);
    this.status.delete(name);
    this.lastAlertTime.delete(name);

    console.log(`Removed uptime check: ${name}`);
  }

  /**
   * Start monitoring a specific check
   */
  private startMonitoring(name: string): void {
    const check = this.checks.get(name);
    if (!check) return;

    // Clear existing interval if any
    this.stopMonitoring(name);

    // Start new interval
    const interval = setInterval(async () => {
      await this.performCheck(name);
    }, check.interval * 1000);

    this.intervals.set(name, interval);

    // Perform initial check
    this.performCheck(name);
  }

  /**
   * Stop monitoring a specific check
   */
  private stopMonitoring(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  /**
   * Perform a single uptime check
   */
  private async performCheck(name: string): Promise<void> {
    const check = this.checks.get(name);
    if (!check) return;

    const startTime = Date.now();
    let status: UptimeStatus;

    try {
      const response = await axios({
        method: check.method,
        url: check.url,
        timeout: check.timeout,
        headers: check.headers,
        data: check.body,
        validateStatus: () => true // Don't throw on any status code
      });

      const responseTime = Date.now() - startTime;
      const expectedStatus = check.expectedStatus || 200;

      let isUp = response.status === expectedStatus;

      // Check response content if specified
      if (isUp && check.expectedResponse) {
        const responseText = typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
        isUp = responseText.includes(check.expectedResponse);
      }

      status = {
        isUp,
        responseTime,
        statusCode: response.status,
        timestamp: new Date(),
        error: !isUp ? `Unexpected status: ${response.status}` : undefined
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      status = {
        isUp: false,
        responseTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Store status
    this.storeStatus(name, status);

    // Check for alerts
    await this.checkForAlerts(name, status);

    // Log to monitoring
    this.logStatus(name, status);
  }

  /**
   * Store status result
   */
  private storeStatus(name: string, status: UptimeStatus): void {
    const history = this.status.get(name) || [];

    // Add new status
    history.push(status);

    // Keep only last 1000 checks (adjust as needed)
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    this.status.set(name, history);
  }

  /**
   * Check if alerts need to be sent
   */
  private async checkForAlerts(name: string, status: UptimeStatus): Promise<void> {
    if (!this.alertConfig.enabled || status.isUp) {
      return;
    }

    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(name);
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - lastAlert.getTime();
      const cooldownMs = this.alertConfig.cooldownMinutes * 60 * 1000;

      if (timeSinceLastAlert < cooldownMs) {
        return; // Still in cooldown period
      }
    }

    // Send alerts
    await this.sendAlerts(name, status);
    this.lastAlertTime.set(name, new Date());
  }

  /**
   * Send downtime alerts
   */
  private async sendAlerts(name: string, status: UptimeStatus): Promise<void> {
    const check = this.checks.get(name);
    if (!check) return;

    const subject = `🚨 Service Down Alert: ${name}`;
    const message = `
      <h2 style="color: #dc2626;">Service Downtime Detected</h2>
      <p><strong>Service:</strong> ${name}</p>
      <p><strong>URL:</strong> ${check.url}</p>
      <p><strong>Status:</strong> DOWN</p>
      <p><strong>Error:</strong> ${status.error}</p>
      <p><strong>Response Time:</strong> ${status.responseTime}ms</p>
      <p><strong>Status Code:</strong> ${status.statusCode || 'N/A'}</p>
      <p><strong>Timestamp:</strong> ${status.timestamp.toISOString()}</p>

      <hr>
      <p>Please investigate immediately and restore service.</p>
    `;

    // Send email alerts
    for (const email of this.alertConfig.emailRecipients) {
      try {
        await emailService.sendEmail(email, subject, message);
      } catch (error) {
        console.error(`Failed to send uptime alert email to ${email}:`, error);
      }
    }

    // Send webhook alert
    if (this.alertConfig.webhookUrl) {
      try {
        await axios.post(this.alertConfig.webhookUrl, {
          service: name,
          url: check.url,
          status: 'DOWN',
          error: status.error,
          responseTime: status.responseTime,
          statusCode: status.statusCode,
          timestamp: status.timestamp.toISOString()
        });
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }

    // Send Slack alert
    if (this.alertConfig.slackWebhook) {
      try {
        await axios.post(this.alertConfig.slackWebhook, {
          text: `🚨 *Service Down Alert*`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Service', value: name, short: true },
              { title: 'URL', value: check.url, short: true },
              { title: 'Error', value: status.error, short: false },
              { title: 'Response Time', value: `${status.responseTime}ms`, short: true },
              { title: 'Status Code', value: status.statusCode?.toString() || 'N/A', short: true }
            ],
            timestamp: Math.floor(status.timestamp.getTime() / 1000)
          }]
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }

    // Log to Sentry
    sentryService.captureMessage(
      `Service downtime detected: ${name}`,
      'error',
      {
        feature: 'uptime_monitoring',
        additionalData: {
          service: name,
          url: check.url,
          error: status.error,
          responseTime: status.responseTime,
          statusCode: status.statusCode
        }
      }
    );
  }

  /**
   * Log status to console and monitoring systems
   */
  private logStatus(name: string, status: UptimeStatus): void {
    const emoji = status.isUp ? '✅' : '❌';
    const statusText = status.isUp ? 'UP' : 'DOWN';

    console.log(
      `${emoji} [${new Date().toISOString()}] ${name}: ${statusText} ` +
      `(${status.responseTime}ms${status.statusCode ? `, ${status.statusCode}` : ''})`
    );

    // Add breadcrumb for debugging
    sentryService.addBreadcrumb(
      `Uptime check: ${name} ${statusText}`,
      {
        service: name,
        isUp: status.isUp,
        responseTime: status.responseTime,
        statusCode: status.statusCode,
        error: status.error
      },
      status.isUp ? 'info' : 'warning'
    );
  }

  /**
   * Get current status of all checks
   */
  getStatus(): Record<string, UptimeStatus | null> {
    const result: Record<string, UptimeStatus | null> = {};

    for (const [name] of this.checks) {
      const history = this.status.get(name) || [];
      result[name] = history.length > 0 ? history[history.length - 1] : null;
    }

    return result;
  }

  /**
   * Get metrics for a specific check
   */
  getMetrics(name: string): UptimeMetrics | null {
    const history = this.status.get(name);
    if (!history || history.length === 0) {
      return null;
    }

    const totalChecks = history.length;
    const successfulChecks = history.filter(s => s.isUp).length;
    const failedChecks = totalChecks - successfulChecks;
    const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    const responseTimes = history.map(s => s.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const lastCheck = history[history.length - 1];
    let currentStatus: 'up' | 'down' | 'degraded' = lastCheck.isUp ? 'up' : 'down';

    // Check if service is degraded (slow response time)
    if (lastCheck.isUp && lastCheck.responseTime > 5000) {
      currentStatus = 'degraded';
    }

    return {
      uptime,
      avgResponseTime,
      totalChecks,
      successfulChecks,
      failedChecks,
      lastCheck: lastCheck.timestamp,
      currentStatus
    };
  }

  /**
   * Get metrics for all checks
   */
  getAllMetrics(): Record<string, UptimeMetrics | null> {
    const result: Record<string, UptimeMetrics | null> = {};

    for (const [name] of this.checks) {
      result[name] = this.getMetrics(name);
    }

    return result;
  }

  /**
   * Start monitoring all checks
   */
  start(): void {
    console.log('Starting uptime monitoring...');

    for (const [name] of this.checks) {
      this.startMonitoring(name);
    }

    console.log(`Started monitoring ${this.checks.size} services`);
  }

  /**
   * Stop monitoring all checks
   */
  stop(): void {
    console.log('Stopping uptime monitoring...');

    for (const [name] of this.checks) {
      this.stopMonitoring(name);
    }

    console.log('Uptime monitoring stopped');
  }

  /**
   * Test a check manually
   */
  async testCheck(name: string): Promise<UptimeStatus | null> {
    await this.performCheck(name);
    const history = this.status.get(name);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }
}

// Factory function to create uptime monitor with environment-based config
export function createUptimeMonitor(): UptimeMonitor {
  const alertConfig: AlertConfig = {
    enabled: process.env.UPTIME_ALERTS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    emailRecipients: process.env.UPTIME_ALERT_EMAILS
      ? process.env.UPTIME_ALERT_EMAILS.split(',').map(email => email.trim())
      : [],
    webhookUrl: process.env.UPTIME_WEBHOOK_URL,
    slackWebhook: process.env.UPTIME_SLACK_WEBHOOK,
    cooldownMinutes: parseInt(process.env.UPTIME_ALERT_COOLDOWN_MINUTES || '15')
  };

  const monitor = new UptimeMonitor(alertConfig);

  // Add default checks for the application
  monitor.addCheck('api_health', {
    url: `http://localhost:${process.env.PORT || 3001}/health`,
    method: 'GET',
    timeout: 5000,
    interval: 60, // every minute
    expectedStatus: 200
  });

  monitor.addCheck('api_ready', {
    url: `http://localhost:${process.env.PORT || 3001}/health/ready`,
    method: 'GET',
    timeout: 5000,
    interval: 30, // every 30 seconds
    expectedStatus: 200
  });

  return monitor;
}