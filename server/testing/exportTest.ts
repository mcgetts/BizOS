import { dataExporter } from '../export/dataExporter.js';
import type { ExportFormat, ExportEntity } from '../export/dataExporter.js';
import fs from 'fs/promises';
import path from 'path';

interface ExportTestResult {
  format: ExportFormat;
  entities: ExportEntity[];
  success: boolean;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  duration: number;
  timestamp: Date;
}

export class ExportTest {

  /**
   * Test all export formats and entities
   */
  async runAllExportTests(): Promise<ExportTestResult[]> {
    const results: ExportTestResult[] = [];

    const formats: ExportFormat[] = ['json', 'csv', 'xlsx'];
    const entitySets: ExportEntity[][] = [
      ['users'],
      ['clients', 'companies'],
      ['projects', 'tasks'],
      ['invoices', 'expenses'],
      ['all']
    ];

    for (const format of formats) {
      for (const entities of entitySets) {
        const result = await this.testExport(format, entities);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test a specific export configuration
   */
  async testExport(format: ExportFormat, entities: ExportEntity[]): Promise<ExportTestResult> {
    const startTime = Date.now();

    try {
      console.log(`Testing export: ${format} format, entities: ${entities.join(', ')}`);

      const options = {
        format,
        entities,
        compressed: false,
        includeDeleted: false
      };

      const result = await dataExporter.exportData(options);

      if (!result.success) {
        return {
          format,
          entities,
          success: false,
          error: result.error || 'Export failed',
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // Verify file exists and get stats
      if (result.filePath) {
        const stats = await fs.stat(result.filePath);

        return {
          format,
          entities,
          success: true,
          filePath: result.filePath,
          fileSize: stats.size,
          recordCount: result.recordCount,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      } else {
        return {
          format,
          entities,
          success: false,
          error: 'No file path returned',
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        format,
        entities,
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test export with compression
   */
  async testCompressedExport(): Promise<ExportTestResult> {
    const startTime = Date.now();

    try {
      const options = {
        format: 'json' as ExportFormat,
        entities: ['all'] as ExportEntity[],
        compressed: true,
        includeDeleted: false
      };

      const result = await dataExporter.exportData(options);

      if (result.success && result.filePath) {
        const stats = await fs.stat(result.filePath);

        return {
          format: 'json',
          entities: ['all'],
          success: true,
          filePath: result.filePath,
          fileSize: stats.size,
          recordCount: result.recordCount,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      } else {
        return {
          format: 'json',
          entities: ['all'],
          success: false,
          error: result.error || 'Compressed export failed',
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        format: 'json',
        entities: ['all'],
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test export with date range filtering
   */
  async testDateRangeExport(): Promise<ExportTestResult> {
    const startTime = Date.now();

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago

      const options = {
        format: 'csv' as ExportFormat,
        entities: ['tasks', 'timeEntries'] as ExportEntity[],
        dateRange: {
          start: startDate,
          end: endDate
        },
        compressed: false
      };

      const result = await dataExporter.exportData(options);

      if (result.success && result.filePath) {
        const stats = await fs.stat(result.filePath);

        return {
          format: 'csv',
          entities: ['tasks', 'timeEntries'],
          success: true,
          filePath: result.filePath,
          fileSize: stats.size,
          recordCount: result.recordCount,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      } else {
        return {
          format: 'csv',
          entities: ['tasks', 'timeEntries'],
          success: false,
          error: result.error || 'Date range export failed',
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        format: 'csv',
        entities: ['tasks', 'timeEntries'],
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test export file content validation
   */
  async testExportContentValidation(format: ExportFormat, entities: ExportEntity[]): Promise<{
    valid: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const options = {
        format,
        entities,
        compressed: false
      };

      const result = await dataExporter.exportData(options);

      if (!result.success || !result.filePath) {
        return {
          valid: false,
          error: 'Export failed or no file generated'
        };
      }

      const fileContent = await fs.readFile(result.filePath, 'utf-8');

      if (format === 'json') {
        try {
          const data = JSON.parse(fileContent);
          return {
            valid: true,
            details: {
              dataKeys: Object.keys(data),
              recordCounts: Object.entries(data).map(([key, value]) => ({
                entity: key,
                count: Array.isArray(value) ? value.length : 'not_array'
              }))
            }
          };
        } catch (parseError) {
          return {
            valid: false,
            error: 'Invalid JSON format'
          };
        }
      } else if (format === 'csv') {
        const lines = fileContent.split('\n').filter(line => line.trim());
        const hasHeader = lines.length > 0 && lines[0].includes(',');

        return {
          valid: hasHeader,
          details: {
            lineCount: lines.length,
            hasHeader,
            sampleHeader: lines[0]?.substring(0, 100)
          }
        };
      } else if (format === 'xlsx') {
        // For XLSX, just check if file exists and has content
        return {
          valid: fileContent.length > 0,
          details: {
            fileSize: fileContent.length
          }
        };
      }

      return { valid: false, error: 'Unknown format' };

    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test export cleanup functionality
   */
  async testExportCleanup(): Promise<{
    success: boolean;
    cleanedCount?: number;
    error?: string;
  }> {
    try {
      // Create a test export first
      const options = {
        format: 'json' as ExportFormat,
        entities: ['users'] as ExportEntity[],
        compressed: false
      };

      const result = await dataExporter.exportData(options);

      if (!result.success || !result.filePath) {
        return {
          success: false,
          error: 'Failed to create test export for cleanup test'
        };
      }

      // Test if cleanup method exists and works
      if (typeof (dataExporter as any).cleanupOldExports === 'function') {
        const cleanedCount = await (dataExporter as any).cleanupOldExports();

        return {
          success: true,
          cleanedCount
        };
      } else {
        return {
          success: false,
          error: 'Cleanup method not available'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Generate export test report
   */
  generateTestReport(results: ExportTestResult[]): string {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalSize = results
      .filter(r => r.success && r.fileSize)
      .reduce((sum, r) => sum + (r.fileSize || 0), 0);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    let report = `
# Data Export Functionality Test Report

**Test Timestamp**: ${new Date().toISOString()}
**Total Tests**: ${results.length}
**Successful**: ${successCount}
**Failed**: ${failCount}
**Success Rate**: ${((successCount / results.length) * 100).toFixed(1)}%
**Total Export Size**: ${this.formatBytes(totalSize)}
**Average Duration**: ${avgDuration.toFixed(0)}ms

---

## Test Results by Format

`;

    const byFormat = results.reduce((acc, result) => {
      if (!acc[result.format]) {
        acc[result.format] = [];
      }
      acc[result.format].push(result);
      return acc;
    }, {} as Record<ExportFormat, ExportTestResult[]>);

    Object.entries(byFormat).forEach(([format, formatResults]) => {
      const formatSuccess = formatResults.filter(r => r.success).length;
      const formatTotal = formatResults.length;

      report += `
### ${format.toUpperCase()} Format

**Success Rate**: ${((formatSuccess / formatTotal) * 100).toFixed(1)}% (${formatSuccess}/${formatTotal})

| Entities | Status | Size | Records | Duration |
|----------|--------|------|---------|----------|
`;

      formatResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const size = result.fileSize ? this.formatBytes(result.fileSize) : 'N/A';
        const records = result.recordCount || 'N/A';
        const duration = `${result.duration}ms`;
        const entities = result.entities.join(', ');

        report += `| ${entities} | ${status} | ${size} | ${records} | ${duration} |
`;
      });
    });

    report += `
---

## Failed Tests

`;

    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      failedTests.forEach(result => {
        report += `
### ❌ ${result.format.toUpperCase()} - ${result.entities.join(', ')}

**Error**: ${result.error}
**Duration**: ${result.duration}ms
**Timestamp**: ${result.timestamp.toISOString()}
`;
      });
    } else {
      report += `✅ **No failed tests**
`;
    }

    return report;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up test export files
   */
  async cleanupTestFiles(results: ExportTestResult[]): Promise<void> {
    for (const result of results) {
      if (result.success && result.filePath) {
        try {
          await fs.unlink(result.filePath);
          console.log(`Cleaned up test export: ${result.filePath}`);
        } catch (error) {
          console.warn(`Failed to cleanup test file ${result.filePath}:`, error);
        }
      }
    }
  }
}

// Global instance
export const exportTest = new ExportTest();