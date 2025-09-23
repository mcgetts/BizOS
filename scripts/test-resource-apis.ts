#!/usr/bin/env tsx

import { db } from '../server/db';
import {
  calculateUserWorkload,
  calculateTeamUtilization,
  generateTeamWorkloadSnapshots,
} from '../server/utils/resourceCalculations.js';
import { users } from "@shared/schema";

async function testResourceAPIs() {
  console.log("🧪 Testing Resource Management APIs...");

  try {
    // Get some test users
    const testUsers = await db.select().from(users).limit(3);

    if (testUsers.length === 0) {
      console.log("❌ No users found for testing");
      return;
    }

    console.log(`👥 Found ${testUsers.length} test users`);

    // Test workload calculation
    console.log("\n📊 Testing workload calculation...");
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week

    for (const user of testUsers) {
      try {
        const workload = await calculateUserWorkload(user.id, startDate, endDate);
        console.log(`✅ User ${user.firstName} ${user.lastName}:`);
        console.log(`   - Total Capacity: ${workload.totalCapacityHours}h`);
        console.log(`   - Allocated: ${workload.totalAllocatedHours}h`);
        console.log(`   - Available: ${workload.availableHours}h`);
        console.log(`   - Utilization: ${workload.utilizationPercentage.toFixed(1)}%`);
        console.log(`   - Active Projects: ${workload.activeProjectsCount}`);
        console.log(`   - Active Tasks: ${workload.activeTasksCount}`);
        console.log(`   - Overallocated: ${workload.isOverallocated ? 'Yes' : 'No'}`);
      } catch (error) {
        console.log(`❌ Failed to calculate workload for ${user.firstName}: ${error.message}`);
      }
    }

    // Test team utilization
    console.log("\n📈 Testing team utilization calculation...");
    try {
      const teamUtilization = await calculateTeamUtilization(
        startDate,
        endDate,
        testUsers.map(u => u.id)
      );

      console.log("✅ Team Utilization Results:");
      console.log(`   - Total Team Members: ${teamUtilization.totalTeamMembers}`);
      console.log(`   - Average Utilization: ${teamUtilization.averageUtilization.toFixed(1)}%`);
      console.log(`   - Overallocated Members: ${teamUtilization.overallocatedMembers}`);
      console.log(`   - Underutilized Members: ${teamUtilization.underutilizedMembers}`);
      console.log(`   - Optimal Utilization Members: ${teamUtilization.optimalUtilizationMembers}`);
      console.log(`   - Total Capacity: ${teamUtilization.totalCapacityHours}h`);
      console.log(`   - Total Allocated: ${teamUtilization.totalAllocatedHours}h`);
    } catch (error) {
      console.log(`❌ Failed to calculate team utilization: ${error.message}`);
    }

    // Test workload snapshot generation
    console.log("\n📸 Testing workload snapshot generation...");
    try {
      await generateTeamWorkloadSnapshots(new Date());
      console.log("✅ Team workload snapshots generated successfully");
    } catch (error) {
      console.log(`❌ Failed to generate workload snapshots: ${error.message}`);
    }

    console.log("\n🎉 Resource Management API testing completed!");

  } catch (error) {
    console.error("❌ Error during API testing:", error);
    throw error;
  }
}

// Run the test
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testResourceAPIs()
    .then(() => {
      console.log("✅ Test script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test script failed:", error);
      process.exit(1);
    });
}

export { testResourceAPIs };