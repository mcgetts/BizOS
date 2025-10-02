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
import {
  INDUSTRIES,
  PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TEMPLATE_CATEGORIES,
  COMPANY_SIZES,
  USER_ROLES,
  type Industry,
  type Priority,
  type ProjectStatus,
  type TaskStatus,
  type TemplateCategory,
  type CompanySize,
  type UserRole
} from './constants';
import {
  DEPARTMENTS,
  ENHANCED_USER_ROLES,
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
  type Department,
  type EnhancedUserRole,
  type PermissionResource,
  type PermissionAction,
  type Permission
} from './permissions';

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
  // Multi-tenancy: users can belong to multiple organizations via organizationMembers
  // defaultOrganizationId stores the user's preferred/last-used organization
  defaultOrganizationId: varchar("default_organization_id").references(() => organizations.id),

  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Authentication fields
  passwordHash: varchar("password_hash"), // For local authentication
  authProvider: varchar("auth_provider").default("local"), // local, replit, google, github
  providerUserId: varchar("provider_user_id"), // ID from OAuth provider
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLoginAt: timestamp("last_login_at"),
  // User profile
  role: varchar("role").default("employee").$type<UserRole>(),
  enhancedRole: varchar("enhanced_role").default("employee").$type<EnhancedUserRole>(),
  department: varchar("department").$type<Department>(),
  position: varchar("position"),
  phone: varchar("phone"),
  address: text("address"),
  skills: text("skills").array(),
  isActive: boolean("is_active").default(true),
  // Enhanced security fields
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret"), // TOTP secret
  mfaBackupCodes: text("mfa_backup_codes").array(), // Recovery codes
  sessionLimit: integer("session_limit").default(5), // Concurrent session limit
  lastPasswordChange: timestamp("last_password_change"),
  passwordExpiresAt: timestamp("password_expires_at"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  twoFactorTempToken: varchar("two_factor_temp_token"), // Temporary token for 2FA setup
  twoFactorTempExpires: timestamp("two_factor_temp_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance index for default organization lookups
  index("idx_users_default_org").on(table.defaultOrganizationId),
]);

// Clients table (now represents individual contacts within companies)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_clients_org").on(table.organizationId),
]);

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  companyId: varchar("company_id").references(() => companies.id),
  clientId: varchar("client_id").references(() => clients.id), // Secondary link to primary contact
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id).unique(), // Link to the originating opportunity (unique to prevent duplicate projects)
  managerId: varchar("manager_id").references(() => users.id),
  status: varchar("status").default("planning").$type<ProjectStatus>(),
  priority: varchar("priority").default("medium").$type<Priority>(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }).default("0"),
  progress: integer("progress").default(0), // 0-100
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  isClientPortalEnabled: boolean("is_client_portal_enabled").default(true),
  // Enhanced fields for opportunity-to-project conversion
  requirements: text("requirements"), // Mapped from opportunity painPoints
  successCriteria: jsonb("success_criteria"), // Copied from opportunity successCriteria
  conversionDate: timestamp("conversion_date"), // When converted from opportunity
  originalValue: decimal("original_value", { precision: 10, scale: 2 }), // Original opportunity value
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_projects_org").on(table.organizationId),
]);

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").references(() => projects.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  status: varchar("status").default("todo").$type<TaskStatus>(),
  priority: varchar("priority").default("medium").$type<Priority>(),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).default("0"),
  startDate: timestamp("start_date"), // Planned start date for Gantt chart
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tasks_org").on(table.organizationId),
]);

// Time entries table
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  taskId: varchar("task_id").references(() => tasks.id),
  description: text("description"),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  billable: boolean("billable").default(true),
  rate: decimal("rate", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_time_entries_org").on(table.organizationId),
]);

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_invoices_org").on(table.organizationId),
]);

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_expenses_org").on(table.organizationId),
]);

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_documents_org").on(table.organizationId),
]);

// Knowledge articles table
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_knowledge_articles_org").on(table.organizationId),
]);

// Marketing campaigns table
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_marketing_campaigns_org").on(table.organizationId),
]);

// Opportunity file attachments table
export const opportunityFileAttachments = pgTable("opportunity_file_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id, { onDelete: "cascade" }),
  communicationId: varchar("communication_id").references(() => opportunityCommunications.id, { onDelete: "cascade" }), // Optional - link to specific communication
  fileName: varchar("file_name").notNull(),
  originalFileName: varchar("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type").notNull(),
  filePath: varchar("file_path").notNull(), // server storage path
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  description: text("description"), // Optional description of the file
  isPublic: boolean("is_public").default(false), // Whether file is shared with client
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_opportunity_file_attachments_org").on(table.organizationId),
]);

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
  // SLA and escalation tracking fields
  firstResponseAt: timestamp("first_response_at"), // When first response was given
  slaBreachAt: timestamp("sla_breach_at"), // When SLA will be/was breached
  escalatedAt: timestamp("escalated_at"), // When ticket was escalated
  escalationLevel: integer("escalation_level").default(0), // 0=none, 1=manager, 2=senior, 3=executive
  businessImpact: varchar("business_impact").default("low"), // low, medium, high, critical
  urgency: varchar("urgency").default("medium"), // low, medium, high, critical
  responseTimeHours: integer("response_time_hours"), // Target response time in hours
  resolutionTimeHours: integer("resolution_time_hours"), // Target resolution time in hours
  actualResponseMinutes: integer("actual_response_minutes"), // Actual response time in minutes
  actualResolutionMinutes: integer("actual_resolution_minutes"), // Actual resolution time in minutes
  slaStatus: varchar("sla_status").default("on_track"), // on_track, at_risk, breached
  lastActivityAt: timestamp("last_activity_at").defaultNow(), // Last activity timestamp
  tags: text("tags"), // JSON array of tags for categorization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_org").on(table.organizationId),
]);

