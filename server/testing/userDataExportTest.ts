import { userDataExporter } from '../export/userDataExporter.js';
import type { UserDataExportOptions } from '../export/userDataExporter.js';
import fs from 'fs/promises';
import path from 'path';

interface UserDataExportTestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export class UserDataExportTest {

  /**
   * Test all user data export functionality
   */
  async runAllTests(): Promise<UserDataExportTestResult[]> {
    const results: UserDataExportTestResult[] = [];

    // Test JSON export
    results.push(await this.testUserDataExport('json'));

    // Test CSV export
    results.push(await this.testUserDataExport('csv'));

    // Test XLSX export
    results.push(await this.testUserDataExport('xlsx'));

    // Test compressed export
    results.push(await this.testCompressedExport());

    // Test date range filtering
    results.push(await this.testDateRangeExport());

    // Test export history
    results.push(await this.testExportHistory());

    // Test data deletion request
    results.push(await this.testDataDeletionRequest());

    // Test export cleanup
    results.push(await this.testExportCleanup());

    return results;
  }

  /**
   * Test user data export for a specific format
   */
  async testUserDataExport(format: 'json' | 'csv' | 'xlsx'): Promise<UserDataExportTestResult> {
    try {
      const testUserId = 'test-user-export-' + Date.now();

      const options: UserDataExportOptions = {
        userId: testUserId,
        format,
        includePersonalData: true,
        includeActivityData: true,
        includeAuditLogs: false,
        compressed: false
      };

      const result = await userDataExporter.exportUserData(options);

      if (result.success && result.filePath) {
        // Verify file exists
        try {
          const stats = await fs.stat(result.filePath);

          // Clean up test file
          await fs.unlink(result.filePath);

          return {
            testName: `User Data Export (${format.toUpperCase()})`,
            success: true,
            message: `Successfully exported user data in ${format} format`,
            details: {
              fileSize: stats.size,
              recordCount: result.recordCount,
              exportId: result.exportId
            },
            timestamp: new Date()
          };
        } catch (fileError) {
          return {
            testName: `User Data Export (${format.toUpperCase()})`,
            success: false,
            message: `Export file not found: ${result.filePath}`,
            timestamp: new Date()
          };
        }
      } else {
        return {
          testName: `User Data Export (${format.toUpperCase()})`,
          success: false,
          message: result.error || 'Export failed without error message',
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        testName: `User Data Export (${format.toUpperCase()})`,
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test compressed export functionality
   */
  async testCompressedExport(): Promise<UserDataExportTestResult> {
    try {
      const testUserId = 'test-user-compressed-' + Date.now();

      const options: UserDataExportOptions = {
        userId: testUserId,
        format: 'json',
        includePersonalData: true,
        includeActivityData: false,
        includeAuditLogs: false,
        compressed: true
      };

      const result = await userDataExporter.exportUserData(options);

      if (result.success && result.filePath) {
        // Verify compressed file exists and has .gz extension
        const isCompressed = result.filePath.endsWith('.gz');

        try {
          const stats = await fs.stat(result.filePath);

          // Clean up test file
          await fs.unlink(result.filePath);

          return {
            testName: 'Compressed Export',
            success: isCompressed,
            message: isCompressed
              ? 'Successfully created compressed export'
              : 'Export created but not compressed',
            details: {
              fileSize: stats.size,
              isCompressed,
              filePath: result.filePath
            },
            timestamp: new Date()
          };
        } catch (fileError) {
          return {
            testName: 'Compressed Export',
            success: false,
            message: `Compressed export file not found: ${result.filePath}`,
            timestamp: new Date()
          };
        }
      } else {
        return {
          testName: 'Compressed Export',
          success: false,
          message: result.error || 'Compressed export failed',
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        testName: 'Compressed Export',
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test date range filtering
   */
  async testDateRangeExport(): Promise<UserDataExportTestResult> {
    try {
      const testUserId = 'test-user-daterange-' + Date.now();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago

      const options: UserDataExportOptions = {
        userId: testUserId,
        format: 'json',
        includePersonalData: false,
        includeActivityData: true,
        includeAuditLogs: false,
        dateRange: {
          start: startDate,
          end: endDate
        },
        compressed: false
      };

      const result = await userDataExporter.exportUserData(options);

      if (result.success && result.filePath) {
        try {
          const stats = await fs.stat(result.filePath);

          // Clean up test file
          await fs.unlink(result.filePath);

          return {
            testName: 'Date Range Export',
            success: true,
            message: 'Successfully exported data with date range filtering',
            details: {
              fileSize: stats.size,
              dateRange: { start: startDate, end: endDate },
              recordCount: result.recordCount
            },
            timestamp: new Date()
          };
        } catch (fileError) {
          return {
            testName: 'Date Range Export',
            success: false,
            message: `Date range export file not found: ${result.filePath}`,
            timestamp: new Date()
          };
        }
      } else {
        return {
          testName: 'Date Range Export',
          success: false,
          message: result.error || 'Date range export failed',
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        testName: 'Date Range Export',
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test export history functionality
   */
  async testExportHistory(): Promise<UserDataExportTestResult> {
    try {
      const testUserId = 'test-user-history-' + Date.now();

      // Create a test export first
      const options: UserDataExportOptions = {
        userId: testUserId,
        format: 'json',
        includePersonalData: true,
        includeActivityData: false,
        includeAuditLogs: false,
        compressed: false
      };

      const exportResult = await userDataExporter.exportUserData(options);

      if (exportResult.success) {
        // Clean up the export file
        if (exportResult.filePath) {
          try {
            await fs.unlink(exportResult.filePath);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }

        // Test getting export history
        const history = await userDataExporter.getExportHistory(testUserId);

        return {
          testName: 'Export History',
          success: Array.isArray(history),
          message: Array.isArray(history)
            ? `Successfully retrieved export history (${history.length} entries)`
            : 'Export history retrieval failed',
          details: {
            historyCount: Array.isArray(history) ? history.length : 0,
            testExportId: exportResult.exportId
          },
          timestamp: new Date()
        };
      } else {
        return {
          testName: 'Export History',
          success: false,
          message: 'Could not create test export for history test',
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        testName: 'Export History',
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test data deletion request functionality
   */
  async testDataDeletionRequest(): Promise<UserDataExportTestResult> {
    try {
      const testUserId = 'test-user-deletion-' + Date.now();
      const reason = 'Test deletion request for functionality verification';

      const result = await userDataExporter.requestDataDeletion(testUserId, reason);

      return {
        testName: 'Data Deletion Request',
        success: result.success,
        message: result.success
          ? 'Successfully submitted data deletion request'
          : `Deletion request failed: ${result.error}`,
        details: {
          deletionRequestId: result.deletionRequestId,
          reason
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        testName: 'Data Deletion Request',
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test export cleanup functionality
   */
  async testExportCleanup(): Promise<UserDataExportTestResult> {
    try {
      // Create a test export file that's old enough to be cleaned up
      const testUserId = 'test-user-cleanup-' + Date.now();
      const exportPath = process.env.EXPORT_PATH || '/tmp/exports';

      // Ensure export directory exists
      await fs.mkdir(exportPath, { recursive: true });

      // Create a test file that appears old
      const testFileName = `user-export-${testUserId}-old.json`;
      const testFilePath = path.join(exportPath, testFileName);
      await fs.writeFile(testFilePath, JSON.stringify({ test: 'data' }));

      // Modify the file's timestamp to make it appear old
      const oldTime = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
      await fs.utimes(testFilePath, oldTime, oldTime);

      // Test cleanup (should clean files older than 24 hours)
      const cleanedCount = await userDataExporter.cleanupOldExports(24);

      // Verify the test file was cleaned up
      let fileStillExists = true;
      try {
        await fs.access(testFilePath);
      } catch {
        fileStillExists = false;
      }

      return {
        testName: 'Export Cleanup',
        success: !fileStillExists && cleanedCount >= 0,
        message: !fileStillExists
          ? `Successfully cleaned up old exports (${cleanedCount} files)`
          : 'Old export file was not cleaned up',
        details: {
          cleanedCount,
          testFileRemoved: !fileStillExists
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        testName: 'Export Cleanup',
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport(results: UserDataExportTestResult[]): string {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    let report = `
# User Data Portability Test Report

**Test Timestamp**: ${new Date().toISOString()}
**Total Tests**: ${results.length}
**Passed**: ${successCount}
**Failed**: ${failCount}
**Success Rate**: ${((successCount / results.length) * 100).toFixed(1)}%

---

## Test Results

`;

    results.forEach(result => {
      const emoji = result.success ? '✅' : '❌';

      report += `
### ${emoji} ${result.testName}

**Status**: ${result.success ? 'PASS' : 'FAIL'}
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
      report += `❌ **FAILURES DETECTED**: ${failCount} tests failed. Review the failed tests above.
`;
    } else {
      report += `✅ **ALL TESTS PASSED**: User data portability functionality is working correctly.
`;
    }

    return report;
  }
}

// Global instance
export const userDataExportTest = new UserDataExportTest();