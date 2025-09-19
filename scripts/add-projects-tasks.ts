import { db } from '../server/db';
import {
  projects,
  tasks,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  timeEntries,
  users
} from '../shared/schema';

async function addProjectsAndTasks() {
  console.log('📚 Adding projects, tasks, and other sample data...');

  // Clean up existing project-related data first
  console.log('🧹 Cleaning up existing project data...');
  await db.delete(timeEntries);
  await db.delete(expenses);
  await db.delete(tasks);
  await db.delete(invoices);
  await db.delete(supportTickets);
  await db.delete(knowledgeArticles);
  await db.delete(marketingCampaigns);
  await db.delete(projects);

  // Get existing users to assign work to
  const existingUsers = await db.select().from(users).limit(4);
  const userIds = existingUsers.map(u => u.id);

  // Create projects linked to companies/clients
  const sampleProjects = await db.insert(projects).values([
    {
      id: 'proj-101',
      name: 'TechCorp Cloud Migration',
      description: 'Complete migration of TechCorp legacy systems to AWS cloud infrastructure',
      companyId: 'comp-1',
      clientId: 'client-1',
      managerId: userIds[0] || null,
      status: 'active',
      priority: 'high',
      budget: '150000.00',
      actualCost: '45000.00',
      progress: 35,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-15'),
      tags: ['cloud', 'aws', 'migration'],
      isClientPortalEnabled: true
    },
    {
      id: 'proj-102',
      name: 'Urban Retail E-commerce Platform',
      description: 'Development of new e-commerce platform for Urban Retail Group',
      companyId: 'comp-3',
      clientId: 'client-3',
      managerId: userIds[1] || null,
      status: 'planning',
      priority: 'high',
      budget: '250000.00',
      actualCost: '15000.00',
      progress: 8,
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-03-30'),
      tags: ['ecommerce', 'web', 'retail'],
      isClientPortalEnabled: true
    },
    {
      id: 'proj-103',
      name: 'Green Energy Solar Installation',
      description: 'Solar panel installation and monitoring system setup',
      companyId: 'comp-2',
      clientId: 'client-2',
      managerId: userIds[2] || null,
      status: 'review',
      priority: 'medium',
      budget: '75000.00',
      actualCost: '65000.00',
      progress: 85,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-09-30'),
      tags: ['solar', 'renewable', 'hardware'],
      isClientPortalEnabled: false
    },
    {
      id: 'proj-104',
      name: 'HealthFirst Patient Management System',
      description: 'Implementation of comprehensive patient management and scheduling system',
      companyId: 'comp-4',
      clientId: 'client-4',
      managerId: userIds[3] || null,
      status: 'planning',
      priority: 'medium',
      budget: '45000.00',
      actualCost: '5000.00',
      progress: 10,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-02-28'),
      tags: ['healthcare', 'scheduling', 'hipaa'],
      isClientPortalEnabled: true
    }
  ]).returning();

  // Create tasks for these projects
  await db.insert(tasks).values([
    // TechCorp Cloud Migration tasks
    {
      id: 'task-101',
      title: 'Infrastructure Assessment',
      description: 'Complete assessment of current infrastructure and dependencies',
      projectId: 'proj-101',
      assigneeId: userIds[0] || null,
      status: 'completed',
      priority: 'high',
      estimatedHours: '40.00',
      actualHours: '35.00',
      dueDate: new Date('2024-08-15'),
      completedAt: new Date('2024-08-14'),
      tags: ['assessment', 'infrastructure']
    },
    {
      id: 'task-102',
      title: 'AWS Environment Setup',
      description: 'Set up AWS VPC, security groups, and basic infrastructure',
      projectId: 'proj-101',
      assigneeId: userIds[1] || null,
      status: 'completed',
      priority: 'high',
      estimatedHours: '60.00',
      actualHours: '55.00',
      dueDate: new Date('2024-09-01'),
      completedAt: new Date('2024-08-30'),
      tags: ['aws', 'setup', 'infrastructure']
    },
    {
      id: 'task-103',
      title: 'Database Migration',
      description: 'Migrate existing databases to AWS RDS with minimal downtime',
      projectId: 'proj-101',
      assigneeId: userIds[2] || null,
      status: 'in_progress',
      priority: 'high',
      estimatedHours: '80.00',
      actualHours: '45.00',
      dueDate: new Date('2024-09-25'),
      tags: ['database', 'migration', 'rds']
    },
    {
      id: 'task-104',
      title: 'Application Deployment',
      description: 'Deploy and configure applications on new cloud infrastructure',
      projectId: 'proj-101',
      assigneeId: userIds[3] || null,
      status: 'todo',
      priority: 'medium',
      estimatedHours: '120.00',
      actualHours: '0.00',
      dueDate: new Date('2024-10-15'),
      tags: ['deployment', 'applications']
    },
    // Urban Retail E-commerce tasks
    {
      id: 'task-105',
      title: 'Requirements Analysis',
      description: 'Gather detailed requirements for e-commerce platform features',
      projectId: 'proj-102',
      assigneeId: userIds[0] || null,
      status: 'in_progress',
      priority: 'high',
      estimatedHours: '30.00',
      actualHours: '20.00',
      dueDate: new Date('2024-09-30'),
      tags: ['requirements', 'analysis']
    },
    {
      id: 'task-106',
      title: 'UI/UX Design',
      description: 'Create modern, responsive design for e-commerce platform',
      projectId: 'proj-102',
      assigneeId: userIds[1] || null,
      status: 'todo',
      priority: 'medium',
      estimatedHours: '100.00',
      actualHours: '0.00',
      dueDate: new Date('2024-10-20'),
      tags: ['design', 'ui', 'ux']
    },
    // Green Energy Solar tasks
    {
      id: 'task-107',
      title: 'Site Survey',
      description: 'Complete detailed site survey and structural assessment',
      projectId: 'proj-103',
      assigneeId: userIds[2] || null,
      status: 'completed',
      priority: 'high',
      estimatedHours: '20.00',
      actualHours: '18.00',
      dueDate: new Date('2024-06-15'),
      completedAt: new Date('2024-06-12'),
      tags: ['survey', 'site', 'assessment']
    },
    {
      id: 'task-108',
      title: 'Panel Installation',
      description: 'Install solar panels and mounting hardware',
      projectId: 'proj-103',
      assigneeId: userIds[3] || null,
      status: 'completed',
      priority: 'high',
      estimatedHours: '200.00',
      actualHours: '185.00',
      dueDate: new Date('2024-08-30'),
      completedAt: new Date('2024-08-25'),
      tags: ['installation', 'hardware']
    },
    {
      id: 'task-109',
      title: 'System Testing',
      description: 'Test solar panel system and monitoring software',
      projectId: 'proj-103',
      assigneeId: userIds[0] || null,
      status: 'in_progress',
      priority: 'medium',
      estimatedHours: '40.00',
      actualHours: '25.00',
      dueDate: new Date('2024-09-25'),
      tags: ['testing', 'monitoring']
    }
  ]);

  // Create invoices for completed work
  await db.insert(invoices).values([
    {
      id: 'inv-101',
      invoiceNumber: 'INV-2024-101',
      clientId: 'client-1',
      projectId: 'proj-101',
      amount: '45000.00',
      tax: '4050.00',
      total: '49050.00',
      status: 'paid',
      issueDate: new Date('2024-09-01'),
      dueDate: new Date('2024-09-30'),
      paidDate: new Date('2024-09-15'),
      description: 'Cloud migration - Phase 1 completion'
    },
    {
      id: 'inv-102',
      invoiceNumber: 'INV-2024-102',
      clientId: 'client-2',
      projectId: 'proj-103',
      amount: '50000.00',
      tax: '4500.00',
      total: '54500.00',
      status: 'sent',
      issueDate: new Date('2024-08-25'),
      dueDate: new Date('2024-09-25'),
      description: 'Solar installation - Hardware and labor'
    },
    {
      id: 'inv-103',
      invoiceNumber: 'INV-2024-103',
      clientId: 'client-5',
      projectId: null,
      amount: '85000.00',
      tax: '7650.00',
      total: '92650.00',
      status: 'paid',
      issueDate: new Date('2024-08-12'),
      dueDate: new Date('2024-09-12'),
      paidDate: new Date('2024-09-01'),
      description: 'Wealth Management Platform - Complete implementation'
    }
  ]);

  // Create expenses
  await db.insert(expenses).values([
    {
      id: 'exp-101',
      description: 'AWS infrastructure costs for cloud migration',
      amount: '2500.00',
      category: 'software',
      projectId: 'proj-101',
      userId: userIds[0] || null,
      billable: true,
      reimbursed: false,
      date: new Date('2024-08-15')
    },
    {
      id: 'exp-102',
      description: 'Travel to client site for solar installation',
      amount: '450.00',
      category: 'travel',
      projectId: 'proj-103',
      userId: userIds[2] || null,
      billable: true,
      reimbursed: true,
      date: new Date('2024-06-10')
    },
    {
      id: 'exp-103',
      description: 'Design software licenses for e-commerce project',
      amount: '800.00',
      category: 'software',
      projectId: 'proj-102',
      userId: userIds[1] || null,
      billable: true,
      reimbursed: false,
      date: new Date('2024-09-05')
    }
  ]);

  // Create time entries
  await db.insert(timeEntries).values([
    {
      id: 'time-101',
      userId: userIds[0] || 'default-user',
      projectId: 'proj-101',
      taskId: 'task-101',
      date: new Date('2024-08-10'),
      hours: '8.00',
      description: 'Infrastructure assessment and documentation',
      billable: true,
      invoiced: true
    },
    {
      id: 'time-102',
      userId: userIds[1] || 'default-user',
      projectId: 'proj-101',
      taskId: 'task-102',
      date: new Date('2024-08-28'),
      hours: '7.50',
      description: 'AWS VPC configuration and security setup',
      billable: true,
      invoiced: true
    },
    {
      id: 'time-103',
      userId: userIds[2] || 'default-user',
      projectId: 'proj-103',
      taskId: 'task-107',
      date: new Date('2024-06-12'),
      hours: '8.00',
      description: 'Complete site survey and measurements',
      billable: true,
      invoiced: false
    }
  ]);

  // Create support tickets
  await db.insert(supportTickets).values([
    {
      id: 'ticket-101',
      ticketNumber: 'TKT-2024-101',
      title: 'Login Issues with New System',
      description: 'Users unable to log into the new cloud system after migration',
      clientId: 'client-1',
      status: 'resolved',
      priority: 'high',
      category: 'technical',
      assigneeId: userIds[0] || null,
      resolution: 'Updated SSO configuration and user credentials',
      resolvedAt: new Date('2024-09-12'),
      rating: 5,
      feedback: 'Quick resolution, very satisfied with support'
    },
    {
      id: 'ticket-102',
      ticketNumber: 'TKT-2024-102',
      title: 'Solar Panel Monitoring Alert',
      description: 'Monitoring system showing decreased efficiency on panel array B',
      clientId: 'client-2',
      status: 'open',
      priority: 'medium',
      category: 'technical',
      assigneeId: userIds[2] || null
    },
    {
      id: 'ticket-103',
      ticketNumber: 'TKT-2024-103',
      title: 'Training Request',
      description: 'Request for additional training on wealth management platform features',
      clientId: 'client-5',
      status: 'in_progress',
      priority: 'low',
      category: 'training',
      assigneeId: userIds[3] || null
    }
  ]);

  // Create knowledge articles
  await db.insert(knowledgeArticles).values([
    {
      id: 'kb-101',
      title: 'Cloud Migration Best Practices',
      content: 'Comprehensive guide to successful cloud migration including planning, execution, and post-migration optimization.',
      category: 'technical',
      tags: ['cloud', 'migration', 'aws', 'best-practices'],
      authorId: userIds[0] || null,
      status: 'published',
      publishedAt: new Date('2024-08-20')
    },
    {
      id: 'kb-102',
      title: 'Solar Panel Maintenance Guide',
      content: 'Regular maintenance procedures to ensure optimal solar panel performance and longevity.',
      category: 'maintenance',
      tags: ['solar', 'maintenance', 'renewable-energy'],
      authorId: userIds[2] || null,
      status: 'published',
      publishedAt: new Date('2024-07-15')
    },
    {
      id: 'kb-103',
      title: 'E-commerce Platform Security',
      content: 'Security considerations and best practices for e-commerce platform development and deployment.',
      category: 'security',
      tags: ['ecommerce', 'security', 'best-practices'],
      authorId: userIds[1] || null,
      status: 'draft'
    }
  ]);

  // Create marketing campaigns
  await db.insert(marketingCampaigns).values([
    {
      id: 'campaign-101',
      name: 'Cloud Migration Services Q3',
      description: 'Targeted campaign promoting cloud migration services to enterprise clients',
      type: 'email',
      status: 'completed',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-09-30'),
      budget: '5000.00',
      actualSpend: '4200.00',
      targetAudience: 'Enterprise CTOs and IT Directors',
      goals: 'Generate 50 qualified leads for cloud migration services',
      results: 'Generated 47 leads, 3 converted to opportunities'
    },
    {
      id: 'campaign-102',
      name: 'Sustainable Energy Solutions',
      description: 'Campaign targeting manufacturing companies for renewable energy solutions',
      type: 'social_media',
      status: 'active',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2024-11-15'),
      budget: '8000.00',
      actualSpend: '2800.00',
      targetAudience: 'Manufacturing operations managers',
      goals: 'Increase brand awareness and generate 30 qualified solar installation leads'
    }
  ]);

  console.log(`✅ Added comprehensive sample data:`);
  console.log(`   - ${sampleProjects.length} projects with client relationships`);
  console.log(`   - 9 tasks across different projects`);
  console.log(`   - 3 invoices with various statuses`);
  console.log(`   - 3 expenses for projects`);
  console.log(`   - 3 time entries for tracking`);
  console.log(`   - 3 support tickets`);
  console.log(`   - 3 knowledge articles`);
  console.log(`   - 2 marketing campaigns`);
}

addProjectsAndTasks().catch(console.error);