// Support ticket comments table for internal collaboration
export const supportTicketComments = pgTable("support_ticket_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: varchar("ticket_id").references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(true), // true for internal, false for client-visible
  attachments: text("attachments"), // JSON array of file attachments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_ticket_comments_org").on(table.organizationId),
]);

// SLA configuration table
export const slaConfigurations = pgTable("sla_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  priority: varchar("priority").notNull(), // low, medium, high, urgent
  category: varchar("category"), // technical, billing, general, etc.
  businessImpact: varchar("business_impact"), // low, medium, high, critical
  responseTimeHours: integer("response_time_hours").notNull(),
  resolutionTimeHours: integer("resolution_time_hours").notNull(),
  escalationLevels: text("escalation_levels"), // JSON array of escalation rules
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sla_configurations_org").on(table.organizationId),
]);

// Ticket escalation history
export const ticketEscalations = pgTable("ticket_escalations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: varchar("ticket_id").references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  escalationLevel: integer("escalation_level").notNull(),
  reason: text("reason").notNull(),
  automatedRule: varchar("automated_rule"), // Rule that triggered auto-escalation
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ticket_escalations_org").on(table.organizationId),
]);

// Company goals table
export const companyGoals = pgTable("company_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  metric: varchar("metric").notNull(), // revenue, pipeline, projects, tickets
  target: decimal("target", { precision: 12, scale: 2 }).notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter"), // 1-4, null for annual goals
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_company_goals_org").on(table.organizationId),
]);

// System variables table
export const systemVariables = pgTable("system_variables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  key: varchar("key").unique().notNull(), // e.g., 'default_currency', 'date_format', 'timezone'
  value: text("value").notNull(), // e.g., 'GBP', 'DD/MM/YYYY', 'Europe/London'
  description: text("description"), // Human-readable description
  category: varchar("category").default("general"), // general, localization, financial, etc.
  dataType: varchar("data_type").default("string"), // string, number, boolean, json
  isEditable: boolean("is_editable").default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_system_variables_org").on(table.organizationId),
]);

// Client interactions table
export const clientInteractions = pgTable("client_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type"), // call, email, meeting, note, etc.
  subject: varchar("subject"),
  notes: text("notes"),
  outcome: varchar("outcome"), // positive, neutral, negative
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_client_interactions_org").on(table.organizationId),
]);

// ====================================
// MULTI-TENANCY TABLES
// ====================================

// Organizations table - represents separate tenant instances
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  subdomain: varchar("subdomain").notNull().unique(), // For tenant routing (e.g., "acme")
  slug: varchar("slug").notNull().unique(), // URL-safe identifier

  // Billing & plan information
  planTier: varchar("plan_tier").default("starter"), // starter, professional, enterprise
  status: varchar("status").default("trial"), // trial, active, suspended, cancelled
  billingEmail: varchar("billing_email"),
  billingStatus: varchar("billing_status").default("current"), // current, past_due, cancelled

  // Limits & features
  maxUsers: integer("max_users").default(5), // User limit per plan
  settings: jsonb("settings").$type<{
    features?: string[];
    branding?: { logo?: string; primaryColor?: string };
    notifications?: { email?: boolean; slack?: boolean };
  }>(),

  // Ownership
  ownerId: varchar("owner_id"), // Will reference users.id after users table is defined

  // Timestamps
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization Members - junction table for user-organization relationships
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id"), // Will reference users.id after users table is defined

  // Role within this organization
  role: varchar("role").default("member"), // owner, admin, member

  // Status
  status: varchar("status").default("active"), // active, invited, suspended
  invitedBy: varchar("invited_by"), // User ID who sent the invitation

  // Timestamps
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Composite unique constraint: user can only be in an organization once
  index("idx_org_members_unique").on(table.organizationId, table.userId),
]);

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  industry: varchar("industry").$type<Industry>(),
  website: varchar("website"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  description: text("description"),
  size: varchar("size").$type<CompanySize>(),
  revenue: decimal("revenue", { precision: 12, scale: 2 }),
  foundedYear: integer("founded_year"),
  linkedinUrl: varchar("linkedin_url"),
  twitterUrl: varchar("twitter_url"),
  tags: text("tags").array(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance index for tenant queries
  index("idx_companies_org").on(table.organizationId),
]);

