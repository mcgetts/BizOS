#!/usr/bin/env node

import { backupRestorationTest } from './backupRestorationTest.js';

async function runBackupRestorationTests() {
  console.log('🔧 Starting Backup Restoration Tests...\n');

  try {
    const tests = new backupRestorationTest();
    const results = await tests.runAllTests();

    console.log('📊 Test Results Summary:');
    console.log('========================');

    let passCount = 0;
    let failCount = 0;

    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.testName}: ${status} (${result.duration}ms)`);
      console.log(`   ${result.message}`);

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');

      if (result.success) {
        passCount++;
      } else {
        failCount++;
      }
    });

    console.log(`\n📈 Final Results:`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Success Rate: ${((passCount / results.length) * 100).toFixed(1)}%`);

    // Generate and display full report
    const report = tests.generateTestReport(results);
    console.log('\n📋 Detailed Report:');
    console.log('===================');
    console.log(report);

    if (failCount === 0) {
      console.log('\n🎉 All backup restoration tests passed! The backup system is production-ready.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failCount} test(s) failed. Please review the failures above before production deployment.`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
runBackupRestorationTests();