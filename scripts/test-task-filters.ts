import { db } from "../server/db";
import { tasks, projects, clients, companies } from "../shared/schema";

async function testTaskFilters() {
  console.log("🔍 Testing Task Management filters...");

  try {
    // Get all data needed for testing
    const allTasks = await db.select().from(tasks);
    const allProjects = await db.select().from(projects);
    const allClients = await db.select().from(clients);
    const allCompanies = await db.select().from(companies);

    console.log(`Found ${allTasks.length} tasks`);
    console.log(`Found ${allProjects.length} projects`);
    console.log(`Found ${allClients.length} clients`);
    console.log(`Found ${allCompanies.length} companies`);

    // Test a few task relationships
    console.log("\n=== TESTING TASK RELATIONSHIPS ===");
    const sampleTasks = allTasks.slice(0, 5);

    for (const task of sampleTasks) {
      console.log(`\n📋 Task: "${task.title}"`);
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Project ID: ${task.projectId || 'No project'}`);

      if (task.projectId) {
        const project = allProjects.find(p => p.id === task.projectId);
        if (project) {
          console.log(`   Project: "${project.name}"`);
          console.log(`   Client ID: ${project.clientId || 'No client'}`);
          console.log(`   Company ID: ${project.companyId || 'No company'}`);

          if (project.clientId) {
            const client = allClients.find(c => c.id === project.clientId);
            console.log(`   Client: "${client?.name || 'Client not found'}"`);
          }

          if (project.companyId) {
            const company = allCompanies.find(c => c.id === project.companyId);
            console.log(`   Company: "${company?.name || 'Company not found'}"`);
          }
        } else {
          console.log(`   ❌ Project not found!`);
        }
      }
    }

    // Test filter scenarios
    console.log("\n=== TESTING FILTER SCENARIOS ===");

    // Test project filter
    const firstProject = allProjects[0];
    if (firstProject) {
      const tasksInProject = allTasks.filter(t => t.projectId === firstProject.id);
      console.log(`\n🎯 Project Filter Test: "${firstProject.name}"`);
      console.log(`   Found ${tasksInProject.length} tasks in this project`);
    }

    // Test client filter (via project relationship)
    const firstClient = allClients[0];
    if (firstClient) {
      const projectsForClient = allProjects.filter(p => p.clientId === firstClient.id);
      const tasksForClient = allTasks.filter(t => {
        const project = allProjects.find(p => p.id === t.projectId);
        return project && project.clientId === firstClient.id;
      });
      console.log(`\n👤 Client Filter Test: "${firstClient.name}"`);
      console.log(`   Client has ${projectsForClient.length} projects`);
      console.log(`   Found ${tasksForClient.length} tasks for this client`);
    }

    // Test company filter (via project relationship)
    const firstCompany = allCompanies[0];
    if (firstCompany) {
      const projectsForCompany = allProjects.filter(p => p.companyId === firstCompany.id);
      const tasksForCompany = allTasks.filter(t => {
        const project = allProjects.find(p => p.id === t.projectId);
        return project && project.companyId === firstCompany.id;
      });
      console.log(`\n🏢 Company Filter Test: "${firstCompany.name}"`);
      console.log(`   Company has ${projectsForCompany.length} projects`);
      console.log(`   Found ${tasksForCompany.length} tasks for this company`);
    }

    console.log("\n✅ Filter relationship tests completed successfully!");

  } catch (error) {
    console.error("❌ Error testing task filters:", error);
    process.exit(1);
  }
}

// Run the test
testTaskFilters()
  .then(() => {
    console.log("\n🎉 Task filter test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Task filter test failed:", error);
    process.exit(1);
  });