import { db } from "../server/db";
import { tasks, taskDependencies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createSampleDependencies() {
  console.log("🔧 Creating sample task dependencies...");

  try {
    // Get some existing tasks
    const existingTasks = await db.select().from(tasks).limit(6);

    if (existingTasks.length < 4) {
      console.log("❌ Need at least 4 tasks to create dependencies. Please ensure tasks exist.");
      process.exit(1);
    }

    console.log(`Found ${existingTasks.length} existing tasks`);

    // Create some sample dependencies
    // Task 2 depends on Task 1
    await db.insert(taskDependencies).values({
      taskId: existingTasks[1].id,
      dependsOnTaskId: existingTasks[0].id,
      relationshipType: "finish_to_start",
    });

    // Task 3 depends on Task 1 and Task 2
    await db.insert(taskDependencies).values([
      {
        taskId: existingTasks[2].id,
        dependsOnTaskId: existingTasks[0].id,
        relationshipType: "finish_to_start",
      },
      {
        taskId: existingTasks[2].id,
        dependsOnTaskId: existingTasks[1].id,
        relationshipType: "finish_to_start",
      }
    ]);

    // Task 4 depends on Task 3
    if (existingTasks[3]) {
      await db.insert(taskDependencies).values({
        taskId: existingTasks[3].id,
        dependsOnTaskId: existingTasks[2].id,
        relationshipType: "finish_to_start",
      });
    }

    // If we have more tasks, add a few more dependencies
    if (existingTasks[4]) {
      await db.insert(taskDependencies).values({
        taskId: existingTasks[4].id,
        dependsOnTaskId: existingTasks[2].id,
        relationshipType: "start_to_start",
      });
    }

    console.log("✅ Sample task dependencies created successfully!");
    console.log(`   - Task "${existingTasks[1].title}" depends on "${existingTasks[0].title}"`);
    console.log(`   - Task "${existingTasks[2].title}" depends on "${existingTasks[0].title}" and "${existingTasks[1].title}"`);
    if (existingTasks[3]) {
      console.log(`   - Task "${existingTasks[3].title}" depends on "${existingTasks[2].title}"`);
    }
    if (existingTasks[4]) {
      console.log(`   - Task "${existingTasks[4].title}" depends on "${existingTasks[2].title}"`);
    }

  } catch (error) {
    console.error("❌ Error creating sample dependencies:", error);
    process.exit(1);
  }
}

createSampleDependencies()
  .then(() => {
    console.log("🎉 Dependency creation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });