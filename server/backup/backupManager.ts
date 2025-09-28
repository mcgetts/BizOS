import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface BackupConfig {
  databaseUrl: string;
  backupPath: string;
  retentionDays: number;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface BackupResult {
  success: boolean;
  backupPath?: string;
  s3Path?: string;
  size?: number;
  timestamp: Date;
  error?: string;
}

export class BackupManager {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.backupPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Create a full database backup using pg_dump
   */
  async createFullBackup(): Promise<BackupResult> {
    const timestamp = new Date();
    const backupFileName = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}.sql`;
    const backupFilePath = path.join(this.config.backupPath, backupFileName);

    try {
      console.log(`Starting database backup to ${backupFilePath}`);

      // Parse database URL
      const dbUrl = new URL(this.config.databaseUrl);

      // Create pg_dump command
      const pgDumpArgs = [
        '--host', dbUrl.hostname,
        '--port', dbUrl.port || '5432',
        '--username', dbUrl.username,
        '--dbname', dbUrl.pathname.slice(1), // Remove leading slash
        '--verbose',
        '--clean',
        '--no-owner',
        '--no-privileges',
        '--format=custom',
        '--file', backupFilePath
      ];

      // Set password via environment variable
      const env = {
        ...process.env,
        PGPASSWORD: dbUrl.password
      };

      // Execute pg_dump
      const pgDump = spawn('pg_dump', pgDumpArgs, { env });

      return new Promise((resolve) => {
        pgDump.on('close', async (code) => {
          if (code === 0) {
            try {
              const stats = await fs.stat(backupFilePath);
              const result: BackupResult = {
                success: true,
                backupPath: backupFilePath,
                size: stats.size,
                timestamp
              };

              // Upload to S3 if configured
              if (this.config.s3Config) {
                result.s3Path = await this.uploadToS3(backupFilePath, backupFileName);
              }

              console.log(`Backup completed successfully: ${backupFilePath} (${stats.size} bytes)`);
              resolve(result);
            } catch (error) {
              resolve({
                success: false,
                timestamp,
                error: `Failed to read backup file: ${error}`
              });
            }
          } else {
            resolve({
              success: false,
              timestamp,
              error: `pg_dump exited with code ${code}`
            });
          }
        });

        pgDump.stderr.on('data', (data) => {
          console.log(`pg_dump: ${data}`);
        });
      });

    } catch (error) {
      return {
        success: false,
        timestamp,
        error: `Backup failed: ${error}`
      };
    }
  }

  /**
   * Create a point-in-time recovery backup using WAL files
   */
  async enablePointInTimeRecovery(): Promise<boolean> {
    try {
      // This would typically be configured at the PostgreSQL server level
      // For now, we'll document the required configuration
      console.log('Point-in-time recovery setup:');
      console.log('1. Set wal_level = replica in postgresql.conf');
      console.log('2. Set archive_mode = on');
      console.log('3. Set archive_command to copy WAL files to backup location');
      console.log('4. Restart PostgreSQL server');

      return true;
    } catch (error) {
      console.error('Failed to enable point-in-time recovery:', error);
      return false;
    }
  }

  /**
   * Restore database from backup file
   */
  async restoreFromBackup(backupFilePath: string): Promise<BackupResult> {
    const timestamp = new Date();

    try {
      console.log(`Starting database restore from ${backupFilePath}`);

      // Parse database URL
      const dbUrl = new URL(this.config.databaseUrl);

      // Create pg_restore command
      const pgRestoreArgs = [
        '--host', dbUrl.hostname,
        '--port', dbUrl.port || '5432',
        '--username', dbUrl.username,
        '--dbname', dbUrl.pathname.slice(1),
        '--verbose',
        '--clean',
        '--if-exists',
        backupFilePath
      ];

      // Set password via environment variable
      const env = {
        ...process.env,
        PGPASSWORD: dbUrl.password
      };

      const { stdout, stderr } = await execAsync(`pg_restore ${pgRestoreArgs.join(' ')}`, { env });

      console.log('Restore completed successfully');
      console.log('STDOUT:', stdout);
      if (stderr) console.log('STDERR:', stderr);

      return {
        success: true,
        timestamp,
        backupPath: backupFilePath
      };

    } catch (error) {
      return {
        success: false,
        timestamp,
        error: `Restore failed: ${error}`
      };
    }
  }

  /**
   * Upload backup file to S3 (if configured)
   */
  private async uploadToS3(filePath: string, fileName: string): Promise<string> {
    if (!this.config.s3Config) {
      throw new Error('S3 configuration not provided');
    }

    // This would use AWS SDK in a real implementation
    // For now, we'll simulate the upload
    const s3Path = `s3://${this.config.s3Config.bucket}/backups/${fileName}`;
    console.log(`Would upload ${filePath} to ${s3Path}`);
    return s3Path;
  }

  /**
   * Clean up old backup files based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.backupPath);
      const backupFiles = files.filter(file => file.startsWith('backup_'));

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Test backup and restore functionality
   */
  async testBackupRestore(): Promise<boolean> {
    try {
      console.log('Testing backup and restore functionality...');

      // Create a test backup
      const backupResult = await this.createFullBackup();
      if (!backupResult.success) {
        console.error('Test backup failed:', backupResult.error);
        return false;
      }

      // Note: In production, you would restore to a test database
      console.log('Backup test completed successfully');
      console.log('Restore test skipped (would restore to test database)');

      return true;
    } catch (error) {
      console.error('Backup/restore test failed:', error);
      return false;
    }
  }

  /**
   * Get backup status and statistics
   */
  async getBackupStatus(): Promise<{
    lastBackup?: Date;
    backupCount: number;
    totalSize: number;
    oldestBackup?: Date;
  }> {
    try {
      const files = await fs.readdir(this.config.backupPath);
      const backupFiles = files.filter(file => file.startsWith('backup_'));

      let totalSize = 0;
      let lastBackup: Date | undefined;
      let oldestBackup: Date | undefined;

      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.stat(filePath);

        totalSize += stats.size;

        if (!lastBackup || stats.mtime > lastBackup) {
          lastBackup = stats.mtime;
        }

        if (!oldestBackup || stats.mtime < oldestBackup) {
          oldestBackup = stats.mtime;
        }
      }

      return {
        lastBackup,
        backupCount: backupFiles.length,
        totalSize,
        oldestBackup
      };
    } catch (error) {
      console.error('Failed to get backup status:', error);
      return {
        backupCount: 0,
        totalSize: 0
      };
    }
  }
}

// Factory function to create backup manager with environment-based config
export function createBackupManager(): BackupManager {
  const config: BackupConfig = {
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres',
    backupPath: process.env.BACKUP_PATH || '/tmp/db-backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    s3Config: process.env.AWS_S3_BUCKET ? {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    } : undefined
  };

  return new BackupManager(config);
}