import { db } from "../server/db";
import { projects } from "../shared/schema";

async function testProjectsApi() {
  console.log("🔍 Testing what data is in projects table...");

  try {
    // Get all projects directly from database
    const allProjects = await db.select().from(projects);

    console.log(`Found ${allProjects.length} projects in database`);

    // Show first few projects with all their fields
    const sampleProjects = allProjects.slice(0, 3);

    for (const project of sampleProjects) {
      console.log(`\n📁 Project: "${project.name}"`);
      console.log(`   ID: ${project.id}`);
      console.log(`   clientId: ${project.clientId}`);
      console.log(`   companyId: ${project.companyId}`);
      console.log(`   managerId: ${project.managerId}`);
      console.log(`   status: ${project.status}`);
      console.log(`   priority: ${project.priority}`);
      console.log(`   All keys: ${Object.keys(project).join(', ')}`);
    }

    // Test specifically the Database Migration projects mentioned by user
    const dbMigrationProjects = allProjects.filter(p => p.name === 'Database Migration');
    console.log(`\n🔍 Found ${dbMigrationProjects.length} "Database Migration" projects:`);

    for (const project of dbMigrationProjects) {
      console.log(`\n📁 "${project.name}"`);
      console.log(`   companyId: ${project.companyId || 'NULL/UNDEFINED'}`);
      console.log(`   clientId: ${project.clientId || 'NULL/UNDEFINED'}`);
      console.log(`   Has companyId field: ${project.hasOwnProperty('companyId')}`);
      console.log(`   companyId type: ${typeof project.companyId}`);
    }

  } catch (error) {
    console.error("❌ Error testing projects API:", error);
    process.exit(1);
  }
}

// Run the test
testProjectsApi()
  .then(() => {
    console.log("\n🎉 Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });