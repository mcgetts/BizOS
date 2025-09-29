#!/usr/bin/env node

import { userDataExportTest } from './userDataExportTest.js';

async function runUserDataPortabilityTests() {
  console.log('🔍 Starting User Data Portability Tests...\n');

  try {
    const tests = new userDataExportTest();
    const results = await tests.runAllTests();

    console.log('📊 Test Results Summary:');
    console.log('========================');

    let passCount = 0;
    let failCount = 0;

    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.testName}: ${status}`);
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
      console.log('\n🎉 All user data portability tests passed! The system is ready for production.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failCount} test(s) failed. Please review the failures above.`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
runUserDataPortabilityTests();