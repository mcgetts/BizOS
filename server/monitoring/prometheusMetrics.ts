import { Request, Response } from 'express';
import * as promClient from 'prom-client';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

interface MetricsConfig {
  enabled: boolean;
  collectDefaultMetrics: boolean;
  prefix: string;
  labels: Record<string, string>;
}

export class PrometheusMetrics {
  private register: promClient.Registry;
  private config: MetricsConfig;

  // HTTP metrics
  private httpRequestsTotal: promClient.Counter;
  private httpRequestDuration: promClient.Histogram;
  private httpRequestSize: promClient.Histogram;
  private httpResponseSize: promClient.Histogram;

  // Application metrics
  private databaseConnections: promClient.Gauge;
  private databaseQueryDuration: promClient.Histogram;
  private databaseQueriesTotal: promClient.Counter;
  private activeUsers: promClient.Gauge;
  private tasksTotal: promClient.Gauge;
  private projectsTotal: promClient.Gauge;
  private invoicesTotal: promClient.Gauge;
  private revenueTotal: promClient.Gauge;

  // System metrics
  private systemUptime: promClient.Gauge;
  private backupStatus: promClient.Gauge;
  private lastBackupTime: promClient.Gauge;
  private errorRate: promClient.Gauge;

  // WebSocket metrics
  private websocketConnections: promClient.Gauge;
  private websocketMessages: promClient.Counter;

  // Business metrics
  private leadsConverted: promClient.Counter;
  private projectsCompleted: promClient.Counter;
  private supportTicketsResolved: promClient.Counter;

  constructor(config: MetricsConfig) {
    this.config = config;
    this.register = new promClient.Registry();

    if (config.collectDefaultMetrics) {
      promClient.collectDefaultMetrics({
        register: this.register,
        prefix: config.prefix
      });
    }

    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    const commonLabels = this.config.labels;

    // HTTP metrics
    this.httpRequestsTotal = new promClient.Counter({
      name: `${this.config.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register]
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: `${this.config.prefix}http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    this.httpRequestSize = new promClient.Histogram({
      name: `${this.config.prefix}http_request_size_bytes`,
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register]
    });

    this.httpResponseSize = new promClient.Histogram({
      name: `${this.config.prefix}http_response_size_bytes`,
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register]
    });

    // Database metrics
    this.databaseConnections = new promClient.Gauge({
      name: `${this.config.prefix}database_connections_active`,
      help: 'Number of active database connections',
      registers: [this.register]
    });

    this.databaseQueryDuration = new promClient.Histogram({
      name: `${this.config.prefix}database_query_duration_seconds`,
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
      registers: [this.register]
    });

    this.databaseQueriesTotal = new promClient.Counter({
      name: `${this.config.prefix}database_queries_total`,
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [this.register]
    });

    // Application metrics
    this.activeUsers = new promClient.Gauge({
      name: `${this.config.prefix}active_users`,
      help: 'Number of active users',
      registers: [this.register]
    });

    this.tasksTotal = new promClient.Gauge({
      name: `${this.config.prefix}tasks_total`,
      help: 'Total number of tasks',
      labelNames: ['status'],
      registers: [this.register]
    });

    this.projectsTotal = new promClient.Gauge({
      name: `${this.config.prefix}projects_total`,
      help: 'Total number of projects',
      labelNames: ['status'],
      registers: [this.register]
    });

    this.invoicesTotal = new promClient.Gauge({
      name: `${this.config.prefix}invoices_total`,
      help: 'Total number of invoices',
      labelNames: ['status'],
      registers: [this.register]
    });

    this.revenueTotal = new promClient.Gauge({
      name: `${this.config.prefix}revenue_total`,
      help: 'Total revenue amount',
      labelNames: ['currency', 'period'],
      registers: [this.register]
    });

    // System metrics
    this.systemUptime = new promClient.Gauge({
      name: `${this.config.prefix}system_uptime_seconds`,
      help: 'System uptime in seconds',
      registers: [this.register]
    });

    this.backupStatus = new promClient.Gauge({
      name: `${this.config.prefix}backup_status`,
      help: 'Backup system status (1 = healthy, 0 = unhealthy)',
      registers: [this.register]
    });

    this.lastBackupTime = new promClient.Gauge({
      name: `${this.config.prefix}last_backup_timestamp`,
      help: 'Timestamp of last successful backup',
      registers: [this.register]
    });

    this.errorRate = new promClient.Gauge({
      name: `${this.config.prefix}error_rate`,
      help: 'Application error rate (errors per minute)',
      registers: [this.register]
    });

    // WebSocket metrics
    this.websocketConnections = new promClient.Gauge({
      name: `${this.config.prefix}websocket_connections`,
      help: 'Number of active WebSocket connections',
      registers: [this.register]
    });

    this.websocketMessages = new promClient.Counter({
      name: `${this.config.prefix}websocket_messages_total`,
      help: 'Total number of WebSocket messages',
      labelNames: ['type', 'direction'],
      registers: [this.register]
    });

    // Business metrics
    this.leadsConverted = new promClient.Counter({
      name: `${this.config.prefix}leads_converted_total`,
      help: 'Total number of leads converted',
      registers: [this.register]
    });

    this.projectsCompleted = new promClient.Counter({
      name: `${this.config.prefix}projects_completed_total`,
      help: 'Total number of projects completed',
      registers: [this.register]
    });

    this.supportTicketsResolved = new promClient.Counter({
      name: `${this.config.prefix}support_tickets_resolved_total`,
      help: 'Total number of support tickets resolved',
      registers: [this.register]
    });
  }

