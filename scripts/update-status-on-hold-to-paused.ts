import { db } from "../server/db";
import { projects } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateOnHoldToPaused() {
  console.log("🔄 Updating project status from 'on_hold' to 'paused'...");

  try {
    // First, let's see what projects have 'on_hold' status
    const onHoldProjects = await db.select().from(projects).where(eq(projects.status, "on_hold"));

    console.log(`Found ${onHoldProjects.length} projects with 'on_hold' status:`);

    if (onHoldProjects.length === 0) {
      console.log("✅ No projects found with 'on_hold' status. Nothing to update.");
      return;
    }

    // Show the projects that will be updated
    for (const project of onHoldProjects) {
      console.log(`  📁 "${project.name}" (ID: ${project.id})`);
    }

    console.log("\n🔄 Updating status from 'on_hold' to 'paused'...");

    // Update all projects with 'on_hold' status to 'paused'
    const result = await db
      .update(projects)
      .set({
        status: "paused",
        updatedAt: new Date()
      })
      .where(eq(projects.status, "on_hold"))
      .returning();

    console.log(`✅ Successfully updated ${result.length} projects:`);

    for (const project of result) {
      console.log(`  ✓ "${project.name}" status changed to '${project.status}'`);
    }

    // Verify the update
    console.log("\n🔍 Verification - checking for any remaining 'on_hold' projects...");
    const remainingOnHold = await db.select().from(projects).where(eq(projects.status, "on_hold"));

    if (remainingOnHold.length === 0) {
      console.log("✅ Verification successful: No projects with 'on_hold' status remain.");
    } else {
      console.log(`❌ Warning: ${remainingOnHold.length} projects still have 'on_hold' status:`);
      for (const project of remainingOnHold) {
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
updateOnHoldToPaused()
  .then(() => {
    console.log("\n🎉 Status update completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Status update failed:", error);
    process.exit(1);
  });