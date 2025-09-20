import { db } from "../server/db";
import { projectTemplates, taskTemplates, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createSampleTemplates() {
  console.log("🔧 Creating sample project templates...");

  try {
    // Get the first admin user
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    if (!adminUsers.length) {
      console.error("❌ No admin users found. Please ensure database is seeded first.");
      process.exit(1);
    }

    const adminUserId = adminUsers[0].id;

    // Create Website Development Template
    const [websiteTemplate] = await db.insert(projectTemplates).values({
      name: "Website Development",
      description: "Complete website development project with design, development, and launch phases",
      industry: "web_development",
      category: "website",
      estimatedDuration: 45,
      defaultBudget: "15000",
      defaultPriority: "high",
      tags: ["website", "development", "responsive", "seo"],
      createdBy: adminUserId,
    }).returning();

    // Create task templates for website development
    await db.insert(taskTemplates).values([
      {
        projectTemplateId: websiteTemplate.id,
        title: "Project Discovery & Requirements",
        description: "Gather requirements, define scope, and create project roadmap",
        estimatedHours: "16",
        priority: "high",
        phase: "planning",
        orderIndex: 1,
        tags: ["planning", "requirements"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "UI/UX Design & Wireframes",
        description: "Create wireframes, mockups, and design system",
        estimatedHours: "40",
        priority: "high",
        phase: "design",
        orderIndex: 2,
        dependsOnPhase: "planning",
        tags: ["design", "wireframes", "mockups"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "Frontend Development",
        description: "Implement responsive frontend based on designs",
        estimatedHours: "80",
        priority: "high",
        phase: "development",
        orderIndex: 3,
        dependsOnPhase: "design",
        tags: ["frontend", "responsive", "javascript"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "Backend Development & API",
        description: "Develop backend services and API endpoints",
        estimatedHours: "60",
        priority: "high",
        phase: "development",
        orderIndex: 4,
        dependsOnPhase: "design",
        tags: ["backend", "api", "database"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "Content Management Integration",
        description: "Set up CMS and content migration",
        estimatedHours: "24",
        priority: "medium",
        phase: "development",
        orderIndex: 5,
        dependsOnPhase: "development",
        tags: ["cms", "content"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "SEO Setup & Optimization",
        description: "Implement SEO best practices and optimization",
        estimatedHours: "16",
        priority: "medium",
        phase: "testing",
        orderIndex: 6,
        dependsOnPhase: "development",
        tags: ["seo", "optimization"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "Testing & Quality Assurance",
        description: "Comprehensive testing across devices and browsers",
        estimatedHours: "32",
        priority: "high",
        phase: "testing",
        orderIndex: 7,
        dependsOnPhase: "development",
        tags: ["testing", "qa", "cross-browser"],
      },
      {
        projectTemplateId: websiteTemplate.id,
        title: "Launch & Deployment",
        description: "Deploy to production and go-live activities",
        estimatedHours: "16",
        priority: "high",
        phase: "launch",
        orderIndex: 8,
        dependsOnPhase: "testing",
        tags: ["deployment", "launch", "production"],
      },
    ]);

    // Create Marketing Campaign Template
    const [marketingTemplate] = await db.insert(projectTemplates).values({
      name: "Digital Marketing Campaign",
      description: "Comprehensive digital marketing campaign with strategy, content creation, and execution",
      industry: "marketing",
      category: "campaign",
      estimatedDuration: 30,
      defaultBudget: "8000",
      defaultPriority: "medium",
      tags: ["marketing", "digital", "campaign", "social-media"],
      createdBy: adminUserId,
    }).returning();

    // Create task templates for marketing campaign
    await db.insert(taskTemplates).values([
      {
        projectTemplateId: marketingTemplate.id,
        title: "Market Research & Analysis",
        description: "Conduct market research and competitor analysis",
        estimatedHours: "20",
        priority: "high",
        phase: "planning",
        orderIndex: 1,
        tags: ["research", "analysis", "market"],
      },
      {
        projectTemplateId: marketingTemplate.id,
        title: "Campaign Strategy Development",
        description: "Develop comprehensive marketing strategy and goals",
        estimatedHours: "16",
        priority: "high",
        phase: "planning",
        orderIndex: 2,
        dependsOnPhase: "planning",
        tags: ["strategy", "planning", "goals"],
      },
      {
        projectTemplateId: marketingTemplate.id,
        title: "Content Creation & Design",
        description: "Create marketing content, graphics, and copy",
        estimatedHours: "40",
        priority: "high",
        phase: "design",
        orderIndex: 3,
        dependsOnPhase: "planning",
        tags: ["content", "design", "copywriting"],
      },
      {
        projectTemplateId: marketingTemplate.id,
        title: "Social Media Setup",
        description: "Set up social media accounts and profiles",
        estimatedHours: "8",
        priority: "medium",
        phase: "development",
        orderIndex: 4,
        dependsOnPhase: "design",
        tags: ["social-media", "setup", "profiles"],
      },
      {
        projectTemplateId: marketingTemplate.id,
        title: "Campaign Launch & Execution",
        description: "Launch campaign across all channels",
        estimatedHours: "24",
        priority: "high",
        phase: "launch",
        orderIndex: 5,
        dependsOnPhase: "development",
        tags: ["launch", "execution", "channels"],
      },
      {
        projectTemplateId: marketingTemplate.id,
        title: "Performance Monitoring & Analytics",
        description: "Set up analytics and monitor campaign performance",
        estimatedHours: "16",
        priority: "medium",
        phase: "launch",
        orderIndex: 6,
        dependsOnPhase: "launch",
        tags: ["analytics", "monitoring", "performance"],
      },
    ]);

    // Create Mobile App Development Template
    const [mobileTemplate] = await db.insert(projectTemplates).values({
      name: "Mobile App Development",
      description: "End-to-end mobile app development for iOS and Android platforms",
      industry: "web_development",
      category: "mobile_app",
      estimatedDuration: 60,
      defaultBudget: "25000",
      defaultPriority: "high",
      tags: ["mobile", "app", "ios", "android", "react-native"],
      createdBy: adminUserId,
    }).returning();

    // Create task templates for mobile app
    await db.insert(taskTemplates).values([
      {
        projectTemplateId: mobileTemplate.id,
        title: "App Concept & Feature Definition",
        description: "Define app concept, features, and user stories",
        estimatedHours: "24",
        priority: "high",
        phase: "planning",
        orderIndex: 1,
        tags: ["planning", "features", "user-stories"],
      },
      {
        projectTemplateId: mobileTemplate.id,
        title: "Technical Architecture Design",
        description: "Design app architecture and technology stack",
        estimatedHours: "20",
        priority: "high",
        phase: "planning",
        orderIndex: 2,
        dependsOnPhase: "planning",
        tags: ["architecture", "technical", "stack"],
      },
      {
        projectTemplateId: mobileTemplate.id,
        title: "UI/UX Design & Prototyping",
        description: "Create app designs and interactive prototypes",
        estimatedHours: "50",
        priority: "high",
        phase: "design",
        orderIndex: 3,
        dependsOnPhase: "planning",
        tags: ["design", "prototyping", "ui-ux"],
      },
      {
        projectTemplateId: mobileTemplate.id,
        title: "Core App Development",
        description: "Develop core app functionality and features",
        estimatedHours: "120",
        priority: "high",
        phase: "development",
        orderIndex: 4,
        dependsOnPhase: "design",
        tags: ["development", "core", "features"],
      },
      {
        projectTemplateId: mobileTemplate.id,
        title: "API Integration & Backend",
        description: "Integrate with APIs and develop backend services",
        estimatedHours: "40",
        priority: "high",
        phase: "development",
        orderIndex: 5,
        dependsOnPhase: "development",
        tags: ["api", "backend", "integration"],
      },
      {
        projectTemplateId: mobileTemplate.id,
        title: "Testing & Bug Fixes",
        description: "Comprehensive testing across devices and platforms",
        estimatedHours: "40",
        priority: "high",
        phase: "testing",
        orderIndex: 6,
        dependsOnPhase: "development",
        tags: ["testing", "bugs", "qa"],
      },
      {
        projectTemplateId: mobileTemplate.id,
        title: "App Store Submission",
        description: "Prepare and submit app to iOS and Android stores",
        estimatedHours: "16",
        priority: "medium",
        phase: "launch",
        orderIndex: 7,
        dependsOnPhase: "testing",
        tags: ["app-store", "submission", "launch"],
      },
    ]);

    console.log("✅ Sample project templates created successfully!");
    console.log(`   - Website Development (${websiteTemplate.id}): 8 tasks`);
    console.log(`   - Digital Marketing Campaign (${marketingTemplate.id}): 6 tasks`);
    console.log(`   - Mobile App Development (${mobileTemplate.id}): 7 tasks`);

  } catch (error) {
    console.error("❌ Error creating sample templates:", error);
    process.exit(1);
  }
}

createSampleTemplates()
  .then(() => {
    console.log("🎉 Template creation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });