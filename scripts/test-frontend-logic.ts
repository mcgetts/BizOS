import { db } from "../server/db";
import { projects, clients, companies } from "../shared/schema";

async function testFrontendLogic() {
  console.log("🔍 Testing frontend company name logic...");

  try {
    // Simulate what the frontend receives
    const allProjects = await db.select().from(projects);
    const allCompanies = await db.select().from(companies);

    console.log(`Found ${allProjects.length} projects`);
    console.log(`Found ${allCompanies.length} companies`);

    // Test the getCompanyName function logic
    const getCompanyName = (companyId: string | null | undefined) => {
      if (!companyId) return 'No company';
      const company = allCompanies?.find(c => c.id === companyId);
      return company ? company.name : 'No company';
    };

    // Test with some sample projects
    const sampleProjects = allProjects.slice(0, 5);
    console.log("\n=== TESTING COMPANY NAME FUNCTION ===");

    for (const project of sampleProjects) {
      console.log(`\n📁 Project: "${project.name}"`);
      console.log(`   companyId: ${project.companyId}`);
      console.log(`   Company Name: "${getCompanyName(project.companyId)}"`);

      if (project.companyId) {
        const actualCompany = allCompanies.find(c => c.id === project.companyId);
        console.log(`   Expected: "${actualCompany?.name || 'Not found'}"`);
        console.log(`   Match: ${actualCompany ? '✅' : '❌'}`);
      }
    }

    // Specifically test the Database Migration project for Sarah Johnson
    const dbMigrationProjects = allProjects.filter(p => p.name === 'Database Migration');
    console.log(`\n=== TESTING DATABASE MIGRATION PROJECTS ===`);

    for (const project of dbMigrationProjects) {
      const companyName = getCompanyName(project.companyId);
      console.log(`\n📁 "${project.name}"`);
      console.log(`   companyId: ${project.companyId}`);
      console.log(`   Company Name Result: "${companyName}"`);

      if (project.companyId) {
        const company = allCompanies.find(c => c.id === project.companyId);
        console.log(`   Actual Company: "${company?.name || 'Not found'}"`);
      }
    }

  } catch (error) {
    console.error("❌ Error testing frontend logic:", error);
    process.exit(1);
  }
}

// Run the test
testFrontendLogic()
  .then(() => {
    console.log("\n🎉 Frontend logic test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Frontend logic test failed:", error);
    process.exit(1);
  });