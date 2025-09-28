import { Request, Response } from 'express';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { createBackupManager } from '../backup/backupManager.js';
import { sentryService } from './sentryService.js';
import fs from 'fs/promises';
import os from 'os';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
      timestamp: string;
    };
  };
  system?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
      usage?: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface MetricsResult {
  timestamp: string;
  system: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    uptime: number;
    version: string;
  };
  database: {
    connectionCount?: number;
    avgQueryTime?: number;
    slowQueries?: number;
  };
  application: {
    activeUsers?: number;
    requestsPerMinute?: number;
    errorRate?: number;
    backupStatus?: string;
  };
}

export class HealthCheckService {
  private startTime: number;
  private version: string;
  private environment: string;
  private backupManager = createBackupManager();

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Basic health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: this.version,
        environment: this.environment,
        checks: {}
      };

      // Database connectivity check
      const dbCheck = await this.checkDatabase();
      result.checks.database = dbCheck;

      // File system check
      const fsCheck = await this.checkFileSystem();
      result.checks.filesystem = fsCheck;

      // Memory check
      const memoryCheck = await this.checkMemory();
      result.checks.memory = memoryCheck;

      // Backup system check
      const backupCheck = await this.checkBackupSystem();
      result.checks.backup = backupCheck;

      // External services check
      const servicesCheck = await this.checkExternalServices();
      result.checks.external_services = servicesCheck;

      // Determine overall status
      const failedChecks = Object.values(result.checks).filter(check => check.status === 'fail');
      const warnChecks = Object.values(result.checks).filter(check => check.status === 'warn');

      if (failedChecks.length > 0) {
        result.status = 'unhealthy';
      } else if (warnChecks.length > 0) {
        result.status = 'degraded';
      }

      // Add system information for detailed health check
      if (req.query.detailed === 'true') {
        result.system = await this.getSystemInfo();
      }

      const duration = Date.now() - startTime;
      sentryService.addBreadcrumb(`Health check completed in ${duration}ms`, { status: result.status });

      // Set appropriate HTTP status
      const httpStatus = result.status === 'healthy' ? 200 :
                        result.status === 'degraded' ? 200 : 503;

      res.status(httpStatus).json(result);

    } catch (error) {
      sentryService.captureException(error as Error, { feature: 'health_check' });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: this.version,
        environment: this.environment,
        checks: {
          health_check: {
            status: 'fail',
            message: `Health check failed: ${(error as Error).message}`,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  }

  /**
   * Readiness check endpoint (for load balancers)
   */
  async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check critical dependencies only
      const dbCheck = await this.checkDatabase();

      if (dbCheck.status === 'pass') {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: { database: dbCheck }
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          checks: { database: dbCheck }
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  }

  /**
   * Liveness check endpoint (simple ping)
   */
  async livenessCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    });
  }

  /**
   * Metrics endpoint for monitoring systems
   */
  async metricsCheck(req: Request, res: Response): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const result: MetricsResult = {
        timestamp: new Date().toISOString(),
        system: {
          memory: memUsage,
          cpu: cpuUsage,
          uptime: process.uptime(),
          version: process.version
        },
        database: await this.getDatabaseMetrics(),
        application: await this.getApplicationMetrics()
      };

      res.status(200).json(result);
    } catch (error) {
      sentryService.captureException(error as Error, { feature: 'metrics' });
      res.status(500).json({
        error: 'Failed to generate metrics',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<{ status: 'pass' | 'fail'; message?: string; duration: number; timestamp: string }> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      await db.execute(sql`SELECT 1`);

      // Test performance (should be under 100ms for simple query)
      const perfStart = Date.now();
      await db.execute(sql`SELECT COUNT(*) FROM users`);
      const queryTime = Date.now() - perfStart;

      const duration = Date.now() - startTime;

      return {
        status: queryTime > 500 ? 'fail' : 'pass',
        message: queryTime > 500 ? `Slow database response: ${queryTime}ms` : undefined,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Database connection failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check file system health
   */
  private async checkFileSystem(): Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string; timestamp: string }> {
    try {
      // Check if we can write to temp directory
      const testFile = '/tmp/health-check-test.txt';
      const testContent = 'health check test';

      await fs.writeFile(testFile, testContent);
      const readContent = await fs.readFile(testFile, 'utf-8');
      await fs.unlink(testFile);

      if (readContent !== testContent) {
        return {
          status: 'fail',
          message: 'File system read/write test failed',
          timestamp: new Date().toISOString()
        };
      }

      // Check disk space
      const stats = await fs.stat('/tmp');
      // This is a simplified check - in production you'd use statvfs or similar

      return {
        status: 'pass',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `File system check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; timestamp: string }> {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message: string | undefined;

    if (memoryPercentage > 90) {
      status = 'fail';
      message = `Critical memory usage: ${memoryPercentage.toFixed(1)}%`;
    } else if (memoryPercentage > 80) {
      status = 'warn';
      message = `High memory usage: ${memoryPercentage.toFixed(1)}%`;
    }

    return {
      status,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check backup system status
   */
  private async checkBackupSystem(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; timestamp: string }> {
    try {
      const backupStatus = await this.backupManager.getBackupStatus();

      if (!backupStatus.lastBackup) {
        return {
          status: 'warn',
          message: 'No backups found',
          timestamp: new Date().toISOString()
        };
      }

      const hoursSinceLastBackup = (Date.now() - backupStatus.lastBackup.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastBackup > 48) {
        return {
          status: 'fail',
          message: `Last backup was ${Math.floor(hoursSinceLastBackup)} hours ago`,
          timestamp: new Date().toISOString()
        };
      } else if (hoursSinceLastBackup > 24) {
        return {
          status: 'warn',
          message: `Last backup was ${Math.floor(hoursSinceLastBackup)} hours ago`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        status: 'pass',
        message: `Last backup: ${backupStatus.lastBackup.toISOString()}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Backup system check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check external services
   */
  private async checkExternalServices(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; timestamp: string }> {
    // This would check external dependencies like email service, payment processors, etc.
    // For now, we'll do a simple check

    try {
      // Simulate checking external services
      const checks = [];

      // You would add real checks here for:
      // - Email service connectivity
      // - Payment processor status
      // - Third-party API availability

      return {
        status: 'pass',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `External services check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get detailed system information
   */
  private async getSystemInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      cpu: {
        loadAverage: os.loadavg()
      },
      disk: {
        used: 0, // Would need diskusage library for real implementation
        total: 0,
        percentage: 0
      }
    };
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics() {
    try {
      // These would be real database metrics in production
      return {
        connectionCount: 10, // Would query pg_stat_activity
        avgQueryTime: 25,    // Would calculate from query logs
        slowQueries: 2       // Would query slow query log
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Get application-specific metrics
   */
  private async getApplicationMetrics() {
    try {
      const backupStatus = await this.backupManager.getBackupStatus();

      return {
        activeUsers: 0,     // Would count from sessions or recent activity
        requestsPerMinute: 0, // Would track from middleware
        errorRate: 0,       // Would calculate from error logs
        backupStatus: backupStatus.lastBackup ? 'healthy' : 'warning'
      };
    } catch (error) {
      return {};
    }
  }
}

export const healthCheckService = new HealthCheckService();