  /**
   * Middleware to collect HTTP metrics
   */
  middleware() {
    return (req: Request, res: Response, next: Function) => {
      if (!this.config.enabled) {
        return next();
      }

      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(body: any) {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        const method = req.method;
        const statusCode = res.statusCode.toString();

        // Record metrics
        this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
        this.httpRequestDuration.observe({ method, route }, duration);

        if (req.get('content-length')) {
          this.httpRequestSize.observe(
            { method, route },
            parseInt(req.get('content-length') || '0')
          );
        }

        if (body) {
          const responseSize = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
          this.httpResponseSize.observe({ method, route }, responseSize);
        }

        return originalSend.call(this, body);
      }.bind(this);

      next();
    };
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean): void {
    if (!this.config.enabled) return;

    this.databaseQueryDuration.observe({ operation, table }, duration);
    this.databaseQueriesTotal.inc({
      operation,
      table,
      status: success ? 'success' : 'error'
    });
  }

  /**
   * Update WebSocket metrics
   */
  updateWebSocketConnections(count: number): void {
    if (!this.config.enabled) return;
    this.websocketConnections.set(count);
  }

  recordWebSocketMessage(type: string, direction: 'incoming' | 'outgoing'): void {
    if (!this.config.enabled) return;
    this.websocketMessages.inc({ type, direction });
  }

  /**
   * Record business events
   */
  recordLeadConversion(): void {
    if (!this.config.enabled) return;
    this.leadsConverted.inc();
  }

  recordProjectCompletion(): void {
    if (!this.config.enabled) return;
    this.projectsCompleted.inc();
  }

  recordTicketResolution(): void {
    if (!this.config.enabled) return;
    this.supportTicketsResolved.inc();
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(uptime: number, backupHealthy: boolean, lastBackup?: Date): void {
    if (!this.config.enabled) return;

    this.systemUptime.set(uptime);
    this.backupStatus.set(backupHealthy ? 1 : 0);

    if (lastBackup) {
      this.lastBackupTime.set(lastBackup.getTime() / 1000);
    }
  }

  /**
   * Update application metrics from database
   */
  async updateApplicationMetrics(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Get task counts by status
      const taskCounts = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM tasks
        GROUP BY status
      `);

      taskCounts.forEach((row: any) => {
        this.tasksTotal.set({ status: row.status }, parseInt(row.count));
      });

      // Get project counts by status
      const projectCounts = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM projects
        GROUP BY status
      `);

      projectCounts.forEach((row: any) => {
        this.projectsTotal.set({ status: row.status }, parseInt(row.count));
      });

      // Get invoice metrics
      const invoiceMetrics = await db.execute(sql`
        SELECT
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM invoices
        GROUP BY status
      `);

      invoiceMetrics.forEach((row: any) => {
        this.invoicesTotal.set({ status: row.status }, parseInt(row.count));
        this.revenueTotal.set(
          { currency: 'USD', period: 'total' },
          parseFloat(row.total_amount || '0')
        );
      });

      // Get active users (users who logged in last 24 hours)
      const activeUserResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE "lastLoginAt" > NOW() - INTERVAL '24 hours'
      `);

      if (activeUserResult.length > 0) {
        this.activeUsers.set(parseInt((activeUserResult[0] as any).count));
      }

    } catch (error) {
      console.error('Failed to update application metrics:', error);
    }
  }

  /**
   * Get metrics endpoint handler
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    if (!this.config.enabled) {
      res.status(404).send('Metrics collection disabled');
      return;
    }

    try {
      // Update application metrics before serving
      await this.updateApplicationMetrics();

      res.set('Content-Type', this.register.contentType);
      const metrics = await this.register.metrics();
      res.send(metrics);
    } catch (error) {
      console.error('Failed to generate metrics:', error);
      res.status(500).send('Failed to generate metrics');
    }
  }

  /**
   * Get registry for custom metrics
   */
  getRegistry(): promClient.Registry {
    return this.register;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.register.clear();
  }
}

// Factory function to create Prometheus metrics service
export function createPrometheusMetrics(): PrometheusMetrics {
  const config: MetricsConfig = {
    enabled: process.env.PROMETHEUS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    collectDefaultMetrics: process.env.PROMETHEUS_DEFAULT_METRICS !== 'false',
    prefix: process.env.PROMETHEUS_PREFIX || 'business_platform_',
    labels: {
      service: 'business-platform',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  return new PrometheusMetrics(config);
}

// Global instance
export const prometheusMetrics = createPrometheusMetrics();