// Sales opportunities table for the CRM pipeline
export const salesOpportunities = pgTable("sales_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_sales_opportunities_org").on(table.organizationId),
]);

// Opportunity next steps table
export const opportunityNextSteps = pgTable("opportunity_next_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_opportunity_next_steps_org").on(table.organizationId),
]);

// Opportunity communications table
export const opportunityCommunications = pgTable("opportunity_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_opportunity_communications_org").on(table.organizationId),
]);

// Opportunity stakeholders table
export const opportunityStakeholders = pgTable("opportunity_stakeholders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
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
}, (table) => [
  index("idx_opportunity_stakeholders_org").on(table.organizationId),
]);

// Opportunity activity history table
export const opportunityActivityHistory = pgTable("opportunity_activity_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  opportunityId: varchar("opportunity_id").references(() => salesOpportunities.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // e.g., "stage_changed", "next_step_added", "communication_logged"
  details: text("details"), // Human-readable description of what happened
  oldValue: text("old_value"), // Previous value (for updates)
  newValue: text("new_value"), // New value (for updates)
  performedBy: varchar("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_opportunity_activity_history_org").on(table.organizationId),
]);

// Project templates table
export const projectTemplates = pgTable("project_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  industry: varchar("industry").$type<Industry>(),
  category: varchar("category").$type<TemplateCategory>(),
  estimatedDuration: integer("estimated_duration"), // days
  defaultBudget: decimal("default_budget", { precision: 10, scale: 2 }),
  defaultPriority: varchar("default_priority").default("medium").$type<Priority>(),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_templates_org").on(table.organizationId),
]);

// Task templates for project templates
export const taskTemplates = pgTable("task_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectTemplateId: varchar("project_template_id").references(() => projectTemplates.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  priority: varchar("priority").default("medium").$type<Priority>(),
  phase: varchar("phase"), // planning, design, development, testing, launch
  orderIndex: integer("order_index").default(0),
  dependsOnPhase: varchar("depends_on_phase"), // previous phase dependency
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_task_templates_org").on(table.organizationId),
]);

// Task dependencies table
export const taskDependencies = pgTable("task_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: varchar("depends_on_task_id").references(() => tasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type").default("finish_to_start"), // finish_to_start, start_to_start, finish_to_finish, start_to_finish
  lag: integer("lag").default(0), // lag time in days
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_task_dependencies_org").on(table.organizationId),
]);

// Project comments and activity feed
export const projectComments = pgTable("project_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  type: varchar("type").default("comment"), // comment, status_update, milestone, file_upload
  mentionedUsers: text("mentioned_users").array(), // array of user IDs
  attachments: jsonb("attachments"), // file references
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_project_comments_org").on(table.organizationId),
]);

// Task comments for task-specific discussions
export const taskComments = pgTable("task_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  type: varchar("type").default("comment"), // comment, status_update, note
  mentionedUsers: text("mentioned_users").array(), // array of user IDs
  attachments: jsonb("attachments"), // file references
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_task_comments_org").on(table.organizationId),
]);

// Project activity log for automatic system updates
export const projectActivity = pgTable("project_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // created, updated, task_added, file_uploaded, etc.
  entityType: varchar("entity_type"), // project, task, comment, file
  entityId: varchar("entity_id"),
  details: jsonb("details"), // structured data about the change
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_project_activity_org").on(table.organizationId),
]);

// User capacity and availability tracking
export const userCapacity = pgTable("user_capacity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  hoursPerDay: decimal("hours_per_day", { precision: 4, scale: 2 }).default("8.00"), // Standard working hours per day
  hoursPerWeek: decimal("hours_per_week", { precision: 4, scale: 2 }).default("40.00"), // Standard working hours per week
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).default("1.50"), // Overtime rate multiplier
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"), // null means current
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_capacity_org").on(table.organizationId),
]);

// User availability periods (vacations, holidays, sick days, etc.)
export const userAvailability = pgTable("user_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // vacation, sick, holiday, training, partial_day
  status: varchar("status").default("approved"), // pending, approved, denied
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  hoursPerDay: decimal("hours_per_day", { precision: 4, scale: 2 }), // for partial days
  description: text("description"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_availability_org").on(table.organizationId),
]);

// User skills and competencies for resource allocation
export const userSkills = pgTable("user_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  skillName: varchar("skill_name").notNull(),
  category: varchar("category"), // technical, soft_skills, domain_knowledge, tools
  proficiencyLevel: integer("proficiency_level").default(1), // 1-5 scale
  yearsExperience: decimal("years_experience", { precision: 3, scale: 1 }),
  isCertified: boolean("is_certified").default(false),
  certificationName: varchar("certification_name"),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_skills_org").on(table.organizationId),
]);

