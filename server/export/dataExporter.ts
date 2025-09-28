import { db } from '../db.js';
import { eq, and, sql } from 'drizzle-orm';
import {
  users, clients, companies, projects, tasks, timeEntries,
  invoices, expenses, documents, knowledgeArticles,
  salesOpportunities, supportTickets, marketingCampaigns
} from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type ExportEntity =
  | 'users' | 'clients' | 'companies' | 'projects' | 'tasks'
  | 'timeEntries' | 'invoices' | 'expenses' | 'documents'
  | 'knowledgeArticles' | 'salesOpportunities' | 'supportTickets'
  | 'marketingCampaigns' | 'all';

interface ExportOptions {
  format: ExportFormat;
  entities: ExportEntity[];
  userId?: string; // For user-specific exports
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeDeleted?: boolean;
  compressed?: boolean;
}

interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  size?: number;
  recordCount?: number;
  timestamp: Date;
  error?: string;
  downloadUrl?: string;
}

interface ExportProgress {
  entity: string;
  processed: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export class DataExporter {
  private exportPath: string;

  constructor(exportPath = '/tmp/exports') {
    this.exportPath = exportPath;
    this.ensureExportDirectory();
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }
  }

  /**
   * Export data based on options
   */
  async exportData(options: ExportOptions, progressCallback?: (progress: ExportProgress) => void): Promise<ExportResult> {
    const timestamp = new Date();
    const fileName = this.generateFileName(options, timestamp);
    const filePath = path.join(this.exportPath, fileName);

    try {
      console.log(`Starting data export: ${fileName}`);

      let totalRecords = 0;

      if (options.format === 'json') {
        totalRecords = await this.exportToJSON(options, filePath, progressCallback);
      } else if (options.format === 'csv') {
        totalRecords = await this.exportToCSV(options, filePath, progressCallback);
      } else if (options.format === 'xlsx') {
        totalRecords = await this.exportToExcel(options, filePath, progressCallback);
      } else {
        throw new Error(`Unsupported export format: ${options.format}`);
      }

      const stats = await fs.stat(filePath);

      // Compress if requested
      let finalPath = filePath;
      if (options.compressed) {
        finalPath = await this.compressFile(filePath);
      }

      console.log(`Export completed: ${finalPath} (${stats.size} bytes, ${totalRecords} records)`);

      return {
        success: true,
        filePath: finalPath,
        fileName: path.basename(finalPath),
        size: stats.size,
        recordCount: totalRecords,
        timestamp,
        downloadUrl: `/api/exports/download/${path.basename(finalPath)}`
      };

    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    options: ExportOptions,
    filePath: string,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<number> {
    const writeStream = createWriteStream(filePath);
    let totalRecords = 0;

    try {
      writeStream.write('{\n');

      const entities = options.entities.includes('all')
        ? ['users', 'clients', 'companies', 'projects', 'tasks', 'timeEntries', 'invoices', 'expenses', 'documents', 'knowledgeArticles', 'salesOpportunities', 'supportTickets', 'marketingCampaigns'] as ExportEntity[]
        : options.entities;

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

        if (progressCallback) {
          progressCallback({
            entity,
            processed: 0,
            total: 0,
            status: 'processing'
          });
        }

        const data = await this.getEntityData(entity, options);
        const recordCount = data.length;
        totalRecords += recordCount;

        writeStream.write(`  "${entity}": `);
        writeStream.write(JSON.stringify(data, null, 2));

        if (i < entities.length - 1) {
          writeStream.write(',');
        }
        writeStream.write('\n');

        if (progressCallback) {
          progressCallback({
            entity,
            processed: recordCount,
            total: recordCount,
            status: 'completed'
          });
        }
      }

      writeStream.write('}\n');
      writeStream.end();

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(totalRecords));
        writeStream.on('error', reject);
      });

    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    options: ExportOptions,
    filePath: string,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<number> {
    let totalRecords = 0;

    const entities = options.entities.includes('all')
      ? ['users', 'clients', 'companies', 'projects', 'tasks', 'timeEntries', 'invoices', 'expenses', 'documents', 'knowledgeArticles', 'salesOpportunities', 'supportTickets', 'marketingCampaigns'] as ExportEntity[]
      : options.entities;

    for (const entity of entities) {
      if (progressCallback) {
        progressCallback({
          entity,
          processed: 0,
          total: 0,
          status: 'processing'
        });
      }

      const data = await this.getEntityData(entity, options);
      const recordCount = data.length;
      totalRecords += recordCount;

      if (data.length > 0) {
        const csvPath = filePath.replace('.csv', `_${entity}.csv`);
        await this.writeCSVFile(csvPath, data);
      }

      if (progressCallback) {
        progressCallback({
          entity,
          processed: recordCount,
          total: recordCount,
          status: 'completed'
        });
      }
    }

    return totalRecords;
  }

