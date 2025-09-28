import cron from 'node-cron';
import { BackupManager, createBackupManager } from './backupManager.js';
import { emailService } from '../emailService.js';

interface BackupSchedulerConfig {
  enabled: boolean;
  cronSchedule: string; // Default: '0 2 * * *' (2 AM daily)
  notificationEmails: string[];
  enableHealthChecks: boolean;
}

export class BackupScheduler {
  private backupManager: BackupManager;
  private config: BackupSchedulerConfig;
  private scheduledTask?: cron.ScheduledTask;
  private lastBackupStatus: { success: boolean; timestamp: Date; error?: string } | null = null;

  constructor(config: BackupSchedulerConfig) {
    this.config = config;
    this.backupManager = createBackupManager();
  }

  /**
   * Start the backup scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('Backup scheduler is disabled');
      return;
    }

    console.log(`Starting backup scheduler with cron: ${this.config.cronSchedule}`);

    this.scheduledTask = cron.schedule(this.config.cronSchedule, async () => {
      await this.performScheduledBackup();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.scheduledTask.start();

    // Also schedule cleanup task (weekly)
    cron.schedule('0 3 * * 0', async () => {
      await this.performCleanup();
    }, {
      timezone: 'UTC'
    });

    console.log('Backup scheduler started successfully');
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      console.log('Backup scheduler stopped');
    }
  }

  /**
   * Perform a scheduled backup
   */
  private async performScheduledBackup(): Promise<void> {
    const startTime = new Date();
    console.log(`Starting scheduled backup at ${startTime.toISOString()}`);

    try {
      const result = await this.backupManager.createFullBackup();

      this.lastBackupStatus = {
        success: result.success,
        timestamp: startTime,
        error: result.error
      };

      if (result.success) {
        console.log(`Scheduled backup completed successfully`);
        await this.sendSuccessNotification(result);
      } else {
        console.error(`Scheduled backup failed: ${result.error}`);
        await this.sendFailureNotification(result.error || 'Unknown error');
      }

      // Update backup metrics
      await this.updateBackupMetrics(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Scheduled backup failed with exception: ${errorMessage}`);

      this.lastBackupStatus = {
        success: false,
        timestamp: startTime,
        error: errorMessage
      };

      await this.sendFailureNotification(errorMessage);
    }
  }

  /**
   * Perform cleanup of old backups
   */
  private async performCleanup(): Promise<void> {
    console.log('Starting scheduled backup cleanup');
    try {
      await this.backupManager.cleanupOldBackups();
      console.log('Backup cleanup completed successfully');
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Send success notification email
   */
  private async sendSuccessNotification(result: any): Promise<void> {
    if (this.config.notificationEmails.length === 0) return;

    const emailSubject = '✅ Database Backup Completed Successfully';
    const emailBody = `
      <h2>Database Backup Completed</h2>
      <p>Your scheduled database backup has completed successfully.</p>

      <h3>Backup Details:</h3>
      <ul>
        <li><strong>Timestamp:</strong> ${result.timestamp.toISOString()}</li>
        <li><strong>Backup Path:</strong> ${result.backupPath}</li>
        <li><strong>File Size:</strong> ${this.formatBytes(result.size || 0)}</li>
        ${result.s3Path ? `<li><strong>S3 Location:</strong> ${result.s3Path}</li>` : ''}
      </ul>

      <p>Your data is safely backed up and ready for recovery if needed.</p>
    `;

    for (const email of this.config.notificationEmails) {
      try {
        await emailService.sendEmail(
          email,
          emailSubject,
          emailBody
        );
      } catch (error) {
        console.error(`Failed to send backup notification to ${email}:`, error);
      }
    }
  }

  /**
   * Send failure notification email
   */
  private async sendFailureNotification(error: string): Promise<void> {
    if (this.config.notificationEmails.length === 0) return;

    const emailSubject = '🚨 Database Backup Failed - Immediate Action Required';
    const emailBody = `
      <h2 style="color: #dc2626;">Database Backup Failed</h2>
      <p><strong>URGENT:</strong> Your scheduled database backup has failed and requires immediate attention.</p>

      <h3>Error Details:</h3>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px;">
        <code>${error}</code>
      </div>

      <h3>Recommended Actions:</h3>
      <ol>
        <li>Check database connectivity and disk space</li>
        <li>Verify backup service configuration</li>
        <li>Run manual backup to test system</li>
        <li>Contact technical support if issue persists</li>
      </ol>

      <p><strong>Note:</strong> Backup failures put your data at risk. Please resolve this issue immediately.</p>
    `;

    for (const email of this.config.notificationEmails) {
      try {
        await emailService.sendEmail(
          email,
          emailSubject,
          emailBody
        );
      } catch (error) {
        console.error(`Failed to send backup failure notification to ${email}:`, error);
      }
    }
  }

  /**
   * Update backup metrics for monitoring
   */
  private async updateBackupMetrics(result: any): Promise<void> {
    // This would integrate with your monitoring system
    // For now, we'll log metrics
    console.log('Backup Metrics:', {
      success: result.success,
      duration: new Date().getTime() - result.timestamp.getTime(),
      size: result.size || 0,
      timestamp: result.timestamp
    });
  }

  /**
   * Get backup scheduler status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    lastBackup: { success: boolean; timestamp: Date; error?: string } | null;
    nextBackup?: Date;
  } {
    return {
      enabled: this.config.enabled,
      running: this.scheduledTask?.running || false,
      lastBackup: this.lastBackupStatus,
      nextBackup: this.scheduledTask ? new Date(this.scheduledTask.nextDates().toISOString()) : undefined
    };
  }

  /**
   * Manually trigger a backup
   */
  async triggerManualBackup(): Promise<boolean> {
    console.log('Triggering manual backup...');
    await this.performScheduledBackup();
    return this.lastBackupStatus?.success || false;
  }

  /**
   * Test backup functionality
   */
  async testBackup(): Promise<boolean> {
    return await this.backupManager.testBackupRestore();
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Factory function to create backup scheduler with environment-based config
export function createBackupScheduler(): BackupScheduler {
  const config: BackupSchedulerConfig = {
    enabled: process.env.BACKUP_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    cronSchedule: process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *', // 2 AM daily
    notificationEmails: process.env.BACKUP_NOTIFICATION_EMAILS
      ? process.env.BACKUP_NOTIFICATION_EMAILS.split(',').map(email => email.trim())
      : [],
    enableHealthChecks: process.env.BACKUP_HEALTH_CHECKS === 'true'
  };

  return new BackupScheduler(config);
}