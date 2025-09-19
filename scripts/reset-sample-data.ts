import { db } from '../server/db';
import {
  users,
  companies,
  clients,
  salesOpportunities,
  opportunityNextSteps,
  opportunityCommunications,
  opportunityStakeholders,
  projects,
  tasks,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  timeEntries,
  clientInteractions,
  documents
} from '../shared/schema';

async function resetSampleData() {
  console.log('🧹 Clearing existing sample data...');

  // Clear all data in dependency order
  await db.delete(timeEntries);
  await db.delete(clientInteractions);
  await db.delete(supportTickets);
  await db.delete(marketingCampaigns);
  await db.delete(knowledgeArticles);
  await db.delete(documents);
  await db.delete(expenses);
  await db.delete(invoices);
  await db.delete(tasks);
  await db.delete(projects);

  // Clear opportunity-related tables
  await db.delete(opportunityNextSteps);
  await db.delete(opportunityCommunications);
  await db.delete(opportunityStakeholders);
  await db.delete(salesOpportunities);

  await db.delete(clients);
  await db.delete(companies);

  console.log('✅ Sample data cleared');

  console.log('📊 Creating comprehensive sample data...');

  // Create companies
  const sampleCompanies = await db.insert(companies).values([
    {
      id: 'comp-1',
      name: 'TechCorp Solutions',
      industry: 'Software',
      size: 'medium',
      website: 'https://techcorp.com',
      address: '123 Innovation Dr, San Francisco, CA 94105',
      phone: '+1 (555) 123-4567',
      email: 'info@techcorp.com',
      description: 'Leading enterprise software solutions provider'
    },
    {
      id: 'comp-2',
      name: 'Green Energy Systems',
      industry: 'Renewable Energy',
      size: 'large',
      website: 'https://greenenergy.com',
      address: '456 Solar Ave, Austin, TX 78701',
      phone: '+1 (555) 234-5678',
      email: 'contact@greenenergy.com',
      description: 'Solar and wind energy installations for commercial clients'
    },
    {
      id: 'comp-3',
      name: 'Urban Retail Group',
      industry: 'Retail',
      size: 'large',
      website: 'https://urbanretail.com',
      address: '789 Commerce St, New York, NY 10001',
      phone: '+1 (555) 345-6789',
      email: 'info@urbanretail.com',
      description: 'Multi-brand retail chain with 200+ locations'
    },
    {
      id: 'comp-4',
      name: 'HealthFirst Clinics',
      industry: 'Healthcare',
      size: 'medium',
      website: 'https://healthfirst.com',
      address: '321 Medical Center Blvd, Chicago, IL 60601',
      phone: '+1 (555) 456-7890',
      email: 'admin@healthfirst.com',
      description: 'Regional healthcare provider with 15 clinic locations'
    },
    {
      id: 'comp-5',
      name: 'FinanceMax Advisors',
      industry: 'Financial Services',
      size: 'small',
      website: 'https://financemax.com',
      address: '654 Wall Street, New York, NY 10005',
      phone: '+1 (555) 567-8901',
      email: 'contact@financemax.com',
      description: 'Boutique financial advisory firm for high-net-worth clients'
    },
    {
      id: 'comp-6',
      name: 'EduTech Learning',
      industry: 'Education',
      size: 'medium',
      website: 'https://edutech.com',
      address: '987 Campus Dr, Boston, MA 02101',
      phone: '+1 (555) 678-9012',
      email: 'info@edutech.com',
      description: 'Online learning platform for K-12 and higher education'
    }
  ]).returning();

  // Create clients with proper company relationships
  const sampleClients = await db.insert(clients).values([
    {
      id: 'client-1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      phone: '+1 (555) 123-4567',
      companyId: 'comp-1',
      position: 'CTO',
      department: 'Technology',
      isPrimaryContact: true,
      source: 'referral',
      notes: 'Very tech-savvy, focuses on scalability and security'
    },
    {
      id: 'client-2',
      name: 'Michael Rodriguez',
      email: 'mrodriguez@greenenergy.com',
      phone: '+1 (555) 234-5678',
      companyId: 'comp-2',
      position: 'VP of Operations',
      department: 'Operations',
      isPrimaryContact: true,
      source: 'marketing',
      notes: 'Interested in energy-efficient solutions, budget conscious'
    },
    {
      id: 'client-3',
      name: 'Emily Chen',
      email: 'echen@urbanretail.com',
      phone: '+1 (555) 345-6789',
      companyId: 'comp-3',
      position: 'IT Director',
      department: 'Information Technology',
      isPrimaryContact: true,
      source: 'website',
      notes: 'Managing digital transformation initiative, needs scalable solutions'
    },
    {
      id: 'client-4',
      name: 'Dr. James Wilson',
      email: 'jwilson@healthfirst.com',
      phone: '+1 (555) 456-7890',
      companyId: 'comp-4',
      position: 'Chief Medical Officer',
      department: 'Medical',
      isPrimaryContact: true,
      source: 'trade_show',
      notes: 'Focused on patient care improvement and compliance'
    },
    {
      id: 'client-5',
      name: 'Lisa Anderson',
      email: 'landerson@financemax.com',
      phone: '+1 (555) 567-8901',
      companyId: 'comp-5',
      position: 'Managing Partner',
      department: 'Management',
      isPrimaryContact: true,
      source: 'referral',
      notes: 'High attention to detail, security and compliance are critical'
    },
    {
      id: 'client-6',
      name: 'David Park',
      email: 'dpark@edutech.com',
      phone: '+1 (555) 678-9012',
      companyId: 'comp-6',
      position: 'VP of Product',
      department: 'Product',
      isPrimaryContact: true,
      source: 'cold_outreach',
      notes: 'Innovation-focused, interested in cutting-edge solutions'
    },
    // Secondary contacts
    {
      id: 'client-7',
      name: 'Tom Bradley',
      email: 'tbradley@techcorp.com',
      phone: '+1 (555) 123-4568',
      companyId: 'comp-1',
      position: 'Engineering Manager',
      department: 'Technology',
      isPrimaryContact: false,
      source: 'referral',
      notes: 'Technical evaluator, concerned with implementation details'
    },
    {
      id: 'client-8',
      name: 'Anna Martinez',
      email: 'amartinez@urbanretail.com',
      phone: '+1 (555) 345-6790',
      companyId: 'comp-3',
      position: 'CFO',
      department: 'Finance',
      isPrimaryContact: false,
      source: 'website',
      notes: 'Budget decision maker, ROI-focused'
    }
  ]).returning();

  // Create sales opportunities with enhanced fields
  const sampleOpportunities = await db.insert(salesOpportunities).values([
    {
      id: 'opp-1',
      title: 'Enterprise Cloud Migration',
      description: 'Migration of legacy systems to cloud infrastructure with modernization',
      companyId: 'comp-1',
      contactId: 'client-1',
      stage: 'proposal',
      value: '150000.00',
      probability: 75,
      expectedCloseDate: new Date('2024-10-15'),
      source: 'referral',
      priority: 'high',
      tags: ['cloud', 'migration', 'enterprise'],
      painPoints: [
        'Legacy systems causing frequent outages',
        'High maintenance costs',
        'Lack of scalability for growing business',
        'Security vulnerabilities in old infrastructure'
      ],
      successCriteria: [
        '99.9% uptime achieved',
        '50% reduction in infrastructure costs',
        'Ability to scale to 10x current load',
        'Compliance with SOC 2 standards'
      ],
      budget: '200000.00',
      budgetStatus: 'approved',
      decisionProcess: 'CTO leads technical evaluation, CEO approval required for >$100k'
    },
    {
      id: 'opp-2',
      title: 'Solar Panel Installation',
      description: 'Commercial solar panel installation for manufacturing facility',
      companyId: 'comp-2',
      contactId: 'client-2',
      stage: 'negotiation',
      value: '75000.00',
      probability: 60,
      expectedCloseDate: new Date('2024-09-30'),
      source: 'marketing',
      priority: 'medium',
      tags: ['solar', 'renewable', 'manufacturing'],
      painPoints: [
        'Rising electricity costs impacting margins',
        'Corporate sustainability goals not being met',
        'Dependence on volatile energy pricing'
      ],
      successCriteria: [
        '30% reduction in energy costs',
        'Carbon neutral certification achieved',
        'ROI within 4 years'
      ],
      budget: '80000.00',
      budgetStatus: 'estimated',
      decisionProcess: 'VP Operations recommends, Board approval needed for capital expenditure'
    },
    {
      id: 'opp-3',
      title: 'E-commerce Platform Upgrade',
      description: 'Modern e-commerce platform to replace aging system',
      companyId: 'comp-3',
      contactId: 'client-3',
      stage: 'qualified',
      value: '250000.00',
      probability: 40,
      expectedCloseDate: new Date('2024-11-20'),
      source: 'website',
      priority: 'high',
      tags: ['ecommerce', 'retail', 'platform'],
      painPoints: [
        'Current platform cannot handle peak traffic',
        'Poor mobile experience losing customers',
        'Limited integration capabilities',
        'Outdated user interface'
      ],
      successCriteria: [
        'Handle 100x current traffic without downtime',
        '40% improvement in mobile conversion rates',
        'Integration with existing ERP and CRM systems',
        'Modern, responsive user experience'
      ],
      budget: '300000.00',
      budgetStatus: 'approved',
      decisionProcess: 'IT Director leads evaluation, CFO approval for budget, CEO sign-off required'
    },
    {
      id: 'opp-4',
      title: 'Patient Management System',
      description: 'Comprehensive patient management and scheduling system',
      companyId: 'comp-4',
      contactId: 'client-4',
      stage: 'lead',
      value: '45000.00',
      probability: 25,
      expectedCloseDate: new Date('2024-12-10'),
      source: 'trade_show',
      priority: 'medium',
      tags: ['healthcare', 'patient', 'scheduling'],
      painPoints: [
        'Manual scheduling causing double-bookings',
        'No centralized patient records',
        'Compliance reporting is time-consuming',
        'Poor patient communication'
      ],
      successCriteria: [
        'Zero double-bookings',
        'Centralized patient history accessible to all staff',
        'Automated compliance reporting',
        'Patient portal for self-service'
      ],
      budget: '50000.00',
      budgetStatus: 'estimated',
      decisionProcess: 'CMO evaluates clinical needs, Admin Director handles procurement'
    },
    {
      id: 'opp-5',
      title: 'Wealth Management Platform',
      description: 'Custom wealth management and client portal solution',
      companyId: 'comp-5',
      contactId: 'client-5',
      stage: 'closed_won',
      value: '85000.00',
      probability: 100,
      expectedCloseDate: new Date('2024-08-15'),
      actualCloseDate: new Date('2024-08-12'),
      source: 'referral',
      priority: 'high',
      tags: ['finance', 'wealth', 'portal'],
      painPoints: [
        'Manual portfolio management processes',
        'Clients lack real-time visibility',
        'Compliance reporting inefficient',
        'No mobile access for clients'
      ],
      successCriteria: [
        'Real-time portfolio updates',
        'Client self-service portal',
        'Automated compliance reporting',
        'Mobile app for client access'
      ],
      budget: '90000.00',
      budgetStatus: 'approved',
      decisionProcess: 'Managing Partner makes final decision'
    },
    {
      id: 'opp-6',
      title: 'Learning Analytics Platform',
      description: 'AI-powered learning analytics and student engagement platform',
      companyId: 'comp-6',
      contactId: 'client-6',
      stage: 'proposal',
      value: '120000.00',
      probability: 55,
      expectedCloseDate: new Date('2024-10-25'),
      source: 'cold_outreach',
      priority: 'medium',
      tags: ['education', 'analytics', 'AI'],
      painPoints: [
        'No visibility into student engagement',
        'Cannot identify at-risk students early',
        'Manual grading and feedback processes',
        'Limited personalization capabilities'
      ],
      successCriteria: [
        'Real-time student engagement metrics',
        'Early warning system for at-risk students',
        'Automated assessment and feedback',
        'Personalized learning paths for each student'
      ],
      budget: '130000.00',
      budgetStatus: 'estimated',
      decisionProcess: 'VP Product evaluates, requires board approval for new technology spend'
    }
  ]).returning();

  console.log(`Created ${sampleCompanies.length} companies`);
  console.log(`Created ${sampleClients.length} clients`);
  console.log(`Created ${sampleOpportunities.length} opportunities`);

  // Add next steps for active opportunities
  await db.insert(opportunityNextSteps).values([
    {
      opportunityId: 'opp-1',
      title: 'Technical Architecture Review',
      description: 'Present detailed technical architecture and migration plan',
      priority: 'high',
      status: 'pending',
      dueDate: new Date('2024-09-25')
    },
    {
      opportunityId: 'opp-1',
      title: 'Security Assessment Meeting',
      description: 'Schedule security review with their CISO',
      priority: 'medium',
      status: 'in_progress',
      dueDate: new Date('2024-09-22')
    },
    {
      opportunityId: 'opp-2',
      title: 'Site Survey Completion',
      description: 'Complete final site survey and structural assessment',
      priority: 'high',
      status: 'pending',
      dueDate: new Date('2024-09-20')
    },
    {
      opportunityId: 'opp-3',
      title: 'Demo Preparation',
      description: 'Prepare customized demo with their product catalog',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date('2024-09-28')
    },
    {
      opportunityId: 'opp-4',
      title: 'Compliance Documentation',
      description: 'Provide HIPAA compliance documentation and certifications',
      priority: 'high',
      status: 'pending',
      dueDate: new Date('2024-09-30')
    }
  ]);

  // Add communications for opportunities
  await db.insert(opportunityCommunications).values([
    {
      opportunityId: 'opp-1',
      type: 'meeting',
      subject: 'Initial Requirements Discussion',
      summary: 'Discussed current infrastructure challenges and migration goals. Identified key pain points around legacy system maintenance and scalability.',
      outcome: 'positive',
      communicationDate: new Date('2024-09-10'),
      followUpRequired: true
    },
    {
      opportunityId: 'opp-1',
      type: 'email',
      subject: 'Proposal Follow-up',
      summary: 'Sent detailed proposal with timeline and pricing. Addressed questions about data migration and downtime.',
      outcome: 'neutral',
      communicationDate: new Date('2024-09-15'),
      followUpRequired: true
    },
    {
      opportunityId: 'opp-2',
      type: 'call',
      subject: 'Budget Discussion',
      summary: 'Discussed financing options and ROI projections. Client interested in tax incentives and rebates.',
      outcome: 'positive',
      communicationDate: new Date('2024-09-12'),
      followUpRequired: false
    },
    {
      opportunityId: 'opp-3',
      type: 'demo',
      subject: 'Platform Demonstration',
      summary: 'Showed key features including mobile responsiveness and analytics dashboard. Very positive response from technical team.',
      outcome: 'positive',
      communicationDate: new Date('2024-09-08'),
      followUpRequired: true
    },
    {
      opportunityId: 'opp-5',
      type: 'contract',
      subject: 'Contract Signed',
      summary: 'Final contract executed with minor modifications to payment terms. Project kickoff scheduled.',
      outcome: 'positive',
      communicationDate: new Date('2024-08-12'),
      followUpRequired: false
    }
  ]);

  // Add stakeholders for opportunities
  await db.insert(opportunityStakeholders).values([
    {
      opportunityId: 'opp-1',
      name: 'Sarah Johnson',
      role: 'decision_maker',
      email: 'sarah.johnson@techcorp.com',
      phone: '+1 (555) 123-4567',
      influence: 'high',
      relationshipStrength: 'strong',
      notes: 'Primary technical decision maker, very supportive of cloud migration'
    },
    {
      opportunityId: 'opp-1',
      name: 'Tom Bradley',
      role: 'influencer',
      email: 'tbradley@techcorp.com',
      phone: '+1 (555) 123-4568',
      influence: 'medium',
      relationshipStrength: 'neutral',
      notes: 'Will be responsible for implementation, concerned about timeline'
    },
    {
      opportunityId: 'opp-3',
      name: 'Emily Chen',
      role: 'champion',
      email: 'echen@urbanretail.com',
      phone: '+1 (555) 345-6789',
      influence: 'high',
      relationshipStrength: 'strong',
      notes: 'Strong advocate for platform upgrade, driving the initiative'
    },
    {
      opportunityId: 'opp-3',
      name: 'Anna Martinez',
      role: 'decision_maker',
      email: 'amartinez@urbanretail.com',
      phone: '+1 (555) 345-6790',
      influence: 'high',
      relationshipStrength: 'neutral',
      notes: 'CFO - final budget approval, focused on ROI and cost control'
    },
    {
      opportunityId: 'opp-2',
      name: 'Michael Rodriguez',
      role: 'decision_maker',
      email: 'mrodriguez@greenenergy.com',
      phone: '+1 (555) 234-5678',
      influence: 'high',
      relationshipStrength: 'strong',
      notes: 'Very interested in sustainability and cost savings'
    }
  ]);

  console.log('📈 Created comprehensive CRM data with:');
  console.log('   - Next steps for active opportunities');
  console.log('   - Communication history');
  console.log('   - Stakeholder mapping');
  console.log('   - Pain points and success criteria');

  console.log('✅ Sample data creation complete!');
}

resetSampleData().catch(console.error);