import {
  users,
  clients,
  projects,
  tasks,
  invoices,
  expenses,
  documents,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  timeEntries,
  clientInteractions,
  companyGoals,
  type User,
  type UpsertUser,
  type InsertUser,
  type InsertClient,
  type Client,
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
  type InsertCompanyGoal,
  type UpdateCompanyGoal,
  type CompanyGoal,
  type TimeEntry,
  type ClientInteraction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";

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
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
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

  // Company goals operations
  getCompanyGoals(): Promise<CompanyGoal[]>;
  getCompanyGoal(id: string): Promise<CompanyGoal | undefined>;
  createCompanyGoal(goal: InsertCompanyGoal): Promise<CompanyGoal>;
  updateCompanyGoal(id: string, goal: UpdateCompanyGoal): Promise<CompanyGoal>;
  deleteCompanyGoal(id: string): Promise<void>;

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
    await db.delete(users).where(eq(users.id, id));
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByClient(clientId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assignedTo, userId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Financial operations
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Knowledge operations
  async getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    return await db.select().from(knowledgeArticles).orderBy(desc(knowledgeArticles.createdAt));
  }

  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    return article;
  }

  async createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [newArticle] = await db.insert(knowledgeArticles).values(article).returning();
    return newArticle;
  }

  async updateKnowledgeArticle(id: string, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle> {
    const [updatedArticle] = await db
      .update(knowledgeArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(eq(knowledgeArticles.id, id))
      .returning();
    return updatedArticle;
  }

  async deleteKnowledgeArticle(id: string): Promise<void> {
    await db.delete(knowledgeArticles).where(eq(knowledgeArticles.id, id));
  }

  // Marketing operations
  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
  }

  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return campaign;
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [newCampaign] = await db.insert(marketingCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateMarketingCampaign(id: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign> {
    const [updatedCampaign] = await db
      .update(marketingCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  // Support operations
  async getSupportTickets(): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  // Generate unique ticket number atomically with retry logic
  private async generateUniqueTicketNumber(): Promise<string> {
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      const ticketNumber = `ST-${year}${month}${day}-${time}${random}`;
      
      // Check if this ticket number already exists
      const [existing] = await db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(eq(supportTickets.ticketNumber, ticketNumber))
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
    // Server-side ticket number generation (never trust client)
    const ticketNumber = await this.generateUniqueTicketNumber();
    
    const ticketData = {
      ...ticket,
      ticketNumber,
      // Server always controls these timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const [newTicket] = await db.insert(supportTickets).values(ticketData).returning();
    return newTicket;
  }

  async updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket> {
    // Get current ticket to check status transitions
    const [currentTicket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
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
      .where(eq(supportTickets.id, id))
      .returning();
    
    return updatedTicket;
  }

  async deleteSupportTicket(id: string): Promise<void> {
    await db.delete(supportTickets).where(eq(supportTickets.id, id));
  }

  // Company goals operations
  async getCompanyGoals(): Promise<CompanyGoal[]> {
    return await db
      .select()
      .from(companyGoals)
      .where(eq(companyGoals.isActive, true))
      .orderBy(desc(companyGoals.year), companyGoals.quarter);
  }

  async getCompanyGoal(id: string): Promise<CompanyGoal | undefined> {
    const [goal] = await db
      .select()
      .from(companyGoals)
      .where(eq(companyGoals.id, id));
    return goal;
  }

  async createCompanyGoal(goalData: InsertCompanyGoal): Promise<CompanyGoal> {
    const [goal] = await db
      .insert(companyGoals)
      .values(goalData)
      .returning();
    return goal;
  }

  async updateCompanyGoal(id: string, goalData: UpdateCompanyGoal): Promise<CompanyGoal> {
    const [goal] = await db
      .update(companyGoals)
      .set(goalData)
      .where(eq(companyGoals.id, id))
      .returning();
    return goal;
  }

  async deleteCompanyGoal(id: string): Promise<void> {
    await db.delete(companyGoals).where(eq(companyGoals.id, id));
  }

  // Dashboard analytics
  async getDashboardKPIs(): Promise<{
    revenue: { current: number; target: number; growth: number };
    pipeline: { current: number; target: number; growth: number };
    projects: { current: number; target: number; growth: number };
    tickets: { current: number; target: number; growth: number };
  }> {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const twoMonthsAgoDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);

    // Get company goals for current year
    const goals = await db
      .select()
      .from(companyGoals)
      .where(and(eq(companyGoals.year, currentYear), eq(companyGoals.isActive, true)));

    const getTarget = (metric: string, defaultTarget: number) => {
      const goal = goals.find(g => g.metric === metric);
      return goal ? Number(goal.target) : defaultTarget;
    };

    // Calculate revenue data with growth
    const [currentRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(eq(invoices.status, 'paid'));

    const [lastMonthRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.status, 'paid'),
        sql`${invoices.paidAt} >= ${lastMonthDate.toISOString()}`,
        sql`${invoices.paidAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.status, 'paid'),
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
      .where(or(eq(invoices.status, 'pending'), eq(invoices.status, 'draft')));

    const [lastMonthPipeline] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        or(eq(invoices.status, 'pending'), eq(invoices.status, 'draft')),
        sql`${invoices.createdAt} >= ${lastMonthDate.toISOString()}`,
        sql`${invoices.createdAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoPipeline] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(
        or(eq(invoices.status, 'pending'), eq(invoices.status, 'draft')),
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
      .where(or(eq(projects.status, 'in_progress'), eq(projects.status, 'planning')));

    const [lastMonthProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        or(eq(projects.status, 'in_progress'), eq(projects.status, 'planning')),
        sql`${projects.createdAt} >= ${lastMonthDate.toISOString()}`,
        sql`${projects.createdAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        or(eq(projects.status, 'in_progress'), eq(projects.status, 'planning')),
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
      .where(or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')));

    const [lastMonthTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')),
        sql`${supportTickets.createdAt} >= ${lastMonthDate.toISOString()}`,
        sql`${supportTickets.createdAt} < ${currentDate.toISOString()}`
      ));

    const [twoMonthsAgoTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')),
        sql`${supportTickets.createdAt} >= ${twoMonthsAgoDate.toISOString()}`,
        sql`${supportTickets.createdAt} < ${lastMonthDate.toISOString()}`
      ));

    const ticketsGrowth = twoMonthsAgoTickets.count > 0
      ? ((lastMonthTickets.count - twoMonthsAgoTickets.count) / twoMonthsAgoTickets.count) * 100
      : 0;

    return {
      revenue: {
        current: Number(currentRevenue?.total || 0),
        target: getTarget('revenue', 500000),
        growth: Math.round(revenueGrowth * 10) / 10,
      },
      pipeline: {
        current: Number(currentPipeline?.total || 0),
        target: getTarget('pipeline', 200000),
        growth: Math.round(pipelineGrowth * 10) / 10,
      },
      projects: {
        current: currentProjects?.count || 0,
        target: getTarget('projects', 25),
        growth: Math.round(projectsGrowth * 10) / 10,
      },
      tickets: {
        current: currentTickets?.count || 0,
        target: getTarget('tickets', 5), // Target is to keep tickets low
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
}

export const storage = new DatabaseStorage();
