import { healthCheckService } from './healthCheck.js';
import { sentryService } from './sentryService.js';
import { prometheusMetrics } from './prometheusMetrics.js';
import { createUptimeMonitor } from './uptimeMonitor.js';
import { createBackupManager } from '../backup/backupManager.js';

interface MonitoringTestResult {
  service: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
}

export class MonitoringTest {

  /**
   * Test all monitoring services
   */
  async runAllTests(): Promise<MonitoringTestResult[]> {
    const results: MonitoringTestResult[] = [];

    // Test health check service
    results.push(await this.testHealthCheck());

    // Test Sentry service
    results.push(await this.testSentryService());

    // Test Prometheus metrics
    results.push(await this.testPrometheusMetrics());

    // Test uptime monitoring
    results.push(await this.testUptimeMonitoring());

    // Test backup system
    results.push(await this.testBackupSystem());

    return results;
  }

  /**
   * Test health check endpoints
   */
  private async testHealthCheck(): Promise<MonitoringTestResult> {
    try {
      // Mock request/response objects for testing
      const mockReq = {} as any;
      const mockRes = {
        status: (code: number) => mockRes,
        json: (data: any) => {
          if (data.status === 'healthy' || data.status === 'alive' || data.status === 'ready') {
            return data;
          }
          throw new Error(`Unhealthy status: ${data.status}`);
        }
      } as any;

      // Test health endpoint
      await healthCheckService.healthCheck(mockReq, mockRes);

      // Test readiness endpoint
      await healthCheckService.readinessCheck(mockReq, mockRes);

      // Test liveness endpoint
      await healthCheckService.livenessCheck(mockReq, mockRes);

      return {
        service: 'Health Check',
        status: 'pass',
        message: 'All health check endpoints responding correctly',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Health Check',
        status: 'fail',
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test Sentry error tracking
   */
  private async testSentryService(): Promise<MonitoringTestResult> {
    try {
      const isInitialized = sentryService.isInitialized();

      if (!isInitialized) {
        return {
          service: 'Sentry',
          status: 'warning',
          message: 'Sentry not initialized (requires SENTRY_DSN and SENTRY_ENABLED=true)',
          details: { dsn_configured: process.env.SENTRY_DSN ? 'yes' : 'no' },
          timestamp: new Date()
        };
      }

      // Test error capture
      const testError = new Error('Test error for monitoring verification');
      sentryService.captureException(testError, { feature: 'monitoring_test' });

      // Test message capture
      sentryService.captureMessage('Test message for monitoring verification', 'info', {
        feature: 'monitoring_test'
      });

      return {
        service: 'Sentry',
        status: 'pass',
        message: 'Sentry error tracking is operational',
        details: { initialized: true },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Sentry',
        status: 'fail',
        message: `Sentry test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test Prometheus metrics collection
   */
  private async testPrometheusMetrics(): Promise<MonitoringTestResult> {
    try {
      // Mock request/response for metrics endpoint
      const mockReq = {} as any;
      const mockRes = {
        set: (header: string, value: string) => {},
        send: (data: string) => {
          if (data.includes('business_platform_')) {
            return data;
          }
          throw new Error('Metrics not properly formatted');
        },
        status: (code: number) => mockRes
      } as any;

      await prometheusMetrics.getMetrics(mockReq, mockRes);

      // Test metric recording
      prometheusMetrics.recordDatabaseQuery('SELECT', 'users', 0.05, true);
      prometheusMetrics.updateWebSocketConnections(5);
      prometheusMetrics.recordWebSocketMessage('notification', 'outgoing');

      return {
        service: 'Prometheus Metrics',
        status: 'pass',
        message: 'Prometheus metrics collection is operational',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Prometheus Metrics',
        status: 'fail',
        message: `Prometheus test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test uptime monitoring
   */
  private async testUptimeMonitoring(): Promise<MonitoringTestResult> {
    try {
      const uptimeMonitor = createUptimeMonitor();

      // Add a test check
      uptimeMonitor.addCheck('test_endpoint', {
        url: 'http://localhost:3001/health/live',
        method: 'GET',
        timeout: 5000,
        interval: 60,
        expectedStatus: 200
      });

      // Test the check manually
      const result = await uptimeMonitor.testCheck('test_endpoint');

      if (result && result.isUp) {
        uptimeMonitor.removeCheck('test_endpoint');
        return {
          service: 'Uptime Monitoring',
          status: 'pass',
          message: 'Uptime monitoring is operational',
          details: { response_time: result.responseTime },
          timestamp: new Date()
        };
      } else {
        return {
          service: 'Uptime Monitoring',
          status: 'warning',
          message: 'Uptime monitoring test endpoint failed',
          details: result,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        service: 'Uptime Monitoring',
        status: 'fail',
        message: `Uptime monitoring test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test backup system
   */
  private async testBackupSystem(): Promise<MonitoringTestResult> {
    try {
      const backupManager = createBackupManager();
      const status = await backupManager.getBackupStatus();

      if (status.lastBackup) {
        const hoursSinceBackup = (Date.now() - status.lastBackup.getTime()) / (1000 * 60 * 60);

        if (hoursSinceBackup > 48) {
          return {
            service: 'Backup System',
            status: 'warning',
            message: `Last backup was ${Math.floor(hoursSinceBackup)} hours ago`,
            details: status,
            timestamp: new Date()
          };
        } else {
          return {
            service: 'Backup System',
            status: 'pass',
            message: 'Backup system is operational',
            details: { last_backup: status.lastBackup },
            timestamp: new Date()
          };
        }
      } else {
        return {
          service: 'Backup System',
          status: 'warning',
          message: 'No backups found in system',
          details: status,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        service: 'Backup System',
        status: 'fail',
        message: `Backup system test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate monitoring test report
   */
  generateReport(results: MonitoringTestResult[]): string {
    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warning').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    let report = `
# Monitoring System Test Report

**Test Timestamp**: ${new Date().toISOString()}
**Total Tests**: ${results.length}
**Passed**: ${passCount}
**Warnings**: ${warnCount}
**Failed**: ${failCount}

---

## Test Results

`;

    results.forEach(result => {
      const emoji = result.status === 'pass' ? '✅' :
                   result.status === 'warning' ? '⚠️' : '❌';

      report += `
### ${emoji} ${result.service}

**Status**: ${result.status.toUpperCase()}
**Message**: ${result.message}
**Timestamp**: ${result.timestamp.toISOString()}
`;

      if (result.details) {
        report += `**Details**: \`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`
`;
      }
    });

    report += `
---

## Summary

`;

    if (failCount > 0) {
      report += `❌ **CRITICAL**: ${failCount} monitoring services failed. Immediate attention required.
`;
    }

    if (warnCount > 0) {
      report += `⚠️ **WARNING**: ${warnCount} monitoring services have warnings. Review recommended.
`;
    }

    if (failCount === 0 && warnCount === 0) {
      report += `✅ **ALL SYSTEMS OPERATIONAL**: All monitoring services are functioning correctly.
`;
    }

    return report;
  }

  /**
   * Run continuous monitoring test
   */
  async runContinuousTest(intervalMinutes: number = 5): Promise<void> {
    console.log(`Starting continuous monitoring test (every ${intervalMinutes} minutes)`);

    const runTest = async () => {
      try {
        const results = await this.runAllTests();
        const report = this.generateReport(results);

        const failedServices = results.filter(r => r.status === 'fail');
        if (failedServices.length > 0) {
          console.error('🚨 MONITORING ALERT: Failed services detected');
          console.error(report);
        } else {
          console.log('✅ Monitoring test passed');
        }
      } catch (error) {
        console.error('Error running monitoring test:', error);
      }
    };

    // Run initial test
    await runTest();

    // Schedule recurring tests
    setInterval(runTest, intervalMinutes * 60 * 1000);
  }
}

// Global instance
export const monitoringTest = new MonitoringTest();