  /**
   * Export to Excel format
   */
  private async exportToExcel(
    options: ExportOptions,
    filePath: string,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<number> {
    // This would require xlsx library - for now, fall back to JSON
    console.log('Excel export not yet implemented, falling back to JSON');
    return await this.exportToJSON(options, filePath.replace('.xlsx', '.json'), progressCallback);
  }

  /**
   * Get data for a specific entity
   */
  private async getEntityData(entity: ExportEntity, options: ExportOptions): Promise<any[]> {
    const userId = options.userId;
    const dateRange = options.dateRange;

    try {
      switch (entity) {
        case 'users':
          return await db.select().from(users);

        case 'clients':
          let clientQuery = db.select().from(clients);
          if (userId) {
            clientQuery = clientQuery.where(eq(clients.assignedTo, userId));
          }
          return await clientQuery;

        case 'companies':
          let companyQuery = db.select().from(companies);
          if (userId) {
            companyQuery = companyQuery.where(eq(companies.assignedTo, userId));
          }
          return await companyQuery;

        case 'projects':
          let projectQuery = db.select().from(projects);
          if (userId) {
            projectQuery = projectQuery.where(eq(projects.managerId, userId));
          }
          if (dateRange) {
            projectQuery = projectQuery.where(
              and(
                sql`${projects.createdAt} >= ${dateRange.start}`,
                sql`${projects.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await projectQuery;

        case 'tasks':
          let taskQuery = db.select().from(tasks);
          if (userId) {
            taskQuery = taskQuery.where(eq(tasks.assignedTo, userId));
          }
          if (dateRange) {
            taskQuery = taskQuery.where(
              and(
                sql`${tasks.createdAt} >= ${dateRange.start}`,
                sql`${tasks.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await taskQuery;

        case 'timeEntries':
          let timeQuery = db.select().from(timeEntries);
          if (userId) {
            timeQuery = timeQuery.where(eq(timeEntries.userId, userId));
          }
          if (dateRange) {
            timeQuery = timeQuery.where(
              and(
                sql`${timeEntries.date} >= ${dateRange.start}`,
                sql`${timeEntries.date} <= ${dateRange.end}`
              )
            );
          }
          return await timeQuery;

        case 'invoices':
          let invoiceQuery = db.select().from(invoices);
          if (dateRange) {
            invoiceQuery = invoiceQuery.where(
              and(
                sql`${invoices.createdAt} >= ${dateRange.start}`,
                sql`${invoices.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await invoiceQuery;

        case 'expenses':
          let expenseQuery = db.select().from(expenses);
          if (userId) {
            expenseQuery = expenseQuery.where(eq(expenses.userId, userId));
          }
          if (dateRange) {
            expenseQuery = expenseQuery.where(
              and(
                sql`${expenses.date} >= ${dateRange.start}`,
                sql`${expenses.date} <= ${dateRange.end}`
              )
            );
          }
          return await expenseQuery;

        case 'documents':
          let docQuery = db.select().from(documents);
          if (userId) {
            docQuery = docQuery.where(eq(documents.uploadedBy, userId));
          }
          if (dateRange) {
            docQuery = docQuery.where(
              and(
                sql`${documents.createdAt} >= ${dateRange.start}`,
                sql`${documents.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await docQuery;

        case 'knowledgeArticles':
          let articleQuery = db.select().from(knowledgeArticles);
          if (userId) {
            articleQuery = articleQuery.where(eq(knowledgeArticles.authorId, userId));
          }
          if (dateRange) {
            articleQuery = articleQuery.where(
              and(
                sql`${knowledgeArticles.createdAt} >= ${dateRange.start}`,
                sql`${knowledgeArticles.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await articleQuery;

        case 'salesOpportunities':
          let oppQuery = db.select().from(salesOpportunities);
          if (userId) {
            oppQuery = oppQuery.where(eq(salesOpportunities.assignedTo, userId));
          }
          if (dateRange) {
            oppQuery = oppQuery.where(
              and(
                sql`${salesOpportunities.createdAt} >= ${dateRange.start}`,
                sql`${salesOpportunities.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await oppQuery;

        case 'supportTickets':
          let ticketQuery = db.select().from(supportTickets);
          if (userId) {
            ticketQuery = ticketQuery.where(eq(supportTickets.assignedTo, userId));
          }
          if (dateRange) {
            ticketQuery = ticketQuery.where(
              and(
                sql`${supportTickets.createdAt} >= ${dateRange.start}`,
                sql`${supportTickets.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await ticketQuery;

        case 'marketingCampaigns':
          let campaignQuery = db.select().from(marketingCampaigns);
          if (userId) {
            campaignQuery = campaignQuery.where(eq(marketingCampaigns.managerId, userId));
          }
          if (dateRange) {
            campaignQuery = campaignQuery.where(
              and(
                sql`${marketingCampaigns.createdAt} >= ${dateRange.start}`,
                sql`${marketingCampaigns.createdAt} <= ${dateRange.end}`
              )
            );
          }
          return await campaignQuery;

        default:
          throw new Error(`Unknown entity: ${entity}`);
      }
    } catch (error) {
      console.error(`Failed to get data for entity ${entity}:`, error);
      return [];
    }
  }

  /**
   * Write CSV file
   */
  private async writeCSVFile(filePath: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    const writeStream = createWriteStream(filePath);

    try {
      // Write header
      const headers = Object.keys(data[0]);
      writeStream.write(headers.map(h => this.escapeCSV(h)).join(',') + '\n');

      // Write data rows
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return this.escapeCSV(value);
        });
        writeStream.write(values.join(',') + '\n');
      }

      writeStream.end();

      return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }

    return stringValue;
  }

  /**
   * Compress file using gzip
   */
  private async compressFile(filePath: string): Promise<string> {
    const zlib = await import('zlib');
    const compressedPath = filePath + '.gz';

    const readStream = (await import('fs')).createReadStream(filePath);
    const writeStream = createWriteStream(compressedPath);
    const gzip = zlib.createGzip();

    await pipeline(readStream, gzip, writeStream);

    // Remove original file
    await fs.unlink(filePath);

    return compressedPath;
  }

  /**
   * Generate filename based on options
   */
  private generateFileName(options: ExportOptions, timestamp: Date): string {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');

    const entityStr = options.entities.includes('all')
      ? 'all-data'
      : options.entities.join('-');

    const userStr = options.userId ? `_user-${options.userId}` : '';
    const rangeStr = options.dateRange
      ? `_${options.dateRange.start.toISOString().split('T')[0]}-to-${options.dateRange.end.toISOString().split('T')[0]}`
      : '';

    return `export_${entityStr}${userStr}${rangeStr}_${dateStr}_${timeStr}.${options.format}`;
  }

  /**
   * List available export files
   */
  async listExports(): Promise<{ fileName: string; size: number; created: Date; downloadUrl: string }[]> {
    try {
      const files = await fs.readdir(this.exportPath);
      const exports = [];

      for (const file of files) {
        if (file.startsWith('export_')) {
          const filePath = path.join(this.exportPath, file);
          const stats = await fs.stat(filePath);

          exports.push({
            fileName: file,
            size: stats.size,
            created: stats.birthtime,
            downloadUrl: `/api/exports/download/${file}`
          });
        }
      }

      return exports.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error('Failed to list exports:', error);
      return [];
    }
  }

  /**
   * Delete old export files
   */
  async cleanupOldExports(maxAgeHours = 72): Promise<void> {
    try {
      const files = await fs.readdir(this.exportPath);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        if (file.startsWith('export_')) {
          const filePath = path.join(this.exportPath, file);
          const stats = await fs.stat(filePath);

          if (stats.birthtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Deleted old export: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
    }
  }

  /**
   * Get export file path
   */
  getExportFilePath(fileName: string): string {
    return path.join(this.exportPath, fileName);
  }
}

export const dataExporter = new DataExporter();