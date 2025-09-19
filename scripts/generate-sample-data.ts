#!/usr/bin/env tsx

import { db } from '../server/db';
import {
  clients, companies, salesOpportunities, projects, tasks, invoices, expenses,
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

  // 1. Generate 8 Companies first (these will be associated with clients and opportunities)
  console.log('\n🏢 Creating 8 companies...');
  const companySizes = ['small', 'medium', 'large', 'enterprise'] as const;
  const industries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Education', 'Retail', 'Consulting', 'Media'] as const;

  const sampleCompanies = [
    {
      id: nanoid(),
      name: 'Acme Corporation',
      industry: 'Manufacturing',
      website: 'https://acme-corp.com',
      address: '123 Business Ave, Tech City, TC 12345',
      phone: '+1-555-0101',
      email: 'contact@acme-corp.com',
      description: 'Fortune 500 manufacturing company specializing in industrial equipment',
      size: 'enterprise' as const,
      revenue: '500000000.00',
      foundedYear: 1985,
      linkedinUrl: 'https://linkedin.com/company/acme-corp',
      tags: ['manufacturing', 'enterprise', 'b2b'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'TechStart Solutions',
      industry: 'Technology',
      website: 'https://techstart.io',
      address: '456 Innovation Blvd, Startup Valley, SV 67890',
      phone: '+1-555-0102',
      email: 'hello@techstart.io',
      description: 'Fast-growing startup developing cutting-edge software solutions',
      size: 'medium' as const,
      revenue: '15000000.00',
      foundedYear: 2019,
      linkedinUrl: 'https://linkedin.com/company/techstart',
      tags: ['technology', 'startup', 'saas'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Global Finance Group',
      industry: 'Finance',
      website: 'https://globalfinance.com',
      address: '789 Wall Street, Financial District, FD 13579',
      phone: '+1-555-0103',
      email: 'partnerships@globalfinance.com',
      description: 'International financial services company providing investment solutions',
      size: 'large' as const,
      revenue: '250000000.00',
      foundedYear: 1995,
      linkedinUrl: 'https://linkedin.com/company/globalfinance',
      tags: ['finance', 'investment', 'international'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Healthcare Plus',
      industry: 'Healthcare',
      website: 'https://healthcareplus.org',
      address: '321 Medical Center Dr, Health City, HC 24680',
      phone: '+1-555-0104',
      email: 'it@healthcareplus.org',
      description: 'Leading healthcare provider focused on patient-centered care',
      size: 'large' as const,
      revenue: '180000000.00',
      foundedYear: 1988,
      linkedinUrl: 'https://linkedin.com/company/healthcareplus',
      tags: ['healthcare', 'medical', 'patient-care'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'EduTech Institute',
      industry: 'Education',
      website: 'https://edutech-inst.edu',
      address: '654 University Ave, Education City, EC 97531',
      phone: '+1-555-0105',
      email: 'admin@edutech-inst.edu',
      description: 'Progressive educational institution pioneering online learning',
      size: 'medium' as const,
      revenue: '25000000.00',
      foundedYear: 2010,
      linkedinUrl: 'https://linkedin.com/company/edutech-inst',
      tags: ['education', 'e-learning', 'innovation'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'RetailMax Solutions',
      industry: 'Retail',
      website: 'https://retailmax.com',
      address: '987 Commerce St, Shopping District, SD 11111',
      phone: '+1-555-0106',
      email: 'business@retailmax.com',
      description: 'Omnichannel retail technology solutions provider',
      size: 'medium' as const,
      revenue: '45000000.00',
      foundedYear: 2015,
      linkedinUrl: 'https://linkedin.com/company/retailmax',
      tags: ['retail', 'omnichannel', 'technology'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Strategic Consulting Partners',
      industry: 'Consulting',
      website: 'https://stratconsulting.com',
      address: '555 Executive Plaza, Business Hub, BH 22222',
      phone: '+1-555-0107',
      email: 'info@stratconsulting.com',
      description: 'Management consulting firm specializing in digital transformation',
      size: 'small' as const,
      revenue: '8000000.00',
      foundedYear: 2020,
      linkedinUrl: 'https://linkedin.com/company/stratconsulting',
      tags: ['consulting', 'digital-transformation', 'strategy'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'MediaFlow Creative',
      industry: 'Media',
      website: 'https://mediaflow.com',
      address: '777 Creative Ave, Arts District, AD 33333',
      phone: '+1-555-0108',
      email: 'hello@mediaflow.com',
      description: 'Digital media agency creating compelling brand experiences',
      size: 'small' as const,
      revenue: '5000000.00',
      foundedYear: 2018,
      linkedinUrl: 'https://linkedin.com/company/mediaflow',
      tags: ['media', 'creative', 'branding'],
      assignedTo: randomElement(teamMembers).id,
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    }
  ];

  for (const company of sampleCompanies) {
    await db.insert(companies).values(company);
    console.log(`✅ Created company: ${company.name} (${company.industry})`);
  }

  // 2. Generate 5 Clients (now with company associations)
  console.log('\n🤝 Creating 5 clients...');
  const clientStatuses = ['lead', 'qualified', 'client', 'inactive'] as const;
  const clientSources = ['referral', 'website', 'social', 'advertising', 'cold_outreach'] as const;
  const clientSizes = ['small', 'medium', 'large', 'enterprise'] as const;

  const sampleClients = [
    {
      id: nanoid(),
      name: 'John Smith',
      email: 'john.smith@acme-corp.com',
      phone: '+1-555-0101',
      companyId: sampleCompanies[0].id, // Acme Corporation
      position: 'CTO',
      department: 'Technology',
      isPrimaryContact: true,
      source: randomElement(clientSources),
      assignedTo: randomElement(teamMembers).id,
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      notes: 'Technical decision maker for digital transformation initiatives',
      tags: ['decision-maker', 'technology'],
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techstart.io',
      phone: '+1-555-0102',
      companyId: sampleCompanies[1].id, // TechStart Solutions
      position: 'CEO',
      department: 'Executive',
      isPrimaryContact: true,
      source: randomElement(clientSources),
      assignedTo: randomElement(teamMembers).id,
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      notes: 'Startup founder looking for scalable technology solutions',
      tags: ['startup', 'ceo'],
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Michael Chen',
      email: 'michael.chen@globalfinance.com',
      phone: '+1-555-0103',
      companyId: sampleCompanies[2].id, // Global Finance Group
      position: 'VP of Technology',
      department: 'Technology',
      isPrimaryContact: true,
      source: randomElement(clientSources),
      assignedTo: randomElement(teamMembers).id,
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      notes: 'Leading technology initiatives for compliance and risk management',
      tags: ['finance', 'technology', 'vp'],
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@healthcareplus.org',
      phone: '+1-555-0104',
      companyId: sampleCompanies[3].id, // Healthcare Plus
      position: 'Chief Information Officer',
      department: 'Information Technology',
      isPrimaryContact: true,
      source: randomElement(clientSources),
      assignedTo: randomElement(teamMembers).id,
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      notes: 'Overseeing digital transformation in healthcare systems',
      tags: ['healthcare', 'cio', 'digital-transformation'],
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    },
    {
      id: nanoid(),
      name: 'David Wilson',
      email: 'david.wilson@edutech-inst.edu',
      phone: '+1-555-0105',
      companyId: sampleCompanies[4].id, // EduTech Institute
      position: 'Director of Technology',
      department: 'Technology',
      isPrimaryContact: true,
      source: randomElement(clientSources),
      assignedTo: randomElement(teamMembers).id,
      lastContactDate: randomDate(new Date(2024, 0, 1), new Date()),
      notes: 'Leading online learning platform development initiatives',
      tags: ['education', 'technology', 'director'],
      isActive: true,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    }
  ];

  for (const client of sampleClients) {
    await db.insert(clients).values(client);
    console.log(`✅ Created client: ${client.name} (${client.source})`);
  }

  // 3. Generate 12 Sales Opportunities (now with proper company associations)
  console.log('\n💼 Creating 12 sales opportunities...');
  const opportunityStages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
  const opportunityPriorities = ['low', 'medium', 'high'] as const;
  const opportunitySources = ['referral', 'website', 'marketing', 'cold_outreach', 'social_media', 'trade_show'] as const;

  const opportunityTemplates = [
    { title: 'Website Redesign Project', description: 'Complete website overhaul with modern design and enhanced functionality' },
    { title: 'ERP System Implementation', description: 'Enterprise resource planning system setup and integration' },
    { title: 'Cloud Migration Services', description: 'Migration of on-premise infrastructure to cloud platforms' },
    { title: 'Mobile App Development', description: 'Custom mobile application for iOS and Android platforms' },
    { title: 'Data Analytics Dashboard', description: 'Business intelligence dashboard for data-driven insights' },
    { title: 'CRM Integration Project', description: 'Customer relationship management system implementation' },
    { title: 'E-commerce Platform', description: 'Online retail platform with payment and inventory management' },
    { title: 'Security Audit & Compliance', description: 'Comprehensive security assessment and compliance certification' },
    { title: 'Digital Marketing Automation', description: 'Automated marketing campaigns and lead nurturing system' },
    { title: 'API Development & Integration', description: 'Custom API development and third-party integrations' },
    { title: 'Business Process Automation', description: 'Workflow automation to streamline business operations' },
    { title: 'Learning Management System', description: 'Educational platform for training and development programs' }
  ];

  const sampleOpportunities = [];
  for (let i = 0; i < 12; i++) {
    const template = opportunityTemplates[i];
    const company = randomElement(sampleCompanies);
    const contact = sampleClients.find(c => c.companyId === company.id) || randomElement(sampleClients);
    const assignedUser = randomElement(teamMembers);

    const opportunity = {
      id: nanoid(),
      title: template.title,
      description: template.description,
      companyId: company.id,
      contactId: contact.id,
      assignedTo: assignedUser.id,
      stage: randomElement(opportunityStages),
      value: randomAmount(10000, 500000),
      probability: Math.floor(Math.random() * 101), // 0-100
      expectedCloseDate: randomDate(new Date(), new Date(2024, 11, 31)),
      actualCloseDate: Math.random() > 0.8 ? randomDate(new Date(2024, 0, 1), new Date()) : null,
      source: randomElement(opportunitySources),
      priority: randomElement(opportunityPriorities),
      tags: [
        randomElement(['enterprise', 'startup', 'mid-market']),
        randomElement(['software', 'consulting', 'integration']),
        randomElement(['urgent', 'strategic', 'standard'])
      ],
      notes: `Opportunity for ${company.name} - ${template.description}. Primary contact: ${contact.name}`,
      lastActivityDate: randomDate(new Date(2024, 0, 1), new Date()),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date()
    };

    sampleOpportunities.push(opportunity);
  }

  for (const opportunity of sampleOpportunities) {
    await db.insert(salesOpportunities).values(opportunity);
    console.log(`✅ Created opportunity: ${opportunity.title} (${opportunity.stage}) - $${opportunity.value}`);
  }

  // 4. Generate 10 Projects
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

  // 5. Generate 20 Tasks
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

  // 6. Generate 5 Knowledge Articles
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

  // 7. Generate 15 Invoices (more for better revenue trends)
  console.log('\n🧾 Creating 15 invoices...');
  const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
  // Ensure most invoices are paid for better revenue trends
  const paidWeightedStatuses = ['paid', 'paid', 'paid', 'paid', 'sent', 'draft', 'overdue'];

  for (let i = 0; i < 15; i++) {
    const client = randomElement(sampleClients);
    const project = sampleProjects.find(p => p.clientId === client.id) || randomElement(sampleProjects);
    const amount = randomAmount(5000, 50000);
    const tax = (parseFloat(amount) * 0.1).toFixed(2);
    const total = (parseFloat(amount) + parseFloat(tax)).toFixed(2);
    const status = randomElement(paidWeightedStatuses);
    const createdDate = randomDate(new Date(2024, 0, 1), new Date());

    // For paid invoices, set paidAt date within 1-30 days after creation, spread across recent months
    let paidAt = null;
    if (status === 'paid') {
      // Create paid dates spread across the last 6 months for better revenue trends
      const monthsAgo = Math.floor(Math.random() * 6); // 0-5 months ago
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - monthsAgo);
      const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      paidAt = randomDate(startOfMonth, endOfMonth);
    }

    await db.insert(invoices).values({
      id: nanoid(),
      invoiceNumber: `INV-2024-${String(Date.now() + i).slice(-6)}`,
      clientId: client.id,
      projectId: project.id,
      amount,
      tax,
      total,
      status,
      dueDate: randomDate(new Date(), new Date(2024, 11, 31)),
      paidAt,
      description: `Professional services for ${project.name}`,
      lineItems: [
        {
          description: 'Development services',
          quantity: Math.floor(Math.random() * 100) + 1,
          rate: randomAmount(100, 300),
          amount
        }
      ],
      createdAt: createdDate,
      updatedAt: new Date()
    });
    console.log(`✅ Created invoice: INV-2024-${String(i + 1).padStart(4, '0')} ($${total}) - ${status}${paidAt ? ` (paid: ${paidAt.toLocaleDateString()})` : ''}`);
  }

  // 8. Generate 5 Expenses
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

  // 9. Generate 5 Marketing Campaigns
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
  const [finalCompanies, finalClients, finalOpportunities, finalProjects, finalTasks, finalInvoices, finalExpenses, finalArticles, finalCampaigns] = await Promise.all([
    db.select().from(companies),
    db.select().from(clients),
    db.select().from(salesOpportunities),
    db.select().from(projects),
    db.select().from(tasks),
    db.select().from(invoices),
    db.select().from(expenses),
    db.select().from(knowledgeArticles),
    db.select().from(marketingCampaigns)
  ]);

  console.log('\n📈 Final Data Summary:');
  console.log(`   🏢 Companies: ${finalCompanies.length}`);
  console.log(`   🤝 Clients: ${finalClients.length}`);
  console.log(`   💼 Sales Opportunities: ${finalOpportunities.length}`);
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