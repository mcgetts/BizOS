import {
  users,
  clients,
  companies,
  salesOpportunities,
  opportunityNextSteps,
  opportunityCommunications,
  opportunityStakeholders,
  projects,
  tasks,
  invoices,
  expenses,
  documents,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  supportTicketComments,
  slaConfigurations,
  ticketEscalations,
  timeEntries,
  clientInteractions,
  systemVariables,
  userCapacity,
  userAvailability,
  userSkills,
  opportunityActivityHistory,
  projectActivity,
  type User,
  type UpsertUser,
  type InsertUser,
  type InsertClient,
  type Client,
  type ClientWithCompany,
  type InsertCompany,
  type Company,
  type InsertSalesOpportunity,
  type SalesOpportunity,
  type SalesOpportunityWithRelations,
  type InsertOpportunityNextStep,
  type OpportunityNextStep,
  type InsertOpportunityCommunication,
  type OpportunityCommunication,
  type InsertOpportunityStakeholder,
  type OpportunityStakeholder,
  type InsertProject,
  type Project,
  type InsertTask,
  type Task,
  type InsertInvoice,
  type Invoice,
  type InsertExpense,
  type Expense,
  type InsertDocument,
  type Document,
  type InsertKnowledgeArticle,
  type KnowledgeArticle,
  type InsertMarketingCampaign,
  type MarketingCampaign,
  type InsertSupportTicket,
  type SupportTicket,
  type UpdateSupportTicket,
  type InsertSupportTicketComment,
  type SupportTicketComment,
  type UpdateSupportTicketComment,
  type InsertSlaConfiguration,
  type SlaConfiguration,
  type UpdateSlaConfiguration,
  type InsertTicketEscalation,
  type TicketEscalation,
  type InsertSystemVariable,
  type UpdateSystemVariable,
  type SystemVariable,
  type TimeEntry,
  type ClientInteraction,
  systemSettings,
  type InsertSystemSetting,
  type SystemSetting,
  userInvitations,
  type InsertUserInvitation,
  type UserInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, count, gte, lte } from "drizzle-orm";
