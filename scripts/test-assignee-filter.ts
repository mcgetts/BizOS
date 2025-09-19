import { db } from "../server/db";
import { tasks, users } from "../shared/schema";

async function testAssigneeFilter() {
  console.log("🔍 Testing Assignee Filter functionality...");

  try {
    const allTasks = await db.select().from(tasks);
    const allUsers = await db.select().from(users);

    console.log(`Found ${allTasks.length} tasks`);
    console.log(`Found ${allUsers.length} users`);

    // Check current assignee distribution
    const assigneeDistribution = allTasks.reduce((acc, task) => {
      const assignee = task.assignedTo || 'unassigned';
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n=== CURRENT ASSIGNEE DISTRIBUTION ===");
    Object.entries(assigneeDistribution).forEach(([assignee, count]) => {
      if (assignee === 'unassigned') {
        console.log(`Unassigned: ${count} tasks`);
      } else {
        const user = allUsers.find(u => u.id === assignee);
        console.log(`${user ? `${user.firstName} ${user.lastName}` : assignee}: ${count} tasks`);
      }
    });

    // Test filter scenarios
    console.log("\n=== TESTING FILTER SCENARIOS ===");

    // Test filtering for unassigned tasks
    const unassignedTasks = allTasks.filter(task => !task.assignedTo);
    console.log(`\n📋 Unassigned Tasks: ${unassignedTasks.length}`);

    // Test filtering for specific users (if any are assigned)
    const assignedTasks = allTasks.filter(task => task.assignedTo);
    if (assignedTasks.length > 0) {
      const firstAssignedTask = assignedTasks[0];
      const assignee = allUsers.find(u => u.id === firstAssignedTask.assignedTo);
      const tasksForAssignee = allTasks.filter(task => task.assignedTo === firstAssignedTask.assignedTo);

      console.log(`\n👤 Testing filter for ${assignee ? `${assignee.firstName} ${assignee.lastName}` : firstAssignedTask.assignedTo}:`);
      console.log(`   Found ${tasksForAssignee.length} tasks assigned to this user`);
    } else {
      console.log("\n⚠️  No assigned tasks found - all tasks are unassigned");
    }

    // Test users data for dropdown
    console.log("\n=== USERS AVAILABLE FOR ASSIGNEE FILTER ===");
    allUsers.slice(0, 5).forEach(user => {
      console.log(`👤 ${user.firstName} ${user.lastName} (${user.email})`);
    });

    console.log("\n✅ Assignee filter test completed successfully!");

  } catch (error) {
    console.error("❌ Error testing assignee filter:", error);
    process.exit(1);
  }
}

// Run the test
testAssigneeFilter()
  .then(() => {
    console.log("\n🎉 Assignee filter test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Assignee filter test failed:", error);
    process.exit(1);
  });