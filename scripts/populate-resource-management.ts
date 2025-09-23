#!/usr/bin/env tsx

import { db } from '../server/db';
import {
  users,
  userCapacity,
  userAvailability,
  userSkills,
  resourceAllocations,
  budgetCategories,
  projectBudgets,
  projects,
  tasks,
  timeEntries,
  timeEntryApprovals,
  workloadSnapshots,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function populateResourceManagement() {
  console.log("🚀 Starting resource management population...");

  try {
    // 1. Create budget categories
    console.log("📊 Creating budget categories...");
    const budgetCategoriesData = [
      {
        name: "Labor",
        description: "Personnel costs including salaries, benefits, and contractor fees",
        categoryType: "labor",
      },
      {
        name: "Materials",
        description: "Physical materials and supplies needed for project execution",
        categoryType: "materials",
      },
      {
        name: "Software & Tools",
        description: "Software licenses, tools, and digital resources",
        categoryType: "software",
      },
      {
        name: "Travel & Expenses",
        description: "Travel costs, meals, and other business expenses",
        categoryType: "travel",
      },
      {
        name: "Overhead",
        description: "Administrative and indirect costs",
        categoryType: "overhead",
      },
    ];

    const createdBudgetCategories = await db.insert(budgetCategories).values(budgetCategoriesData).returning();
    console.log(`✅ Created ${createdBudgetCategories.length} budget categories`);

    // 2. Get existing users for capacity and skills setup
    const existingUsers = await db.select().from(users).limit(10);
    console.log(`👥 Found ${existingUsers.length} existing users`);

    if (existingUsers.length === 0) {
      console.log("❌ No users found. Please run user creation script first.");
      return;
    }

    // 3. Create user capacities
    console.log("⚡ Setting up user capacities...");
    const userCapacityData = existingUsers.map((user) => ({
      userId: user.id,
      hoursPerDay: "8.00",
      hoursPerWeek: "40.00",
      overtimeMultiplier: "1.50",
      effectiveFrom: new Date(),
      effectiveTo: null,
    }));

    await db.insert(userCapacity).values(userCapacityData);
    console.log(`✅ Created capacity settings for ${userCapacityData.length} users`);

    // 4. Create some user availability (vacations, holidays)
    console.log("🏖️ Creating user availability periods...");
    const availabilityData = [
      {
        userId: existingUsers[0].id,
        type: "vacation",
        status: "approved",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Two weeks from now
        description: "Annual vacation",
        approvedBy: existingUsers[1]?.id,
        approvedAt: new Date(),
      },
      {
        userId: existingUsers[1].id,
        type: "training",
        status: "approved",
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // Three weeks from now
        endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // Day after
        description: "Technical training workshop",
        approvedBy: existingUsers[0]?.id,
        approvedAt: new Date(),
      },
      {
        userId: existingUsers[2]?.id || existingUsers[0].id,
        type: "holiday",
        status: "approved",
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // One month from now
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Same day
        description: "Company holiday",
        approvedBy: existingUsers[0]?.id,
        approvedAt: new Date(),
      },
    ];

    await db.insert(userAvailability).values(availabilityData.filter(item => item.userId));
    console.log(`✅ Created ${availabilityData.length} availability periods`);

    // 5. Create user skills
    console.log("🛠️ Setting up user skills...");
    const skillsData = [
      // User 1 skills - Full-stack developer
      {
        userId: existingUsers[0].id,
        skillName: "React",
        category: "technical",
        proficiencyLevel: 4,
        yearsExperience: "3.5",
        isCertified: false,
        lastUsed: new Date(),
      },
      {
        userId: existingUsers[0].id,
        skillName: "Node.js",
        category: "technical",
        proficiencyLevel: 4,
        yearsExperience: "3.0",
        isCertified: false,
        lastUsed: new Date(),
      },
      {
        userId: existingUsers[0].id,
        skillName: "Project Management",
        category: "soft_skills",
        proficiencyLevel: 3,
        yearsExperience: "2.0",
        isCertified: true,
        certificationName: "PMP",
        lastUsed: new Date(),
      },
      // User 2 skills - UI/UX Designer
      ...(existingUsers[1] ? [
        {
          userId: existingUsers[1].id,
          skillName: "Figma",
          category: "tools",
          proficiencyLevel: 5,
          yearsExperience: "4.0",
          isCertified: true,
          certificationName: "Figma Professional",
          lastUsed: new Date(),
        },
        {
          userId: existingUsers[1].id,
          skillName: "User Research",
          category: "domain_knowledge",
          proficiencyLevel: 4,
          yearsExperience: "3.5",
          isCertified: false,
          lastUsed: new Date(),
        },
        {
          userId: existingUsers[1].id,
          skillName: "Communication",
          category: "soft_skills",
          proficiencyLevel: 5,
          yearsExperience: "5.0",
          isCertified: false,
          lastUsed: new Date(),
        },
      ] : []),
      // User 3 skills - Backend Developer
      ...(existingUsers[2] ? [
        {
          userId: existingUsers[2].id,
          skillName: "PostgreSQL",
          category: "technical",
          proficiencyLevel: 4,
          yearsExperience: "4.0",
          isCertified: true,
          certificationName: "PostgreSQL Professional",
          lastUsed: new Date(),
        },
        {
          userId: existingUsers[2].id,
          skillName: "Python",
          category: "technical",
          proficiencyLevel: 5,
          yearsExperience: "5.0",
          isCertified: false,
          lastUsed: new Date(),
        },
        {
          userId: existingUsers[2].id,
          skillName: "System Architecture",
          category: "domain_knowledge",
          proficiencyLevel: 3,
          yearsExperience: "2.5",
          isCertified: false,
          lastUsed: new Date(),
        },
      ] : []),
    ];

    if (skillsData.length > 0) {
      await db.insert(userSkills).values(skillsData);
      console.log(`✅ Created ${skillsData.length} user skills`);
    }

    // 6. Get existing projects for resource allocations
    const existingProjects = await db.select().from(projects).limit(5);
    console.log(`📁 Found ${existingProjects.length} existing projects`);

    if (existingProjects.length > 0) {
      // 7. Create resource allocations
      console.log("📋 Creating resource allocations...");
      const allocationData = [
        {
          userId: existingUsers[0].id,
          projectId: existingProjects[0].id,
          allocationType: "project",
          allocatedHours: "160.00", // 4 weeks full-time
          hourlyRate: "85.00",
          startDate: new Date(),
          endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks
          utilizationTarget: 100,
          priority: "high",
          status: "active",
          notes: "Lead developer for project initialization",
          createdBy: existingUsers[0].id,
        },
        ...(existingUsers[1] && existingProjects[0] ? [{
          userId: existingUsers[1].id,
          projectId: existingProjects[0].id,
          allocationType: "project",
          allocatedHours: "80.00", // 2 weeks part-time
          hourlyRate: "75.00",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Start next week
          endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
          utilizationTarget: 50,
          priority: "medium",
          status: "active",
          notes: "UI/UX design phase",
          createdBy: existingUsers[0].id,
        }] : []),
        ...(existingUsers[2] && existingProjects[1] ? [{
          userId: existingUsers[2].id,
          projectId: existingProjects[1].id,
          allocationType: "project",
          allocatedHours: "120.00", // 3 weeks full-time
          hourlyRate: "90.00",
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Start in 2 weeks
          endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 5 weeks
          utilizationTarget: 80,
          priority: "high",
          status: "active",
          notes: "Database optimization and backend development",
          createdBy: existingUsers[0].id,
        }] : []),
      ];

      if (allocationData.length > 0) {
        await db.insert(resourceAllocations).values(allocationData);
        console.log(`✅ Created ${allocationData.length} resource allocations`);
      }

      // 8. Create project budgets using the budget categories
      console.log("💰 Creating project budget breakdowns...");
      const projectBudgetData = [];

      for (const project of existingProjects.slice(0, 2)) {
        for (const category of createdBudgetCategories) {
          let budgetAmount = "0";

          switch (category.categoryType) {
            case "labor":
              budgetAmount = "50000.00";
              break;
            case "materials":
              budgetAmount = "5000.00";
              break;
            case "software":
              budgetAmount = "3000.00";
              break;
            case "travel":
              budgetAmount = "2000.00";
              break;
            case "overhead":
              budgetAmount = "10000.00";
              break;
          }

          projectBudgetData.push({
            projectId: project.id,
            categoryId: category.id,
            budgetedAmount: budgetAmount,
            spentAmount: (parseFloat(budgetAmount) * 0.2).toFixed(2), // 20% spent
            committedAmount: (parseFloat(budgetAmount) * 0.3).toFixed(2), // 30% committed
            forecastAmount: (parseFloat(budgetAmount) * 0.9).toFixed(2), // 90% forecast
            notes: `Budget allocation for ${category.name} in ${project.name}`,
          });
        }
      }

      await db.insert(projectBudgets).values(projectBudgetData);
      console.log(`✅ Created ${projectBudgetData.length} project budget entries`);

      // 9. Create workload snapshots
      console.log("📈 Creating workload snapshots...");
      const snapshotData = [];
      const today = new Date();

      // Create weekly snapshots for the past 4 weeks
      for (let week = 0; week < 4; week++) {
        const snapshotDate = new Date(today.getTime() - (week * 7 * 24 * 60 * 60 * 1000));

        for (const user of existingUsers.slice(0, 3)) {
          const baseHours = 40; // Standard work week
          const utilization = 0.7 + (Math.random() * 0.3); // 70-100% utilization

          snapshotData.push({
            userId: user.id,
            snapshotDate,
            totalAllocatedHours: (baseHours * utilization).toFixed(2),
            actualWorkedHours: (baseHours * utilization * 0.95).toFixed(2), // Slightly less than allocated
            availableHours: baseHours.toFixed(2),
            utilizationPercentage: (utilization * 100).toFixed(2),
            overallocationHours: utilization > 1 ? ((utilization - 1) * baseHours).toFixed(2) : "0.00",
            activeProjectsCount: Math.floor(Math.random() * 3) + 1, // 1-3 projects
            activeTasksCount: Math.floor(Math.random() * 8) + 2, // 2-9 tasks
          });
        }
      }

      await db.insert(workloadSnapshots).values(snapshotData);
      console.log(`✅ Created ${snapshotData.length} workload snapshots`);
    }

    console.log("🎉 Resource management population completed successfully!");

  } catch (error) {
    console.error("❌ Error populating resource management data:", error);
    throw error;
  }
}

// Run the population script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  populateResourceManagement()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

export { populateResourceManagement };