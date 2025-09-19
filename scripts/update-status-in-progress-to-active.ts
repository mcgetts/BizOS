import { db } from "../server/db";
import { projects } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateInProgressToActive() {
  console.log("🔄 Updating project status from 'in_progress' to 'active'...");

  try {
    // First, let's see what projects have 'in_progress' status
    const inProgressProjects = await db.select().from(projects).where(eq(projects.status, "in_progress"));

    console.log(`Found ${inProgressProjects.length} projects with 'in_progress' status:`);

    if (inProgressProjects.length === 0) {
      console.log("✅ No projects found with 'in_progress' status. Nothing to update.");
      return;
    }

    // Show the projects that will be updated
    for (const project of inProgressProjects) {
      console.log(`  📁 "${project.name}" (ID: ${project.id})`);
    }

    console.log("\n🔄 Updating status from 'in_progress' to 'active'...");

    // Update all projects with 'in_progress' status to 'active'
    const result = await db
      .update(projects)
      .set({
        status: "active",
        updatedAt: new Date()
      })
      .where(eq(projects.status, "in_progress"))
      .returning();

    console.log(`✅ Successfully updated ${result.length} projects:`);

    for (const project of result) {
      console.log(`  ✓ "${project.name}" status changed to '${project.status}'`);
    }

    // Verify the update
    console.log("\n🔍 Verification - checking for any remaining 'in_progress' projects...");
    const remainingInProgress = await db.select().from(projects).where(eq(projects.status, "in_progress"));

    if (remainingInProgress.length === 0) {
      console.log("✅ Verification successful: No projects with 'in_progress' status remain.");
    } else {
      console.log(`❌ Warning: ${remainingInProgress.length} projects still have 'in_progress' status:`);
      for (const project of remainingInProgress) {
        console.log(`  ⚠️  "${project.name}" (ID: ${project.id})`);
      }
    }

    // Show current status distribution
    console.log("\n📊 Current project status distribution:");
    const allProjects = await db.select().from(projects);
    const statusCounts = allProjects.reduce((acc, project) => {
      const status = project.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} projects`);
    });

  } catch (error) {
    console.error("❌ Error updating project status:", error);
    process.exit(1);
  }
}

// Run the update
updateInProgressToActive()
  .then(() => {
    console.log("\n🎉 Status update completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Status update failed:", error);
    process.exit(1);
  });