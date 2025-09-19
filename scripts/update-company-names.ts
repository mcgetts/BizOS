import { db } from "../server/db";
import { projects, clients, companies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateCompanyNames() {
  console.log("Starting company names update...");

  try {
    // Get all projects, clients, and companies
    const allProjects = await db.select().from(projects);
    const allClients = await db.select().from(clients);
    const allCompanies = await db.select().from(companies);

    console.log(`Found ${allProjects.length} projects`);
    console.log(`Found ${allClients.length} clients`);
    console.log(`Found ${allCompanies.length} companies`);

    let updates = 0;

    // For each project, check if we need to update company information
    for (const project of allProjects) {
      if (!project.clientId) {
        console.log(`Project "${project.name}" has no client, skipping...`);
        continue;
      }

      // Find the client for this project
      const client = allClients.find(c => c.id === project.clientId);
      if (!client) {
        console.log(`Client not found for project "${project.name}", skipping...`);
        continue;
      }

      // If client has a company, check if we need to update the project's company
      if (client.companyId) {
        const company = allCompanies.find(c => c.id === client.companyId);
        if (company) {
          // Update project's companyId if it's different
          if (project.companyId !== client.companyId) {
            console.log(`Updating project "${project.name}" company from ${project.companyId || 'null'} to ${client.companyId} (${company.name})`);
            await db.update(projects)
              .set({ companyId: client.companyId })
              .where(eq(projects.id, project.id));
            updates++;
          }
        }
      } else {
        // Client doesn't have a company assigned, let's check if there's a company with the same name as the client
        const matchingCompany = allCompanies.find(c =>
          c.name.toLowerCase() === client.name.toLowerCase()
        );

        if (matchingCompany) {
          console.log(`Found matching company "${matchingCompany.name}" for client "${client.name}"`);

          // Update the client to link to this company
          await db.update(clients)
            .set({ companyId: matchingCompany.id })
            .where(eq(clients.id, client.id));

          // Update the project to link to this company
          if (project.companyId !== matchingCompany.id) {
            console.log(`Updating project "${project.name}" to use company "${matchingCompany.name}"`);
            await db.update(projects)
              .set({ companyId: matchingCompany.id })
              .where(eq(projects.id, project.id));
            updates++;
          }
        } else {
          console.log(`No matching company found for client "${client.name}"`);
        }
      }
    }

    console.log(`\nUpdate completed! Updated ${updates} project company references.`);

  } catch (error) {
    console.error("Error updating company names:", error);
    process.exit(1);
  }
}

// Run the update
updateCompanyNames()
  .then(() => {
    console.log("Company names update completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update company names:", error);
    process.exit(1);
  });

export { updateCompanyNames };