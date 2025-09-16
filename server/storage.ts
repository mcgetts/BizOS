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
  type User,
  type UpsertUser,
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
  updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket>;
  deleteSupportTicket(id: string): Promise<void>;
  
  // Dashboard analytics
  getDashboardKPIs(): Promise<{
    revenue: { current: number; target: number; growth: number };
    clients: { current: number; target: number; growth: number };
    projects: { current: number; target: number; growth: number };
    team: { current: number; target: number; growth: number };
  }>;
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

  // Dashboard analytics
  async getDashboardKPIs(): Promise<{
    revenue: { current: number; target: number; growth: number };
    clients: { current: number; target: number; growth: number };
    projects: { current: number; target: number; growth: number };
    team: { current: number; target: number; growth: number };
  }> {
    // Get total revenue from paid invoices
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(eq(invoices.status, 'paid'));

    // Get active clients count
    const [clientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.status, 'client'));

    // Get active projects count
    const [projectsResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(or(eq(projects.status, 'active'), eq(projects.status, 'planning')));

    // Get team members count
    const [teamResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.isActive, true), or(eq(users.role, 'employee'), eq(users.role, 'manager'))));

    return {
      revenue: {
        current: Number(revenueResult?.total || 0),
        target: 500000,
        growth: 12.5,
      },
      clients: {
        current: clientsResult?.count || 0,
        target: 50,
        growth: 8.3,
      },
      projects: {
        current: projectsResult?.count || 0,
        target: 25,
        growth: 0,
      },
      team: {
        current: teamResult?.count || 0,
        target: 45,
        growth: 5.0,
      },
    };
  }
}

export const storage = new DatabaseStorage();