// Resource allocations for projects and tasks
export const resourceAllocations = pgTable("resource_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  taskId: varchar("task_id").references(() => tasks.id), // optional - can be project-level
  allocationType: varchar("allocation_type").default("project"), // project, task, milestone
  allocatedHours: decimal("allocated_hours", { precision: 6, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  utilizationTarget: integer("utilization_target").default(100), // % of capacity to allocate
  priority: varchar("priority").default("medium").$type<Priority>(),
  status: varchar("status").default("active"), // active, completed, cancelled, on_hold
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resource_allocations_org").on(table.organizationId),
]);

// Budget categories for more granular budget tracking
export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  categoryType: varchar("category_type").notNull(), // labor, materials, software, travel, overhead
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_budget_categories_org").on(table.organizationId),
]);

// Project budget breakdown by category
export const projectBudgets = pgTable("project_budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  categoryId: varchar("category_id").references(() => budgetCategories.id),
  budgetedAmount: decimal("budgeted_amount", { precision: 10, scale: 2 }).notNull(),
  spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default("0"),
  committedAmount: decimal("committed_amount", { precision: 10, scale: 2 }).default("0"), // POs, contracts
  forecastAmount: decimal("forecast_amount", { precision: 10, scale: 2 }).default("0"), // projected final cost
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_budgets_org").on(table.organizationId),
]);

// Enhanced time entry approval workflow
export const timeEntryApprovals = pgTable("time_entry_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  timeEntryId: varchar("time_entry_id").references(() => timeEntries.id, { onDelete: "cascade" }),
  status: varchar("status").default("pending"), // pending, approved, rejected, needs_revision
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  approverNotes: text("approver_notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_time_entry_approvals_org").on(table.organizationId),
]);

// Workload snapshots for historical tracking and reporting
export const workloadSnapshots = pgTable("workload_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  snapshotDate: timestamp("snapshot_date").notNull(),
  totalAllocatedHours: decimal("total_allocated_hours", { precision: 6, scale: 2 }).notNull(),
  actualWorkedHours: decimal("actual_worked_hours", { precision: 6, scale: 2 }).default("0"),
  availableHours: decimal("available_hours", { precision: 6, scale: 2 }).notNull(),
  utilizationPercentage: decimal("utilization_percentage", { precision: 5, scale: 2 }),
  overallocationHours: decimal("overallocation_hours", { precision: 6, scale: 2 }).default("0"),
  activeProjectsCount: integer("active_projects_count").default(0),
  activeTasksCount: integer("active_tasks_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_workload_snapshots_org").on(table.organizationId),
]);

// Notifications table for real-time notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // task_created, task_updated, task_completed, project_updated, comment_added, dependency_changed
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional context data (task ID, project ID, etc.)
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_notifications_org").on(table.organizationId),
]);

// ====================================
// PHASE 2: ENHANCED SECURITY & RBAC TABLES
// ====================================

// Role definitions and permissions
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  department: varchar("department").$type<Department>(),
  isSystemRole: boolean("is_system_role").default(false), // Built-in vs custom roles
  isActive: boolean("is_active").default(true),
  permissions: text("permissions").array(), // Array of permission strings
  inheritFrom: varchar("inherit_from").references(() => roles.id), // Role inheritance
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_roles_org").on(table.organizationId),
]);

// User role assignments (many-to-many with additional context)
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration
  isActive: boolean("is_active").default(true),
  reason: text("reason"), // Why this role was assigned
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_role_assignments_org").on(table.organizationId),
]);

// User sessions for enhanced session management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionId: varchar("session_id").notNull().unique(), // Links to sessions table
  deviceInfo: jsonb("device_info"), // Browser, OS, etc.
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  location: jsonb("location"), // Geolocation data
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_sessions_org").on(table.organizationId),
]);

// Comprehensive audit log
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id), // Can be null for system actions
  sessionId: varchar("session_id"), // Link to user session
  action: varchar("action").notNull(), // create, read, update, delete, login, logout, etc.
  resource: varchar("resource").notNull().$type<PermissionResource>(),
  resourceId: varchar("resource_id"), // ID of the affected resource
  department: varchar("department").$type<Department>(),

  // Change tracking
  oldValues: jsonb("old_values"), // Previous state
  newValues: jsonb("new_values"), // New state
  changes: jsonb("changes"), // Specific fields changed

  // Context information
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceInfo: jsonb("device_info"),
  location: jsonb("location"),

  // Classification
  severity: varchar("severity").default("info"), // info, warning, critical
  category: varchar("category"), // security, data_change, system, user_action
  isSensitive: boolean("is_sensitive").default(false),
  requiresReview: boolean("requires_review").default(false),

  // Additional metadata
  metadata: jsonb("metadata"), // Flexible additional data
  tags: text("tags").array(), // Searchable tags
  description: text("description"), // Human-readable description

  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_org").on(table.organizationId),
]);

