import { db } from "../server/db";
import { projects, clients, companies } from "../shared/schema";
import { eq, and, isNotNull, ne, or, isNull } from "drizzle-orm";

async function syncProjectCompanies() {
  console.log("Starting Option 1: Prioritize Client's Company update...");

  try {
    // First, let's audit the current state
    const allProjects = await db.select().from(projects);
    const allClients = await db.select().from(clients);
    const allCompanies = await db.select().from(companies);

    console.log(`Found ${allProjects.length} projects`);
    console.log(`Found ${allClients.length} clients`);
    console.log(`Found ${allCompanies.length} companies`);

    // Audit current inconsistencies
    let inconsistencies = 0;
    let missingCompanies = 0;
    let correctlyLinked = 0;

    console.log("\n=== AUDIT PHASE ===");
    for (const project of allProjects) {
      if (!project.clientId) {
        console.log(`⚠️  Project "${project.name}" has no client assigned`);
        continue;
      }

      const client = allClients.find(c => c.id === project.clientId);
      if (!client) {
        console.log(`❌ Project "${project.name}" references non-existent client`);
        continue;
      }

      if (!client.companyId) {
        console.log(`⚠️  Client "${client.name}" has no company assigned`);
        continue;
      }

      const company = allCompanies.find(c => c.id === client.companyId);
      if (!company) {
        console.log(`❌ Client "${client.name}" references non-existent company`);
        continue;
      }

      // Check for inconsistencies
      if (!project.companyId) {
        console.log(`🔄 Project "${project.name}" missing company (should be "${company.name}")`);
        missingCompanies++;
      } else if (project.companyId !== client.companyId) {
        const currentCompany = allCompanies.find(c => c.id === project.companyId);
        console.log(`⚠️  Project "${project.name}" company mismatch:`);
        console.log(`   Current: "${currentCompany?.name || 'Unknown'}" (${project.companyId})`);
        console.log(`   Should be: "${company.name}" (${client.companyId})`);
        inconsistencies++;
      } else {
        correctlyLinked++;
      }
    }

    console.log(`\n=== AUDIT SUMMARY ===`);
    console.log(`✅ Correctly linked: ${correctlyLinked}`);
    console.log(`🔄 Missing companies: ${missingCompanies}`);
    console.log(`⚠️  Inconsistencies: ${inconsistencies}`);
    console.log(`📊 Total to update: ${missingCompanies + inconsistencies}`);

    if (missingCompanies + inconsistencies === 0) {
      console.log("\n🎉 All projects are already correctly linked to companies!");
      return;
    }

    // Execute the update
    console.log("\n=== UPDATE PHASE ===");
    let updateCount = 0;

    for (const project of allProjects) {
      if (!project.clientId) continue;

      const client = allClients.find(c => c.id === project.clientId);
      if (!client || !client.companyId) continue;

      const company = allCompanies.find(c => c.id === client.companyId);
      if (!company) continue;

      // Update if missing or mismatched
      if (!project.companyId || project.companyId !== client.companyId) {
        const oldCompany = project.companyId ?
          allCompanies.find(c => c.id === project.companyId)?.name || 'Unknown' :
          'None';

        console.log(`🔄 Updating project "${project.name}":`);
        console.log(`   From: ${oldCompany}`);
        console.log(`   To: ${company.name}`);

        await db.update(projects)
          .set({ companyId: client.companyId })
          .where(eq(projects.id, project.id));

        updateCount++;
      }
    }

    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`✅ Successfully updated ${updateCount} project company references`);
    console.log(`🎯 All projects now use their client's company`);

    // Final verification
    console.log("\n=== VERIFICATION ===");
    const updatedProjects = await db.select().from(projects);
    let verifyCorrect = 0;
    let verifyIssues = 0;

    for (const project of updatedProjects) {
      if (!project.clientId) continue;

      const client = allClients.find(c => c.id === project.clientId);
      if (!client || !client.companyId) continue;

      if (project.companyId === client.companyId) {
        verifyCorrect++;
      } else {
        console.log(`❌ Still inconsistent: Project "${project.name}"`);
        verifyIssues++;
      }
    }

    console.log(`✅ Verified correct: ${verifyCorrect}`);
    console.log(`❌ Still have issues: ${verifyIssues}`);

  } catch (error) {
    console.error("❌ Error during company sync:", error);
    process.exit(1);
  }
}

// Run the sync
syncProjectCompanies()
  .then(() => {
    console.log("\n🎉 Company sync completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to sync project companies:", error);
    process.exit(1);
  });

export { syncProjectCompanies };