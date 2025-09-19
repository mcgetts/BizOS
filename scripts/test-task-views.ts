import { db } from "../server/db";
import { tasks } from "../shared/schema";

async function testTaskViews() {
  console.log("🔍 Testing Task Management views...");

  try {
    const allTasks = await db.select().from(tasks);
    console.log(`Found ${allTasks.length} tasks`);

    // Test status grouping for Kanban view
    const statusGroups = {
      todo: allTasks.filter(t => t.status === "todo"),
      in_progress: allTasks.filter(t => t.status === "in_progress"),
      review: allTasks.filter(t => t.status === "review"),
      completed: allTasks.filter(t => t.status === "completed")
    };

    console.log("\n=== KANBAN VIEW STATUS DISTRIBUTION ===");
    Object.entries(statusGroups).forEach(([status, tasks]) => {
      console.log(`${status}: ${tasks.length} tasks`);
    });

    // Test sample data for table view
    console.log("\n=== SAMPLE TASKS FOR TABLE VIEW ===");
    const sampleTasks = allTasks.slice(0, 3);
    for (const task of sampleTasks) {
      console.log(`\n📋 Task: "${task.title}"`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Project ID: ${task.projectId}`);
      console.log(`   Assigned To: ${task.assignedTo || 'Unassigned'}`);
      console.log(`   Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}`);
      console.log(`   Hours: ${task.actualHours || 0}h / ${task.estimatedHours || 0}h`);
    }

    console.log("\n✅ Task views test completed successfully!");

  } catch (error) {
    console.error("❌ Error testing task views:", error);
    process.exit(1);
  }
}

// Run the test
testTaskViews()
  .then(() => {
    console.log("\n🎉 Task views test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Task views test failed:", error);
    process.exit(1);
  });