// Security events for monitoring
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  eventType: varchar("event_type").notNull(), // login_failed, login_success, mfa_enabled, password_changed, etc.
  severity: varchar("severity").notNull().default("info"), // low, medium, high, critical
  source: varchar("source"), // web, api, mobile, system

  // Event details
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint"),
  location: jsonb("location"),

  // Risk assessment
  riskScore: integer("risk_score").default(0), // 0-100
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),

  // Investigation
  isInvestigated: boolean("is_investigated").default(false),
  investigatedBy: varchar("investigated_by").references(() => users.id),
  investigatedAt: timestamp("investigated_at"),
  resolution: text("resolution"),

  // Metadata
  eventData: jsonb("event_data"), // Additional event-specific data
  correlationId: varchar("correlation_id"), // Link related events

  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_security_events_org").on(table.organizationId),
]);

// Data access logs for sensitive resources
export const dataAccessLogs = pgTable("data_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  resource: varchar("resource").notNull().$type<PermissionResource>(),
  resourceId: varchar("resource_id").notNull(),
  action: varchar("action").notNull().$type<PermissionAction>(),

  // Access context
  accessMethod: varchar("access_method"), // ui, api, export, etc.
  purpose: text("purpose"), // Business justification
  approvedBy: varchar("approved_by").references(() => users.id),

  // Data details
  fieldsAccessed: text("fields_accessed").array(), // Specific fields viewed/modified
  recordCount: integer("record_count").default(1),
  exportFormat: varchar("export_format"), // If data was exported

  // Classification
  dataClassification: varchar("data_classification").default("internal"), // public, internal, confidential, restricted
  isPersonalData: boolean("is_personal_data").default(false),
  isFinancialData: boolean("is_financial_data").default(false),

  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_data_access_logs_org").on(table.organizationId),
]);

// Permission exceptions and temporary access
export const permissionExceptions = pgTable("permission_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  resource: varchar("resource").notNull().$type<PermissionResource>(),
  action: varchar("action").notNull().$type<PermissionAction>(),

  // Exception details
  reason: text("reason").notNull(),
  approvedBy: varchar("approved_by").references(() => users.id).notNull(),
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),

  // Timing
  startsAt: timestamp("starts_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),

  // Usage tracking
  timesUsed: integer("times_used").default(0),
  lastUsedAt: timestamp("last_used_at"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_permission_exceptions_org").on(table.organizationId),
]);

// Multi-Factor Authentication tokens
export const mfaTokens = pgTable("mfa_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),

  // Token details
  type: varchar("type").notNull(), // 'totp' or 'sms'
  secret: text("secret").notNull(), // TOTP secret or SMS code
  phoneNumber: varchar("phone_number"), // For SMS

  // Timing
  expiresAt: timestamp("expires_at"), // For SMS codes
  isActive: boolean("is_active").default(false),

  // TOTP backup codes (JSON array)
  backupCodes: jsonb("backup_codes").$type<string[]>(),

  // Usage tracking
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_mfa_tokens_org").on(table.organizationId),
]);

// ====================================
// ACCESS CONTROL TABLES
// ====================================

// System settings for access control
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  key: varchar("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_system_settings_org").on(table.organizationId),
]);

// User invitations for controlled access
export const userInvitations = pgTable("user_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token").notNull().unique(),
  email: varchar("email").notNull(),
  role: varchar("role").default("employee").$type<UserRole>(),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),

  // Status tracking
  status: varchar("status").default("pending"), // pending, accepted, expired, revoked
  acceptedAt: timestamp("accepted_at"),
  acceptedByUserId: varchar("accepted_by_user_id").references(() => users.id),

  // Expiration
  expiresAt: timestamp("expires_at").notNull(),

  // Metadata
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_invitations_org").on(table.organizationId),
]);

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
  // Resource management relations
  capacity: many(userCapacity),
  availability: many(userAvailability),
  skills: many(userSkills),
  resourceAllocations: many(resourceAllocations),
  workloadSnapshots: many(workloadSnapshots),
  approvedTimeEntries: many(timeEntryApprovals, { relationName: "approver" }),
  notifications: many(notifications),
  // Enhanced security relations
  roleAssignments: many(userRoleAssignments),
  sessions: many(userSessions),
  auditLogs: many(auditLogs),
  securityEvents: many(securityEvents),
  dataAccessLogs: many(dataAccessLogs),
  permissionExceptions: many(permissionExceptions),
  mfaTokens: many(mfaTokens),
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
  fileAttachments: many(opportunityFileAttachments),
  projects: many(projects),
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
  opportunity: one(salesOpportunities, {
    fields: [projects.opportunityId],
    references: [salesOpportunities.id],
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
  comments: many(projectComments),
  activities: many(projectActivity),
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
  dependencies: many(taskDependencies, { relationName: "dependencies" }),
  dependents: many(taskDependencies, { relationName: "dependents" }),
  comments: many(taskComments),
}));

