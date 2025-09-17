#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from "drizzle-orm";
import {
  users,
  clients,
  projects,
  tasks,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  systemVariables,
} from "@shared/schema";

// Generate a random date between two dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random amount as string
function randomAmount(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// Get random element from array
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createProjects() {
  console.log("📋 Creating 20 projects linked to clients...");

  // Get existing data
  const allUsers = await db.select().from(users);
  const allClients = await db.select().from(clients);

  const managers = allUsers.filter(u => u.role === "manager" || u.role === "admin");
  const activeClients = allClients.filter(c => c.status === "client");

  const projectData = [
    {
      name: "AI-Powered Analytics Dashboard",
      description: "Development of machine learning analytics platform with real-time data visualization and predictive modeling capabilities.",
      clientId: allClients.find(c => c.company === "TechStartup Ltd")?.id,
      managerId: managers[0]?.id,
      status: "in_progress",
      priority: "high",
      budget: "45000.00",
      actualCost: "32000.00",
      progress: 75,
      startDate: new Date("2024-08-01"),
      endDate: new Date("2024-12-15"),
      tags: ["AI", "Analytics", "Dashboard"]
    },
    {
      name: "Solar Panel Management System",
      description: "Comprehensive system for monitoring and managing solar panel installations across multiple sites.",
      clientId: allClients.find(c => c.company === "GreenEnergy Solutions")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "in_progress",
      priority: "medium",
      budget: "78000.00",
      actualCost: "45000.00",
      progress: 60,
      startDate: new Date("2024-07-15"),
      endDate: new Date("2025-01-30"),
      tags: ["Solar", "IoT", "Management"]
    },
    {
      name: "GDPR-Compliant Patient Portal",
      description: "Secure patient management system with GDPR compliance, appointment scheduling, and medical records management.",
      clientId: allClients.find(c => c.company === "HealthCare Plus")?.id,
      managerId: managers[0]?.id,
      status: "in_progress",
      priority: "high",
      budget: "92000.00",
      actualCost: "67000.00",
      progress: 80,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2024-11-30"),
      tags: ["Healthcare", "GDPR", "Portal"]
    },
    {
      name: "Inventory Management System",
      description: "Multi-location inventory tracking with POS integration and automated reordering capabilities.",
      clientId: allClients.find(c => c.company === "RetailMax Chain")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "active",
      priority: "medium",
      budget: "56000.00",
      actualCost: "28000.00",
      progress: 45,
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-02-28"),
      tags: ["Retail", "Inventory", "POS"]
    },
    {
      name: "Fleet Management Platform",
      description: "GPS tracking and route optimization system for logistics fleet management with driver performance analytics.",
      clientId: allClients.find(c => c.company === "LogiFlow Transport")?.id,
      managerId: managers[0]?.id,
      status: "active",
      priority: "medium",
      budget: "67000.00",
      actualCost: "35000.00",
      progress: 55,
      startDate: new Date("2024-08-15"),
      endDate: new Date("2025-01-15"),
      tags: ["Logistics", "GPS", "Fleet"]
    },
    {
      name: "Digital Asset Management",
      description: "Cloud-based system for managing, organizing, and distributing digital media assets with collaboration tools.",
      clientId: allClients.find(c => c.company === "MediaFlow Studios")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "planning",
      priority: "low",
      budget: "54000.00",
      actualCost: "8000.00",
      progress: 15,
      startDate: new Date("2024-10-01"),
      endDate: new Date("2025-03-31"),
      tags: ["Media", "DAM", "Cloud"]
    },
    {
      name: "Parts Catalog E-commerce",
      description: "B2B e-commerce platform for automotive parts with advanced search, compatibility checking, and bulk ordering.",
      clientId: allClients.find(c => c.company === "AutoParts Direct")?.id,
      managerId: managers[0]?.id,
      status: "completed",
      priority: "medium",
      budget: "48000.00",
      actualCost: "46500.00",
      progress: 100,
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-08-31"),
      completedAt: new Date("2024-08-28"),
      tags: ["Automotive", "E-commerce", "B2B"]
    },
    {
      name: "Event Management Platform",
      description: "Comprehensive platform for event planning, ticketing, attendee management, and analytics.",
      clientId: allClients.find(c => c.company === "EventTech Pro")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "active",
      priority: "medium",
      budget: "41000.00",
      actualCost: "25000.00",
      progress: 65,
      startDate: new Date("2024-07-01"),
      endDate: new Date("2024-12-31"),
      tags: ["Events", "Ticketing", "Management"]
    },
    {
      name: "Online Learning Platform",
      description: "Educational platform with course management, video streaming, assessments, and progress tracking.",
      clientId: allClients.find(c => c.company === "EduLearn Academy")?.id,
      managerId: managers[0]?.id,
      status: "planning",
      priority: "medium",
      budget: "35000.00",
      actualCost: "5000.00",
      progress: 10,
      startDate: new Date("2024-11-01"),
      endDate: new Date("2025-04-30"),
      tags: ["Education", "E-learning", "Platform"]
    },
    {
      name: "Trading Platform Development",
      description: "Real-time trading platform with advanced charting, portfolio management, and risk analysis tools.",
      clientId: allClients.find(c => c.company === "FinServ Partners")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "planning",
      priority: "high",
      budget: "125000.00",
      actualCost: "15000.00",
      progress: 5,
      startDate: new Date("2024-12-01"),
      endDate: new Date("2025-08-31"),
      tags: ["FinTech", "Trading", "Real-time"]
    },
    {
      name: "Smart Farming IoT Dashboard",
      description: "IoT sensor integration with data analytics for crop monitoring, irrigation control, and yield prediction.",
      clientId: allClients.find(c => c.company === "AgroTech Farms")?.id,
      managerId: managers[0]?.id,
      status: "planning",
      priority: "medium",
      budget: "43000.00",
      actualCost: "3000.00",
      progress: 8,
      startDate: new Date("2024-11-15"),
      endDate: new Date("2025-05-15"),
      tags: ["IoT", "Agriculture", "Dashboard"]
    },
    {
      name: "Property Management CRM",
      description: "Customer relationship management system specifically designed for property management companies.",
      clientId: allClients.find(c => c.company === "PropTech Solutions")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "planning",
      priority: "medium",
      budget: "89000.00",
      actualCost: "12000.00",
      progress: 12,
      startDate: new Date("2024-10-15"),
      endDate: new Date("2025-06-30"),
      tags: ["PropTech", "CRM", "Management"]
    },
    {
      name: "Fan Engagement Mobile App",
      description: "Mobile application for sports fans with live updates, social features, and merchandise integration.",
      clientId: allClients.find(c => c.company === "SportsTech Arena")?.id,
      managerId: managers[0]?.id,
      status: "planning",
      priority: "low",
      budget: "37000.00",
      actualCost: "2000.00",
      progress: 5,
      startDate: new Date("2024-12-15"),
      endDate: new Date("2025-05-31"),
      tags: ["Sports", "Mobile", "Social"]
    },
    {
      name: "Legal Document Automation",
      description: "System for automating legal document generation, review processes, and case management workflows.",
      clientId: allClients.find(c => c.company === "LegalTech Partners")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "planning",
      priority: "medium",
      budget: "76000.00",
      actualCost: "8000.00",
      progress: 10,
      startDate: new Date("2024-11-01"),
      endDate: new Date("2025-07-31"),
      tags: ["Legal", "Automation", "Documents"]
    },
    {
      name: "Supply Chain Traceability",
      description: "Blockchain-based system for food supply chain traceability from farm to consumer.",
      clientId: allClients.find(c => c.company === "FoodChain Solutions")?.id,
      managerId: managers[0]?.id,
      status: "planning",
      priority: "medium",
      budget: "52000.00",
      actualCost: "4000.00",
      progress: 7,
      startDate: new Date("2024-12-01"),
      endDate: new Date("2025-06-30"),
      tags: ["Supply Chain", "Blockchain", "Traceability"]
    },
    {
      name: "Claims Processing Automation",
      description: "AI-powered system for automated insurance claims processing with fraud detection capabilities.",
      clientId: allClients.find(c => c.company === "InsureTech Now")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "planning",
      priority: "high",
      budget: "83000.00",
      actualCost: "9000.00",
      progress: 8,
      startDate: new Date("2024-11-15"),
      endDate: new Date("2025-08-15"),
      tags: ["Insurance", "AI", "Automation"]
    },
    {
      name: "Brewery Management System",
      description: "Production planning, inventory management, and distribution tracking for craft brewery operations.",
      clientId: allClients.find(c => c.company === "CraftBrew Collective")?.id,
      managerId: managers[0]?.id,
      status: "planning",
      priority: "low",
      budget: "28000.00",
      actualCost: "2500.00",
      progress: 5,
      startDate: new Date("2024-12-01"),
      endDate: new Date("2025-04-30"),
      tags: ["Brewery", "Production", "Distribution"]
    },
    {
      name: "Customer Support Portal",
      description: "Self-service customer support portal with ticketing system, knowledge base, and live chat integration.",
      clientId: allClients.find(c => c.company === "TechStartup Ltd")?.id,
      managerId: managers[0]?.id,
      status: "completed",
      priority: "low",
      budget: "18000.00",
      actualCost: "17200.00",
      progress: 100,
      startDate: new Date("2024-05-01"),
      endDate: new Date("2024-07-31"),
      completedAt: new Date("2024-07-28"),
      tags: ["Support", "Portal", "Self-service"]
    },
    {
      name: "API Integration Platform",
      description: "Middleware platform for integrating multiple third-party APIs with custom business applications.",
      clientId: allClients.find(c => c.company === "GreenEnergy Solutions")?.id,
      managerId: managers[1]?.id || managers[0]?.id,
      status: "review",
      priority: "medium",
      budget: "32000.00",
      actualCost: "30500.00",
      progress: 95,
      startDate: new Date("2024-06-15"),
      endDate: new Date("2024-10-15"),
      tags: ["API", "Integration", "Middleware"]
    },
    {
      name: "Data Migration & Optimization",
      description: "Legacy system data migration with database optimization and performance tuning.",
      clientId: allClients.find(c => c.company === "HealthCare Plus")?.id,
      managerId: managers[0]?.id,
      status: "completed",
      priority: "high",
      budget: "25000.00",
      actualCost: "24800.00",
      progress: 100,
      startDate: new Date("2024-04-01"),
      endDate: new Date("2024-06-30"),
      completedAt: new Date("2024-06-25"),
      tags: ["Migration", "Database", "Optimization"]
    }
  ];

  const createdProjects = [];
  for (const project of projectData) {
    if (project.clientId) { // Only create if client exists
      const [newProject] = await db.insert(projects).values(project).returning();
      createdProjects.push(newProject);
      console.log(`✅ Created project: ${newProject.name} (${newProject.status} - ${Math.round(newProject.progress)}%)`);
    }
  }

  return createdProjects;
}

async function createTasks() {
  console.log("✅ Generating 5-10 tasks per project with assignments...");

  const allUsers = await db.select().from(users);
  const allProjects = await db.select().from(projects);
  const developers = allUsers.filter(u => u.department === "Development" || u.department === "Design" || u.department === "Quality Assurance");

  const taskTemplates = [
    "Setup development environment",
    "Design user interface mockups",
    "Implement authentication system",
    "Database schema design",
    "API endpoint development",
    "Frontend component creation",
    "Unit test implementation",
    "Integration testing",
    "Performance optimization",
    "Security vulnerability assessment",
    "Documentation writing",
    "Code review",
    "Deployment configuration",
    "Bug fixes and improvements",
    "Feature implementation",
    "User acceptance testing",
    "Data migration scripts",
    "Third-party API integration",
    "Mobile responsive design",
    "SEO optimization"
  ];

  const statuses = ["todo", "in_progress", "review", "completed"];
  const priorities = ["low", "medium", "high", "urgent"];

  let totalTasks = 0;
  for (const project of allProjects) {
    const numTasks = Math.floor(Math.random() * 6) + 5; // 5-10 tasks per project

    for (let i = 0; i < numTasks; i++) {
      const assignee = randomElement(developers);
      const creator = allUsers.find(u => u.id === project.managerId) || randomElement(allUsers);

      const dueDate = randomDate(new Date(), new Date(project.endDate || "2025-06-30"));
      const isCompleted = Math.random() < 0.3; // 30% chance of being completed

      const task = {
        title: randomElement(taskTemplates),
        description: `Detailed implementation task for ${project.name}. Requires attention to detail and technical expertise.`,
        projectId: project.id,
        assignedTo: assignee.id,
        createdBy: creator.id,
        status: isCompleted ? "completed" : randomElement(statuses),
        priority: randomElement(priorities),
        estimatedHours: randomAmount(4, 40),
        actualHours: isCompleted ? randomAmount(4, 35) : randomAmount(0, 20),
        dueDate,
        completedAt: isCompleted ? randomDate(new Date("2024-01-01"), new Date()) : null,
        tags: project.tags?.slice(0, 2) || ["development"]
      };

      const [newTask] = await db.insert(tasks).values(task).returning();
      totalTasks++;
      if (totalTasks % 20 === 0) {
        console.log(`✅ Created ${totalTasks} tasks so far...`);
      }
    }
  }

  console.log(`✅ Created ${totalTasks} tasks total`);
  return totalTasks;
}

async function createFinanceData() {
  console.log("💰 Populating finance data with budgets and invoices...");

  const allClients = await db.select().from(clients);
  const allProjects = await db.select().from(projects);
  const allUsers = await db.select().from(users);

  // Create invoices
  console.log("📄 Creating invoices...");
  const completedProjects = allProjects.filter(p => p.status === "completed");
  const activeProjects = allProjects.filter(p => p.status === "in_progress" || p.status === "active");

  const invoiceStatuses = ["draft", "sent", "paid", "overdue"];
  let invoiceCount = 0;

  // Get existing invoices to avoid duplicates
  const existingInvoices = await db.select().from(invoices);
  const existingNumbers = new Set(existingInvoices.map(inv => inv.invoiceNumber));

  // Helper to generate unique invoice number
  const generateUniqueInvoiceNumber = () => {
    let number;
    do {
      number = `INV-2024-${String(++invoiceCount).padStart(4, '0')}`;
    } while (existingNumbers.has(number));
    existingNumbers.add(number);
    return number;
  };

  // Create invoices for completed projects
  for (const project of completedProjects) {
    const client = allClients.find(c => c.id === project.clientId);
    if (client) {
      const amount = parseFloat(project.budget || "0") * 0.8; // 80% of budget
      const tax = amount * 0.2; // 20% tax
      const total = amount + tax;

      const invoice = {
        invoiceNumber: generateUniqueInvoiceNumber(),
        clientId: client.id,
        projectId: project.id,
        amount: amount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: "paid",
        dueDate: randomDate(new Date("2024-01-01"), new Date("2024-11-30")),
        paidAt: randomDate(new Date("2024-01-01"), new Date()),
        notes: `Final invoice for ${project.name}`,
        terms: "Payment due within 30 days"
      };

      await db.insert(invoices).values(invoice);
    }
  }

  // Create invoices for active projects
  for (const project of activeProjects.slice(0, 8)) {
    const client = allClients.find(c => c.id === project.clientId);
    if (client) {
      const amount = parseFloat(project.actualCost || "0") * 0.6; // 60% of actual cost
      const tax = amount * 0.2;
      const total = amount + tax;

      const invoice = {
        invoiceNumber: generateUniqueInvoiceNumber(),
        clientId: client.id,
        projectId: project.id,
        amount: amount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: randomElement(invoiceStatuses),
        dueDate: randomDate(new Date(), new Date("2025-03-31")),
        paidAt: Math.random() < 0.5 ? randomDate(new Date("2024-01-01"), new Date()) : null,
        notes: `Interim invoice for ${project.name}`,
        terms: "Payment due within 30 days"
      };

      await db.insert(invoices).values(invoice);
    }
  }

  // Create expenses
  console.log("💸 Creating expenses...");
  const expenseCategories = ["software", "travel", "office_supplies", "training", "marketing"];
  const expenseDescriptions = [
    "Software license renewal",
    "Client site visit travel",
    "Office supplies and equipment",
    "Professional development course",
    "Marketing campaign materials",
    "Conference attendance",
    "Hardware purchases",
    "Contractor payments",
    "Meal allowances",
    "Communication tools"
  ];

  for (let i = 0; i < 25; i++) {
    const project = randomElement(allProjects);
    const user = randomElement(allUsers);

    const expense = {
      description: randomElement(expenseDescriptions),
      amount: randomAmount(50, 2500),
      category: randomElement(expenseCategories),
      projectId: project.id,
      userId: user.id,
      billable: Math.random() < 0.7, // 70% billable
      reimbursed: Math.random() < 0.6, // 60% reimbursed
      date: randomDate(new Date("2024-01-01"), new Date())
    };

    await db.insert(expenses).values(expense);
  }

  console.log(`✅ Created ${invoiceCount} invoices and 25 expenses`);
}

async function createKnowledgeBase() {
  console.log("📚 Creating knowledge base with business articles...");

  const allUsers = await db.select().from(users);
  const authors = allUsers.filter(u => u.role === "admin" || u.role === "manager" || u.department === "Development");

  const knowledgeArticleData = [
    {
      title: "API Integration Best Practices",
      content: `# API Integration Best Practices

## Overview
This guide outlines the best practices for integrating with third-party APIs in our projects.

## Security Considerations
- Always use HTTPS for API communications
- Implement proper authentication (OAuth 2.0, API keys)
- Validate all input data
- Use rate limiting to prevent abuse

## Error Handling
- Implement retry logic with exponential backoff
- Handle different HTTP status codes appropriately
- Log errors for debugging and monitoring
- Provide meaningful error messages to users

## Performance Optimization
- Use caching where appropriate
- Implement connection pooling
- Monitor API response times
- Optimize payload sizes

## Testing
- Mock external APIs in unit tests
- Use dedicated test environments
- Implement contract testing
- Monitor API dependencies`,
      category: "technical",
      tags: ["API", "Integration", "Best Practices"],
      status: "published"
    },
    {
      title: "Client Onboarding Process",
      content: `# Client Onboarding Process

## Initial Contact
1. Schedule discovery call within 24 hours
2. Send welcome package with company information
3. Assign dedicated project manager
4. Set up communication channels

## Requirements Gathering
- Conduct stakeholder interviews
- Document functional requirements
- Identify technical constraints
- Define success criteria

## Project Planning
- Create detailed project timeline
- Assign team members
- Set up development environments
- Establish quality gates

## Kickoff Meeting
- Review project scope and timeline
- Introduce team members
- Establish communication protocols
- Set expectations and deliverables`,
      category: "process",
      tags: ["Onboarding", "Process", "Client Management"],
      status: "published"
    },
    {
      title: "Database Performance Troubleshooting",
      content: `# Database Performance Troubleshooting

## Common Issues
- Slow query performance
- Connection pool exhaustion
- Deadlocks and blocking
- High CPU utilization

## Diagnostic Tools
- Query execution plans
- Performance monitoring tools
- Database logs analysis
- Resource utilization metrics

## Optimization Techniques
- Index optimization
- Query rewriting
- Connection pooling
- Caching strategies

## Monitoring and Alerting
- Set up performance baselines
- Configure alerts for anomalies
- Regular performance reviews
- Capacity planning`,
      category: "troubleshooting",
      tags: ["Database", "Performance", "Troubleshooting"],
      status: "published"
    },
    {
      title: "Project Management Methodology",
      content: `# Our Project Management Methodology

## Agile Framework
We use a modified Scrum approach with 2-week sprints.

## Key Ceremonies
- Sprint Planning (2 hours)
- Daily Standups (15 minutes)
- Sprint Review (1 hour)
- Retrospective (1 hour)

## Roles and Responsibilities
- Product Owner: Defines requirements and priorities
- Scrum Master: Facilitates process and removes blockers
- Development Team: Delivers working software

## Tools and Artifacts
- Project management: Jira/Azure DevOps
- Documentation: Confluence/SharePoint
- Code repository: Git
- Communication: Slack/Teams`,
      category: "process",
      tags: ["Project Management", "Agile", "Methodology"],
      status: "published"
    },
    {
      title: "Code Review Guidelines",
      content: `# Code Review Guidelines

## Review Criteria
- Code functionality and correctness
- Performance considerations
- Security vulnerabilities
- Code style and conventions
- Test coverage

## Review Process
1. Create pull request with clear description
2. Assign appropriate reviewers
3. Address feedback promptly
4. Ensure all checks pass
5. Merge after approval

## Best Practices
- Keep reviews small and focused
- Provide constructive feedback
- Explain reasoning behind suggestions
- Be respectful and professional

## Tools
- GitHub/GitLab pull requests
- SonarQube for code quality
- Automated testing pipelines
- Code coverage reports`,
      category: "best_practices",
      tags: ["Code Review", "Quality", "Best Practices"],
      status: "published"
    },
    {
      title: "Security Incident Response Plan",
      content: `# Security Incident Response Plan

## Incident Classification
- Level 1: Minor security issue
- Level 2: Moderate security breach
- Level 3: Major security incident
- Level 4: Critical security emergency

## Response Team
- Incident Commander
- Technical Lead
- Security Officer
- Communications Lead

## Response Procedures
1. Immediate containment
2. Evidence preservation
3. Impact assessment
4. Stakeholder notification
5. Recovery planning
6. Post-incident review

## Communication Plan
- Internal escalation paths
- Client notification procedures
- Regulatory reporting requirements
- Public communication strategy`,
      category: "security",
      tags: ["Security", "Incident Response", "Emergency"],
      status: "published"
    },
    {
      title: "Quality Assurance Standards",
      content: `# Quality Assurance Standards

## Testing Strategy
- Unit testing (90% coverage minimum)
- Integration testing
- End-to-end testing
- Performance testing
- Security testing

## Test Environment Management
- Dedicated QA environments
- Data management procedures
- Environment provisioning
- Test data privacy

## Bug Management
- Severity classification
- Priority assignment
- Lifecycle tracking
- Resolution verification

## Quality Metrics
- Defect density
- Test coverage
- Escaped defects
- Customer satisfaction`,
      category: "quality",
      tags: ["QA", "Testing", "Quality"],
      status: "published"
    },
    {
      title: "Cloud Migration Strategy",
      content: `# Cloud Migration Strategy

## Assessment Phase
- Current infrastructure analysis
- Application dependencies mapping
- Cost-benefit analysis
- Risk assessment

## Migration Approaches
- Lift and Shift (Rehost)
- Platform Optimization (Replatform)
- Application Modernization (Refactor)
- Cloud-Native Rebuild

## Implementation Plan
1. Pilot project selection
2. Migration toolkit setup
3. Data migration strategy
4. Cutover planning
5. Rollback procedures

## Post-Migration
- Performance monitoring
- Cost optimization
- Security hardening
- Team training`,
      category: "technical",
      tags: ["Cloud", "Migration", "Strategy"],
      status: "published"
    }
  ];

  for (const article of knowledgeArticleData) {
    const author = randomElement(authors);

    const articleData = {
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      status: article.status,
      authorId: author.id,
      isPublic: Math.random() < 0.8, // 80% public
      viewCount: Math.floor(Math.random() * 500)
    };

    const [newArticle] = await db.insert(knowledgeArticles).values(articleData).returning();
    console.log(`✅ Created article: ${newArticle.title}`);
  }
}

async function createMarketingCampaigns() {
  console.log("📢 Adding marketing campaigns with details...");

  const allUsers = await db.select().from(users);
  const marketingTeam = allUsers.filter(u => u.department === "Marketing" || u.role === "admin");

  const campaigns = [
    {
      name: "Q4 Digital Transformation Campaign",
      description: "Comprehensive campaign targeting enterprises looking to modernize their technology stack.",
      type: "email",
      status: "active",
      budget: "25000.00",
      spent: "18500.00",
      targetAudience: "C-level executives in technology and healthcare",
      channels: ["email", "linkedin", "content"],
      startDate: new Date("2024-10-01"),
      endDate: new Date("2024-12-31"),
      metrics: {
        impressions: 45000,
        clicks: 2250,
        conversions: 180,
        ctr: 5.0,
        conversionRate: 8.0,
        costPerLead: 102.78
      }
    },
    {
      name: "Social Media Brand Awareness",
      description: "Multi-platform social media campaign to increase brand visibility and engagement.",
      type: "social",
      status: "active",
      budget: "15000.00",
      spent: "12800.00",
      targetAudience: "Small to medium businesses and startups",
      channels: ["facebook", "twitter", "linkedin", "instagram"],
      startDate: new Date("2024-09-15"),
      endDate: new Date("2024-12-15"),
      metrics: {
        impressions: 125000,
        clicks: 6250,
        conversions: 95,
        ctr: 5.0,
        engagement: 3.2,
        followerGrowth: 15.5
      }
    },
    {
      name: "Google Ads - Custom Software Solutions",
      description: "Targeted Google Ads campaign for custom software development services.",
      type: "ppc",
      status: "active",
      budget: "20000.00",
      spent: "15600.00",
      targetAudience: "Businesses seeking custom software development",
      channels: ["google_ads", "bing_ads"],
      startDate: new Date("2024-08-01"),
      endDate: new Date("2024-11-30"),
      metrics: {
        impressions: 78000,
        clicks: 3900,
        conversions: 156,
        ctr: 5.0,
        cpc: 4.0,
        costPerAcquisition: 100.0
      }
    },
    {
      name: "Content Marketing - Tech Insights Blog",
      description: "Educational content series covering latest technology trends and best practices.",
      type: "content",
      status: "active",
      budget: "12000.00",
      spent: "8900.00",
      targetAudience: "Technical decision makers and developers",
      channels: ["blog", "email", "social"],
      startDate: new Date("2024-07-01"),
      endDate: new Date("2025-01-31"),
      metrics: {
        pageViews: 25000,
        uniqueVisitors: 18500,
        timeOnPage: 3.5,
        shareRate: 8.2,
        leadGeneration: 85
      }
    },
    {
      name: "Webinar Series - Industry Insights",
      description: "Monthly webinar series featuring industry experts and thought leadership.",
      type: "webinar",
      status: "completed",
      budget: "8000.00",
      spent: "7200.00",
      targetAudience: "Business leaders and technology professionals",
      channels: ["webinar", "email", "linkedin"],
      startDate: new Date("2024-06-01"),
      endDate: new Date("2024-09-30"),
      metrics: {
        registrations: 450,
        attendance: 285,
        attendanceRate: 63.3,
        leadQuality: 7.8,
        followUpMeetings: 35
      }
    },
    {
      name: "Partner Referral Program",
      description: "Incentive program for existing clients and partners to refer new business.",
      type: "referral",
      status: "active",
      budget: "10000.00",
      spent: "3500.00",
      targetAudience: "Existing clients and technology partners",
      channels: ["email", "direct"],
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-03-31"),
      metrics: {
        programParticipants: 28,
        referralsGenerated: 12,
        qualifiedLeads: 8,
        closedDeals: 3,
        revenueGenerated: 85000
      }
    }
  ];

  for (const campaign of campaigns) {
    const manager = randomElement(marketingTeam);

    const campaignData = {
      ...campaign,
      managerId: manager.id
    };

    const [newCampaign] = await db.insert(marketingCampaigns).values(campaignData).returning();
    console.log(`✅ Created campaign: ${newCampaign.name} (${newCampaign.status})`);
  }
}

async function createSupportTickets() {
  console.log("🎫 Developing support ticket system with realistic tickets...");

  const allUsers = await db.select().from(users);
  const allClients = await db.select().from(clients);
  const supportTeam = allUsers.filter(u => u.department === "Support" || u.role === "admin");

  const ticketCategories = ["technical", "billing", "general", "feature_request"];
  const priorities = ["low", "medium", "high", "urgent"];
  const statuses = ["open", "in_progress", "resolved", "closed"];

  const ticketTemplates = [
    {
      title: "Login authentication issues",
      description: "Users experiencing difficulty logging into the system with valid credentials.",
      category: "technical",
      priority: "high"
    },
    {
      title: "Invoice payment processing error",
      description: "Payment gateway returning error codes when processing client invoices.",
      category: "billing",
      priority: "urgent"
    },
    {
      title: "Dashboard loading performance",
      description: "Analytics dashboard taking excessive time to load with large datasets.",
      category: "technical",
      priority: "medium"
    },
    {
      title: "Request for custom reporting features",
      description: "Client requesting additional filtering and export options for reports.",
      category: "feature_request",
      priority: "low"
    },
    {
      title: "Email notification not working",
      description: "System email notifications not being delivered to user inboxes.",
      category: "technical",
      priority: "medium"
    },
    {
      title: "Billing discrepancy inquiry",
      description: "Client questioning charges on latest invoice for additional services.",
      category: "billing",
      priority: "medium"
    },
    {
      title: "Mobile app synchronization issue",
      description: "Data not syncing properly between mobile app and web platform.",
      category: "technical",
      priority: "high"
    },
    {
      title: "User training session request",
      description: "Client requesting additional training for new team members.",
      category: "general",
      priority: "low"
    },
    {
      title: "Database connection timeouts",
      description: "Intermittent database connection timeouts affecting application performance.",
      category: "technical",
      priority: "urgent"
    },
    {
      title: "API rate limit exceeded",
      description: "Third-party API integration hitting rate limits during peak usage.",
      category: "technical",
      priority: "high"
    },
    {
      title: "Account access permission changes",
      description: "Request to modify user permissions and access levels for team members.",
      category: "general",
      priority: "medium"
    },
    {
      title: "Data export functionality enhancement",
      description: "Request for additional data export formats and scheduling options.",
      category: "feature_request",
      priority: "low"
    },
    {
      title: "Security compliance documentation",
      description: "Client requesting updated security compliance certificates and documentation.",
      category: "general",
      priority: "medium"
    },
    {
      title: "Integration webhook failures",
      description: "Webhook endpoints failing to receive real-time data updates.",
      category: "technical",
      priority: "high"
    },
    {
      title: "Subscription renewal inquiry",
      description: "Client inquiry about upcoming subscription renewal and pricing options.",
      category: "billing",
      priority: "low"
    }
  ];

  for (let i = 0; i < 30; i++) {
    const template = randomElement(ticketTemplates);
    const client = randomElement(allClients);
    const assignedAgent = randomElement(supportTeam);

    const isResolved = Math.random() < 0.6; // 60% resolved
    const status = isResolved ? randomElement(["resolved", "closed"]) : randomElement(["open", "in_progress"]);

    const createdDate = randomDate(new Date("2024-01-01"), new Date());
    const resolvedDate = isResolved ? randomDate(createdDate, new Date()) : null;

    const ticket = {
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      status,
      clientId: client.id,
      assignedTo: assignedAgent.id,
      createdBy: assignedAgent.id, // Support agent created the ticket
      resolution: isResolved ? "Issue has been resolved. System is functioning normally. Please contact support if you experience any further issues." : null,
      satisfactionRating: isResolved && Math.random() < 0.8 ? Math.floor(Math.random() * 2) + 4 : null, // 4-5 rating
      resolvedAt: resolvedDate
    };

    // Use the storage system to create tickets with proper ticket numbers
    const { storage } = await import('../server/storage');
    const newTicket = await storage.createSupportTicket(ticket);
    console.log(`✅ Created ticket: ${newTicket.ticketNumber} - ${newTicket.title} (${newTicket.status})`);
  }
}

// Main execution function
async function main() {
  try {
    console.log("🚀 Creating remaining sample data components...\n");

    const projects = await createProjects();
    console.log("");

    const taskCount = await createTasks();
    console.log("");

    await createFinanceData();
    console.log("");

    await createKnowledgeBase();
    console.log("");

    await createMarketingCampaigns();
    console.log("");

    await createSupportTickets();
    console.log("");

    // Final summary
    const [finalUsers, finalClients, finalProjects, finalTasks, finalInvoices, finalExpenses, finalArticles, finalCampaigns, finalTickets] = await Promise.all([
      db.select().from(users),
      db.select().from(clients),
      db.select().from(projects),
      db.select().from(tasks),
      db.select().from(invoices),
      db.select().from(expenses),
      db.select().from(knowledgeArticles),
      db.select().from(marketingCampaigns),
      db.select().from(supportTickets)
    ]);

    console.log("🎉 COMPREHENSIVE SAMPLE DATA GENERATION COMPLETE!");
    console.log("=" * 60);
    console.log("📊 Final Data Summary:");
    console.log(`   👥 Team Members: ${finalUsers.length}`);
    console.log(`   🏢 Clients: ${finalClients.length}`);
    console.log(`   📋 Projects: ${finalProjects.length}`);
    console.log(`   ✅ Tasks: ${finalTasks.length}`);
    console.log(`   💰 Invoices: ${finalInvoices.length}`);
    console.log(`   💸 Expenses: ${finalExpenses.length}`);
    console.log(`   📚 Knowledge Articles: ${finalArticles.length}`);
    console.log(`   📢 Marketing Campaigns: ${finalCampaigns.length}`);
    console.log(`   🎫 Support Tickets: ${finalTickets.length}`);
    console.log("=" * 60);

    console.log("\n✅ All data relationships are properly connected:");
    console.log("   • Tasks are linked to projects and assigned to team members");
    console.log("   • Projects are linked to clients and managed by team members");
    console.log("   • Invoices are linked to clients and projects");
    console.log("   • Support tickets are assigned to support team members");
    console.log("   • Steven McGettigan has admin access to all sections");
    console.log("\n🎯 The system is ready for testing with realistic business data!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating comprehensive sample data:", error);
    process.exit(1);
  }
}

// Run the script
main();