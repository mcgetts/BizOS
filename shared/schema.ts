import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("employee"), // admin, manager, employee, client
  department: varchar("department"),
  position: varchar("position"),
  phone: varchar("phone"),
  address: text("address"),
  skills: text("skills").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table (now represents individual contacts within companies)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  companyId: varchar("company_id").references(() => companies.id),
  position: varchar("position"), // Job title/position
  department: varchar("department"),
  isPrimaryContact: boolean("is_primary_contact").default(false),
  source: varchar("source"), // referral, website, marketing, etc.
  assignedTo: varchar("assigned_to").references(() => users.id),
  lastContactDate: timestamp("last_contact_date"),
  notes: text("notes"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  // Legacy fields to avoid data loss during migration
  company: varchar("company"),
  industry: varchar("industry"),
  website: varchar("website"),
  address: text("address"),
  status: varchar("status"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  companyId: varchar("company_id").references(() => companies.id),
  clientId: varchar("client_id").references(() => clients.id), // Secondary link to primary contact
  managerId: varchar("manager_id").references(() => users.id),
  status: varchar("status").default("planning"), // planning, active, review, completed, cancelled
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  budget: decimal("budget", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }).default("0"),
  progress: integer("progress").default(0), // 0-100
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  isClientPortalEnabled: boolean("is_client_portal_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").references(() => projects.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  status: varchar("status").default("todo"), // todo, in_progress, review, completed
  priority: varchar("priority").default("medium"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).default("0"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time entries table
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  taskId: varchar("task_id").references(() => tasks.id),
  description: text("description"),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  billable: boolean("billable").default(true),
  rate: decimal("rate", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").unique().notNull(),
  companyId: varchar("company_id").references(() => companies.id),
  clientId: varchar("client_id").references(() => clients.id), // Contact person
  projectId: varchar("project_id").references(() => projects.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("draft"), // draft, sent, paid, overdue, cancelled
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  terms: text("terms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category"), // travel, meals, supplies, software, etc.
  projectId: varchar("project_id").references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  receiptUrl: varchar("receipt_url"),
  billable: boolean("billable").default(false),
  reimbursed: boolean("reimbursed").default(false),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  category: varchar("category"), // contract, proposal, report, sop, training, etc.
  projectId: varchar("project_id").references(() => projects.id),
  clientId: varchar("client_id").references(() => clients.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  version: varchar("version").default("1.0"),
  isPublic: boolean("is_public").default(false),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge articles table
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category"), // sop, training, policy, faq, etc.
  tags: text("tags").array(),
  authorId: varchar("author_id").references(() => users.id),
  status: varchar("status").default("draft"), // draft, published, archived
  isPublic: boolean("is_public").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketing campaigns table
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type"), // email, social, paid_ads, content, etc.
  status: varchar("status").default("planning"), // planning, active, paused, completed
  budget: decimal("budget", { precision: 10, scale: 2 }),
  spent: decimal("spent", { precision: 10, scale: 2 }).default("0"),
  targetAudience: text("target_audience"),
  channels: text("channels").array(), // email, facebook, google, linkedin, etc.
  metrics: jsonb("metrics"), // impressions, clicks, conversions, etc.
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  managerId: varchar("manager_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number").unique().notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category"), // technical, billing, general, etc.
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  status: varchar("status").default("open"), // open, in_progress, resolved, closed
  clientId: varchar("client_id").references(() => clients.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  resolution: text("resolution"),
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company goals table
export const companyGoals = pgTable("company_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metric: varchar("metric").notNull(), // revenue, pipeline, projects, tickets
  target: decimal("target", { precision: 12, scale: 2 }).notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter"), // 1-4, null for annual goals
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System variables table
export const systemVariables = pgTable("system_variables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(), // e.g., 'default_currency', 'date_format', 'timezone'
  value: text("value").notNull(), // e.g., 'GBP', 'DD/MM/YYYY', 'Europe/London'
  description: text("description"), // Human-readable description
  category: varchar("category").default("general"), // general, localization, financial, etc.
  dataType: varchar("data_type").default("string"), // string, number, boolean, json
  isEditable: boolean("is_editable").default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client interactions table
export const clientInteractions = pgTable("client_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type"), // call, email, meeting, note, etc.
  subject: varchar("subject"),
  notes: text("notes"),
  outcome: varchar("outcome"), // positive, neutral, negative
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  industry: varchar("industry"),
  website: varchar("website"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  description: text("description"),
  size: varchar("size"), // small, medium, large, enterprise
  revenue: decimal("revenue", { precision: 12, scale: 2 }),
  foundedYear: integer("founded_year"),
  linkedinUrl: varchar("linkedin_url"),
  twitterUrl: varchar("twitter_url"),
  tags: text("tags").array(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales opportunities table for the CRM pipeline
export const salesOpportunities = pgTable("sales_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  companyId: varchar("company_id").references(() => companies.id),
  contactId: varchar("contact_id").references(() => clients.id), // Primary contact for this opportunity
  assignedTo: varchar("assigned_to").references(() => users.id),
  stage: varchar("stage").default("lead"), // lead, qualified, proposal, negotiation, closed_won, closed_lost
  value: decimal("value", { precision: 10, scale: 2 }),
  probability: integer("probability").default(50), // 0-100 percentage
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  source: varchar("source"), // referral, website, marketing, cold_outreach, etc.
  priority: varchar("priority").default("medium"), // low, medium, high
  tags: text("tags").array(),
  notes: text("notes"),
  painPoints: jsonb("pain_points"), // Array of client pain points/challenges
  successCriteria: jsonb("success_criteria"), // How success will be measured
  decisionProcess: text("decision_process"), // How decisions are made at the company
  budget: decimal("budget", { precision: 12, scale: 2 }), // Known or estimated budget
  budgetStatus: varchar("budget_status"), // approved, estimated, unknown, no_budget
  competitorInfo: jsonb("competitor_info"), // Competing solutions and vendors
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Opportunity next steps table
export const opportunityNextSteps = pgTable("opportunity_next_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  status: varchar("status").default("pending"), // pending, in_progress, completed, cancelled
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Opportunity communications table
export const opportunityCommunications = pgTable("opportunity_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // call, email, meeting, demo, proposal, contract
  subject: varchar("subject"),
  summary: text("summary"),
  outcome: varchar("outcome"), // positive, neutral, negative, no_response
  attendees: text("attendees").array(), // Contact names/emails who attended
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  attachments: jsonb("attachments"), // File references or URLs
  recordedBy: varchar("recorded_by").references(() => users.id),
  communicationDate: timestamp("communication_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Opportunity stakeholders table
export const opportunityStakeholders = pgTable("opportunity_stakeholders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  role: varchar("role"), // decision_maker, influencer, user, blocker, champion
  email: varchar("email"),
  phone: varchar("phone"),
  influence: varchar("influence").default("medium"), // low, medium, high
  relationshipStrength: varchar("relationship_strength").default("neutral"), // strong, neutral, weak, unknown
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Opportunity activity history table
export const opportunityActivityHistory = pgTable("opportunity_activity_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // e.g., "stage_changed", "next_step_added", "communication_logged"
  details: text("details"), // Human-readable description of what happened
  oldValue: text("old_value"), // Previous value (for updates)
  newValue: text("new_value"), // New value (for updates)
  performedBy: varchar("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  managedProjects: many(projects, { relationName: "manager" }),
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  timeEntries: many(timeEntries),
  expenses: many(expenses),
  uploadedDocuments: many(documents),
  knowledgeArticles: many(knowledgeArticles),
  managedCampaigns: many(marketingCampaigns),
  assignedTickets: many(supportTickets, { relationName: "assignee" }),
  createdTickets: many(supportTickets, { relationName: "creator" }),
  clientInteractions: many(clientInteractions),
}));

export const clientRelations = relations(clients, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [clients.assignedTo],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [clients.companyId],
    references: [companies.id],
  }),
  projects: many(projects),
  invoices: many(invoices),
  documents: many(documents),
  supportTickets: many(supportTickets),
  interactions: many(clientInteractions),
  opportunities: many(salesOpportunities, { relationName: "contact" }),
}));

export const companyRelations = relations(companies, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [companies.assignedTo],
    references: [users.id],
  }),
  clients: many(clients),
  projects: many(projects),
  invoices: many(invoices),
  opportunities: many(salesOpportunities),
}));

export const salesOpportunityRelations = relations(salesOpportunities, ({ one, many }) => ({
  company: one(companies, {
    fields: [salesOpportunities.companyId],
    references: [companies.id],
  }),
  contact: one(clients, {
    fields: [salesOpportunities.contactId],
    references: [clients.id],
    relationName: "contact",
  }),
  assignedUser: one(users, {
    fields: [salesOpportunities.assignedTo],
    references: [users.id],
  }),
  nextSteps: many(opportunityNextSteps),
  communications: many(opportunityCommunications),
  stakeholders: many(opportunityStakeholders),
  activityHistory: many(opportunityActivityHistory),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  manager: one(users, {
    fields: [projects.managerId],
    references: [users.id],
  }),
  tasks: many(tasks),
  timeEntries: many(timeEntries),
  invoices: many(invoices),
  expenses: many(expenses),
  documents: many(documents),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignee",
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  timeEntries: many(timeEntries),
}));

// Insert schemas
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  skills: z.array(z.string()).optional(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Fix date validation to handle Date objects from frontend
  dueDate: z.coerce.date().nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
}).extend({
  // Fix date validation to handle Date objects from frontend
  date: z.coerce.date(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  ticketNumber: true, // Server-generated, never accept from client
  resolvedAt: true,   // Server-generated on status change
  createdAt: true,
  updatedAt: true,
});

// Secure schema for updates that prevents client from setting system timestamps
export const updateSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  ticketNumber: true, // Never allow client to change ticket number
  resolvedAt: true,   // Server manages this based on status
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertCompanyGoalSchema = createInsertSchema(companyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanyGoalSchema = createInsertSchema(companyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertSystemVariableSchema = createInsertSchema(systemVariables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSystemVariableSchema = createInsertSchema(systemVariables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  revenue: z.string().nullable().optional().transform((val) => val === "" || !val ? null : val),
  foundedYear: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? parseInt(val, 10) : val;
  }),
  tags: z.array(z.string()).optional(),
});

export const insertSalesOpportunitySchema = createInsertSchema(salesOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  value: z.string().optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  actualCloseDate: z.coerce.date().nullable().optional(),
  lastActivityDate: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  successCriteria: z.array(z.string()).optional(),
  competitorInfo: z.array(z.object({
    name: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    notes: z.string().optional(),
  })).optional(),
});

// New table schemas
export const insertOpportunityNextStepSchema = createInsertSchema(opportunityNextSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  dueDate: z.coerce.date().nullable().optional(),
});

export const insertOpportunityCommunicationSchema = createInsertSchema(opportunityCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  communicationDate: z.coerce.date(),
  attendees: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
  })).optional(),
});

export const insertOpportunityStakeholderSchema = createInsertSchema(opportunityStakeholders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schemas that omit ownership fields for security
export const updateOpportunityNextStepSchema = insertOpportunityNextStepSchema.partial().omit({
  opportunityId: true,
  createdBy: true,
  completedBy: true,
});

export const updateOpportunityCommunicationSchema = insertOpportunityCommunicationSchema.partial().omit({
  opportunityId: true,
  recordedBy: true,
});

export const updateOpportunityStakeholderSchema = insertOpportunityStakeholderSchema.partial().omit({
  opportunityId: true,
  createdBy: true,
});

// New relations
export const opportunityNextStepRelations = relations(opportunityNextSteps, ({ one }) => ({
  opportunity: one(salesOpportunities, {
    fields: [opportunityNextSteps.opportunityId],
    references: [salesOpportunities.id],
  }),
  assignedUser: one(users, {
    fields: [opportunityNextSteps.assignedTo],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [opportunityNextSteps.completedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [opportunityNextSteps.createdBy],
    references: [users.id],
  }),
}));

export const opportunityCommunicationRelations = relations(opportunityCommunications, ({ one }) => ({
  opportunity: one(salesOpportunities, {
    fields: [opportunityCommunications.opportunityId],
    references: [salesOpportunities.id],
  }),
  recordedByUser: one(users, {
    fields: [opportunityCommunications.recordedBy],
    references: [users.id],
  }),
}));

export const opportunityStakeholderRelations = relations(opportunityStakeholders, ({ one }) => ({
  opportunity: one(salesOpportunities, {
    fields: [opportunityStakeholders.opportunityId],
    references: [salesOpportunities.id],
  }),
  createdByUser: one(users, {
    fields: [opportunityStakeholders.createdBy],
    references: [users.id],
  }),
}));

export const opportunityActivityHistoryRelations = relations(opportunityActivityHistory, ({ one }) => ({
  opportunity: one(salesOpportunities, {
    fields: [opportunityActivityHistory.opportunityId],
    references: [salesOpportunities.id],
  }),
  performedByUser: one(users, {
    fields: [opportunityActivityHistory.performedBy],
    references: [users.id],
  }),
}));

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type ClientWithCompany = Omit<Client, 'company'> & {
  company: {
    id: string;
    name: string;
    industry: string | null;
  } | null;
};
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type UpdateSupportTicket = z.infer<typeof updateSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertCompanyGoal = z.infer<typeof insertCompanyGoalSchema>;
export type UpdateCompanyGoal = z.infer<typeof updateCompanyGoalSchema>;
export type CompanyGoal = typeof companyGoals.$inferSelect;
export type InsertSystemVariable = z.infer<typeof insertSystemVariableSchema>;
export type UpdateSystemVariable = z.infer<typeof updateSystemVariableSchema>;
export type SystemVariable = typeof systemVariables.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertSalesOpportunity = z.infer<typeof insertSalesOpportunitySchema>;
export type SalesOpportunity = typeof salesOpportunities.$inferSelect;

// Enhanced type for API responses with joined data
export type SalesOpportunityWithRelations = Omit<SalesOpportunity, 'painPoints' | 'successCriteria' | 'competitorInfo'> & {
  painPoints?: string[] | null;
  successCriteria?: string[] | null;
  competitorInfo?: any | null;
  company?: {
    id: string;
    name: string;
    industry: string | null;
    website?: string | null;
  } | null;
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    position: string | null;
  } | null;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};
export type InsertOpportunityNextStep = z.infer<typeof insertOpportunityNextStepSchema>;
export type OpportunityNextStep = typeof opportunityNextSteps.$inferSelect;
export type InsertOpportunityCommunication = z.infer<typeof insertOpportunityCommunicationSchema>;
export type OpportunityCommunication = typeof opportunityCommunications.$inferSelect;
export type InsertOpportunityStakeholder = z.infer<typeof insertOpportunityStakeholderSchema>;
export type OpportunityStakeholder = typeof opportunityStakeholders.$inferSelect;
export type OpportunityActivityHistory = typeof opportunityActivityHistory.$inferSelect;
