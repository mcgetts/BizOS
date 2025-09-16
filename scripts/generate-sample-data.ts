#!/usr/bin/env tsx

import { db } from '../server/db';
import {
  clients, projects, tasks, invoices, expenses,
  knowledgeArticles, marketingCampaigns, users
} from '../shared/schema';
import { nanoid } from 'nanoid';

// Utility functions for random data
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomAmount = (min: number, max: number) =>
  (Math.random() * (max - min) + min).toFixed(2);

async function generateSampleData() {
  console.log('🚀 Generating comprehensive sample data...\n');

  // Get existing users for assignments
  const teamMembers = await db.select().from(users);
  console.log(`👥 Found ${teamMembers.length} team members for assignments`);

  // 1. Generate 5 Clients
  console.log('\n🤝 Creating 5 clients...');
  const clientStatuses = ['lead', 'qualified', 'client', 'inactive'] as const;
  const clientSources = ['referral', 'website', 'social', 'advertising', 'cold_outreach'] as const;
  const clientSizes = ['small', 'medium', 'large', 'enterprise'] as const;

  const sampleClients = [
    {
      id: nanoid(),
      name: 'Acme Corporation',
      email: 'contact@acme-corp.com',
      phone: '+1-555-0101',
      address: '123 Business Ave, Tech City, TC 12345',
      status: randomElement(clientStatuses),
      notes: 'Fortune 500 company looking for digital transformation',
      contactPerson: 'John Smith',
      website: 'https://acme-corp.com',
      industry: 'Manufacturing',
      size: randomElement(clientSizes),
      source: randomElement(clientSources),
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      nextFollowUpDate: randomDate(new Date(), new Date(2024, 11, 31)),
      totalValue: randomAmount(50000, 500000),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'TechStart Solutions',
      email: 'hello@techstart.io',
      phone: '+1-555-0102',
      address: '456 Innovation Blvd, Startup Valley, SV 67890',
      status: randomElement(clientStatuses),
      notes: 'Fast-growing startup needing scalable solutions',
      contactPerson: 'Sarah Johnson',
      website: 'https://techstart.io',
      industry: 'Technology',
      size: randomElement(clientSizes),
      source: randomElement(clientSources),
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      nextFollowUpDate: randomDate(new Date(), new Date(2024, 11, 31)),
      totalValue: randomAmount(25000, 200000),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Global Finance Group',
      email: 'partnerships@globalfinance.com',
      phone: '+1-555-0103',
      address: '789 Wall Street, Financial District, FD 13579',
      status: randomElement(clientStatuses),
      notes: 'International finance company requiring compliance solutions',
      contactPerson: 'Michael Chen',
      website: 'https://globalfinance.com',
      industry: 'Finance',
      size: randomElement(clientSizes),
      source: randomElement(clientSources),
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      nextFollowUpDate: randomDate(new Date(), new Date(2024, 11, 31)),
      totalValue: randomAmount(100000, 1000000),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Healthcare Plus',
      email: 'it@healthcareplus.org',
      phone: '+1-555-0104',
      address: '321 Medical Center Dr, Health City, HC 24680',
      status: randomElement(clientStatuses),
      notes: 'Healthcare provider modernizing patient management systems',
      contactPerson: 'Dr. Emily Rodriguez',
      website: 'https://healthcareplus.org',
      industry: 'Healthcare',
      size: randomElement(clientSizes),
      source: randomElement(clientSources),
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      nextFollowUpDate: randomDate(new Date(), new Date(2024, 11, 31)),
      totalValue: randomAmount(75000, 400000),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'EduTech Institute',
      email: 'admin@edutech-inst.edu',
      phone: '+1-555-0105',
      address: '654 University Ave, Education City, EC 97531',
      status: randomElement(clientStatuses),
      notes: 'Educational institution developing online learning platform',
      contactPerson: 'Prof. David Wilson',
      website: 'https://edutech-inst.edu',
      industry: 'Education',
      size: randomElement(clientSizes),
      source: randomElement(clientSources),
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      nextFollowUpDate: randomDate(new Date(), new Date(2024, 11, 31)),
      totalValue: randomAmount(30000, 150000),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    }
  ];

  for (const client of sampleClients) {
    await db.insert(clients).values(client);
    console.log(`✅ Created client: ${client.name} (${client.status})`);
  }

  // 2. Generate 10 Projects
  console.log('\n📁 Creating 10 projects...');
  const projectStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;
  const projectPriorities = ['low', 'medium', 'high', 'urgent'] as const;

  const projectTemplates = [
    'Website Redesign', 'Mobile App Development', 'Database Migration', 'API Integration',
    'E-commerce Platform', 'Data Analytics Dashboard', 'CRM Implementation',
    'Security Audit', 'Cloud Migration', 'Marketing Automation'
  ];

  const sampleProjects = [];
  for (let i = 0; i < 10; i++) {
    const client = randomElement(sampleClients);
    const project = {
      id: nanoid(),
      name: `${randomElement(projectTemplates)} - ${client.name}`,
      description: `Comprehensive ${randomElement(projectTemplates).toLowerCase()} project for ${client.name} to enhance their business operations and digital presence.`,
      clientId: client.id,
      status: randomElement(projectStatuses),
      priority: randomElement(projectPriorities),
      budget: randomAmount(10000, 200000),
      spent: randomAmount(1000, 50000),
      startDate: randomDate(new Date(2024, 0, 1), new Date()),
      endDate: randomDate(new Date(), new Date(2024, 11, 31)),
      progress: Math.floor(Math.random() * 101),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    };
    sampleProjects.push(project);
  }

  for (const project of sampleProjects) {
    await db.insert(projects).values(project);
    console.log(`✅ Created project: ${project.name} (${project.status})`);
  }

  // 3. Generate 20 Tasks
  console.log('\n✅ Creating 20 tasks...');
  const taskStatuses = ['todo', 'in_progress', 'review', 'completed', 'blocked'] as const;
  const taskPriorities = ['low', 'medium', 'high', 'urgent'] as const;

  const taskTemplates = [
    'Setup development environment', 'Design user interface mockups', 'Implement authentication system',
    'Database schema design', 'API endpoint development', 'Frontend component creation',
    'Unit test implementation', 'Integration testing', 'Performance optimization',
    'Security vulnerability assessment', 'Documentation writing', 'Code review',
    'Deployment configuration', 'Bug fixes', 'Feature implementation',
    'User acceptance testing', 'Data migration', 'Third-party integration',
    'Mobile responsive design', 'SEO optimization'
  ];

  for (let i = 0; i < 20; i++) {
    const project = randomElement(sampleProjects);
    const assignee = randomElement(teamMembers);
    const task = {
      id: nanoid(),
      title: randomElement(taskTemplates),
      description: `Detailed task for ${project.name} requiring technical expertise and attention to detail.`,
      projectId: project.id,
      assigneeId: assignee.id,
      status: randomElement(taskStatuses),
      priority: randomElement(taskPriorities),
      estimatedHours: randomAmount(4, 40),
      actualHours: randomAmount(0, 35),
      dueDate: randomDate(new Date(), new Date(2024, 11, 31)),
      completedDate: Math.random() > 0.6 ? randomDate(new Date(2024, 0, 1), new Date()) : null,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    };

    await db.insert(tasks).values(task);
    console.log(`✅ Created task: ${task.title} (${task.status}) → ${assignee.firstName}`);
  }

  // 4. Generate 5 Knowledge Articles
  console.log('\n📚 Creating 5 knowledge articles...');
  const articleStatuses = ['draft', 'published', 'archived'] as const;
  const categories = ['technical', 'business', 'process', 'troubleshooting', 'best_practices'] as const;

  const knowledgeData = [
    {
      title: 'API Integration Best Practices',
      content: 'Comprehensive guide on implementing secure and efficient API integrations...',
      category: 'technical' as const
    },
    {
      title: 'Client Onboarding Process',
      content: 'Step-by-step process for onboarding new clients effectively...',
      category: 'business' as const
    },
    {
      title: 'Troubleshooting Common Database Issues',
      content: 'Solutions for the most frequent database problems encountered...',
      category: 'troubleshooting' as const
    },
    {
      title: 'Project Management Methodology',
      content: 'Our proven approach to managing software development projects...',
      category: 'process' as const
    },
    {
      title: 'Code Review Guidelines',
      content: 'Standards and best practices for conducting effective code reviews...',
      category: 'best_practices' as const
    }
  ];

  for (const article of knowledgeData) {
    const author = randomElement(teamMembers);
    await db.insert(knowledgeArticles).values({
      id: nanoid(),
      title: article.title,
      content: article.content,
      category: article.category,
      status: randomElement(articleStatuses),
      authorId: author.id,
      tags: ['development', 'guide', 'best-practices'],
      views: Math.floor(Math.random() * 500),
      lastUpdated: randomDate(new Date(2024, 0, 1), new Date()),
      createdAt: randomDate(new Date(2024, 0, 1), new Date())
    });
    console.log(`✅ Created article: ${article.title} (${randomElement(articleStatuses)})`);
  }

  // 5. Generate 5 Invoices
  console.log('\n🧾 Creating 5 invoices...');
  const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;

  for (let i = 0; i < 5; i++) {
    const client = randomElement(sampleClients);
    const project = sampleProjects.find(p => p.clientId === client.id) || randomElement(sampleProjects);
    const amount = randomAmount(5000, 50000);
    const tax = (parseFloat(amount) * 0.1).toFixed(2);
    const total = (parseFloat(amount) + parseFloat(tax)).toFixed(2);

    await db.insert(invoices).values({
      id: nanoid(),
      invoiceNumber: `INV-2024-${String(i + 1).padStart(4, '0')}`,
      clientId: client.id,
      projectId: project.id,
      amount,
      tax,
      total,
      status: randomElement(invoiceStatuses),
      dueDate: randomDate(new Date(), new Date(2024, 11, 31)),
      description: `Professional services for ${project.name}`,
      lineItems: [
        {
          description: 'Development services',
          quantity: Math.floor(Math.random() * 100) + 1,
          rate: randomAmount(100, 300),
          amount
        }
      ],
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    });
    console.log(`✅ Created invoice: INV-2024-${String(i + 1).padStart(4, '0')} ($${total})`);
  }

  // 6. Generate 5 Expenses
  console.log('\n💰 Creating 5 expenses...');
  const expenseCategories = ['office_supplies', 'travel', 'software', 'marketing', 'training'] as const;
  const expenseStatuses = ['pending', 'approved', 'rejected', 'reimbursed'] as const;

  const expenseDescriptions = [
    'Office supplies for Q4', 'Business travel to client site', 'Software license renewal',
    'Marketing campaign materials', 'Professional development training'
  ];

  for (let i = 0; i < 5; i++) {
    const project = randomElement(sampleProjects);
    const user = randomElement(teamMembers);

    await db.insert(expenses).values({
      id: nanoid(),
      description: expenseDescriptions[i],
      amount: randomAmount(100, 2500),
      category: expenseCategories[i],
      projectId: project.id,
      userId: user.id,
      receiptUrl: `https://example.com/receipts/receipt-${i + 1}.pdf`,
      billable: Math.random() > 0.5,
      reimbursed: Math.random() > 0.7,
      status: randomElement(expenseStatuses),
      date: randomDate(new Date(2024, 0, 1), new Date()),
      createdAt: randomDate(new Date(2024, 0, 1), new Date())
    });
    console.log(`✅ Created expense: ${expenseDescriptions[i]} (${randomElement(expenseStatuses)})`);
  }

  // 7. Generate 5 Marketing Campaigns
  console.log('\n📢 Creating 5 marketing campaigns...');
  const campaignStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;
  const campaignTypes = ['email', 'social', 'ppc', 'content', 'webinar'] as const;

  const campaignData = [
    { name: 'Q4 Lead Generation Campaign', type: 'email' as const },
    { name: 'Social Media Brand Awareness', type: 'social' as const },
    { name: 'Google Ads - Tech Solutions', type: 'ppc' as const },
    { name: 'Content Marketing - Blog Series', type: 'content' as const },
    { name: 'Webinar - Industry Insights', type: 'webinar' as const }
  ];

  for (let i = 0; i < 5; i++) {
    const campaign = campaignData[i];
    const manager = randomElement(teamMembers);

    await db.insert(marketingCampaigns).values({
      id: nanoid(),
      name: campaign.name,
      description: `Strategic marketing campaign to drive business growth and brand awareness.`,
      type: campaign.type,
      status: randomElement(campaignStatuses),
      budget: randomAmount(5000, 25000),
      spent: randomAmount(1000, 15000),
      startDate: randomDate(new Date(2024, 0, 1), new Date()),
      endDate: randomDate(new Date(), new Date(2024, 11, 31)),
      targetAudience: 'Business decision makers in technology sector',
      managerId: manager.id,
      metrics: {
        impressions: Math.floor(Math.random() * 100000),
        clicks: Math.floor(Math.random() * 5000),
        conversions: Math.floor(Math.random() * 500),
        ctr: parseFloat(randomAmount(1, 5)),
        cpc: parseFloat(randomAmount(0.5, 3))
      },
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    });
    console.log(`✅ Created campaign: ${campaign.name} (${randomElement(campaignStatuses)})`);
  }

  console.log('\n📊 Sample data generation complete!');

  // Generate summary
  const [finalClients, finalProjects, finalTasks, finalInvoices, finalExpenses, finalArticles, finalCampaigns] = await Promise.all([
    db.select().from(clients),
    db.select().from(projects),
    db.select().from(tasks),
    db.select().from(invoices),
    db.select().from(expenses),
    db.select().from(knowledgeArticles),
    db.select().from(marketingCampaigns)
  ]);

  console.log('\n📈 Final Data Summary:');
  console.log(`   🤝 Clients: ${finalClients.length}`);
  console.log(`   📁 Projects: ${finalProjects.length}`);
  console.log(`   ✅ Tasks: ${finalTasks.length}`);
  console.log(`   🧾 Invoices: ${finalInvoices.length}`);
  console.log(`   💰 Expenses: ${finalExpenses.length}`);
  console.log(`   📚 Knowledge Articles: ${finalArticles.length}`);
  console.log(`   📢 Marketing Campaigns: ${finalCampaigns.length}`);
  console.log(`   👥 Team Members: ${teamMembers.length}`);
}

// Run the script
generateSampleData()
  .then(() => {
    console.log('\n🎉 All sample data created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error creating sample data:', error);
    process.exit(1);
  });