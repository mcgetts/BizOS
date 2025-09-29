#!/usr/bin/env node

import { monitoringTest } from '../monitoring/monitoringTest.js';
import { exportTest } from './exportTest.js';
import { backupRestorationTest } from './backupRestorationTest.js';

interface ProductionTestSuite {
  name: string;
  description: string;
  tests: any[];
  passCount: number;
  failCount: number;
  duration: number;
}

async function runProductionReadinessTests() {
  console.log('🚀 Production Readiness Test Suite');
  console.log('==================================\n');

  const startTime = Date.now();
  const testSuites: ProductionTestSuite[] = [];

  try {
    // 1. Monitoring System Tests
    console.log('📊 Running Monitoring System Tests...');
    const monitoringTests = new monitoringTest();
    const monitoringResults = await monitoringTests.runAllTests();

    const monitoringSuite: ProductionTestSuite = {
      name: 'Monitoring System',
      description: 'Health checks, Sentry, Prometheus, and uptime monitoring',
      tests: monitoringResults,
      passCount: monitoringResults.filter(r => r.status === 'pass').length,
      failCount: monitoringResults.filter(r => r.status === 'fail').length,
      duration: Date.now() - startTime
    };
    testSuites.push(monitoringSuite);

    console.log(`✅ Monitoring: ${monitoringSuite.passCount} passed, ${monitoringSuite.failCount} failed\n`);

    // 2. Data Export Tests
    console.log('📤 Running Data Export Tests...');
    const dataExportTests = new exportTest();
    const exportResults = await dataExportTests.runAllExportTests();

    const exportSuite: ProductionTestSuite = {
      name: 'Data Export System',
      description: 'CSV, JSON, XLSX export functionality and file integrity',
      tests: exportResults,
      passCount: exportResults.filter(r => r.success).length,
      failCount: exportResults.filter(r => !r.success).length,
      duration: Date.now() - startTime
    };
    testSuites.push(exportSuite);

    console.log(`✅ Data Export: ${exportSuite.passCount} passed, ${exportSuite.failCount} failed\n`);

    // 3. Backup & Restoration Tests
    console.log('💾 Running Backup & Restoration Tests...');
    const backupTests = new backupRestorationTest();
    const backupResults = await backupTests.runAllTests();

    const backupSuite: ProductionTestSuite = {
      name: 'Backup & Restoration',
      description: 'Database backups, file integrity, and restoration procedures',
      tests: backupResults,
      passCount: backupResults.filter(r => r.success).length,
      failCount: backupResults.filter(r => !r.success).length,
      duration: Date.now() - startTime
    };
    testSuites.push(backupSuite);

    console.log(`✅ Backup: ${backupSuite.passCount} passed, ${backupSuite.failCount} failed\n`);

    // Calculate overall results
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = testSuites.reduce((sum, suite) => sum + suite.passCount, 0);
    const totalFailed = testSuites.reduce((sum, suite) => sum + suite.failCount, 0);
    const totalDuration = Date.now() - startTime;

    // Display comprehensive results
    console.log('🎯 Production Readiness Results');
    console.log('===============================');

    testSuites.forEach(suite => {
      const status = suite.failCount === 0 ? '✅ READY' : '❌ ISSUES';
      const percentage = ((suite.passCount / suite.tests.length) * 100).toFixed(1);

      console.log(`\n${status} ${suite.name} (${percentage}%)`);
      console.log(`    ${suite.description}`);
      console.log(`    Tests: ${suite.tests.length} | Passed: ${suite.passCount} | Failed: ${suite.failCount}`);
    });

    console.log(`\n📈 Overall Production Readiness:`);
    console.log(`===============================`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);

    // Generate production readiness report
    const report = generateProductionReadinessReport(testSuites, totalTests, totalPassed, totalFailed, totalDuration);
    console.log('\n📋 Production Readiness Report:');
    console.log('===============================');
    console.log(report);

    // Final assessment
    if (totalFailed === 0) {
      console.log('\n🎉 PRODUCTION READY! All systems are operational and ready for deployment.');
      console.log('✅ Monitoring systems are functional');
      console.log('✅ Data export capabilities are working');
      console.log('✅ Backup and restoration procedures are validated');
      console.log('✅ Infrastructure is production-grade');
      process.exit(0);
    } else {
      console.log(`\n⚠️  PRODUCTION NOT READY: ${totalFailed} critical issues detected.`);
      console.log('❌ Please address all failed tests before production deployment.');

      if (testSuites.find(s => s.name === 'Monitoring System' && s.failCount > 0)) {
        console.log('🚨 CRITICAL: Monitoring system issues detected - essential for production operations');
      }
      if (testSuites.find(s => s.name === 'Backup & Restoration' && s.failCount > 0)) {
        console.log('🚨 CRITICAL: Backup system issues detected - data recovery may not be possible');
      }
      if (testSuites.find(s => s.name === 'Data Export System' && s.failCount > 0)) {
        console.log('⚠️  WARNING: Data export issues detected - user data portability may be affected');
      }

      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Production readiness test execution failed:', error);
    process.exit(1);
  }
}

function generateProductionReadinessReport(
  testSuites: ProductionTestSuite[],
  totalTests: number,
  totalPassed: number,
  totalFailed: number,
  totalDuration: number
): string {
  const timestamp = new Date().toISOString();
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

  let report = `
# Production Readiness Assessment Report

**Assessment Date**: ${timestamp}
**Total Test Suites**: ${testSuites.length}
**Total Tests Executed**: ${totalTests}
**Tests Passed**: ${totalPassed}
**Tests Failed**: ${totalFailed}
**Overall Success Rate**: ${successRate}%
**Total Execution Time**: ${totalDuration}ms

---

## Executive Summary

`;

  if (totalFailed === 0) {
    report += `✅ **PRODUCTION READY** - All critical systems have passed comprehensive testing.

The platform infrastructure is production-ready with:
- Fully operational monitoring and alerting systems
- Validated data export and portability features
- Reliable backup and restoration procedures
- Comprehensive health checks and system validation

**Recommendation**: Proceed with production deployment.
`;
  } else {
    report += `❌ **NOT PRODUCTION READY** - ${totalFailed} critical issues require resolution.

**Critical Actions Required Before Production Deployment:**
`;

    testSuites.forEach(suite => {
      if (suite.failCount > 0) {
        report += `
- **${suite.name}**: ${suite.failCount} issues detected
  ${suite.description}
`;
      }
    });

    report += `
**Recommendation**: Address all failed tests before production deployment.
`;
  }

  report += `
---

## Detailed Test Suite Results

`;

  testSuites.forEach(suite => {
    const suiteStatus = suite.failCount === 0 ? '✅ PASSED' : '❌ FAILED';
    const suitePercentage = ((suite.passCount / suite.tests.length) * 100).toFixed(1);

    report += `
### ${suiteStatus} ${suite.name} (${suitePercentage}%)

**Description**: ${suite.description}
**Tests Executed**: ${suite.tests.length}
**Passed**: ${suite.passCount}
**Failed**: ${suite.failCount}

`;

    // Show failed tests details
    if (suite.failCount > 0) {
      report += `**Failed Tests:**
`;
      suite.tests.forEach((test: any) => {
        const testFailed = (test.status === 'fail') || (test.success === false);
        if (testFailed) {
          const testName = test.service || test.format || test.testName || 'Unknown Test';
          const testMessage = test.message || 'No error message provided';
          report += `- ${testName}: ${testMessage}
`;
        }
      });
    }
  });

  report += `
---

## Infrastructure Readiness Checklist

### Monitoring & Observability
`;

  const monitoringSuite = testSuites.find(s => s.name === 'Monitoring System');
  if (monitoringSuite) {
    report += monitoringSuite.failCount === 0
      ? `✅ Health checks, Sentry, Prometheus, and uptime monitoring are operational
`
      : `❌ Monitoring system has ${monitoringSuite.failCount} issues requiring attention
`;
  }

  report += `
### Data Management & Portability
`;

  const exportSuite = testSuites.find(s => s.name === 'Data Export System');
  if (exportSuite) {
    report += exportSuite.failCount === 0
      ? `✅ Data export functionality (CSV, JSON, XLSX) is working correctly
`
      : `❌ Data export system has ${exportSuite.failCount} issues requiring attention
`;
  }

  report += `
### Backup & Recovery
`;

  const backupSuite = testSuites.find(s => s.name === 'Backup & Restoration');
  if (backupSuite) {
    report += backupSuite.failCount === 0
      ? `✅ Backup creation, validation, and restoration procedures are working
`
      : `❌ Backup system has ${backupSuite.failCount} issues requiring attention
`;
  }

  report += `
---

## Next Steps

`;

  if (totalFailed === 0) {
    report += `1. **Deploy to Production**: All systems are validated and ready
2. **Monitor Deployment**: Use established monitoring to track deployment health
3. **Schedule Regular Tests**: Implement automated testing schedule for ongoing validation
4. **Document Procedures**: Ensure all restoration and maintenance procedures are documented
`;
  } else {
    report += `1. **Fix Critical Issues**: Address all failed tests immediately
2. **Re-run Tests**: Execute this test suite again after fixes
3. **Validate Fixes**: Ensure all systems pass before deployment
4. **Plan Rollback**: Prepare rollback procedures in case of deployment issues
`;
  }

  report += `
---

*Report generated by Production Readiness Test Suite*
*Platform: Enterprise Business Management System*
*Testing Framework: Comprehensive Infrastructure Validation*
`;

  return report;
}

// Run the production readiness tests
runProductionReadinessTests();