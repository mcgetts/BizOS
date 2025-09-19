import { db } from "../server/db";
import { projects, clients, companies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function debugCompanyRelationships() {
  console.log("🔍 Debugging company relationships...");

  try {
    // Find the specific project mentioned by the user
    const allProjects = await db.select().from(projects);
    const allClients = await db.select().from(clients);
    const allCompanies = await db.select().from(companies);

    const databaseMigrationProjects = allProjects.filter(p =>
      p.name === 'Database Migration'
    );

    console.log(`\nFound ${databaseMigrationProjects.length} "Database Migration" projects:`);

    for (const project of databaseMigrationProjects) {
      console.log(`\n📁 Project: "${project.name}"`);
      console.log(`   Project ID: ${project.id}`);
      console.log(`   Project companyId: ${project.companyId}`);
      console.log(`   Project clientId: ${project.clientId}`);

      if (project.clientId) {
        const client = allClients.find(c => c.id === project.clientId);
        if (client) {
          console.log(`\n👤 Client: "${client.name}"`);
          console.log(`   Client ID: ${client.id}`);
          console.log(`   Client companyId: ${client.companyId}`);

          if (client.companyId) {
            const clientCompany = allCompanies.find(c => c.id === client.companyId);
            if (clientCompany) {
              console.log(`\n🏢 Client's Company: "${clientCompany.name}"`);
              console.log(`   Company ID: ${clientCompany.id}`);
            } else {
              console.log(`\n❌ Client's company not found in companies table`);
            }
          } else {
            console.log(`\n⚠️  Client has no companyId`);
          }

          if (project.companyId) {
            const projectCompany = allCompanies.find(c => c.id === project.companyId);
            if (projectCompany) {
              console.log(`\n🏢 Project's Company: "${projectCompany.name}"`);
              console.log(`   Company ID: ${projectCompany.id}`);
            } else {
              console.log(`\n❌ Project's company not found in companies table`);
            }

            // Check if they match
            if (project.companyId === client.companyId) {
              console.log(`\n✅ Project and Client companies MATCH`);
            } else {
              console.log(`\n❌ Project and Client companies DO NOT MATCH`);
              console.log(`   Project company: ${project.companyId}`);
              console.log(`   Client company: ${client.companyId}`);
            }
          } else {
            console.log(`\n⚠️  Project has no companyId`);
          }
        } else {
          console.log(`\n❌ Client not found`);
        }
      } else {
        console.log(`\n⚠️  Project has no clientId`);
      }

      console.log(`\n${'='.repeat(50)}`);
    }

    // Let's also check Sarah Johnson specifically
    console.log(`\n🔍 Checking Sarah Johnson clients:`);
    const sarahClients = allClients.filter(c => c.name.includes('Sarah Johnson'));

    for (const client of sarahClients) {
      console.log(`\n👤 Client: "${client.name}"`);
      console.log(`   Client ID: ${client.id}`);
      console.log(`   Client companyId: ${client.companyId}`);

      if (client.companyId) {
        const company = allCompanies.find(c => c.id === client.companyId);
        if (company) {
          console.log(`   Linked to company: "${company.name}"`);
        } else {
          console.log(`   ❌ Company not found`);
        }
      }

      // Find projects for this client
      const clientProjects = allProjects.filter(p => p.clientId === client.id);
      console.log(`   Has ${clientProjects.length} projects:`);
      for (const proj of clientProjects) {
        console.log(`     - "${proj.name}"`);
      }
    }

  } catch (error) {
    console.error("❌ Error debugging relationships:", error);
    process.exit(1);
  }
}

// Run the debug
debugCompanyRelationships()
  .then(() => {
    console.log("\n🎉 Debug completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Debug failed:", error);
    process.exit(1);
  });