import { db } from '../db.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { users, projects, tasks, timeEntries, expenses, supportTickets, notifications, auditLogs, userSessions } from '../../shared/schema.js';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';

export interface UserDataExportOptions {
  userId: string;
  format: 'json' | 'csv' | 'xlsx';
  includePersonalData: boolean;
  includeActivityData: boolean;
  includeAuditLogs: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  compressed?: boolean;
}

export interface UserDataExportResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  exportId: string;
  timestamp: Date;
}

export class UserDataExporter {
  private exportPath: string;

  constructor() {
    this.exportPath = process.env.EXPORT_PATH || '/tmp/exports';
  }

  /**
   * Export all user data for GDPR compliance
   */
  async exportUserData(options: UserDataExportOptions): Promise<UserDataExportResult> {
    const exportId = `user-export-${options.userId}-${Date.now()}`;

    try {
      // Ensure export directory exists
      await fs.mkdir(this.exportPath, { recursive: true });

      // Collect user data
      const userData = await this.collectUserData(options);

      // Generate export file
      const filePath = await this.generateExportFile(userData, options, exportId);

      // Get file stats
      const stats = await fs.stat(filePath);

      // Log export activity
      await this.logExportActivity(options.userId, exportId, options.format);

      return {
        success: true,
        filePath,
        fileSize: stats.size,
        recordCount: this.countRecords(userData),
        exportId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('User data export failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        exportId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Collect all user-related data from database
   */
  private async collectUserData(options: UserDataExportOptions) {
    const { userId, includePersonalData, includeActivityData, includeAuditLogs, dateRange } = options;
    const userData: any = {};

    // Personal Information
    if (includePersonalData) {
      const userInfo = await db.select().from(users).where(eq(users.id, userId));
      userData.personalInfo = userInfo[0] ? {
        id: userInfo[0].id,
        email: userInfo[0].email,
        firstName: userInfo[0].firstName,
        lastName: userInfo[0].lastName,
        role: userInfo[0].role,
        department: userInfo[0].department,
        enhancedRole: userInfo[0].enhancedRole,
        createdAt: userInfo[0].createdAt,
        lastLoginAt: userInfo[0].lastLoginAt,
        emailVerified: userInfo[0].emailVerified,
        mfaEnabled: userInfo[0].mfaEnabled,
        sessionLimit: userInfo[0].sessionLimit
      } : null;

      // User sessions
      const sessions = await db.select().from(userSessions).where(eq(userSessions.userId, userId));
      userData.sessions = sessions.map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        lastAccess: session.lastAccess,
        createdAt: session.createdAt,
        isActive: session.isActive
      }));
    }

    // Activity Data
    if (includeActivityData) {
      let projectsQuery = db.select().from(projects).where(eq(projects.createdBy, userId));
      let tasksQuery = db.select().from(tasks).where(eq(tasks.assignedTo, userId));
      let timeEntriesQuery = db.select().from(timeEntries).where(eq(timeEntries.userId, userId));
      let expensesQuery = db.select().from(expenses).where(eq(expenses.userId, userId));
      let supportTicketsQuery = db.select().from(supportTickets).where(eq(supportTickets.userId, userId));
      let notificationsQuery = db.select().from(notifications).where(eq(notifications.userId, userId));

      // Apply date range filtering if specified
      if (dateRange) {
        projectsQuery = projectsQuery.where(
          and(
            gte(projects.createdAt, dateRange.start),
            lte(projects.createdAt, dateRange.end)
          )
        ) as any;

        tasksQuery = tasksQuery.where(
          and(
            gte(tasks.createdAt, dateRange.start),
            lte(tasks.createdAt, dateRange.end)
          )
        ) as any;

        timeEntriesQuery = timeEntriesQuery.where(
          and(
            gte(timeEntries.startTime, dateRange.start),
            lte(timeEntries.startTime, dateRange.end)
          )
        ) as any;

        expensesQuery = expensesQuery.where(
          and(
            gte(expenses.date, dateRange.start),
            lte(expenses.date, dateRange.end)
          )
        ) as any;

        supportTicketsQuery = supportTicketsQuery.where(
          and(
            gte(supportTickets.createdAt, dateRange.start),
            lte(supportTickets.createdAt, dateRange.end)
          )
        ) as any;

        notificationsQuery = notificationsQuery.where(
          and(
            gte(notifications.createdAt, dateRange.start),
            lte(notifications.createdAt, dateRange.end)
          )
        ) as any;
      }

      // Execute queries
      userData.projects = await projectsQuery;
      userData.tasks = await tasksQuery;
      userData.timeEntries = await timeEntriesQuery;
      userData.expenses = await expensesQuery;
      userData.supportTickets = await supportTicketsQuery;
      userData.notifications = await notificationsQuery;
    }

    // Audit Logs (if requested and user has permission)
    if (includeAuditLogs) {
      let auditQuery = db.select().from(auditLogs).where(eq(auditLogs.userId, userId));

      if (dateRange) {
        auditQuery = auditQuery.where(
          and(
            gte(auditLogs.timestamp, dateRange.start),
            lte(auditLogs.timestamp, dateRange.end)
          )
        ) as any;
      }

      userData.auditLogs = await auditQuery;
    }

    return userData;
  }

  /**
   * Generate export file in specified format
   */
  private async generateExportFile(userData: any, options: UserDataExportOptions, exportId: string): Promise<string> {
    const fileName = `${exportId}.${options.format}`;
    const filePath = path.join(this.exportPath, fileName);

    switch (options.format) {
      case 'json':
        await fs.writeFile(filePath, JSON.stringify(userData, null, 2), 'utf-8');
        break;

      case 'csv':
        await this.generateCSVExport(userData, filePath);
        break;

      case 'xlsx':
        await this.generateExcelExport(userData, filePath);
        break;

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Compress if requested
    if (options.compressed) {
      const compressedPath = await this.compressFile(filePath);
      await fs.unlink(filePath); // Remove uncompressed file
      return compressedPath;
    }

    return filePath;
  }

  /**
   * Generate CSV export with multiple sheets as separate files
   */
  private async generateCSVExport(userData: any, basePath: string): Promise<void> {
    const baseDir = path.dirname(basePath);
    const baseName = path.basename(basePath, '.csv');

    for (const [key, data] of Object.entries(userData)) {
      if (Array.isArray(data) && data.length > 0) {
        const csvPath = path.join(baseDir, `${baseName}-${key}.csv`);
        const csvWriter = createObjectCsvWriter({
          path: csvPath,
          header: Object.keys(data[0]).map(field => ({ id: field, title: field }))
        });
        await csvWriter.writeRecords(data);
      } else if (typeof data === 'object' && data !== null) {
        // Single object (like personalInfo)
        const csvPath = path.join(baseDir, `${baseName}-${key}.csv`);
        const csvWriter = createObjectCsvWriter({
          path: csvPath,
          header: Object.keys(data).map(field => ({ id: field, title: field }))
        });
        await csvWriter.writeRecords([data]);
      }
    }
  }

  /**
   * Generate Excel export with multiple worksheets
   */
  private async generateExcelExport(userData: any, filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    for (const [key, data] of Object.entries(userData)) {
      const worksheet = workbook.addWorksheet(key);

      if (Array.isArray(data) && data.length > 0) {
        // Array data
        const columns = Object.keys(data[0]).map(field => ({
          header: field,
          key: field,
          width: 15
        }));
        worksheet.columns = columns;
        worksheet.addRows(data);
      } else if (typeof data === 'object' && data !== null) {
        // Single object
        worksheet.columns = [
          { header: 'Field', key: 'field', width: 20 },
          { header: 'Value', key: 'value', width: 30 }
        ];

        const rows = Object.entries(data).map(([field, value]) => ({
          field,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }));
        worksheet.addRows(rows);
      }

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    }

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Compress export file
   */
  private async compressFile(filePath: string): Promise<string> {
    const { createGzip } = await import('zlib');
    const { pipeline } = await import('stream/promises');

    const compressedPath = `${filePath}.gz`;
    const readStream = (await import('fs')).createReadStream(filePath);
    const writeStream = (await import('fs')).createWriteStream(compressedPath);
    const gzip = createGzip();

    await pipeline(readStream, gzip, writeStream);
    return compressedPath;
  }

  /**
   * Count total records in export
   */
  private countRecords(userData: any): number {
    let count = 0;

    for (const [key, data] of Object.entries(userData)) {
      if (Array.isArray(data)) {
        count += data.length;
      } else if (typeof data === 'object' && data !== null) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Log export activity for audit purposes
   */
  private async logExportActivity(userId: string, exportId: string, format: string): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'data_export',
        resource: 'user_data',
        resourceId: userId,
        details: JSON.stringify({ exportId, format }),
        ipAddress: '127.0.0.1', // Will be updated by middleware in actual requests
        userAgent: 'UserDataExporter',
        timestamp: new Date(),
        riskScore: 1 // Low risk for legitimate data export
      });
    } catch (error) {
      console.error('Failed to log export activity:', error);
    }
  }

  /**
   * Request data deletion (GDPR Right to be Forgotten)
   */
  async requestDataDeletion(userId: string, reason?: string): Promise<{
    success: boolean;
    deletionRequestId: string;
    error?: string;
  }> {
    const deletionRequestId = `deletion-${userId}-${Date.now()}`;

    try {
      // Log deletion request
      await db.insert(auditLogs).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'data_deletion_request',
        resource: 'user_data',
        resourceId: userId,
        details: JSON.stringify({ deletionRequestId, reason }),
        ipAddress: '127.0.0.1',
        userAgent: 'UserDataExporter',
        timestamp: new Date(),
        riskScore: 3 // Medium risk for data deletion
      });

      // Note: Actual deletion should be a manual process or scheduled job
      // This creates a deletion request that needs admin approval
      console.log(`Data deletion requested for user ${userId}. Request ID: ${deletionRequestId}`);

      return {
        success: true,
        deletionRequestId
      };

    } catch (error) {
      console.error('Data deletion request failed:', error);
      return {
        success: false,
        deletionRequestId,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get user's export history
   */
  async getExportHistory(userId: string): Promise<any[]> {
    try {
      const exports = await db.select().from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, userId),
            eq(auditLogs.action, 'data_export')
          )
        )
        .orderBy(auditLogs.timestamp);

      return exports.map(log => ({
        exportId: JSON.parse(log.details || '{}').exportId,
        format: JSON.parse(log.details || '{}').format,
        timestamp: log.timestamp,
        id: log.id
      }));
    } catch (error) {
      console.error('Failed to get export history:', error);
      return [];
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = await fs.readdir(this.exportPath);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportPath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
      return 0;
    }
  }
}

// Global instance
export const userDataExporter = new UserDataExporter();

// Standalone export function for API routes
export async function exportUserData(options: UserDataExportOptions): Promise<UserDataExportResult> {
  return userDataExporter.exportUserData(options);
}