// Insert schemas
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  authProvider: true,
  providerUserId: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true, // Never allow client to set password hash directly
  emailVerificationToken: true, // Server-generated
  passwordResetToken: true, // Server-generated
  passwordResetExpires: true, // Server-generated
  createdAt: true,
  updatedAt: true,
}).extend({
  skills: z.array(z.string()).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

// Registration schema for new users
export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

// Login schema
export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

// Password reset schemas
export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  organizationId: true,
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
  organizationId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  conversionDate: z.coerce.date().nullable().optional(),
  requirements: z.string().optional(),
  successCriteria: z.any().optional(), // JSONB field
}).refine((data) => {
  // Validate that end date is not before start date
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

// Update schema without refine validation that works with .partial()
export const updateProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  conversionDate: z.coerce.date().nullable().optional(),
  requirements: z.string().optional(),
  successCriteria: z.any().optional(), // JSONB field
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().nullable().optional(),
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

// Support ticket comments schemas
export const insertSupportTicketCommentSchema = createInsertSchema(supportTicketComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSupportTicketCommentSchema = createInsertSchema(supportTicketComments).omit({
  id: true,
  ticketId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// SLA configuration schemas
export const insertSlaConfigurationSchema = createInsertSchema(slaConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSlaConfigurationSchema = createInsertSchema(slaConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Ticket escalation schemas
export const insertTicketEscalationSchema = createInsertSchema(ticketEscalations).omit({
  id: true,
  createdAt: true,
});

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
  organizationId: true,
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
  organizationId: true,
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
  organizationId: true, // Added by storage layer
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  dueDate: z.coerce.date().nullable().optional(),
});

export const insertOpportunityCommunicationSchema = createInsertSchema(opportunityCommunications).omit({
  id: true,
  organizationId: true, // Added by storage layer
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
  organizationId: true, // Added by storage layer
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

// Opportunity file attachment schemas
export const insertOpportunityFileAttachmentSchema = createInsertSchema(opportunityFileAttachments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true,
});

export const updateOpportunityFileAttachmentSchema = insertOpportunityFileAttachmentSchema.partial().omit({
  opportunityId: true,
  uploadedBy: true,
  fileName: true,
  filePath: true,
});

// New project template schemas
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  tags: z.array(z.string()).optional(),
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
}).extend({
  tags: z.array(z.string()).optional(),
});

export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({
  id: true,
  createdAt: true,
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
  editedAt: true,
}).extend({
  mentionedUsers: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number().optional(),
  })).optional(),
});

export const insertProjectActivitySchema = createInsertSchema(projectActivity).omit({
  id: true,
  createdAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  editedAt: true,
}).extend({
  mentionedUsers: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number().optional(),
  })).optional(),
});

// Resource Management Insert Schemas
export const insertUserCapacitySchema = createInsertSchema(userCapacity).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAvailabilitySchema = createInsertSchema(userAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSkillsSchema = createInsertSchema(userSkills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourceAllocationSchema = createInsertSchema(resourceAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({
  id: true,
  createdAt: true,
});

export const insertProjectBudgetSchema = createInsertSchema(projectBudgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimeEntryApprovalSchema = createInsertSchema(timeEntryApprovals).omit({
  id: true,
  createdAt: true,
});

export const insertWorkloadSnapshotSchema = createInsertSchema(workloadSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  organizationId: true, // Multi-tenant: Server provides this
  createdAt: true,
  updatedAt: true,
});

// ====================================
// PHASE 2: ENHANCED SECURITY SCHEMAS
// ====================================

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  permissions: z.array(z.string()).optional(),
});

export const updateRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  permissions: z.array(z.string()).optional(),
});

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
});

export const insertDataAccessLogSchema = createInsertSchema(dataAccessLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPermissionExceptionSchema = createInsertSchema(permissionExceptions).omit({
  id: true,
  createdAt: true,
});

export const insertMfaTokenSchema = createInsertSchema(mfaTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ====================================
// ACCESS CONTROL SCHEMAS
// ====================================

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSystemSettingSchema = insertSystemSettingSchema.partial();

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  token: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
});

export const updateUserInvitationSchema = insertUserInvitationSchema.partial();

// API request schemas for access control
export const accessControlDomainsSchema = z.object({
  domains: z.array(z.string().min(1)).default([]),
  requireDomain: z.boolean().default(false),
});

export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['admin', 'manager', 'employee', 'client']).default('employee'),
  expiresInDays: z.number().int().positive().max(90).optional(),
  notes: z.string().max(500).optional(),
});

// Enhanced user schema with security fields
export const insertEnhancedUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  emailVerificationToken: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  mfaSecret: true,
  mfaBackupCodes: true,
  twoFactorTempToken: true,
  twoFactorTempExpires: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  skills: z.array(z.string()).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  mfaBackupCodes: z.array(z.string()).optional(),
});

export const updateEnhancedUserSchema = insertEnhancedUserSchema.partial();

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

