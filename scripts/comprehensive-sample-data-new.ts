#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from "drizzle-orm";
import {
  users,
  companies,
  clients,
  projects,
  tasks,
  timeEntries,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  salesOpportunities,
  clientInteractions,
  projectActivity,
  projectComments,
  projectBudgets,
  budgetCategories,
  documents,
  systemVariables,
  resourceAllocations,
  userCapacity,
  userAvailability,
  userSkills,
  timeEntryApprovals,
  workloadSnapshots,
  opportunityActivityHistory,
  opportunityCommunications,
  opportunityFileAttachments,
  opportunityNextSteps,
  opportunityStakeholders,
  taskDependencies,
  taskTemplates,
  projectTemplates,
  notifications,
} from "../shared/schema";

// Helper functions
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomFutureDate(daysFromNow: number = 30): Date {
  const now = new Date();
  return new Date(now.getTime() + Math.random() * daysFromNow * 24 * 60 * 60 * 1000);
}

function randomPastDate(daysAgo: number = 180): Date {
  const now = new Date();
  return new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function clearAllData() {
  console.log("🧹 Clearing all existing sample data...");

  // Clear all tables in correct order (respecting foreign key constraints)
  await db.delete(workloadSnapshots);
  await db.delete(timeEntryApprovals);
  await db.delete(resourceAllocations);
  await db.delete(userAvailability);
  await db.delete(userCapacity);
  await db.delete(userSkills);
  await db.delete(projectActivity);
  await db.delete(projectComments);
  await db.delete(timeEntries);
  await db.delete(taskDependencies);
  await db.delete(tasks);
  await db.delete(taskTemplates);
  await db.delete(projectBudgets);
  await db.delete(budgetCategories);
  await db.delete(invoices);
  await db.delete(expenses);
  await db.delete(documents);
  await db.delete(knowledgeArticles);
  await db.delete(supportTickets);
  await db.delete(opportunityActivityHistory);
  await db.delete(opportunityCommunications);
  await db.delete(opportunityFileAttachments);
  await db.delete(opportunityNextSteps);
  await db.delete(opportunityStakeholders);
  await db.delete(salesOpportunities);
  await db.delete(clientInteractions);
  await db.delete(projects);
  await db.delete(projectTemplates);
  await db.delete(clients);
  await db.delete(companies);
  await db.delete(marketingCampaigns);
  await db.delete(systemVariables);
  await db.delete(notifications);
  
  // Clear all users except authenticated user if exists
  await db.delete(users).where(sql`email != 'steven@mcgettigan.com'`);

  console.log("✅ All existing data cleared successfully");
}

async function createTeamMembers() {
  console.log("👥 Creating 10 team members with diverse roles...");

  const teamMembers = [
    {
      email: "steven@mcgettigan.com",
      firstName: "Steven",
      lastName: "McGettigan",
      role: "admin",
      department: "Executive",
      position: "CEO",
      phone: "+44 7900 123456",
      address: "London, UK",
      skills: ["Leadership", "Strategy", "Business Development"],
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "sarah.johnson@bizos.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "manager",
      department: "Project Management",
      position: "Senior Project Manager",
      phone: "+44 7900 234567",
      address: "Manchester, UK",
      skills: ["Project Management", "Agile", "Team Leadership", "Risk Management"],
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b68cba93?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "mike.chen@bizos.com",
      firstName: "Mike",
      lastName: "Chen",
      role: "employee",
      department: "Development",
      position: "Senior Full Stack Developer",
      phone: "+44 7900 345678",
      address: "Birmingham, UK",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "emma.williams@bizos.com",
      firstName: "Emma",
      lastName: "Williams",
      role: "employee",
      department: "Design",
      position: "UX/UI Designer",
      phone: "+44 7900 456789",
      address: "Leeds, UK",
      skills: ["Figma", "Adobe Creative Suite", "User Research", "Prototyping"],
      profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "david.brown@bizos.com",
      firstName: "David",
      lastName: "Brown",
      role: "employee",
      department: "Development",
      position: "DevOps Engineer",
      phone: "+44 7900 567890",
      address: "Edinburgh, UK",
      skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Monitoring"],
      profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "lisa.taylor@bizos.com",
      firstName: "Lisa",
      lastName: "Taylor",
      role: "employee",
      department: "Marketing",
      position: "Digital Marketing Specialist",
      phone: "+44 7900 678901",
      address: "Bristol, UK",
      skills: ["SEO", "Google Ads", "Social Media", "Content Marketing", "Analytics"],
      profileImageUrl: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "james.wilson@bizos.com",
      firstName: "James",
      lastName: "Wilson",
      role: "employee",
      department: "Support",
      position: "Customer Support Manager",
      phone: "+44 7900 789012",
      address: "Glasgow, UK",
      skills: ["Customer Service", "Technical Support", "Team Management", "CRM"],
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "rachel.davis@bizos.com",
      firstName: "Rachel",
      lastName: "Davis",
      role: "employee",
      department: "Finance",
      position: "Financial Analyst",
      phone: "+44 7900 890123",
      address: "Cardiff, UK",
      skills: ["Financial Analysis", "Excel", "Accounting", "Budgeting", "Reporting"],
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b68cba93?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "tom.anderson@bizos.com",
      firstName: "Tom",
      lastName: "Anderson",
      role: "employee",
      department: "Development",
      position: "Junior Developer",
      phone: "+44 7900 901234",
      address: "Liverpool, UK",
      skills: ["JavaScript", "Python", "React", "Learning", "Problem Solving"],
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "anna.martinez@bizos.com",
      firstName: "Anna",
      lastName: "Martinez",
      role: "employee",
      department: "Quality Assurance",
      position: "QA Engineer",
      phone: "+44 7900 012345",
      address: "Nottingham, UK",
      skills: ["Test Automation", "Selenium", "API Testing", "Bug Tracking", "Quality Processes"],
      profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  ];

  const createdUsers = [];
  for (const member of teamMembers) {
    // Use upsert to handle existing users
    const [user] = await db.insert(users).values(member)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          department: member.department,
          position: member.position,
          phone: member.phone,
          address: member.address,
          skills: member.skills,
          profileImageUrl: member.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    createdUsers.push(user);
    console.log(`✅ Created team member: ${user.firstName} ${user.lastName} (${user.position})`);
  }

  return createdUsers;
}

async function createCompanies() {
  console.log("🏢 Creating 10 companies with realistic business details...");
  
  const companyData = [
    {
      name: "TechStart Innovation",
      industry: "technology",
      website: "https://techstart.com",
      address: "123 Tech Street, London, EC1A 1AA",
      phone: "+44 20 1234 5678",
      email: "hello@techstart.com",
      description: "A fast-growing startup developing AI-powered business automation tools",
      size: "startup",
      revenue: "2500000",
      foundedYear: 2019,
      tags: ["AI", "Automation", "SaaS"]
    },
    {
      name: "Global Health Solutions",
      industry: "healthcare",
      website: "https://globalhealthsolutions.com",
      address: "45 Medical Way, Manchester, M1 2AB",
      phone: "+44 161 234 5678",
      email: "contact@globalhealthsolutions.com",
      description: "Healthcare technology company specializing in patient management systems",
      size: "medium",
      revenue: "15000000",
      foundedYear: 2015,
      tags: ["Healthcare", "Technology", "Patient Care"]
    },
    {
      name: "Premier Financial Services",
      industry: "finance",
      website: "https://premierfs.co.uk",
      address: "78 Finance Plaza, Edinburgh, EH1 3CD",
      phone: "+44 131 345 6789",
      email: "info@premierfs.co.uk",
      description: "Independent financial advisory firm serving SMEs across the UK",
      size: "small",
      revenue: "5000000",
      foundedYear: 2012,
      tags: ["Financial Services", "Advisory", "SME"]
    },
    {
      name: "BuildCorp Construction",
      industry: "construction",
      website: "https://buildcorp.co.uk",
      address: "156 Construction Avenue, Birmingham, B1 4EF",
      phone: "+44 121 456 7890",
      email: "projects@buildcorp.co.uk",
      description: "Commercial construction company specializing in office buildings and retail spaces",
      size: "large",
      revenue: "45000000",
      foundedYear: 2008,
      tags: ["Construction", "Commercial", "Real Estate"]
    },
    {
      name: "EduTech Learning",
      industry: "education",
      website: "https://edutech-learning.com",
      address: "89 Education Road, Cambridge, CB1 5GH",
      phone: "+44 1223 567 890",
      email: "hello@edutech-learning.com",
      description: "Online learning platform for professional development and certification",
      size: "medium",
      revenue: "8000000",
      foundedYear: 2017,
      tags: ["Education", "Online Learning", "Certification"]
    },
    {
      name: "RetailMax Group",
      industry: "retail",
      website: "https://retailmax.co.uk",
      address: "234 Retail Street, Leeds, LS1 6IJ",
      phone: "+44 113 678 901",
      email: "contact@retailmax.co.uk",
      description: "Multi-brand retail group operating fashion and lifestyle stores across the UK",
      size: "large",
      revenue: "120000000",
      foundedYear: 2003,
      tags: ["Retail", "Fashion", "Lifestyle"]
    },
    {
      name: "GreenEnergy Solutions",
      industry: "technology",
      website: "https://greenenergy-solutions.com",
      address: "67 Renewable Way, Bristol, BS1 7KL",
      phone: "+44 117 789 012",
      email: "info@greenenergy-solutions.com",
      description: "Renewable energy technology company developing smart grid solutions",
      size: "medium",
      revenue: "12000000",
      foundedYear: 2016,
      tags: ["Renewable Energy", "Smart Grid", "Technology"]
    },
    {
      name: "Creative Media Agency",
      industry: "media",
      website: "https://creativemedia.co.uk",
      address: "91 Creative Studios, Brighton, BN1 8MN",
      phone: "+44 1273 890 123",
      email: "studio@creativemedia.co.uk",
      description: "Full-service creative agency specializing in digital marketing and brand design",
      size: "small",
      revenue: "3500000",
      foundedYear: 2014,
      tags: ["Creative", "Digital Marketing", "Branding"]
    },
    {
      name: "ManufacturingPro Ltd",
      industry: "manufacturing",
      website: "https://manufacturingpro.co.uk",
      address: "145 Industrial Park, Sheffield, S1 9OP",
      phone: "+44 114 901 234",
      email: "sales@manufacturingpro.co.uk",
      description: "Precision manufacturing company producing components for automotive and aerospace industries",
      size: "large",
      revenue: "65000000",
      foundedYear: 2005,
      tags: ["Manufacturing", "Automotive", "Aerospace"]
    },
    {
      name: "Charity Foundation UK",
      industry: "non-profit",
      website: "https://charityfoundation.org.uk",
      address: "33 Charity Lane, Oxford, OX1 0QR",
      phone: "+44 1865 012 345",
      email: "contact@charityfoundation.org.uk",
      description: "National charity focused on education and community development programs",
      size: "medium",
      revenue: "4000000",
      foundedYear: 2010,
      tags: ["Non-profit", "Education", "Community"]
    }
  ];

  const insertedCompanies = await db.insert(companies).values(companyData).returning();
  console.log(`✅ Created ${insertedCompanies.length} companies`);
  return insertedCompanies;
}

async function createContacts(companyList: any[], userList: any[]) {
  console.log("👤 Creating 16 contacts across companies...");
  
  const contactData = [];
  
  // Create 1-2 contacts per company, ensuring we have 16 total
  let contactCount = 0;
  for (let i = 0; i < companyList.length && contactCount < 16; i++) {
    const company = companyList[i];
    const contactsForCompany = i < 6 ? 2 : 1; // First 6 companies get 2 contacts, rest get 1
    
    for (let j = 0; j < contactsForCompany && contactCount < 16; j++) {
      const isPrimary = j === 0; // First contact is primary
      const firstName = randomChoice([
        "John", "Jane", "Michael", "Sarah", "David", "Emma", "James", "Olivia",
        "Robert", "Emily", "William", "Sophia", "Thomas", "Isabella", "Daniel", "Ava"
      ]);
      const lastName = randomChoice([
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Taylor"
      ]);
      
      contactData.push({
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `+44 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
        companyId: company.id,
        position: randomChoice(["CEO", "CTO", "VP Sales", "Marketing Director", "Operations Manager", "IT Manager", "Finance Director"]),
        department: randomChoice(["Executive", "Technology", "Sales", "Marketing", "Operations", "Finance"]),
        isPrimaryContact: isPrimary,
        source: randomChoice(["referral", "website", "marketing", "cold_outreach", "networking"]),
        assignedTo: randomChoice(userList).id,
        lastContactDate: randomPastDate(30),
        notes: `${isPrimary ? "Primary contact" : "Secondary contact"} for ${company.name}. ${randomChoice(["Very responsive", "Prefers email communication", "Best to contact in the morning", "Key decision maker"])}`,
        tags: randomChoices(["decision-maker", "technical", "budget-holder", "influencer", "champion"], Math.floor(Math.random() * 3) + 1),
        isActive: true
      });
      contactCount++;
    }
  }

  const insertedContacts = await db.insert(clients).values(contactData).returning();
  console.log(`✅ Created ${insertedContacts.length} contacts`);
  return insertedContacts;
}

async function createProjects(companyList: any[], contactList: any[], userList: any[]) {
  console.log("📋 Creating 12 projects with realistic timelines and budgets...");
  
  const projectData = [];
  
  for (let i = 0; i < 12; i++) {
    const company = randomChoice(companyList);
    const primaryContact = contactList.find(c => c.companyId === company.id && c.isPrimaryContact) ||
                          contactList.find(c => c.companyId === company.id);
    
    const startDate = randomPastDate(120);
    const endDate = new Date(startDate.getTime() + (Math.random() * 180 + 30) * 24 * 60 * 60 * 1000);
    const status = randomChoice(["planning", "active", "on_hold", "completed", "cancelled"]);
    const progress = status === "completed" ? 100 :
                    status === "active" ? Math.floor(Math.random() * 80) + 20 :
                    status === "planning" ? Math.floor(Math.random() * 20) :
                    status === "on_hold" ? Math.floor(Math.random() * 60) + 10 : 0;
    
    const budget = Math.floor(Math.random() * 150000) + 25000;
    const actualCost = progress > 0 ? budget * (progress / 100) * (0.8 + Math.random() * 0.4) : 0;

    projectData.push({
      name: `${company.name} - ${randomChoice(["Platform Development", "System Migration", "Process Optimization", "Digital Transformation", "Integration Project", "Consulting Engagement"])}`,
      description: `Comprehensive project for ${company.name} focusing on business process improvement and technology modernization.`,
      companyId: company.id,
      clientId: primaryContact?.id,
      managerId: randomChoice(userList.filter(u => u.role === "manager" || u.role === "admin")).id,
      status,
      priority: randomChoice(["low", "medium", "high", "urgent"]),
      budget: budget.toString(),
      actualCost: actualCost.toString(),
      progress,
      startDate,
      endDate,
      completedAt: status === "completed" ? endDate : null,
      tags: randomChoices(["strategic", "technology", "process", "integration"], Math.floor(Math.random() * 3) + 1),
      isClientPortalEnabled: true
    });
  }

  const insertedProjects = await db.insert(projects).values(projectData).returning();
  console.log(`✅ Created ${insertedProjects.length} projects`);
  return insertedProjects;
}

async function createTasks(projectList: any[], userList: any[]) {
  console.log("📝 Creating 25 tasks distributed across projects...");
  
  const taskData = [];
  const tasksPerProject = Math.ceil(25 / projectList.length);
  
  for (let i = 0; i < 25; i++) {
    const project = projectList[i % projectList.length];
    const assignedUser = randomChoice(userList);
    const createdBy = randomChoice(userList.filter(u => u.role === "manager" || u.role === "admin"));
    
    const status = randomChoice(["todo", "in_progress", "review", "completed", "cancelled"]);
    const estimatedHours = Math.floor(Math.random() * 40) + 5;
    const actualHours = status === "completed" ? estimatedHours * (0.8 + Math.random() * 0.4) :
                       status === "in_progress" ? estimatedHours * (0.3 + Math.random() * 0.4) :
                       status === "review" ? estimatedHours * 0.9 : 0;
    
    const startDate = randomPastDate(60);
    const dueDate = new Date(startDate.getTime() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000);

    taskData.push({
      title: randomChoice([
        "Setup development environment",
        "Design user interface mockups",
        "Implement authentication system",
        "Create API endpoints",
        "Write unit tests",
        "Database schema design",
        "Frontend component development",
        "Integration testing",
        "Performance optimization",
        "Security audit",
        "Documentation update",
        "Code review",
        "Bug fixing",
        "Feature implementation",
        "Data migration",
        "System deployment",
        "User training preparation",
        "Quality assurance testing",
        "Requirements analysis",
        "Technical documentation"
      ]),
      description: "Detailed task description with specific requirements and acceptance criteria.",
      projectId: project.id,
      assignedTo: assignedUser.id,
      createdBy: createdBy.id,
      status,
      priority: randomChoice(["low", "medium", "high", "urgent"]),
      estimatedHours: estimatedHours.toString(),
      actualHours: actualHours.toString(),
      startDate,
      dueDate,
      completedAt: status === "completed" ? dueDate : null,
      tags: randomChoices(["frontend", "backend", "testing", "documentation", "design"], Math.floor(Math.random() * 3) + 1)
    });
  }

  const insertedTasks = await db.insert(tasks).values(taskData).returning();
  console.log(`✅ Created ${insertedTasks.length} tasks`);
  return insertedTasks;
}

async function createTimeEntries(taskList: any[], projectList: any[], userList: any[]) {
  console.log("⏰ Creating 200 time entries with realistic work patterns...");
  
  const timeEntryData = [];
  
  for (let i = 0; i < 200; i++) {
    const user = randomChoice(userList);
    const task = randomChoice(taskList);
    const project = projectList.find(p => p.id === task.projectId);
    
    const workDate = randomPastDate(90);
    const hours = Math.random() * 8 + 0.5; // 0.5 to 8.5 hours
    const hourlyRate = Math.floor(Math.random() * 100) + 50; // £50-150 per hour
    
    timeEntryData.push({
      userId: user.id,
      projectId: project.id,
      taskId: task.id,
      description: `Work on ${task.title} - ${randomChoice(["development", "testing", "documentation", "review", "debugging"])}`,
      hours: hours.toFixed(2),
      date: workDate,
      billable: Math.random() > 0.2, // 80% billable
      rate: hourlyRate.toString()
    });
  }

  const insertedTimeEntries = await db.insert(timeEntries).values(timeEntryData).returning();
  console.log(`✅ Created ${insertedTimeEntries.length} time entries`);
  return insertedTimeEntries;
}

async function createInvoices(projectList: any[], companyList: any[], contactList: any[]) {
  console.log("💰 Creating 20 invoices with mixed statuses...");
  
  const invoiceData = [];
  
  for (let i = 0; i < 20; i++) {
    const project = randomChoice(projectList);
    const company = companyList.find(c => c.id === project.companyId);
    const contact = contactList.find(c => c.companyId === company.id && c.isPrimaryContact);
    
    const amount = Math.floor(Math.random() * 50000) + 5000;
    const tax = amount * 0.2; // 20% VAT
    const total = amount + tax;
    
    const status = randomChoice(["draft", "sent", "paid", "overdue", "cancelled"]);
    const invoiceDate = randomPastDate(120);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const paidAt = status === "paid" ? randomDate(invoiceDate, dueDate) : null;

    invoiceData.push({
      invoiceNumber: `INV-${String(i + 1).padStart(4, '0')}`,
      companyId: company.id,
      clientId: contact?.id,
      projectId: project.id,
      amount: amount.toString(),
      tax: tax.toString(),
      total: total.toString(),
      status,
      dueDate,
      paidAt,
      notes: `Invoice for ${project.name}`,
      terms: "Payment due within 30 days of invoice date"
    });
  }

  const insertedInvoices = await db.insert(invoices).values(invoiceData).returning();
  console.log(`✅ Created ${insertedInvoices.length} invoices`);
  return insertedInvoices;
}

async function createExpenses(projectList: any[], userList: any[]) {
  console.log("💳 Creating 50 expenses mapped to projects and team members...");
  
  const expenseData = [];
  const categories = ["travel", "meals", "supplies", "software", "equipment", "training", "marketing", "utilities"];
  
  for (let i = 0; i < 50; i++) {
    const project = randomChoice(projectList);
    const user = randomChoice(userList);
    const category = randomChoice(categories);
    const amount = Math.floor(Math.random() * 1000) + 10;
    
    expenseData.push({
      description: `${category.charAt(0).toUpperCase() + category.slice(1)} expense for ${project.name}`,
      amount: amount.toString(),
      category,
      projectId: project.id,
      userId: user.id,
      billable: Math.random() > 0.3, // 70% billable
      reimbursed: Math.random() > 0.4, // 60% reimbursed
      date: randomPastDate(90)
    });
  }

  const insertedExpenses = await db.insert(expenses).values(expenseData).returning();
  console.log(`✅ Created ${insertedExpenses.length} expenses`);
  return insertedExpenses;
}

async function createKnowledgeContent(userList: any[]) {
  console.log("📚 Creating knowledge articles and documents...");
  
  const articleData = [];
  const categories = ["sop", "training", "policy", "faq", "documentation"];
  
  for (let i = 0; i < 15; i++) {
    const author = randomChoice(userList);
    const category = randomChoice(categories);
    
    articleData.push({
      title: `${category.toUpperCase()}: ${randomChoice([
        "Onboarding Process",
        "Security Guidelines",
        "Project Management Best Practices",
        "Code Review Standards",
        "Client Communication Protocol",
        "Quality Assurance Procedures",
        "Emergency Response Plan",
        "Data Backup Procedures",
        "Software Deployment Guide",
        "Performance Review Process"
      ])}`,
      content: "Comprehensive guide covering all aspects of this topic with detailed procedures, examples, and best practices.",
      category,
      tags: randomChoices(["important", "updated", "required", "reference"], Math.floor(Math.random() * 3) + 1),
      authorId: author.id,
      status: randomChoice(["draft", "published", "archived"]),
      isPublic: Math.random() > 0.3, // 70% public
      viewCount: Math.floor(Math.random() * 100)
    });
  }

  const insertedArticles = await db.insert(knowledgeArticles).values(articleData).returning();
  console.log(`✅ Created ${insertedArticles.length} knowledge articles`);
  return insertedArticles;
}

async function createSalesOpportunities(companyList: any[], contactList: any[], userList: any[], projectList: any[]) {
  console.log("💼 Creating sales opportunities and pipeline data...");
  
  const opportunityData = [];
  const salesTeam = userList.filter(u => u.role === "manager" || u.role === "admin" || u.department === "Marketing");
  
  // Create 15 opportunities at various pipeline stages
  for (let i = 0; i < 15; i++) {
    const company = randomChoice(companyList);
    const primaryContact = contactList.find(c => c.companyId === company.id && c.isPrimaryContact) ||
                          contactList.find(c => c.companyId === company.id);
    const assignedTo = randomChoice(salesTeam);
    
    const stage = randomChoice(["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]);
    const probability = {
      "prospecting": Math.floor(Math.random() * 25) + 5, // 5-30%
      "qualification": Math.floor(Math.random() * 25) + 25, // 25-50%
      "proposal": Math.floor(Math.random() * 25) + 50, // 50-75%
      "negotiation": Math.floor(Math.random() * 25) + 70, // 70-95%
      "closed_won": 100,
      "closed_lost": 0
    }[stage];
    
    const value = Math.floor(Math.random() * 200000) + 50000; // £50k-250k
    const closeDate = stage.startsWith("closed") ? randomPastDate(90) : randomFutureDate(120);
    
    opportunityData.push({
      title: `${company.name} - ${randomChoice(["Digital Transformation", "System Integration", "Platform Development", "Consulting Services", "Process Automation", "Technology Upgrade"])}`,
      description: `Opportunity to provide comprehensive business solutions for ${company.name}. Includes system design, implementation, and ongoing support.`,
      companyId: company.id,
      contactId: primaryContact?.id,
      assignedTo: assignedTo.id,
      stage,
      value: value.toString(),
      probability,
      expectedCloseDate: closeDate,
      actualCloseDate: stage.startsWith("closed") ? closeDate : null,
      source: randomChoice(["website", "referral", "cold_outreach", "marketing", "networking", "existing_client"]),
      lostReason: stage === "closed_lost" ? randomChoice(["budget", "timeline", "competitor", "no_decision", "requirements_changed"]) : null,
      tags: randomChoices(["strategic", "recurring", "enterprise", "pilot", "urgent"], Math.floor(Math.random() * 3) + 1),
      nextAction: stage.startsWith("closed") ? null : randomChoice([
        "Follow up call scheduled",
        "Proposal preparation",
        "Technical demo",
        "Contract review",
        "Budget approval",
        "Requirements gathering"
      ]),
      lastActivityDate: randomPastDate(14)
    });
  }

  const insertedOpportunities = await db.insert(salesOpportunities).values(opportunityData).returning();
  console.log(`✅ Created ${insertedOpportunities.length} sales opportunities`);

  // Create opportunity stakeholders
  const stakeholderData = [];
  for (const opportunity of insertedOpportunities) {
    const relatedContacts = contactList.filter(c => c.companyId === opportunity.companyId);
    const stakeholderCount = Math.min(relatedContacts.length, Math.floor(Math.random() * 3) + 1);
    
    for (let i = 0; i < stakeholderCount; i++) {
      const contact = relatedContacts[i];
      stakeholderData.push({
        opportunityId: opportunity.id,
        contactId: contact.id,
        name: contact.name,
        role: randomChoice(["decision_maker", "influencer", "technical_contact", "budget_holder", "end_user"]),
        influence: randomChoice(["high", "medium", "low"]),
        notes: `Key ${contact.position} involved in decision making process.`
      });
    }
  }

  if (stakeholderData.length > 0) {
    await db.insert(opportunityStakeholders).values(stakeholderData);
    console.log(`✅ Created ${stakeholderData.length} opportunity stakeholders`);
  }

  // Create opportunity communications
  const communicationData = [];
  for (const opportunity of insertedOpportunities) {
    const commCount = Math.floor(Math.random() * 5) + 2; // 2-6 communications per opportunity
    
    for (let i = 0; i < commCount; i++) {
      communicationData.push({
        opportunityId: opportunity.id,
        type: randomChoice(["email", "call", "meeting", "proposal", "demo"]),
        subject: `Re: ${opportunity.title} - ${randomChoice(["Follow up", "Proposal Discussion", "Technical Requirements", "Budget Review", "Next Steps"])}`,
        summary: "Detailed discussion about project requirements, timeline, and next steps.",
        contactId: opportunity.contactId,
        userId: opportunity.assignedTo,
        scheduledDate: randomPastDate(60),
        completedDate: randomPastDate(60),
        outcome: randomChoice(["positive", "neutral", "negative", "action_required"]),
        followUpRequired: Math.random() > 0.6
      });
    }
  }

  if (communicationData.length > 0) {
    await db.insert(opportunityCommunications).values(communicationData);
    console.log(`✅ Created ${communicationData.length} opportunity communications`);
  }

  // Create opportunity next steps
  const nextStepsData = [];
  for (const opportunity of insertedOpportunities.filter(o => !o.stage.startsWith("closed"))) {
    const stepCount = Math.floor(Math.random() * 3) + 1; // 1-3 next steps per active opportunity
    
    for (let i = 0; i < stepCount; i++) {
      const stepTitle = randomChoice([
        "Schedule technical demo with IT team",
        "Prepare detailed project proposal", 
        "Review budget requirements",
        "Conduct stakeholder interviews",
        "Present solution architecture",
        "Negotiate contract terms",
        "Finalize project timeline"
      ]);
      
      nextStepsData.push({
        opportunityId: opportunity.id,
        title: stepTitle,
        description: `${stepTitle} - Important step to move opportunity forward in the sales pipeline.`,
        dueDate: randomFutureDate(30),
        assignedTo: opportunity.assignedTo,
        priority: randomChoice(["low", "medium", "high"]),
        status: randomChoice(["pending", "in_progress", "completed"])
      });
    }
  }

  if (nextStepsData.length > 0) {
    await db.insert(opportunityNextSteps).values(nextStepsData);
    console.log(`✅ Created ${nextStepsData.length} opportunity next steps`);
  }

  // Link closed-won opportunities to projects
  const closedWonOpportunities = insertedOpportunities.filter(o => o.stage === "closed_won");
  let linkedProjects = 0;
  
  for (const opportunity of closedWonOpportunities) {
    const relatedProject = projectList.find(p => p.companyId === opportunity.companyId);
    if (relatedProject) {
      await db.update(projects)
        .set({ 
          opportunityId: opportunity.id,
          updatedAt: new Date()
        })
        .where(sql`id = ${relatedProject.id}`);
      linkedProjects++;
    }
  }

  if (linkedProjects > 0) {
    console.log(`✅ Linked ${linkedProjects} projects to won opportunities`);
  }

  return insertedOpportunities;
}

async function createClientInteractions(contactList: any[], userList: any[]) {
  console.log("🤝 Creating client interaction history...");
  
  const interactionData = [];
  const salesTeam = userList.filter(u => u.role === "manager" || u.role === "admin" || u.department === "Marketing");
  
  for (let i = 0; i < 30; i++) {
    const contact = randomChoice(contactList);
    const user = randomChoice(salesTeam);
    
    interactionData.push({
      clientId: contact.id,
      userId: user.id,
      type: randomChoice(["call", "email", "meeting", "demo", "proposal", "follow_up"]),
      subject: randomChoice([
        "Initial discovery call",
        "Product demonstration", 
        "Proposal discussion",
        "Technical requirements review",
        "Budget and timeline planning",
        "Contract negotiation",
        "Project kickoff meeting",
        "Regular check-in call"
      ]),
      summary: "Productive discussion covering client needs, project scope, and next steps.",
      outcome: randomChoice(["positive", "neutral", "needs_follow_up", "not_interested"]),
      followUpRequired: Math.random() > 0.7,
      followUpDate: Math.random() > 0.5 ? randomFutureDate(14) : null,
      duration: Math.floor(Math.random() * 120) + 15, // 15-135 minutes
      interactionDate: randomPastDate(180),
      tags: randomChoices(["discovery", "technical", "commercial", "decision_maker"], Math.floor(Math.random() * 3) + 1)
    });
  }

  const insertedInteractions = await db.insert(clientInteractions).values(interactionData).returning();
  console.log(`✅ Created ${insertedInteractions.length} client interactions`);
  return insertedInteractions;
}

async function createSupportTickets(contactList: any[], userList: any[]) {
  console.log("🎫 Creating support tickets...");
  
  const ticketData = [];
  const categories = ["technical", "billing", "general", "feature_request"];
  
  for (let i = 0; i < 12; i++) {
    const client = randomChoice(contactList);
    const assignee = randomChoice(userList.filter(u => u.department === "Support"));
    const creator = randomChoice(userList);
    
    const status = randomChoice(["open", "in_progress", "resolved", "closed"]);
    const priority = randomChoice(["low", "medium", "high", "urgent"]);
    
    ticketData.push({
      ticketNumber: `TICK-${String(i + 1).padStart(4, '0')}`,
      title: randomChoice([
        "Login issues with new system",
        "Performance degradation reported",
        "Feature request for reporting",
        "Bug in dashboard calculations",
        "Access permission problems",
        "Integration not working",
        "Data synchronization error",
        "User interface feedback",
        "Security concern reported",
        "Training request"
      ]),
      description: "Detailed description of the issue with steps to reproduce and expected vs actual behavior.",
      category: randomChoice(categories),
      priority,
      status,
      clientId: client.id,
      assignedTo: assignee.id,
      createdBy: creator.id,
      resolution: status === "resolved" || status === "closed" ? "Issue resolved through system update and user training." : null,
      satisfactionRating: status === "resolved" || status === "closed" ? Math.floor(Math.random() * 5) + 1 : null,
      resolvedAt: status === "resolved" || status === "closed" ? randomPastDate(30) : null
    });
  }

  const insertedTickets = await db.insert(supportTickets).values(ticketData).returning();
  console.log(`✅ Created ${insertedTickets.length} support tickets`);
  return insertedTickets;
}

// Main function to orchestrate all data creation
async function main() {
  try {
    console.log("🚀 Starting comprehensive sample data generation...\n");

    await clearAllData();
    console.log("");

    const teamMembers = await createTeamMembers();
    console.log("");

    const companyList = await createCompanies();
    console.log("");

    const contactList = await createContacts(companyList, teamMembers);
    console.log("");

    const projectList = await createProjects(companyList, contactList, teamMembers);
    console.log("");

    const taskList = await createTasks(projectList, teamMembers);
    console.log("");

    const timeEntryList = await createTimeEntries(taskList, projectList, teamMembers);
    console.log("");

    const invoiceList = await createInvoices(projectList, companyList, contactList);
    console.log("");

    const expenseList = await createExpenses(projectList, teamMembers);
    console.log("");

    const knowledgeList = await createKnowledgeContent(teamMembers);
    console.log("");

    const opportunityList = await createSalesOpportunities(companyList, contactList, teamMembers, projectList);
    console.log("");

    const interactionList = await createClientInteractions(contactList, teamMembers);
    console.log("");

    const ticketList = await createSupportTickets(contactList, teamMembers);
    console.log("");

    // Set system variables
    await db.insert(systemVariables).values([
      {
        key: "sample_data_version",
        value: "comprehensive-v2.0",
        description: "Current sample data version",
        category: "system"
      },
      {
        key: "data_seed_date",
        value: new Date().toISOString(),
        description: "Date when sample data was generated",
        category: "system"
      }
    ]).onConflictDoUpdate({
      target: systemVariables.key,
      set: {
        value: sql`excluded.value`,
        updatedAt: sql`now()`
      }
    });

    console.log("🎉 Comprehensive sample data generation completed successfully!");
    console.log(`📊 Summary: 
    - ${teamMembers.length} team members
    - ${companyList.length} companies  
    - ${contactList.length} contacts
    - ${opportunityList.length} sales opportunities
    - ${projectList.length} projects
    - ${taskList.length} tasks
    - ${timeEntryList.length} time entries
    - ${invoiceList.length} invoices
    - ${expenseList.length} expenses
    - ${interactionList.length} client interactions
    - ${knowledgeList.length} knowledge articles
    - ${ticketList.length} support tickets`);

  } catch (error) {
    console.error("❌ Error generating sample data:", error);
    throw error;
  }
}

// Run the script
main().then(() => {
  console.log("✅ Script completed successfully");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

export { main as generateComprehensiveSampleData };