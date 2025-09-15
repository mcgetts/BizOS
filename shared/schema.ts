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

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  company: varchar("company"),
  industry: varchar("industry"),
  website: varchar("website"),
  address: text("address"),
  status: varchar("status").default("lead"), // lead, qualified, proposal, client, inactive
  source: varchar("source"), // referral, website, marketing, etc.
  assignedTo: varchar("assigned_to").references(() => users.id),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).default("0"),
  lastContactDate: timestamp("last_contact_date"),
  notes: text("notes"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  clientId: varchar("client_id").references(() => clients.id),
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
  clientId: varchar("client_id").references(() => clients.id),
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
  projects: many(projects),
  invoices: many(invoices),
  documents: many(documents),
  supportTickets: many(supportTickets),
  interactions: many(clientInteractions),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
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

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
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
export type TimeEntry = typeof timeEntries.$inferSelect;
export type ClientInteraction = typeof clientInteractions.$inferSelect;