export const opportunityCommunicationRelations = relations(opportunityCommunications, ({ one, many }) => ({
  opportunity: one(salesOpportunities, {
    fields: [opportunityCommunications.opportunityId],
    references: [salesOpportunities.id],
  }),
  recordedByUser: one(users, {
    fields: [opportunityCommunications.recordedBy],
    references: [users.id],
  }),
  fileAttachments: many(opportunityFileAttachments),
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

// Opportunity file attachment relations
export const opportunityFileAttachmentRelations = relations(opportunityFileAttachments, ({ one }) => ({
  opportunity: one(salesOpportunities, {
    fields: [opportunityFileAttachments.opportunityId],
    references: [salesOpportunities.id],
  }),
  communication: one(opportunityCommunications, {
    fields: [opportunityFileAttachments.communicationId],
    references: [opportunityCommunications.id],
  }),
  uploadedByUser: one(users, {
    fields: [opportunityFileAttachments.uploadedBy],
    references: [users.id],
  }),
}));

// Project template relations
export const projectTemplateRelations = relations(projectTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [projectTemplates.createdBy],
    references: [users.id],
  }),
  taskTemplates: many(taskTemplates),
}));

export const taskTemplateRelations = relations(taskTemplates, ({ one }) => ({
  projectTemplate: one(projectTemplates, {
    fields: [taskTemplates.projectTemplateId],
    references: [projectTemplates.id],
  }),
}));

// Task dependency relations
export const taskDependencyRelations = relations(taskDependencies, ({ one }) => ({
  task: one(tasks, {
    fields: [taskDependencies.taskId],
    references: [tasks.id],
  }),
  dependsOnTask: one(tasks, {
    fields: [taskDependencies.dependsOnTaskId],
    references: [tasks.id],
  }),
}));

// Project communication relations
export const projectCommentRelations = relations(projectComments, ({ one }) => ({
  project: one(projects, {
    fields: [projectComments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectComments.userId],
    references: [users.id],
  }),
}));

// Task comment relations
export const taskCommentRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));

export const projectActivityRelations = relations(projectActivity, ({ one }) => ({
  project: one(projects, {
    fields: [projectActivity.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectActivity.userId],
    references: [users.id],
  }),
}));

// Resource Management Relations
export const userCapacityRelations = relations(userCapacity, ({ one }) => ({
  user: one(users, {
    fields: [userCapacity.userId],
    references: [users.id],
  }),
}));

export const userAvailabilityRelations = relations(userAvailability, ({ one }) => ({
  user: one(users, {
    fields: [userAvailability.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [userAvailability.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, {
    fields: [userSkills.userId],
    references: [users.id],
  }),
}));

export const resourceAllocationsRelations = relations(resourceAllocations, ({ one }) => ({
  user: one(users, {
    fields: [resourceAllocations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [resourceAllocations.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [resourceAllocations.taskId],
    references: [tasks.id],
  }),
  createdBy: one(users, {
    fields: [resourceAllocations.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({ many }) => ({
  projectBudgets: many(projectBudgets),
}));

export const projectBudgetsRelations = relations(projectBudgets, ({ one }) => ({
  project: one(projects, {
    fields: [projectBudgets.projectId],
    references: [projects.id],
  }),
  category: one(budgetCategories, {
    fields: [projectBudgets.categoryId],
    references: [budgetCategories.id],
  }),
}));

export const timeEntryApprovalsRelations = relations(timeEntryApprovals, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [timeEntryApprovals.timeEntryId],
    references: [timeEntries.id],
  }),
  approvedBy: one(users, {
    fields: [timeEntryApprovals.approvedBy],
    references: [users.id],
  }),
}));

export const workloadSnapshotsRelations = relations(workloadSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [workloadSnapshots.userId],
    references: [users.id],
  }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ====================================
// PHASE 2: ENHANCED SECURITY RELATIONS
// ====================================

export const rolesRelations = relations(roles, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [roles.createdBy],
    references: [users.id],
  }),
  inheritedFrom: one(roles, {
    fields: [roles.inheritFrom],
    references: [roles.id],
  }),
  userAssignments: many(userRoleAssignments),
}));

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userRoleAssignments.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoleAssignments.roleId],
    references: [roles.id],
  }),
  assignedBy: one(users, {
    fields: [userRoleAssignments.assignedBy],
    references: [users.id],
    relationName: "roleAssigner",
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, {
    fields: [securityEvents.userId],
    references: [users.id],
  }),
  investigatedBy: one(users, {
    fields: [securityEvents.investigatedBy],
    references: [users.id],
    relationName: "investigator",
  }),
}));

