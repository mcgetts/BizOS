import { db } from "../server/db";
import { projects } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixEcommerceName() {
  try {
    // Find and fix the "commerce Platform" project
    const allProjects = await db.select().from(projects);
    const brokenProject = allProjects.find(p => p.name === "commerce Platform");

    if (brokenProject) {
      console.log(`Fixing project name: "${brokenProject.name}" → "E-commerce Platform"`);
      await db.update(projects)
        .set({ name: "E-commerce Platform" })
        .where(eq(projects.id, brokenProject.id));
      console.log("Fixed successfully!");
    } else {
      console.log("No broken project name found.");
    }
  } catch (error) {
    console.error("Error fixing project name:", error);
  }
}

fixEcommerceName();