import { calculateSlaMetrics, calculateBusinessImpact, DEFAULT_SLA_CONFIGS } from "@shared/slaUtils";
import { getOrganizationId } from "./tenancy/tenantContext";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Client operations
  getClients(): Promise<ClientWithCompany[]>;
  getClient(id: string): Promise<ClientWithCompany | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;

  // Sales opportunity operations
  getSalesOpportunities(): Promise<SalesOpportunityWithRelations[]>;
  getSalesOpportunity(id: string): Promise<SalesOpportunityWithRelations | undefined>;
  getSalesOpportunitiesByStage(stage: string): Promise<SalesOpportunityWithRelations[]>;
  createSalesOpportunity(opportunity: InsertSalesOpportunity): Promise<SalesOpportunity>;
  updateSalesOpportunity(id: string, opportunity: Partial<InsertSalesOpportunity>): Promise<SalesOpportunity>;
  deleteSalesOpportunity(id: string): Promise<void>;

  // Opportunity next steps operations
  getOpportunityNextSteps(opportunityId: string): Promise<OpportunityNextStep[]>;
  getOpportunityNextStep(id: string): Promise<OpportunityNextStep | undefined>;
  createOpportunityNextStep(nextStep: InsertOpportunityNextStep): Promise<OpportunityNextStep>;
  updateOpportunityNextStep(id: string, nextStep: Partial<InsertOpportunityNextStep>): Promise<OpportunityNextStep>;
  deleteOpportunityNextStep(id: string): Promise<void>;

  // Opportunity communications operations
  getOpportunityCommunications(opportunityId: string): Promise<OpportunityCommunication[]>;
  getOpportunityCommunication(id: string): Promise<OpportunityCommunication | undefined>;
  createOpportunityCommunication(communication: InsertOpportunityCommunication): Promise<OpportunityCommunication>;
  updateOpportunityCommunication(id: string, communication: Partial<InsertOpportunityCommunication>): Promise<OpportunityCommunication>;
  deleteOpportunityCommunication(id: string): Promise<void>;

  // Opportunity stakeholders operations
  getOpportunityStakeholders(opportunityId: string): Promise<OpportunityStakeholder[]>;
  getOpportunityStakeholder(id: string): Promise<OpportunityStakeholder | undefined>;
  createOpportunityStakeholder(stakeholder: InsertOpportunityStakeholder): Promise<OpportunityStakeholder>;
  updateOpportunityStakeholder(id: string, stakeholder: Partial<InsertOpportunityStakeholder>): Promise<OpportunityStakeholder>;
  deleteOpportunityStakeholder(id: string): Promise<void>;
  
  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByClient(clientId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Financial operations
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  
  // Knowledge operations
  getKnowledgeArticles(): Promise<KnowledgeArticle[]>;
  getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined>;
  createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(id: string, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle>;
  deleteKnowledgeArticle(id: string): Promise<void>;
  
  // Marketing operations
  getMarketingCampaigns(): Promise<MarketingCampaign[]>;
  getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  updateMarketingCampaign(id: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign>;
  
  // Support operations
  getSupportTickets(): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, ticket: UpdateSupportTicket): Promise<SupportTicket>;
  deleteSupportTicket(id: string): Promise<void>;

  // Support ticket comments operations
  getSupportTicketComments(ticketId: string): Promise<SupportTicketComment[]>;
  createSupportTicketComment(comment: InsertSupportTicketComment): Promise<SupportTicketComment>;
  updateSupportTicketComment(id: string, comment: UpdateSupportTicketComment): Promise<SupportTicketComment>;
  deleteSupportTicketComment(id: string): Promise<void>;

  // SLA configuration operations
  getSlaConfigurations(): Promise<SlaConfiguration[]>;
  getSlaConfiguration(id: string): Promise<SlaConfiguration | undefined>;
  createSlaConfiguration(config: InsertSlaConfiguration): Promise<SlaConfiguration>;
  updateSlaConfiguration(id: string, config: UpdateSlaConfiguration): Promise<SlaConfiguration>;
  deleteSlaConfiguration(id: string): Promise<void>;

  // Ticket escalation operations
  getTicketEscalations(ticketId: string): Promise<TicketEscalation[]>;
  createTicketEscalation(escalation: InsertTicketEscalation): Promise<TicketEscalation>;

  // Enhanced support operations
  updateTicketSlaMetrics(ticketId: string, metrics: Partial<SupportTicket>): Promise<SupportTicket>;
  getOverdueTickets(): Promise<SupportTicket[]>;
  getTicketsNeedingEscalation(): Promise<SupportTicket[]>;

  // Support analytics operations
  getSupportAnalytics(timeRange: { start: Date; end: Date }): Promise<any>;
  getAgentPerformanceMetrics(timeRange: { start: Date; end: Date }): Promise<any[]>;
  getSupportTrends(timeRange: { start: Date; end: Date }): Promise<any>;
  getTicketVolumeByCategory(timeRange: { start: Date; end: Date }): Promise<any[]>;
  getResponseTimeMetrics(timeRange: { start: Date; end: Date }): Promise<any>;
  getSLAComplianceReport(timeRange: { start: Date; end: Date }): Promise<any>;

  // System variables operations
  getSystemVariables(): Promise<SystemVariable[]>;
  getSystemVariable(key: string): Promise<SystemVariable | undefined>;
  createSystemVariable(variable: InsertSystemVariable): Promise<SystemVariable>;
  updateSystemVariable(key: string, variable: UpdateSystemVariable): Promise<SystemVariable>;
  deleteSystemVariable(key: string): Promise<void>;

  // System settings operations (access control, domains, etc.)
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(key: string, value: Record<string, any>): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;

  // User invitation operations
  getUserInvitations(): Promise<UserInvitation[]>;
  getUserInvitation(token: string): Promise<UserInvitation | undefined>;
  createUserInvitation(invitation: Omit<UserInvitation, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserInvitation>;
  updateUserInvitation(token: string, data: Partial<Omit<UserInvitation, 'id' | 'token' | 'createdAt' | 'updatedAt'>>): Promise<UserInvitation>;
  deleteUserInvitation(token: string): Promise<void>;

  // Dashboard analytics
  getDashboardKPIs(): Promise<{
    revenue: { current: number; target: number; growth: number };
    pipeline: { current: number; target: number; growth: number };
    projects: { current: number; target: number; growth: number };
    tickets: { current: number; target: number; growth: number };
  }>;

  getRevenueTrends(months: number): Promise<Array<{
    month: string;
    year: number;
    revenue: number;
    invoiceCount: number;
  }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName, users.lastName);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
          // DO NOT update role/enhancedRole - preserve existing values from database
          // This prevents OAuth logins from resetting admin roles to default
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Check for business-related foreign key references that need reassignment
    const [clientRefs, projectRefs, taskAssignedRefs, taskCreatedRefs, opportunityRefs, 
           stepAssignedRefs, stepCompletedRefs, stepCreatedRefs, supportAssignedRefs, 
           supportCreatedRefs] = await Promise.all([
      db.select({ count: count() }).from(clients).where(eq(clients.assignedTo, id)),
      db.select({ count: count() }).from(projects).where(eq(projects.managerId, id)),
      db.select({ count: count() }).from(tasks).where(eq(tasks.assignedTo, id)),
      db.select({ count: count() }).from(tasks).where(eq(tasks.createdBy, id)),
      db.select({ count: count() }).from(salesOpportunities).where(eq(salesOpportunities.assignedTo, id)),
      db.select({ count: count() }).from(opportunityNextSteps).where(eq(opportunityNextSteps.assignedTo, id)),
      db.select({ count: count() }).from(opportunityNextSteps).where(eq(opportunityNextSteps.completedBy, id)),
      db.select({ count: count() }).from(opportunityNextSteps).where(eq(opportunityNextSteps.createdBy, id)),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.assignedTo, id)),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.createdBy, id))
    ]);

    const totalRefs = clientRefs[0].count + projectRefs[0].count + taskAssignedRefs[0].count + 
                     taskCreatedRefs[0].count + opportunityRefs[0].count + stepAssignedRefs[0].count + 
                     stepCompletedRefs[0].count + stepCreatedRefs[0].count + supportAssignedRefs[0].count + 
                     supportCreatedRefs[0].count;

    if (totalRefs > 0) {
      throw new Error(`Cannot delete user: ${totalRefs} records are still assigned to this user. Please reassign them first.`);
    }

    // Delete user profile and activity data first (these can be safely deleted)
    await Promise.all([
      // User profile data
      db.delete(userCapacity).where(eq(userCapacity.userId, id)),
      db.delete(userAvailability).where(eq(userAvailability.userId, id)),
      db.delete(userSkills).where(eq(userSkills.userId, id)),
      // Activity and communication logs (safe to delete) 
      db.delete(opportunityCommunications).where(eq(opportunityCommunications.recordedBy, id)),
      db.delete(opportunityStakeholders).where(eq(opportunityStakeholders.createdBy, id)),
      db.delete(opportunityActivityHistory).where(eq(opportunityActivityHistory.performedBy, id)),
      db.delete(projectActivity).where(eq(projectActivity.userId, id))
    ]);

    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }


  // Client operations
  async getClients(): Promise<ClientWithCompany[]> {
    const organizationId = getOrganizationId();
    return await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        companyId: clients.companyId,
        position: clients.position,
        department: clients.department,
        isPrimaryContact: clients.isPrimaryContact,
        source: clients.source,
        assignedTo: clients.assignedTo,
        lastContactDate: clients.lastContactDate,
        notes: clients.notes,
        tags: clients.tags,
        isActive: clients.isActive,
        // Legacy fields
        company: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
        },
        industry: clients.industry,
        website: clients.website,
        address: clients.address,
        status: clients.status,
        totalValue: clients.totalValue,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
      })
      .from(clients)
      .leftJoin(companies, and(
        eq(clients.companyId, companies.id),
        eq(companies.organizationId, organizationId)
      ))
      .where(eq(clients.organizationId, organizationId))
      .orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<ClientWithCompany | undefined> {
    const organizationId = getOrganizationId();
    const [client] = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        companyId: clients.companyId,
        position: clients.position,
        department: clients.department,
        isPrimaryContact: clients.isPrimaryContact,
        source: clients.source,
        assignedTo: clients.assignedTo,
        lastContactDate: clients.lastContactDate,
        notes: clients.notes,
        tags: clients.tags,
        isActive: clients.isActive,
        // Legacy fields
        company: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
        },
        industry: clients.industry,
        website: clients.website,
        address: clients.address,
        status: clients.status,
        totalValue: clients.totalValue,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
      })
      .from(clients)
      .leftJoin(companies, and(
        eq(clients.companyId, companies.id),
        eq(companies.organizationId, organizationId)
      ))
      .where(and(
        eq(clients.id, id),
        eq(clients.organizationId, organizationId)
      ));
    return client;
  }

  async createClient(client: InsertClient, organizationId?: string): Promise<Client> {
    const orgId = organizationId || getOrganizationId();
    const [newClient] = await db.insert(clients).values({
      ...client,
      organizationId: orgId
    }).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const organizationId = getOrganizationId();
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(and(
        eq(clients.id, id),
        eq(clients.organizationId, organizationId)
      ))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(clients).where(and(
      eq(clients.id, id),
      eq(clients.organizationId, organizationId)
    ));
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(companies)
      .where(and(
        eq(companies.isActive, true),
        eq(companies.organizationId, organizationId)
      ))
      .orderBy(desc(companies.createdAt));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const organizationId = getOrganizationId();
    const [company] = await db.select().from(companies)
      .where(and(
        eq(companies.id, id),
        eq(companies.organizationId, organizationId)
      ));
    return company;
  }

  async createCompany(company: InsertCompany, organizationId?: string): Promise<Company> {
    const orgId = organizationId || getOrganizationId();
    const [newCompany] = await db.insert(companies).values({
      ...company,
      organizationId: orgId
    }).returning();
    return newCompany;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company> {
    const organizationId = getOrganizationId();
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(and(
        eq(companies.id, id),
        eq(companies.organizationId, organizationId)
      ))
      .returning();
    return updatedCompany;
  }

  async deleteCompany(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.update(companies)
      .set({ isActive: false })
      .where(and(
        eq(companies.id, id),
        eq(companies.organizationId, organizationId)
      ));
  }

  // Sales opportunity operations
  async getSalesOpportunities(): Promise<SalesOpportunityWithRelations[]> {
    const organizationId = getOrganizationId();
    return await db
      .select({
        id: salesOpportunities.id,
        title: salesOpportunities.title,
        description: salesOpportunities.description,
        companyId: salesOpportunities.companyId,
        contactId: salesOpportunities.contactId,
        assignedTo: salesOpportunities.assignedTo,
        stage: salesOpportunities.stage,
        value: salesOpportunities.value,
        probability: salesOpportunities.probability,
        expectedCloseDate: salesOpportunities.expectedCloseDate,
        actualCloseDate: salesOpportunities.actualCloseDate,
        source: salesOpportunities.source,
        priority: salesOpportunities.priority,
        tags: salesOpportunities.tags,
        notes: salesOpportunities.notes,
        painPoints: salesOpportunities.painPoints,
        successCriteria: salesOpportunities.successCriteria,
        decisionProcess: salesOpportunities.decisionProcess,
        budget: salesOpportunities.budget,
        budgetStatus: salesOpportunities.budgetStatus,
        competitorInfo: salesOpportunities.competitorInfo,
        lastActivityDate: salesOpportunities.lastActivityDate,
        createdAt: salesOpportunities.createdAt,
        updatedAt: salesOpportunities.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          website: companies.website,
        },
        contact: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          position: clients.position,
        },
        assignedUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(salesOpportunities)
      .leftJoin(companies, and(
        eq(salesOpportunities.companyId, companies.id),
        eq(companies.organizationId, organizationId)
      ))
      .leftJoin(clients, and(
        eq(salesOpportunities.contactId, clients.id),
        eq(clients.organizationId, organizationId)
      ))
      .leftJoin(users, eq(salesOpportunities.assignedTo, users.id))
      .where(eq(salesOpportunities.organizationId, organizationId))
      .orderBy(desc(salesOpportunities.lastActivityDate));
  }

  async getSalesOpportunity(id: string): Promise<SalesOpportunityWithRelations | undefined> {
    const [opportunity] = await db
      .select({
        id: salesOpportunities.id,
        title: salesOpportunities.title,
        description: salesOpportunities.description,
        companyId: salesOpportunities.companyId,
        contactId: salesOpportunities.contactId,
        assignedTo: salesOpportunities.assignedTo,
        stage: salesOpportunities.stage,
        value: salesOpportunities.value,
        probability: salesOpportunities.probability,
        expectedCloseDate: salesOpportunities.expectedCloseDate,
        actualCloseDate: salesOpportunities.actualCloseDate,
        source: salesOpportunities.source,
        priority: salesOpportunities.priority,
        tags: salesOpportunities.tags,
        notes: salesOpportunities.notes,
        painPoints: salesOpportunities.painPoints,
        successCriteria: salesOpportunities.successCriteria,
        decisionProcess: salesOpportunities.decisionProcess,
        budget: salesOpportunities.budget,
        budgetStatus: salesOpportunities.budgetStatus,
        competitorInfo: salesOpportunities.competitorInfo,
        lastActivityDate: salesOpportunities.lastActivityDate,
        createdAt: salesOpportunities.createdAt,
        updatedAt: salesOpportunities.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          website: companies.website,
        },
        contact: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          position: clients.position,
        },
        assignedUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(salesOpportunities)
      .leftJoin(companies, and(
        eq(salesOpportunities.companyId, companies.id),
        eq(companies.organizationId, getOrganizationId())
      ))
      .leftJoin(clients, and(
        eq(salesOpportunities.contactId, clients.id),
        eq(clients.organizationId, getOrganizationId())
      ))
      .leftJoin(users, eq(salesOpportunities.assignedTo, users.id))
      .where(and(
        eq(salesOpportunities.id, id),
        eq(salesOpportunities.organizationId, getOrganizationId())
      ));
    return opportunity;
  }

  async getSalesOpportunitiesByStage(stage: string): Promise<SalesOpportunityWithRelations[]> {
    const organizationId = getOrganizationId();
    return await db
      .select({
        id: salesOpportunities.id,
        title: salesOpportunities.title,
        description: salesOpportunities.description,
        companyId: salesOpportunities.companyId,
        contactId: salesOpportunities.contactId,
        assignedTo: salesOpportunities.assignedTo,
        stage: salesOpportunities.stage,
        value: salesOpportunities.value,
        probability: salesOpportunities.probability,
        expectedCloseDate: salesOpportunities.expectedCloseDate,
        actualCloseDate: salesOpportunities.actualCloseDate,
        source: salesOpportunities.source,
        priority: salesOpportunities.priority,
        tags: salesOpportunities.tags,
        notes: salesOpportunities.notes,
        painPoints: salesOpportunities.painPoints,
        successCriteria: salesOpportunities.successCriteria,
        decisionProcess: salesOpportunities.decisionProcess,
        budget: salesOpportunities.budget,
        budgetStatus: salesOpportunities.budgetStatus,
        competitorInfo: salesOpportunities.competitorInfo,
        lastActivityDate: salesOpportunities.lastActivityDate,
        createdAt: salesOpportunities.createdAt,
        updatedAt: salesOpportunities.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          website: companies.website,
        },
        contact: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          position: clients.position,
        },
        assignedUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(salesOpportunities)
      .leftJoin(companies, and(
        eq(salesOpportunities.companyId, companies.id),
        eq(companies.organizationId, organizationId)
      ))
      .leftJoin(clients, and(
        eq(salesOpportunities.contactId, clients.id),
        eq(clients.organizationId, organizationId)
      ))
      .leftJoin(users, eq(salesOpportunities.assignedTo, users.id))
      .where(and(
        eq(salesOpportunities.stage, stage),
        eq(salesOpportunities.organizationId, organizationId)
      ))
      .orderBy(desc(salesOpportunities.lastActivityDate));
  }

  async createSalesOpportunity(opportunity: InsertSalesOpportunity, organizationId?: string): Promise<SalesOpportunity> {
    const orgId = organizationId || getOrganizationId();
    const [newOpportunity] = await db.insert(salesOpportunities).values({
      ...opportunity,
      organizationId: orgId,
      lastActivityDate: new Date(),
    }).returning();
    return newOpportunity;
  }

  async updateSalesOpportunity(id: string, opportunity: Partial<InsertSalesOpportunity>): Promise<SalesOpportunity> {
    const organizationId = getOrganizationId();
    const [updatedOpportunity] = await db
      .update(salesOpportunities)
      .set({
        ...opportunity,
        updatedAt: new Date(),
        lastActivityDate: new Date(),
      })
      .where(and(
        eq(salesOpportunities.id, id),
        eq(salesOpportunities.organizationId, organizationId)
      ))
      .returning();
    return updatedOpportunity;
  }

  // Helper function to recompute lastActivityDate based on remaining activities
  private async recomputeLastActivityDate(opportunityId: string, tx: any): Promise<void> {
    const result = await tx
      .select({
        maxDate: sql<Date>`GREATEST(
          COALESCE(MAX(${opportunityCommunications.communicationDate}), '1970-01-01'::timestamp),
          COALESCE(MAX(${opportunityNextSteps.completedAt}), '1970-01-01'::timestamp),
          COALESCE(MAX(${opportunityNextSteps.updatedAt}), '1970-01-01'::timestamp),
          COALESCE(MAX(${opportunityNextSteps.createdAt}), '1970-01-01'::timestamp),
          COALESCE((SELECT ${salesOpportunities.updatedAt} FROM ${salesOpportunities} WHERE ${salesOpportunities.id} = ${opportunityId}), '1970-01-01'::timestamp)
        )`
      })
      .from(salesOpportunities)
      .leftJoin(opportunityCommunications, eq(opportunityCommunications.opportunityId, opportunityId))
      .leftJoin(opportunityNextSteps, eq(opportunityNextSteps.opportunityId, opportunityId))
      .where(eq(salesOpportunities.id, opportunityId));
    
    if (result[0]?.maxDate) {
      await tx.update(salesOpportunities)
        .set({ lastActivityDate: result[0].maxDate })
        .where(eq(salesOpportunities.id, opportunityId));
    }
  }

  async deleteSalesOpportunity(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    // Transactionally delete all related records first to maintain referential integrity
    await db.transaction(async (tx) => {
      // Delete related next steps
      await tx.delete(opportunityNextSteps).where(and(
        eq(opportunityNextSteps.opportunityId, id),
        eq(opportunityNextSteps.organizationId, organizationId)
      ));

      // Delete related communications
      await tx.delete(opportunityCommunications).where(and(
        eq(opportunityCommunications.opportunityId, id),
        eq(opportunityCommunications.organizationId, organizationId)
      ));

      // Delete related stakeholders
      await tx.delete(opportunityStakeholders).where(and(
        eq(opportunityStakeholders.opportunityId, id),
        eq(opportunityStakeholders.organizationId, organizationId)
      ));

      // Finally delete the opportunity itself
      await tx.delete(salesOpportunities).where(and(
        eq(salesOpportunities.id, id),
        eq(salesOpportunities.organizationId, organizationId)
      ));
    });
  }

  // Opportunity next steps operations
  async getOpportunityNextSteps(opportunityId: string): Promise<OpportunityNextStep[]> {
    const organizationId = getOrganizationId();
    return await db
      .select({
        id: opportunityNextSteps.id,
        opportunityId: opportunityNextSteps.opportunityId,
        title: opportunityNextSteps.title,
        description: opportunityNextSteps.description,
        assignedTo: opportunityNextSteps.assignedTo,
        dueDate: opportunityNextSteps.dueDate,
        priority: opportunityNextSteps.priority,
        status: opportunityNextSteps.status,
        completedAt: opportunityNextSteps.completedAt,
        completedBy: opportunityNextSteps.completedBy,
        createdBy: opportunityNextSteps.createdBy,
        createdAt: opportunityNextSteps.createdAt,
        updatedAt: opportunityNextSteps.updatedAt,
        assignedUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(opportunityNextSteps)
      .leftJoin(users, eq(opportunityNextSteps.assignedTo, users.id))
      .where(and(
        eq(opportunityNextSteps.opportunityId, opportunityId),
        eq(opportunityNextSteps.organizationId, organizationId)
      ))
      .orderBy(desc(opportunityNextSteps.createdAt));
  }

  async getOpportunityNextStep(id: string): Promise<OpportunityNextStep | undefined> {
    const organizationId = getOrganizationId();
    const [nextStep] = await db
      .select()
      .from(opportunityNextSteps)
      .where(and(
        eq(opportunityNextSteps.id, id),
        eq(opportunityNextSteps.organizationId, organizationId)
      ));
    return nextStep;
  }

  async createOpportunityNextStep(nextStep: InsertOpportunityNextStep): Promise<OpportunityNextStep> {
    const organizationId = getOrganizationId();
    return await db.transaction(async (tx) => {
      const [result] = await tx.insert(opportunityNextSteps).values({
        ...nextStep,
        organizationId
      }).returning();

      // Update parent opportunity's last activity date to the step creation time
      if (nextStep.opportunityId) {
        await tx.update(salesOpportunities)
          .set({ lastActivityDate: result.createdAt })
          .where(and(
            eq(salesOpportunities.id, nextStep.opportunityId),
            eq(salesOpportunities.organizationId, organizationId)
          ));
      }

      return result;
    });
  }

  async updateOpportunityNextStep(id: string, nextStep: Partial<InsertOpportunityNextStep>): Promise<OpportunityNextStep> {
    const organizationId = getOrganizationId();
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .update(opportunityNextSteps)
        .set({ ...nextStep, updatedAt: new Date() })
        .where(and(
          eq(opportunityNextSteps.id, id),
          eq(opportunityNextSteps.organizationId, organizationId)
        ))
        .returning();

      // Update parent opportunity's last activity date to the step's updated time
      if (result.opportunityId) {
        await tx.update(salesOpportunities)
          .set({ lastActivityDate: result.updatedAt })
          .where(and(
            eq(salesOpportunities.id, result.opportunityId),
            eq(salesOpportunities.organizationId, organizationId)
          ));
      }

      return result;
    });
  }

  async deleteOpportunityNextStep(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.transaction(async (tx) => {
      // Get the opportunity ID before deleting the next step
      const [nextStep] = await tx.select({ opportunityId: opportunityNextSteps.opportunityId })
        .from(opportunityNextSteps)
        .where(and(
          eq(opportunityNextSteps.id, id),
          eq(opportunityNextSteps.organizationId, organizationId)
        ));

      if (nextStep) {
        await tx.delete(opportunityNextSteps).where(and(
          eq(opportunityNextSteps.id, id),
          eq(opportunityNextSteps.organizationId, organizationId)
        ));
        
        // Update parent opportunity's last activity date
        await this.recomputeLastActivityDate(nextStep.opportunityId!, tx);
      }
    });
  }

  // Opportunity communications operations
  async getOpportunityCommunications(opportunityId: string): Promise<OpportunityCommunication[]> {
    const organizationId = getOrganizationId();
    return await db
      .select({
        id: opportunityCommunications.id,
        opportunityId: opportunityCommunications.opportunityId,
        type: opportunityCommunications.type,
        subject: opportunityCommunications.subject,
        summary: opportunityCommunications.summary,
        outcome: opportunityCommunications.outcome,
        attendees: opportunityCommunications.attendees,
        followUpRequired: opportunityCommunications.followUpRequired,
        followUpDate: opportunityCommunications.followUpDate,
        attachments: opportunityCommunications.attachments,
        recordedBy: opportunityCommunications.recordedBy,
        communicationDate: opportunityCommunications.communicationDate,
        createdAt: opportunityCommunications.createdAt,
        updatedAt: opportunityCommunications.updatedAt,
        recordedByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(opportunityCommunications)
      .leftJoin(users, eq(opportunityCommunications.recordedBy, users.id))
      .where(and(
        eq(opportunityCommunications.opportunityId, opportunityId),
        eq(opportunityCommunications.organizationId, organizationId)
      ))
      .orderBy(desc(opportunityCommunications.communicationDate));
  }

  async getOpportunityCommunication(id: string): Promise<OpportunityCommunication | undefined> {
    const organizationId = getOrganizationId();
    const [communication] = await db
      .select()
      .from(opportunityCommunications)
      .where(and(
        eq(opportunityCommunications.id, id),
        eq(opportunityCommunications.organizationId, organizationId)
      ));
    return communication;
  }

  async createOpportunityCommunication(communication: InsertOpportunityCommunication): Promise<OpportunityCommunication> {
    const organizationId = getOrganizationId();
    return await db.transaction(async (tx) => {
      const [result] = await tx.insert(opportunityCommunications).values({
        ...communication,
        organizationId
      }).returning();

      // Update parent opportunity's last activity date to the communication date
      if (communication.opportunityId) {
        await tx.update(salesOpportunities)
          .set({ lastActivityDate: result.communicationDate })
          .where(and(
            eq(salesOpportunities.id, communication.opportunityId),
            eq(salesOpportunities.organizationId, organizationId)
          ));
      }

      return result;
    });
  }

  async updateOpportunityCommunication(id: string, communication: Partial<InsertOpportunityCommunication>): Promise<OpportunityCommunication> {
    const organizationId = getOrganizationId();
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .update(opportunityCommunications)
        .set({ ...communication, updatedAt: new Date() })
        .where(and(
          eq(opportunityCommunications.id, id),
          eq(opportunityCommunications.organizationId, organizationId)
        ))
        .returning();

      // Update parent opportunity's last activity date to the communication date or updated time
      if (result.opportunityId) {
        await tx.update(salesOpportunities)
          .set({ lastActivityDate: result.communicationDate || result.updatedAt })
          .where(and(
            eq(salesOpportunities.id, result.opportunityId),
            eq(salesOpportunities.organizationId, organizationId)
          ));
      }

      return result;
    });
  }

  async deleteOpportunityCommunication(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.transaction(async (tx) => {
      // Get the opportunity ID before deleting the communication
      const [communication] = await tx.select({ opportunityId: opportunityCommunications.opportunityId })
        .from(opportunityCommunications)
        .where(and(
          eq(opportunityCommunications.id, id),
          eq(opportunityCommunications.organizationId, organizationId)
        ));
      
      if (communication) {
        await tx.delete(opportunityCommunications).where(and(
          eq(opportunityCommunications.id, id),
          eq(opportunityCommunications.organizationId, organizationId)
        ));

        // Update parent opportunity's last activity date
        await this.recomputeLastActivityDate(communication.opportunityId!, tx);
      }
    });
  }

  // Opportunity stakeholders operations
  async getOpportunityStakeholders(opportunityId: string): Promise<OpportunityStakeholder[]> {
    const organizationId = getOrganizationId();
    return await db
      .select({
        id: opportunityStakeholders.id,
        opportunityId: opportunityStakeholders.opportunityId,
        name: opportunityStakeholders.name,
        role: opportunityStakeholders.role,
        email: opportunityStakeholders.email,
        phone: opportunityStakeholders.phone,
        influence: opportunityStakeholders.influence,
        relationshipStrength: opportunityStakeholders.relationshipStrength,
        notes: opportunityStakeholders.notes,
        createdBy: opportunityStakeholders.createdBy,
        createdAt: opportunityStakeholders.createdAt,
        updatedAt: opportunityStakeholders.updatedAt,
        createdByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(opportunityStakeholders)
      .leftJoin(users, eq(opportunityStakeholders.createdBy, users.id))
      .where(and(
        eq(opportunityStakeholders.opportunityId, opportunityId),
        eq(opportunityStakeholders.organizationId, organizationId)
      ))
      .orderBy(opportunityStakeholders.name);
  }

  async getOpportunityStakeholder(id: string): Promise<OpportunityStakeholder | undefined> {
    const organizationId = getOrganizationId();
    const [stakeholder] = await db
      .select()
      .from(opportunityStakeholders)
      .where(and(
        eq(opportunityStakeholders.id, id),
        eq(opportunityStakeholders.organizationId, organizationId)
      ));
    return stakeholder;
  }

  async createOpportunityStakeholder(stakeholder: InsertOpportunityStakeholder): Promise<OpportunityStakeholder> {
    const organizationId = getOrganizationId();
    return await db.transaction(async (tx) => {
      const [result] = await tx.insert(opportunityStakeholders).values({
        ...stakeholder,
        organizationId
      }).returning();

      // Update parent opportunity's last activity date
      if (stakeholder.opportunityId) {
        await tx.update(salesOpportunities)
          .set({ lastActivityDate: new Date() })
          .where(and(
            eq(salesOpportunities.id, stakeholder.opportunityId),
            eq(salesOpportunities.organizationId, organizationId)
          ));
      }

      return result;
    });
  }

  async updateOpportunityStakeholder(id: string, stakeholder: Partial<InsertOpportunityStakeholder>): Promise<OpportunityStakeholder> {
    const organizationId = getOrganizationId();
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .update(opportunityStakeholders)
        .set({ ...stakeholder, updatedAt: new Date() })
        .where(and(
          eq(opportunityStakeholders.id, id),
          eq(opportunityStakeholders.organizationId, organizationId)
        ))
        .returning();

      // Update parent opportunity's last activity date
      if (result.opportunityId) {
        await tx.update(salesOpportunities)
          .set({ lastActivityDate: new Date() })
          .where(and(
            eq(salesOpportunities.id, result.opportunityId),
            eq(salesOpportunities.organizationId, organizationId)
          ));
      }

      return result;
    });
  }

  async deleteOpportunityStakeholder(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.transaction(async (tx) => {
      // Get the opportunity ID before deleting the stakeholder
      const [stakeholder] = await tx.select({ opportunityId: opportunityStakeholders.opportunityId })
        .from(opportunityStakeholders)
        .where(and(
          eq(opportunityStakeholders.id, id),
          eq(opportunityStakeholders.organizationId, organizationId)
        ));

      if (stakeholder) {
        await tx.delete(opportunityStakeholders).where(and(
          eq(opportunityStakeholders.id, id),
          eq(opportunityStakeholders.organizationId, organizationId)
        ));

        // Update parent opportunity's last activity date
        await this.recomputeLastActivityDate(stakeholder.opportunityId!, tx);
      }
    });
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(projects)
      .where(eq(projects.organizationId, organizationId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const organizationId = getOrganizationId();
    const [project] = await db.select().from(projects)
      .where(and(
        eq(projects.id, id),
        eq(projects.organizationId, organizationId)
      ));
    return project;
  }

  async getProjectsByClient(clientId: string): Promise<Project[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(projects)
      .where(and(
        eq(projects.clientId, clientId),
        eq(projects.organizationId, organizationId)
      ));
  }

  async createProject(project: InsertProject, organizationId?: string): Promise<Project> {
    const orgId = organizationId || getOrganizationId();
    const [newProject] = await db.insert(projects).values({
      ...project,
      organizationId: orgId
    }).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const organizationId = getOrganizationId();
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(and(
        eq(projects.id, id),
        eq(projects.organizationId, organizationId)
      ))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(projects).where(and(
      eq(projects.id, id),
      eq(projects.organizationId, organizationId)
    ));
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(tasks)
      .where(eq(tasks.organizationId, organizationId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const organizationId = getOrganizationId();
    const [task] = await db.select().from(tasks)
      .where(and(
        eq(tasks.id, id),
        eq(tasks.organizationId, organizationId)
      ));
    return task;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.projectId, projectId),
        eq(tasks.organizationId, organizationId)
      ));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.assignedTo, userId),
        eq(tasks.organizationId, organizationId)
      ));
  }

  async createTask(task: InsertTask, organizationId?: string): Promise<Task> {
    const orgId = organizationId || getOrganizationId();
    const [newTask] = await db.insert(tasks).values({
      ...task,
      organizationId: orgId
    }).returning();
    return newTask;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const organizationId = getOrganizationId();
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(and(
        eq(tasks.id, id),
        eq(tasks.organizationId, organizationId)
      ))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(tasks).where(and(
      eq(tasks.id, id),
      eq(tasks.organizationId, organizationId)
    ));
  }

  // Financial operations
  async getInvoices(): Promise<Invoice[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const organizationId = getOrganizationId();
    const [invoice] = await db.select().from(invoices)
      .where(and(
        eq(invoices.id, id),
        eq(invoices.organizationId, organizationId)
      ));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const organizationId = getOrganizationId();
    const [newInvoice] = await db.insert(invoices).values({
      ...invoice,
      organizationId
    }).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const organizationId = getOrganizationId();
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(and(
        eq(invoices.id, id),
        eq(invoices.organizationId, organizationId)
      ))
      .returning();
    return updatedInvoice;
  }

  async getExpenses(): Promise<Expense[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(expenses)
      .where(eq(expenses.organizationId, organizationId))
      .orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const organizationId = getOrganizationId();
    const [newExpense] = await db.insert(expenses).values({
      ...expense,
      organizationId
    }).returning();
    return newExpense;
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const organizationId = getOrganizationId();
    const [expense] = await db.select().from(expenses)
      .where(and(
        eq(expenses.id, id),
        eq(expenses.organizationId, organizationId)
      ));
    return expense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const organizationId = getOrganizationId();
    const [updatedExpense] = await db
      .update(expenses)
      .set(expense)
      .where(and(
        eq(expenses.id, id),
        eq(expenses.organizationId, organizationId)
      ))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(expenses).where(and(
      eq(expenses.id, id),
      eq(expenses.organizationId, organizationId)
    ));
  }

  async deleteInvoice(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(invoices).where(and(
      eq(invoices.id, id),
      eq(invoices.organizationId, organizationId)
    ));
  }

  // Knowledge operations
  async getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(knowledgeArticles)
      .where(eq(knowledgeArticles.organizationId, organizationId))
      .orderBy(desc(knowledgeArticles.createdAt));
  }

  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined> {
    const organizationId = getOrganizationId();
    const [article] = await db.select().from(knowledgeArticles)
      .where(and(
        eq(knowledgeArticles.id, id),
        eq(knowledgeArticles.organizationId, organizationId)
      ));
    return article;
  }

  async createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const organizationId = getOrganizationId();
    const [newArticle] = await db.insert(knowledgeArticles).values({
      ...article,
      organizationId
    }).returning();
    return newArticle;
  }

  async updateKnowledgeArticle(id: string, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle> {
    const organizationId = getOrganizationId();
    const [updatedArticle] = await db
      .update(knowledgeArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(and(
        eq(knowledgeArticles.id, id),
        eq(knowledgeArticles.organizationId, organizationId)
      ))
      .returning();
    return updatedArticle;
  }

  async deleteKnowledgeArticle(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(knowledgeArticles).where(and(
      eq(knowledgeArticles.id, id),
      eq(knowledgeArticles.organizationId, organizationId)
    ));
  }

  // Marketing operations
  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, organizationId))
      .orderBy(desc(marketingCampaigns.createdAt));
  }

  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    const organizationId = getOrganizationId();
    const [campaign] = await db.select().from(marketingCampaigns)
      .where(and(
        eq(marketingCampaigns.id, id),
        eq(marketingCampaigns.organizationId, organizationId)
      ));
    return campaign;
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const organizationId = getOrganizationId();
    const [newCampaign] = await db.insert(marketingCampaigns).values({
      ...campaign,
      organizationId
    }).returning();
    return newCampaign;
  }

  async updateMarketingCampaign(id: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign> {
    const organizationId = getOrganizationId();
    const [updatedCampaign] = await db
      .update(marketingCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(and(
        eq(marketingCampaigns.id, id),
        eq(marketingCampaigns.organizationId, organizationId)
      ))
      .returning();
    return updatedCampaign;
  }

  // Support operations
  async getSupportTickets(): Promise<SupportTicket[]> {
    const organizationId = getOrganizationId();
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.organizationId, organizationId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const organizationId = getOrganizationId();
    const [ticket] = await db.select().from(supportTickets)
      .where(and(
        eq(supportTickets.id, id),
        eq(supportTickets.organizationId, organizationId)
      ));
    return ticket;
  }

  // Generate unique ticket number atomically with retry logic
  private async generateUniqueTicketNumber(): Promise<string> {
    const organizationId = getOrganizationId();
    const maxRetries = 10;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      const ticketNumber = `ST-${year}${month}${day}-${time}${random}`;

      // Check if this ticket number already exists in this organization
      const [existing] = await db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(and(
          eq(supportTickets.ticketNumber, ticketNumber),
          eq(supportTickets.organizationId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return ticketNumber;
      }

      // Small delay before retry to avoid tight collision loops
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error('Failed to generate unique ticket number after maximum retries');
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const organizationId = getOrganizationId();
    // Server-side ticket number generation (never trust client)
    const ticketNumber = await this.generateUniqueTicketNumber();

    // Calculate business impact if not provided
    const businessImpact = ticket.businessImpact || calculateBusinessImpact(
      ticket.category || 'general',
      ticket.priority || 'medium'
    );

    // Get SLA configuration for this ticket type
    const slaKey = `${ticket.priority || 'medium'}-${businessImpact}`;
    const slaConfig = DEFAULT_SLA_CONFIGS[slaKey] || DEFAULT_SLA_CONFIGS['medium-medium'];

    const now = new Date();
    const responseTimeHours = ticket.responseTimeHours || slaConfig.responseTimeHours || 8;
    const resolutionTimeHours = ticket.resolutionTimeHours || slaConfig.resolutionTimeHours || 48;

    // Calculate SLA breach time
    const slaBreachAt = new Date(now.getTime() + (resolutionTimeHours * 60 * 60 * 1000));

    const ticketData = {
      ...ticket,
      ticketNumber,
      organizationId,
      businessImpact,
      responseTimeHours,
      resolutionTimeHours,
      slaBreachAt,
      slaStatus: 'on_track' as const,
      lastActivityAt: now,
      urgency: ticket.urgency || ticket.priority || 'medium',
      // Server always controls these timestamps
      createdAt: now,
      updatedAt: now,
    };

    const [newTicket] = await db.insert(supportTickets).values(ticketData).returning();
    return newTicket;
  }

  async updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket> {
    const organizationId = getOrganizationId();
    // Get current ticket to check status transitions
    const [currentTicket] = await db.select().from(supportTickets)
      .where(and(
        eq(supportTickets.id, id),
        eq(supportTickets.organizationId, organizationId)
      ));
    if (!currentTicket) {
      throw new Error('Ticket not found');
    }

    const updateData: any = {
      ...ticket,
      updatedAt: new Date(),
    };

    // Server-side timestamp authority for status transitions
    if (ticket.status && ticket.status !== currentTicket.status) {
      switch (ticket.status) {
        case 'resolved':
          updateData.resolvedAt = new Date();
          break;
        case 'closed':
          updateData.resolvedAt = updateData.resolvedAt || currentTicket.resolvedAt || new Date();
          break;
        case 'open':
        case 'in_progress':
          // Clear resolvedAt if reopening ticket
          updateData.resolvedAt = null;
          break;
      }
    }

    // Never allow client to override ticket number or system timestamps
    delete updateData.ticketNumber;
    delete updateData.createdAt;

    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(and(
        eq(supportTickets.id, id),
        eq(supportTickets.organizationId, organizationId)
      ))
      .returning();

    return updatedTicket;
  }

  async deleteSupportTicket(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(supportTickets).where(and(
      eq(supportTickets.id, id),
      eq(supportTickets.organizationId, organizationId)
    ));
  }

  // Support ticket comments operations
  async getSupportTicketComments(ticketId: string): Promise<SupportTicketComment[]> {
    const organizationId = getOrganizationId();
    return await db
      .select()
      .from(supportTicketComments)
      .where(and(
        eq(supportTicketComments.ticketId, ticketId),
        eq(supportTicketComments.organizationId, organizationId)
      ))
      .orderBy(supportTicketComments.createdAt);
  }

  async createSupportTicketComment(comment: InsertSupportTicketComment): Promise<SupportTicketComment> {
    const organizationId = getOrganizationId();
    const [newComment] = await db
      .insert(supportTicketComments)
      .values({
        ...comment,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newComment;
  }

  async updateSupportTicketComment(id: string, comment: UpdateSupportTicketComment): Promise<SupportTicketComment> {
    const organizationId = getOrganizationId();
    const [updatedComment] = await db
      .update(supportTicketComments)
      .set({
        ...comment,
        updatedAt: new Date(),
      })
      .where(and(
        eq(supportTicketComments.id, id),
        eq(supportTicketComments.organizationId, organizationId)
      ))
      .returning();
    return updatedComment;
  }

  async deleteSupportTicketComment(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(supportTicketComments).where(and(
      eq(supportTicketComments.id, id),
      eq(supportTicketComments.organizationId, organizationId)
    ));
  }

  // SLA configuration operations
  async getSlaConfigurations(): Promise<SlaConfiguration[]> {
    const organizationId = getOrganizationId();
    return await db
      .select()
      .from(slaConfigurations)
      .where(and(
        eq(slaConfigurations.isActive, true),
        eq(slaConfigurations.organizationId, organizationId)
      ))
      .orderBy(slaConfigurations.priority, slaConfigurations.name);
  }

  async getSlaConfiguration(id: string): Promise<SlaConfiguration | undefined> {
    const organizationId = getOrganizationId();
    const [config] = await db
      .select()
      .from(slaConfigurations)
      .where(and(
        eq(slaConfigurations.id, id),
        eq(slaConfigurations.organizationId, organizationId)
      ));
    return config;
  }

  async createSlaConfiguration(config: InsertSlaConfiguration): Promise<SlaConfiguration> {
    const organizationId = getOrganizationId();
    const [newConfig] = await db
      .insert(slaConfigurations)
      .values({
        ...config,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newConfig;
  }

  async updateSlaConfiguration(id: string, config: UpdateSlaConfiguration): Promise<SlaConfiguration> {
    const organizationId = getOrganizationId();
    const [updatedConfig] = await db
      .update(slaConfigurations)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(and(
        eq(slaConfigurations.id, id),
        eq(slaConfigurations.organizationId, organizationId)
      ))
      .returning();
    return updatedConfig;
  }

  async deleteSlaConfiguration(id: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.update(slaConfigurations)
      .set({ isActive: false })
      .where(and(
        eq(slaConfigurations.id, id),
        eq(slaConfigurations.organizationId, organizationId)
      ));
  }

  // Ticket escalation operations
  async getTicketEscalations(ticketId: string): Promise<TicketEscalation[]> {
    const organizationId = getOrganizationId();
    return await db
      .select()
      .from(ticketEscalations)
      .where(and(
        eq(ticketEscalations.ticketId, ticketId),
        eq(ticketEscalations.organizationId, organizationId)
      ))
      .orderBy(ticketEscalations.createdAt);
  }

  async createTicketEscalation(escalation: InsertTicketEscalation): Promise<TicketEscalation> {
    const organizationId = getOrganizationId();
    const [newEscalation] = await db
      .insert(ticketEscalations)
      .values({
        ...escalation,
        organizationId,
        createdAt: new Date(),
      })
      .returning();
    return newEscalation;
  }

  // Enhanced support operations
  async updateTicketSlaMetrics(ticketId: string, metrics: Partial<SupportTicket>): Promise<SupportTicket> {
    const organizationId = getOrganizationId();
    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        ...metrics,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.organizationId, organizationId)
      ))
      .returning();
    return updatedTicket;
  }

  async getOverdueTickets(): Promise<SupportTicket[]> {
    const organizationId = getOrganizationId();
    const now = new Date();
    return await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          or(
            eq(supportTickets.status, 'open'),
            eq(supportTickets.status, 'in_progress')
          ),
          lte(supportTickets.slaBreachAt, now)
        )
      )
      .orderBy(supportTickets.slaBreachAt);
  }

  async getTicketsNeedingEscalation(): Promise<SupportTicket[]> {
    const organizationId = getOrganizationId();
    const now = new Date();
    // Get tickets that are open/in_progress and past their escalation time
    return await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          or(
            eq(supportTickets.status, 'open'),
            eq(supportTickets.status, 'in_progress')
          ),
          lte(supportTickets.escalatedAt, now)
        )
      )
      .orderBy(supportTickets.createdAt);
  }

  // Support analytics operations
  async getSupportAnalytics(timeRange: { start: Date; end: Date }): Promise<any> {
    const organizationId = getOrganizationId();
    const { calculateSupportKPIs, calculateSupportTrends, generateSupportPredictions } = await import('@shared/supportAnalytics');

    // Get tickets in time range
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      );

    // Get previous period for comparison
    const periodLength = timeRange.end.getTime() - timeRange.start.getTime();
    const previousStart = new Date(timeRange.start.getTime() - periodLength);
    const previousEnd = timeRange.start;

    const previousTickets = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, previousStart),
          lte(supportTickets.createdAt, previousEnd)
        )
      );

    // Calculate KPIs and trends
    const kpis = calculateSupportKPIs(tickets, timeRange, previousTickets);
    const trends = calculateSupportTrends(tickets, timeRange);
    const predictions = generateSupportPredictions(tickets, trends);

    return {
      kpis,
      trends,
      predictions,
      timeRange,
      ticketCount: tickets.length
    };
  }

  async getAgentPerformanceMetrics(timeRange: { start: Date; end: Date }): Promise<any[]> {
    const organizationId = getOrganizationId();
    const { calculateAgentPerformance } = await import('@shared/supportAnalytics');

    // Get tickets and users
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      );

    const allUsers = await db.select().from(users);

    return calculateAgentPerformance(tickets, allUsers);
  }

  async getSupportTrends(timeRange: { start: Date; end: Date }): Promise<any> {
    const organizationId = getOrganizationId();
    const { calculateSupportTrends } = await import('@shared/supportAnalytics');

    const tickets = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      );

    return calculateSupportTrends(tickets, timeRange);
  }

  async getTicketVolumeByCategory(timeRange: { start: Date; end: Date }): Promise<any[]> {
    const organizationId = getOrganizationId();
    const results = await db
      .select({
        category: supportTickets.category,
        count: sql<number>`count(*)`,
        avgResolutionTime: sql<number>`avg(actual_resolution_minutes)`,
        slaCompliance: sql<number>`count(case when sla_status = 'on_track' then 1 end) * 100.0 / count(*)`
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      )
      .groupBy(supportTickets.category)
      .orderBy(desc(sql`count(*)`));

    return results.map(row => ({
      category: row.category || 'general',
      count: Number(row.count),
      avgResolutionTime: Number(row.avgResolutionTime) || 0,
      slaCompliance: Number(row.slaCompliance) || 0
    }));
  }

  async getResponseTimeMetrics(timeRange: { start: Date; end: Date }): Promise<any> {
    const organizationId = getOrganizationId();
    const [result] = await db
      .select({
        avgResponseTime: sql<number>`avg(actual_response_minutes)`,
        medianResponseTime: sql<number>`percentile_cont(0.5) within group (order by actual_response_minutes)`,
        p90ResponseTime: sql<number>`percentile_cont(0.9) within group (order by actual_response_minutes)`,
        avgResolutionTime: sql<number>`avg(actual_resolution_minutes)`,
        medianResolutionTime: sql<number>`percentile_cont(0.5) within group (order by actual_resolution_minutes)`,
        p90ResolutionTime: sql<number>`percentile_cont(0.9) within group (order by actual_resolution_minutes)`,
        totalTickets: sql<number>`count(*)`,
        respondedTickets: sql<number>`count(actual_response_minutes)`,
        resolvedTickets: sql<number>`count(actual_resolution_minutes)`
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      );

    return {
      avgResponseTime: Number(result.avgResponseTime) || 0,
      medianResponseTime: Number(result.medianResponseTime) || 0,
      p90ResponseTime: Number(result.p90ResponseTime) || 0,
      avgResolutionTime: Number(result.avgResolutionTime) || 0,
      medianResolutionTime: Number(result.medianResolutionTime) || 0,
      p90ResolutionTime: Number(result.p90ResolutionTime) || 0,
      responseRate: result.totalTickets > 0 ? (Number(result.respondedTickets) / Number(result.totalTickets)) * 100 : 0,
      resolutionRate: result.totalTickets > 0 ? (Number(result.resolvedTickets) / Number(result.totalTickets)) * 100 : 0
    };
  }

  async getSLAComplianceReport(timeRange: { start: Date; end: Date }): Promise<any> {
    const organizationId = getOrganizationId();
    const [overall] = await db
      .select({
        totalTickets: sql<number>`count(*)`,
        onTrack: sql<number>`count(case when sla_status = 'on_track' then 1 end)`,
        atRisk: sql<number>`count(case when sla_status = 'at_risk' then 1 end)`,
        breached: sql<number>`count(case when sla_status = 'breached' then 1 end)`,
        avgSatisfaction: sql<number>`avg(satisfaction_rating)`
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      );

    const byPriority = await db
      .select({
        priority: supportTickets.priority,
        totalTickets: sql<number>`count(*)`,
        onTrack: sql<number>`count(case when sla_status = 'on_track' then 1 end)`,
        breached: sql<number>`count(case when sla_status = 'breached' then 1 end)`,
        complianceRate: sql<number>`count(case when sla_status = 'on_track' then 1 end) * 100.0 / count(*)`
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      )
      .groupBy(supportTickets.priority);

    const byCategory = await db
      .select({
        category: supportTickets.category,
        totalTickets: sql<number>`count(*)`,
        complianceRate: sql<number>`count(case when sla_status = 'on_track' then 1 end) * 100.0 / count(*)`
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.organizationId, organizationId),
          gte(supportTickets.createdAt, timeRange.start),
          lte(supportTickets.createdAt, timeRange.end)
        )
      )
      .groupBy(supportTickets.category);

    return {
      overall: {
        totalTickets: Number(overall.totalTickets),
        onTrack: Number(overall.onTrack),
        atRisk: Number(overall.atRisk),
        breached: Number(overall.breached),
        complianceRate: overall.totalTickets > 0 ? (Number(overall.onTrack) / Number(overall.totalTickets)) * 100 : 100,
        avgSatisfaction: Number(overall.avgSatisfaction) || 0
      },
      byPriority: byPriority.map(row => ({
        priority: row.priority || 'medium',
        totalTickets: Number(row.totalTickets),
        onTrack: Number(row.onTrack),
        breached: Number(row.breached),
        complianceRate: Number(row.complianceRate) || 0
      })),
      byCategory: byCategory.map(row => ({
        category: row.category || 'general',
        totalTickets: Number(row.totalTickets),
        complianceRate: Number(row.complianceRate) || 0
      }))
    };
  }

  // System variables operations
  async getSystemVariables(): Promise<SystemVariable[]> {
    const organizationId = getOrganizationId();
    return await db
      .select()
      .from(systemVariables)
      .where(eq(systemVariables.organizationId, organizationId))
      .orderBy(systemVariables.category, systemVariables.key);
  }

  async getSystemVariable(key: string): Promise<SystemVariable | undefined> {
    const organizationId = getOrganizationId();
    const [variable] = await db
      .select()
      .from(systemVariables)
      .where(and(
        eq(systemVariables.key, key),
        eq(systemVariables.organizationId, organizationId)
      ));
    return variable;
  }

  async createSystemVariable(variableData: InsertSystemVariable): Promise<SystemVariable> {
    const organizationId = getOrganizationId();
    const [variable] = await db
      .insert(systemVariables)
      .values({
        ...variableData,
        organizationId
      })
      .returning();
    return variable;
  }

  async updateSystemVariable(key: string, variableData: UpdateSystemVariable): Promise<SystemVariable> {
    const organizationId = getOrganizationId();
    // First, check if the variable exists
    const existingVariable = await this.getSystemVariable(key);

    if (existingVariable) {
      // Update existing variable
      const [variable] = await db
        .update(systemVariables)
        .set({ ...variableData, updatedAt: new Date() })
        .where(and(
          eq(systemVariables.key, key),
          eq(systemVariables.organizationId, organizationId)
        ))
        .returning();
      return variable;
    } else {
      // Create new variable with default values
      const defaultData = {
        key,
        organizationId,
        value: variableData.value || '',
        description: variableData.description || '',
        category: variableData.category || 'general',
        dataType: variableData.dataType || 'string',
        isEditable: true,
        updatedBy: variableData.updatedBy,
      };

      const [variable] = await db
        .insert(systemVariables)
        .values(defaultData)
        .returning();
      return variable;
    }
  }

  async deleteSystemVariable(key: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(systemVariables).where(and(
      eq(systemVariables.key, key),
      eq(systemVariables.organizationId, organizationId)
    ));
  }

  // System settings operations (access control, domains, etc.)
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const organizationId = getOrganizationId();
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.key, key),
        eq(systemSettings.organizationId, organizationId)
      ));
    return setting;
  }

  async upsertSystemSetting(key: string, value: Record<string, any>): Promise<SystemSetting> {
    const organizationId = getOrganizationId();
    const [setting] = await db
      .insert(systemSettings)
      .values({ key, value, organizationId })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    const organizationId = getOrganizationId();
    return await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.organizationId, organizationId))
      .orderBy(systemSettings.key);
  }

  // User invitation operations
  async getUserInvitations(): Promise<UserInvitation[]> {
    const organizationId = getOrganizationId();
    return await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.organizationId, organizationId))
      .orderBy(desc(userInvitations.createdAt));
  }

  async getUserInvitation(token: string): Promise<UserInvitation | undefined> {
    const organizationId = getOrganizationId();
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(and(
        eq(userInvitations.token, token),
        eq(userInvitations.organizationId, organizationId)
      ));
    return invitation;
  }

  async createUserInvitation(invitationData: Omit<UserInvitation, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserInvitation> {
    const organizationId = getOrganizationId();
    const [invitation] = await db
      .insert(userInvitations)
      .values({
        ...invitationData,
        organizationId
      })
      .returning();
    return invitation;
  }

  async updateUserInvitation(token: string, data: Partial<Omit<UserInvitation, 'id' | 'token' | 'createdAt' | 'updatedAt'>>): Promise<UserInvitation> {
    const organizationId = getOrganizationId();
    const [invitation] = await db
      .update(userInvitations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(userInvitations.token, token),
        eq(userInvitations.organizationId, organizationId)
      ))
      .returning();
    return invitation;
  }

  async deleteUserInvitation(token: string): Promise<void> {
    const organizationId = getOrganizationId();
    await db.delete(userInvitations).where(and(
      eq(userInvitations.token, token),
      eq(userInvitations.organizationId, organizationId)
    ));
  }

  // Dashboard analytics
  async getDashboardKPIs(): Promise<{
    revenue: { current: number; target: number; growth: number };
    pipeline: { current: number; target: number; growth: number };
    projects: { current: number; target: number; growth: number };
    tickets: { current: number; target: number; growth: number };
  }> {
    const organizationId = getOrganizationId();
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const twoMonthsAgoDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);

    // Get business targets from system variables
    const businessTargets = await db
      .select()
      .from(systemVariables)
      .where(and(
        like(systemVariables.key, '%_target_%'),
        eq(systemVariables.organizationId, organizationId)
      ));

    const getTarget = (targetKey: string, defaultTarget: number) => {
      const target = businessTargets.find(t => t.key === targetKey);
      return target ? Number(target.value) : defaultTarget;
    };

    // Calculate revenue data with growth
    const [currentRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.status, 'paid'),
        eq(invoices.organizationId, organizationId)
      ));

    const [lastMonthRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.status, 'paid'),
        eq(invoices.organizationId, organizationId),
        sql`${invoices.paidAt} >= ${lastMonthDate.toISOString()}`,
        sql`${invoices.paidAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.status, 'paid'),
        eq(invoices.organizationId, organizationId),
        sql`${invoices.paidAt} >= ${twoMonthsAgoDate.toISOString()}`,
        sql`${invoices.paidAt} < ${lastMonthDate.toISOString()}`
      ));

    const revenueGrowth = twoMonthsAgoRevenue.total > 0
      ? ((lastMonthRevenue.total - twoMonthsAgoRevenue.total) / twoMonthsAgoRevenue.total) * 100
      : 0;

    // Calculate pipeline value (pending/draft invoices)
    const [currentPipeline] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        or(eq(invoices.status, 'pending'), eq(invoices.status, 'draft')),
        eq(invoices.organizationId, organizationId)
      ));

    const [lastMonthPipeline] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        or(eq(invoices.status, 'pending'), eq(invoices.status, 'draft')),
        eq(invoices.organizationId, organizationId),
        sql`${invoices.createdAt} >= ${lastMonthDate.toISOString()}`,
        sql`${invoices.createdAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoPipeline] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        or(eq(invoices.status, 'pending'), eq(invoices.status, 'draft')),
        eq(invoices.organizationId, organizationId),
        sql`${invoices.createdAt} >= ${twoMonthsAgoDate.toISOString()}`,
        sql`${invoices.createdAt} < ${lastMonthDate.toISOString()}`
      ));

    const pipelineGrowth = twoMonthsAgoPipeline.total > 0
      ? ((lastMonthPipeline.total - twoMonthsAgoPipeline.total) / twoMonthsAgoPipeline.total) * 100
      : 0;

    // Calculate active projects with growth
    const [currentProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        or(eq(projects.status, 'in_progress'), eq(projects.status, 'planning')),
        eq(projects.organizationId, organizationId)
      ));

    const [lastMonthProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        or(eq(projects.status, 'in_progress'), eq(projects.status, 'planning')),
        eq(projects.organizationId, organizationId),
        sql`${projects.createdAt} >= ${lastMonthDate.toISOString()}`,
        sql`${projects.createdAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        or(eq(projects.status, 'in_progress'), eq(projects.status, 'planning')),
        eq(projects.organizationId, organizationId),
        sql`${projects.createdAt} >= ${twoMonthsAgoDate.toISOString()}`,
        sql`${projects.createdAt} < ${lastMonthDate.toISOString()}`
      ));

    const projectsGrowth = twoMonthsAgoProjects.count > 0
      ? ((lastMonthProjects.count - twoMonthsAgoProjects.count) / twoMonthsAgoProjects.count) * 100
      : 0;

    // Calculate open tickets with growth
    const [currentTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')),
        eq(supportTickets.organizationId, organizationId)
      ));

    const [lastMonthTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')),
        eq(supportTickets.organizationId, organizationId),
        sql`${supportTickets.createdAt} >= ${lastMonthDate.toISOString()}`,
        sql`${supportTickets.createdAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')),
        eq(supportTickets.organizationId, organizationId),
        sql`${supportTickets.createdAt} >= ${twoMonthsAgoDate.toISOString()}`,
        sql`${supportTickets.createdAt} < ${lastMonthDate.toISOString()}`
      ));

    const ticketsGrowth = twoMonthsAgoTickets.count > 0
      ? ((lastMonthTickets.count - twoMonthsAgoTickets.count) / twoMonthsAgoTickets.count) * 100
      : 0;

    return {
      revenue: {
        current: Number(currentRevenue?.total || 0),
        target: getTarget('revenue_target_annual', 500000),
        growth: Math.round(revenueGrowth * 10) / 10,
      },
      pipeline: {
        current: Number(currentPipeline?.total || 0),
        target: getTarget('pipeline_target_annual', 200000),
        growth: Math.round(pipelineGrowth * 10) / 10,
      },
      projects: {
        current: currentProjects?.count || 0,
        target: getTarget('projects_target_annual', 25),
        growth: Math.round(projectsGrowth * 10) / 10,
      },
      tickets: {
        current: currentTickets?.count || 0,
        target: getTarget('tickets_target_max', 5), // Target is to keep tickets low
        growth: Math.round(ticketsGrowth * 10) / 10,
      },
    };
  }

  async getRevenueTrends(months: number = 6): Promise<Array<{
    month: string;
    year: number;
    revenue: number;
    invoiceCount: number;
  }>> {
    const organizationId = getOrganizationId();
    // Get revenue trends by grouping paid invoices by month
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${invoices.paidAt}, 'Mon')`,
        year: sql<number>`EXTRACT(YEAR FROM ${invoices.paidAt})::int`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${invoices.paidAt})::int`,
        revenue: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
        invoiceCount: sql<number>`COUNT(*)::int`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'paid'),
          eq(invoices.organizationId, organizationId),
          sql`${invoices.paidAt} >= CURRENT_DATE - INTERVAL '${sql.raw(months.toString())} months'`
        )
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${invoices.paidAt})`,
        sql`EXTRACT(MONTH FROM ${invoices.paidAt})`,
        sql`TO_CHAR(${invoices.paidAt}, 'Mon')`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${invoices.paidAt})`,
        sql`EXTRACT(MONTH FROM ${invoices.paidAt})`
      );

    // Fill in missing months with zero revenue
    const now = new Date();
    const trends: Array<{
      month: string;
      year: number;
      revenue: number;
      invoiceCount: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;

      const existingData = result.find(r => r.year === year && r.monthNum === monthNum);

      trends.push({
        month: monthName,
        year: year,
        revenue: existingData ? Number(existingData.revenue) : 0,
        invoiceCount: existingData ? existingData.invoiceCount : 0,
      });
    }

    return trends;
  }

  // Time tracking methods
  async getTimeEntries(options: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
    userId?: string;
  } = {}) {
    try {
      const organizationId = getOrganizationId();
      let query = db.select().from(timeEntries);
      const conditions = [eq(timeEntries.organizationId, organizationId)];

      if (options.startDate && options.endDate) {
        conditions.push(and(
          gte(timeEntries.date, new Date(options.startDate)),
          lte(timeEntries.date, new Date(options.endDate))
        ));
      }

      if (options.projectId) {
        conditions.push(eq(timeEntries.projectId, options.projectId));
      }

      if (options.userId) {
        conditions.push(eq(timeEntries.userId, options.userId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(timeEntries.date));
    } catch (error) {
      console.error("Error fetching time entries:", error);
      throw error;
    }
  }

  async createTimeEntry(data: {
    userId: string;
    projectId?: string;
    taskId?: string;
    description?: string;
    hours: number;
    date: Date;
    billable?: boolean;
    rate?: number;
  }) {
    try {
      const organizationId = getOrganizationId();
      const [result] = await db.insert(timeEntries).values({
        userId: data.userId,
        projectId: data.projectId,
        taskId: data.taskId,
        description: data.description,
        hours: data.hours.toString(),
        date: data.date,
        billable: data.billable ?? true,
        rate: data.rate?.toString(),
        organizationId
      }).returning();

      return result;
    } catch (error) {
      console.error("Error creating time entry:", error);
      throw error;
    }
  }

  async updateTimeEntry(id: string, data: Partial<{
    projectId: string;
    taskId: string;
    description: string;
    hours: number;
    date: Date;
    billable: boolean;
    rate: number;
  }>) {
    try {
      const organizationId = getOrganizationId();
      const updateData: any = {};

      if (data.projectId) updateData.projectId = data.projectId;
      if (data.taskId) updateData.taskId = data.taskId;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.hours !== undefined) updateData.hours = data.hours.toString();
      if (data.date) updateData.date = data.date;
      if (data.billable !== undefined) updateData.billable = data.billable;
      if (data.rate !== undefined) updateData.rate = data.rate.toString();

      const [result] = await db.update(timeEntries)
        .set(updateData)
        .where(and(
          eq(timeEntries.id, id),
          eq(timeEntries.organizationId, organizationId)
        ))
        .returning();

      return result;
    } catch (error) {
      console.error("Error updating time entry:", error);
      throw error;
    }
  }

  async deleteTimeEntry(id: string) {
    try {
      const organizationId = getOrganizationId();
      await db.delete(timeEntries).where(and(
        eq(timeEntries.id, id),
        eq(timeEntries.organizationId, organizationId)
      ));
    } catch (error) {
      console.error("Error deleting time entry:", error);
      throw error;
    }
  }

  async getTimeProductivityAnalytics(options: {
    startDate?: string;
    endDate?: string;
    userId: string;
  }) {
    try {
      const organizationId = getOrganizationId();
      const startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = options.endDate ? new Date(options.endDate) : new Date();

      // Get time entries for the period
      const entries = await db.select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.userId, options.userId),
          eq(timeEntries.organizationId, organizationId),
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate)
        ));

      // Calculate analytics
      const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.hours || "0"), 0);
      const billableHours = entries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours || "0"), 0);

      const billableRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
      const avgHoursPerDay = totalHours / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Project breakdown
      const projectBreakdown = entries.reduce((acc: any, entry) => {
        const projectId = entry.projectId || 'unassigned';
        if (!acc[projectId]) {
          acc[projectId] = { hours: 0, entries: 0 };
        }
        acc[projectId].hours += parseFloat(entry.hours || "0");
        acc[projectId].entries += 1;
        return acc;
      }, {});

      return {
        totalHours: totalHours.toFixed(2),
        billableHours: billableHours.toFixed(2),
        billableRate: billableRate.toFixed(1),
        avgHoursPerDay: avgHoursPerDay.toFixed(1),
        totalEntries: entries.length,
        projectBreakdown,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }
      };
    } catch (error) {
      console.error("Error fetching productivity analytics:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
