import { db } from "../server/db";
import { projects, clients, companies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateProjectData() {
  console.log("Starting project data update...");

  try {
    // First, let's examine current project data
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} projects`);

    const allClients = await db.select().from(clients);
    console.log(`Found ${allClients.length} clients`);

    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies`);

    console.log("\nCurrent project names:");
    allProjects.forEach(project => {
      console.log(`- "${project.name}" (Client: ${project.clientId})`);
    });

    console.log("\nClients and their companies:");
    allClients.forEach(client => {
      console.log(`- ${client.name} (Company ID: ${client.companyId})`);
    });

    console.log("\nCompanies:");
    allCompanies.forEach(company => {
      console.log(`- ${company.name} (ID: ${company.id})`);
    });

    // Update project names to remove client references
    let projectUpdates = 0;
    for (const project of allProjects) {
      const currentName = project.name;

      // Remove common patterns that include client names
      let cleanName = currentName;

      // Remove patterns like "for [Client]", "- [Client]", "[Client] -", etc.
      cleanName = cleanName.replace(/\s+for\s+[^-]+$/i, '');
      cleanName = cleanName.replace(/\s*-\s*[A-Z][^-]*\s*$/i, ''); // Remove - followed by proper names at end
      cleanName = cleanName.replace(/\([^)]+\)$/i, ''); // Remove content in parentheses at end

      // Clean up extra whitespace
      cleanName = cleanName.trim();

      if (cleanName !== currentName && cleanName.length > 0) {
        console.log(`\nUpdating project: "${currentName}" → "${cleanName}"`);
        await db.update(projects)
          .set({ name: cleanName })
          .where(eq(projects.id, project.id));
        projectUpdates++;
      }
    }

    // Update project companyId based on client's company
    let companyUpdates = 0;
    for (const project of allProjects) {
      if (project.clientId && !project.companyId) {
        const client = allClients.find(c => c.id === project.clientId);
        if (client && client.companyId) {
          console.log(`\nUpdating project "${project.name}" to use company ID: ${client.companyId}`);
          await db.update(projects)
            .set({ companyId: client.companyId })
            .where(eq(projects.id, project.id));
          companyUpdates++;
        }
      }
    }

    console.log(`\nUpdate completed!`);
    console.log(`- Updated ${projectUpdates} project names`);
    console.log(`- Updated ${companyUpdates} project company references`);

  } catch (error) {
    console.error("Error updating project data:", error);
    process.exit(1);
  }
}

// Run the update
updateProjectData()
  .then(() => {
    console.log("Project data update completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update project data:", error);
    process.exit(1);
  });

export { updateProjectData };