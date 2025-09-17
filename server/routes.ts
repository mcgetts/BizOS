import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import {
  insertUserSchema,
  insertClientSchema,
  insertCompanySchema,
  insertSalesOpportunitySchema,
  insertProjectSchema,
  insertTaskSchema,
  insertInvoiceSchema,
  insertExpenseSchema,
  insertKnowledgeArticleSchema,
  insertMarketingCampaignSchema,
  insertSupportTicketSchema,
  updateSupportTicketSchema,
  clients,
  companies,
  salesOpportunities,
  projects,
  tasks,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  timeEntries,
  clientInteractions,
  documents,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Test reset endpoint - must be BEFORE auth setup to bypass authentication
  app.get('/api/test/reset', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Test reset endpoint only available in development' });
    }

    try {
      // Clear all database tables in reverse dependency order to avoid foreign key constraints
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
      await db.delete(salesOpportunities);
      await db.delete(clients);
      await db.delete(companies);
      // Note: Not clearing users table to keep authentication working
      
      res.json({ 
        message: 'Test data reset successfully', 
        cleared: [
          'timeEntries', 'clientInteractions', 'supportTickets', 
          'marketingCampaigns', 'knowledgeArticles', 'documents', 
          'expenses', 'invoices', 'tasks', 'projects', 'clients'
        ]
      });
    } catch (error) {
      console.error("Error resetting test data:", error);
      res.status(500).json({ message: "Failed to reset test data" });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Development-only authentication endpoint for testing - AFTER auth setup
  app.post('/api/auth/dev-login', async (req: any, res) => {
    console.log('Dev login endpoint hit, NODE_ENV:', process.env.NODE_ENV);
    
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Dev login endpoint only available in development' });
    }

    try {
      const testUserId = 'test-user-123';
      const testUser = {
        id: testUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        role: 'admin'
      };

      console.log('Creating test user:', testUser);
      
      // Ensure test user exists in database
      await storage.upsertUser(testUser);
      console.log('Test user upserted successfully');

      // Create mock claims and session data similar to OIDC flow
      const mockClaims = {
        sub: testUserId,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        profile_image_url: null,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      // Set up session data to mimic successful authentication
      const user = {
        claims: mockClaims,
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: mockClaims.exp
      };

      console.log('Setting up authentication session');

      // Manually set user data on request to mimic authentication
      req.user = user;
      
      // Manually set session as authenticated  
      if (req.session) {
        req.session.passport = { user: user };
        
        // Force session to be saved to ensure persistence
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save failed:', err);
            return res.status(500).json({ message: 'Failed to save session' });
          }
          
          console.log('Session established and saved successfully');
          res.json({ 
            message: 'Development authentication successful',
            user: testUser,
            authenticated: true,
            debug: 'Session set up and saved'
          });
        });
      } else {
        console.log('No session available');
        res.status(500).json({ message: 'Session not available' });
      }

    } catch (error) {
      console.error('Dev login failed:', error);
      res.status(500).json({ message: 'Dev authentication failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/kpis', isAuthenticated, async (req, res) => {
    try {
      const kpis = await storage.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get('/api/dashboard/revenue-trends', isAuthenticated, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const trends = await storage.getRevenueTrends(months);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching revenue trends:", error);
      res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
  });

  // System variables routes (admin only)
  app.get('/api/system-variables', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variables = await storage.getSystemVariables();
      res.json(variables);
    } catch (error) {
      console.error("Error fetching system variables:", error);
      res.status(500).json({ message: "Failed to fetch system variables" });
    }
  });

  app.get('/api/system-variables/:key', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variable = await storage.getSystemVariable(req.params.key);
      if (!variable) {
        return res.status(404).json({ message: "System variable not found" });
      }
      res.json(variable);
    } catch (error) {
      console.error("Error fetching system variable:", error);
      res.status(500).json({ message: "Failed to fetch system variable" });
    }
  });

  app.post('/api/system-variables', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variable = await storage.createSystemVariable({
        ...req.body,
        updatedBy: req.user.id,
      });
      res.status(201).json(variable);
    } catch (error) {
      console.error("Error creating system variable:", error);
      res.status(400).json({ message: "Failed to create system variable" });
    }
  });

  app.put('/api/system-variables/:key', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const variable = await storage.updateSystemVariable(req.params.key, {
        ...req.body,
        updatedBy: req.user.id,
      });
      res.json(variable);
    } catch (error) {
      console.error("Error updating system variable:", error);
      res.status(400).json({ message: "Failed to update system variable" });
    }
  });

  app.delete('/api/system-variables/:key', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteSystemVariable(req.params.key);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system variable:", error);
      res.status(400).json({ message: "Failed to delete system variable" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Company routes
  app.get('/api/companies', isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ message: "Failed to update company" });
    }
  });

  app.delete('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Sales Opportunity routes
  app.get('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getSalesOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.get('/api/opportunities/by-stage/:stage', isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getSalesOpportunitiesByStage(req.params.stage);
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities by stage:", error);
      res.status(500).json({ message: "Failed to fetch opportunities by stage" });
    }
  });

  app.get('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      const opportunity = await storage.getSalesOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  app.post('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSalesOpportunitySchema.parse(req.body);
      const opportunity = await storage.createSalesOpportunity(validatedData);
      res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      res.status(400).json({ message: "Failed to create opportunity" });
    }
  });

  app.put('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSalesOpportunitySchema.partial().parse(req.body);
      const opportunity = await storage.updateSalesOpportunity(req.params.id, validatedData);
      res.json(opportunity);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      res.status(400).json({ message: "Failed to update opportunity" });
    }
  });

  app.delete('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSalesOpportunity(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ message: "Failed to delete opportunity" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, validatedData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Financial routes
  app.get('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.get('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.put('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: "Failed to create expense" });
    }
  });

  app.get('/api/expenses/:id', isAuthenticated, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.put('/api/expenses/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validatedData);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(400).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/expenses/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Knowledge routes
  app.get('/api/knowledge', isAuthenticated, async (req, res) => {
    try {
      const articles = await storage.getKnowledgeArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching knowledge articles:", error);
      res.status(500).json({ message: "Failed to fetch knowledge articles" });
    }
  });

  app.get('/api/knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      const article = await storage.getKnowledgeArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Knowledge article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching knowledge article:", error);
      res.status(500).json({ message: "Failed to fetch knowledge article" });
    }
  });

  app.post('/api/knowledge', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertKnowledgeArticleSchema.parse(req.body);
      const article = await storage.createKnowledgeArticle(validatedData);
      res.status(201).json(article);
    } catch (error) {
      console.error("Error creating knowledge article:", error);
      res.status(400).json({ message: "Failed to create knowledge article" });
    }
  });

  app.put('/api/knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertKnowledgeArticleSchema.partial().parse(req.body);
      const article = await storage.updateKnowledgeArticle(req.params.id, validatedData);
      res.json(article);
    } catch (error) {
      console.error("Error updating knowledge article:", error);
      res.status(400).json({ message: "Failed to update knowledge article" });
    }
  });

  app.delete('/api/knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteKnowledgeArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge article:", error);
      res.status(500).json({ message: "Failed to delete knowledge article" });
    }
  });

  // Marketing routes
  app.get('/api/marketing/campaigns', isAuthenticated, async (req, res) => {
    try {
      const campaigns = await storage.getMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching marketing campaigns:", error);
      res.status(500).json({ message: "Failed to fetch marketing campaigns" });
    }
  });

  app.post('/api/marketing/campaigns', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMarketingCampaignSchema.parse(req.body);
      const campaign = await storage.createMarketingCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating marketing campaign:", error);
      res.status(400).json({ message: "Failed to create marketing campaign" });
    }
  });

  // Support routes
  app.get('/api/support/tickets', isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.post('/api/support/tickets', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSupportTicketSchema.parse(req.body);
      const ticket = await storage.createSupportTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(400).json({ message: "Failed to create support ticket" });
    }
  });

  app.get('/api/support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      res.status(500).json({ message: "Failed to fetch support ticket" });
    }
  });

  app.put('/api/support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      // Use secure validation schema that excludes system fields
      const validatedData = updateSupportTicketSchema.parse(req.body);
      const ticket = await storage.updateSupportTicket(req.params.id, validatedData);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating support ticket:", error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: "Invalid ticket data", details: error.message });
      } else {
        res.status(400).json({ message: "Failed to update support ticket" });
      }
    }
  });

  // DELETE operation requires admin or manager role
  app.delete('/api/support/tickets/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      await storage.deleteSupportTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting support ticket:", error);
      res.status(500).json({ message: "Failed to delete support ticket" });
    }
  });

  // API 404 handler - catch any unmatched /api routes before SPA fallback
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