export const dataAccessLogsRelations = relations(dataAccessLogs, ({ one }) => ({
  user: one(users, {
    fields: [dataAccessLogs.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [dataAccessLogs.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
}));

export const permissionExceptionsRelations = relations(permissionExceptions, ({ one }) => ({
  user: one(users, {
    fields: [permissionExceptions.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [permissionExceptions.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
  requestedBy: one(users, {
    fields: [permissionExceptions.requestedBy],
    references: [users.id],
    relationName: "requester",
  }),
}));

export const mfaTokensRelations = relations(mfaTokens, ({ one }) => ({
  user: one(users, {
    fields: [mfaTokens.userId],
    references: [users.id],
  }),
}));

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
// Authentication types
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
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
export type InsertSupportTicketComment = z.infer<typeof insertSupportTicketCommentSchema>;
export type UpdateSupportTicketComment = z.infer<typeof updateSupportTicketCommentSchema>;
export type SupportTicketComment = typeof supportTicketComments.$inferSelect;
export type InsertSlaConfiguration = z.infer<typeof insertSlaConfigurationSchema>;
export type UpdateSlaConfiguration = z.infer<typeof updateSlaConfigurationSchema>;
export type SlaConfiguration = typeof slaConfigurations.$inferSelect;
export type InsertTicketEscalation = z.infer<typeof insertTicketEscalationSchema>;
export type TicketEscalation = typeof ticketEscalations.$inferSelect;
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
export type InsertOpportunityFileAttachment = z.infer<typeof insertOpportunityFileAttachmentSchema>;
export type OpportunityFileAttachment = typeof opportunityFileAttachments.$inferSelect;
export type InsertOpportunityStakeholder = z.infer<typeof insertOpportunityStakeholderSchema>;
export type OpportunityStakeholder = typeof opportunityStakeholders.$inferSelect;
export type OpportunityActivityHistory = typeof opportunityActivityHistory.$inferSelect;

// New types for project management enhancements
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertProjectActivity = z.infer<typeof insertProjectActivitySchema>;
export type ProjectActivity = typeof projectActivity.$inferSelect;

// Enhanced types with relations
export type ProjectTemplateWithTasks = ProjectTemplate & {
  taskTemplates: TaskTemplate[];
};

export type TaskWithDependencies = Task & {
  dependencies: TaskDependency[];
  dependents: TaskDependency[];
};

export type ProjectWithActivity = Project & {
  comments: ProjectComment[];
  activities: ProjectActivity[];
};

// Resource Management Types
export type InsertUserCapacity = z.infer<typeof insertUserCapacitySchema>;
export type UserCapacity = typeof userCapacity.$inferSelect;
export type InsertUserAvailability = z.infer<typeof insertUserAvailabilitySchema>;
export type UserAvailability = typeof userAvailability.$inferSelect;
export type InsertUserSkills = z.infer<typeof insertUserSkillsSchema>;
export type UserSkills = typeof userSkills.$inferSelect;
export type InsertResourceAllocation = z.infer<typeof insertResourceAllocationSchema>;
export type ResourceAllocation = typeof resourceAllocations.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertProjectBudget = z.infer<typeof insertProjectBudgetSchema>;
export type ProjectBudget = typeof projectBudgets.$inferSelect;
export type InsertTimeEntryApproval = z.infer<typeof insertTimeEntryApprovalSchema>;
export type TimeEntryApproval = typeof timeEntryApprovals.$inferSelect;
export type InsertWorkloadSnapshot = z.infer<typeof insertWorkloadSnapshotSchema>;
export type WorkloadSnapshot = typeof workloadSnapshots.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ====================================
// PHASE 2: ENHANCED SECURITY TYPES
// ====================================

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertDataAccessLog = z.infer<typeof insertDataAccessLogSchema>;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type InsertPermissionException = z.infer<typeof insertPermissionExceptionSchema>;
export type PermissionException = typeof permissionExceptions.$inferSelect;
export type InsertMfaToken = z.infer<typeof insertMfaTokenSchema>;
export type MfaToken = typeof mfaTokens.$inferSelect;
export type InsertEnhancedUser = z.infer<typeof insertEnhancedUserSchema>;
export type UpdateEnhancedUser = z.infer<typeof updateEnhancedUserSchema>;

// ====================================
// ACCESS CONTROL TYPES
// ====================================

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UpdateSystemSetting = z.infer<typeof updateSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;
export type UpdateUserInvitation = z.infer<typeof updateUserInvitationSchema>;
export type UserInvitation = typeof userInvitations.$inferSelect;

export type UserInvitationWithInviter = UserInvitation & {
  inviter: User;
};

// Enhanced user types with security information
export type UserWithSecurity = User & {
  roleAssignments: (UserRoleAssignment & {
    role: Role;
  })[];
  sessions: UserSession[];
  securityEvents: SecurityEvent[];
  permissionExceptions: PermissionException[];
};

export type RoleWithPermissions = Role & {
  userAssignments: (UserRoleAssignment & {
    user: User;
  })[];
};

export type AuditLogWithUser = AuditLog & {
  user: User | null;
};

export type SecurityEventWithUser = SecurityEvent & {
  user: User | null;
  investigatedBy: User | null;
};

// Enhanced resource management types with relations
export type UserWithCapacityAndSkills = User & {
  capacity: UserCapacity[];
  availability: UserAvailability[];
  skills: UserSkills[];
  resourceAllocations: ResourceAllocation[];
  workloadSnapshots: WorkloadSnapshot[];
};

export type ProjectWithBudgetBreakdown = Project & {
  budgets: (ProjectBudget & {
    category: BudgetCategory;
  })[];
};

export type ResourceAllocationWithDetails = ResourceAllocation & {
  user: User;
  project: Project;
  task?: Task;
};
