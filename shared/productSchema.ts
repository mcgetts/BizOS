// Product Management Schema
// Tables for product strategy, epics, features, sprints, and releases
// Note: Foreign key constraints will be added via Drizzle migrations
// This avoids circular dependency issues with the main schema

import { sql } from 'drizzle-orm';
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  Priority,
  ProductType,
  ProductStatus,
  EpicStatus,
  FeatureStatus,
  ConfidenceLevel,
  RiskLevel,
} from './constants';

// ====================================
// PRODUCT MANAGEMENT TABLES
// ====================================
// Foreign key relationships:
// - All tables -> organizations (cascade delete)
// - products -> users (ownerId)
// - epics -> products, users
// - features -> products, epics, releases, sprints, projects, users
// - userStories -> products, features, epics, sprints, tasks, users
// - sprints -> products
// - releases -> products
// - productBacklog -> products
// - roadmapItems -> products, epics
// ====================================

// Products table - Top-level product definition
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)

  // Basic Info
  name: varchar("name").notNull(),
  description: text("description"),
  productType: varchar("product_type").default("internal").$type<ProductType>(),

  // Ownership
  ownerId: varchar("owner_id"), // Foreign key to users table (defined in main schema)
  teamId: varchar("team_id"), // Optional team assignment

  // Integration with CRM
  opportunityId: varchar("opportunity_id"), // Foreign key to salesOpportunities table (defined in main schema)

  // Status & Planning
  status: varchar("status").default("discovery").$type<ProductStatus>(),
  vision: text("vision"), // Product vision statement
  targetAudience: text("target_audience"),
  goals: jsonb("goals").$type<Array<{
    id: string;
    goal: string;
    targetDate?: string;
    metrics?: string;
  }>>(),

  // Metadata
  tags: text("tags").array(),
  metadata: jsonb("metadata"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  launchedAt: timestamp("launched_at"),
}, (table) => [
  index("idx_products_org").on(table.organizationId),
  index("idx_products_owner").on(table.ownerId),
  index("idx_products_status").on(table.status),
]);

// Epics table - Large bodies of work (maps to roadmap phases)
export const epics = pgTable("epics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table
  productId: varchar("product_id"),
  // Foreign key to products table (same file)

  // Basic Info
  title: varchar("title").notNull(), // "Phase 11: UX Enhancement"
  description: text("description"),

  // Status & Priority
  status: varchar("status").default("planned").$type<EpicStatus>(),
  priority: varchar("priority").default("medium").$type<Priority>(),

  // Planning
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),
  progressPercentage: integer("progress").default(0), // 0-100

  // Roadmap Integration
  roadmapPhase: varchar("roadmap_phase"), // "Phase 11", "Phase 12"
  roadmapUrl: varchar("roadmap_url"), // Link to ROADMAP.md#phase-11

  // Scoring
  businessValue: integer("business_value"), // 1-100
  effort: integer("effort"), // Story points or days
  confidence: varchar("confidence").default("medium").$type<ConfidenceLevel>(),

  // Ownership
  ownerId: varchar("owner_id"),
  // Foreign key to users table

  // Metadata
  tags: text("tags").array(),
  dependencies: jsonb("dependencies").$type<Array<{
    epicId: string;
    type: string; // "blocks", "depends_on", "relates_to"
  }>>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_epics_org").on(table.organizationId),
  index("idx_epics_product").on(table.productId),
  index("idx_epics_status").on(table.status),
]);

// Features table - Discrete product capabilities
export const features = pgTable("features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)
  productId: varchar("product_id"),
  // Foreign key to products table (same file)
  epicId: varchar("epic_id"),
  // Foreign key to epics table (same file)

  // Basic Info
  title: varchar("title").notNull(), // "Command Palette"
  description: text("description"),

  // Acceptance Criteria
  acceptanceCriteria: jsonb("acceptance_criteria").$type<Array<{
    id: string;
    description: string;
    completed?: boolean;
  }>>(),

  // Status & Priority
  status: varchar("status").default("backlog").$type<FeatureStatus>(),
  priority: varchar("priority").default("medium").$type<Priority>(),

  // Estimation
  estimatedEffort: integer("estimated_effort"), // Story points or days
  actualEffort: integer("actual_effort"),

  // Value & Risk
  businessValue: integer("business_value"), // 1-100
  technicalRisk: varchar("technical_risk").default("medium").$type<RiskLevel>(),
  userImpact: varchar("user_impact"), // low, medium, high

  // Planning
  releaseId: varchar("release_id"),
  // Foreign key to releases table (same file)
  sprintId: varchar("sprint_id"),
  // Foreign key to sprints table (same file)
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),

  // Ownership
  ownerId: varchar("owner_id"),
  // Foreign key to users table (defined in main schema)
  assignedTo: varchar("assigned_to"),
  // Foreign key to users table (defined in main schema)

  // Integration with existing system
  projectId: varchar("project_id"),
  // Foreign key to projects table (defined in main schema)

  // Metadata
  tags: text("tags").array(),
  dependencies: jsonb("dependencies").$type<Array<{
    featureId: string;
    type: string;
  }>>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_features_org").on(table.organizationId),
  index("idx_features_epic").on(table.epicId),
  index("idx_features_sprint").on(table.sprintId),
  index("idx_features_release").on(table.releaseId),
  index("idx_features_status").on(table.status),
]);

// User Stories table - User-centric requirements
export const userStories = pgTable("user_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)
  productId: varchar("product_id"),
  // Foreign key to products table (same file)
  featureId: varchar("feature_id"),
  // Foreign key to features table (same file)
  epicId: varchar("epic_id"),
  // Foreign key to epics table (same file)

  // Story Format: "As a [type of user], I want [goal], so that [reason]"
  title: varchar("title").notNull(),
  asA: varchar("as_a"), // "As a power user"
  iWant: text("i_want"), // "I want keyboard shortcuts"
  soThat: text("so_that"), // "So that I can work faster"

  // Acceptance Criteria
  acceptanceCriteria: jsonb("acceptance_criteria").$type<Array<{
    id: string;
    description: string;
    completed?: boolean;
  }>>(),

  // Status & Priority
  status: varchar("status").default("backlog").$type<FeatureStatus>(),
  priority: varchar("priority").default("medium").$type<Priority>(),

  // Estimation
  storyPoints: integer("story_points"), // Fibonacci: 1, 2, 3, 5, 8, 13
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),

  // Sprint Planning
  sprintId: varchar("sprint_id"),
  // Foreign key to sprints table (same file)
  sprintOrder: integer("sprint_order"), // Order within sprint

  // Ownership
  assignedTo: varchar("assigned_to"),
  // Foreign key to users table (defined in main schema)
  createdBy: varchar("created_by"),
  // Foreign key to users table (defined in main schema)

  // Integration with existing tasks
  taskId: varchar("task_id"),
  // Foreign key to tasks table (defined in main schema)

  // Metadata
  tags: text("tags").array(),
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_user_stories_org").on(table.organizationId),
  index("idx_user_stories_feature").on(table.featureId),
  index("idx_user_stories_sprint").on(table.sprintId),
]);

// Sprints table - Time-boxed iterations
export const sprints = pgTable("sprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)
  productId: varchar("product_id"),
  // Foreign key to products table (same file)

  // Basic Info
  name: varchar("name").notNull(), // "Sprint 23"
  goal: text("goal"), // Sprint objective/theme

  // Dates
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),

  // Status
  status: varchar("status").default("planning"),
  // planning, active, completed, cancelled

  // Capacity Planning
  capacity: integer("capacity"), // Team capacity in story points
  committedPoints: integer("committed_points"),
  completedPoints: integer("completed_points"),

  // Velocity (for planning)
  velocityPrevious: integer("velocity_previous"),
  velocityAverage: integer("velocity_average"),

  // Retrospective
  retrospectiveNotes: text("retrospective_notes"),
  actionItems: jsonb("action_items").$type<Array<{
    action: string;
    owner?: string;
    done?: boolean;
  }>>(),

  // Metrics
  burndownData: jsonb("burndown_data").$type<Array<{
    date: string;
    remaining: number;
    ideal: number;
  }>>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_sprints_org").on(table.organizationId),
  index("idx_sprints_product").on(table.productId),
  index("idx_sprints_status").on(table.status),
]);

// Releases table - Version releases
export const releases = pgTable("releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)
  productId: varchar("product_id"),
  // Foreign key to products table (same file)

  // Version Info
  version: varchar("version").notNull(), // "10.1", "2.0.0"
  name: varchar("name"), // "Performance Update"
  description: text("description"),

  // Release Details
  releaseDate: timestamp("release_date"),
  status: varchar("status").default("planned"),
  // planned, in_progress, released, rolled_back

  // Release Notes
  releaseNotes: text("release_notes"), // Markdown format
  changelogUrl: varchar("changelog_url"),

  // Deployment Info
  deploymentEnvironment: varchar("deployment_environment"),
  deploymentUrl: varchar("deployment_url"),

  // Metrics
  featuresCount: integer("features_count"),
  bugFixesCount: integer("bug_fixes_count"),
  breakingChanges: boolean("breaking_changes").default(false),

  // Metadata
  tags: text("tags").array(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_releases_org").on(table.organizationId),
  index("idx_releases_product").on(table.productId),
]);

// Product Backlog table - Prioritized work queue
export const productBacklog = pgTable("product_backlog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)
  productId: varchar("product_id"),
  // Foreign key to products table (same file)

  // Item Reference (polymorphic)
  itemType: varchar("item_type").notNull(), // epic, feature, story
  itemId: varchar("item_id").notNull(),

  // Priority
  priority: integer("priority").notNull(), // Ordered: 1, 2, 3...
  priorityReason: text("priority_reason"),

  // Prioritization Framework
  priorityFramework: varchar("priority_framework"),
  // rice, moscow, value_effort, custom

  // RICE Scoring
  riceScore: jsonb("rice_score").$type<{
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    total: number;
  }>(),

  // MoSCoW
  moscowCategory: varchar("moscow_category"),
  // must, should, could, wont

  // Value vs Effort
  valueScore: integer("value_score"), // 1-10
  effortScore: integer("effort_score"), // 1-10

  // Metadata
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_backlog_org").on(table.organizationId),
  index("idx_backlog_product").on(table.productId),
  index("idx_backlog_priority").on(table.priority),
]);

// Roadmap Items table - Visual roadmap entries
export const roadmapItems = pgTable("roadmap_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  // Foreign key to organizations table (defined in main schema)
  productId: varchar("product_id"),
  // Foreign key to products table (same file)
  epicId: varchar("epic_id"),
  // Foreign key to epics table (same file)

  // Basic Info
  title: varchar("title").notNull(),
  description: text("description"),

  // Timeline
  timeframe: varchar("timeframe"), // Q1_2025, Q2_2025, H1_2025
  startMonth: varchar("start_month"), // 2025-01
  endMonth: varchar("end_month"),

  // Status
  status: varchar("status").default("planned"),
  confidence: varchar("confidence").default("medium").$type<ConfidenceLevel>(),

  // Categorization
  theme: varchar("theme"),
  // performance, ux, features, infrastructure, security
  category: varchar("category"),

  // Display
  color: varchar("color"),
  order: integer("order"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_roadmap_org").on(table.organizationId),
  index("idx_roadmap_product").on(table.productId),
  index("idx_roadmap_timeframe").on(table.timeframe),
]);

// ====================================
// ZOD SCHEMAS
// ====================================

// Products
const baseProductSchema = createInsertSchema(products, {
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  productType: z.enum(["internal", "client", "saas"]).optional(),
  status: z.enum(["discovery", "development", "launched", "maintenance", "sunset"]).optional(),
});

// Make organizationId optional since it's added by backend
export const insertProductSchema = baseProductSchema.extend({
  organizationId: z.string().optional(),
});

export const updateProductSchema = insertProductSchema.partial();

// Epics
const baseEpicSchema = createInsertSchema(epics, {
  title: z.string().min(1, "Epic title is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  productId: z.string(), // Required - must be provided by frontend
});

// Make organizationId optional since it's added by backend
export const insertEpicSchema = baseEpicSchema.extend({
  organizationId: z.string().optional(),
});

export const updateEpicSchema = insertEpicSchema.partial();

// Features
const baseFeatureSchema = createInsertSchema(features, {
  title: z.string().min(1, "Feature title is required"),
  description: z.string().optional(),
  status: z.enum(["backlog", "planned", "in_progress", "in_review", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  productId: z.string(), // Required - must be provided by frontend
  epicId: z.string().optional(), // Optional - features can exist without epics
});

// Make organizationId optional since it's added by backend
export const insertFeatureSchema = baseFeatureSchema.extend({
  organizationId: z.string().optional(),
});

export const updateFeatureSchema = insertFeatureSchema.partial();

// User Stories
const baseUserStorySchema = createInsertSchema(userStories, {
  title: z.string().min(1, "Story title is required"),
  asA: z.string().optional(),
  iWant: z.string().optional(),
  soThat: z.string().optional(),
  status: z.enum(["backlog", "planned", "in_progress", "in_review", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  productId: z.string().optional(), // Optional - can be inferred from feature
  featureId: z.string().optional(), // Optional
  epicId: z.string().optional(), // Optional
});

// Make organizationId optional since it's added by backend
export const insertUserStorySchema = baseUserStorySchema.extend({
  organizationId: z.string().optional(),
});

export const updateUserStorySchema = insertUserStorySchema.partial();

// Sprints
export const insertSprintSchema = createInsertSchema(sprints, {
  name: z.string().min(1, "Sprint name is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["planning", "active", "completed", "cancelled"]).optional(),
});

export const updateSprintSchema = insertSprintSchema.partial();

// Releases
export const insertReleaseSchema = createInsertSchema(releases, {
  version: z.string().min(1, "Version is required"),
  name: z.string().optional(),
  status: z.enum(["planned", "in_progress", "released", "rolled_back"]).optional(),
});

export const updateReleaseSchema = insertReleaseSchema.partial();

// Product Backlog
export const insertProductBacklogSchema = createInsertSchema(productBacklog, {
  itemType: z.enum(["epic", "feature", "story"]),
  itemId: z.string().min(1),
  priority: z.number().int().positive(),
});

export const updateProductBacklogSchema = insertProductBacklogSchema.partial();

// Roadmap Items
export const insertRoadmapItemSchema = createInsertSchema(roadmapItems, {
  title: z.string().min(1, "Title is required"),
  timeframe: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "delayed", "cancelled"]).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
});

export const updateRoadmapItemSchema = insertRoadmapItemSchema.partial();

// ====================================
// TYPESCRIPT TYPES
// ====================================

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

export type Epic = typeof epics.$inferSelect;
export type InsertEpic = z.infer<typeof insertEpicSchema>;
export type UpdateEpic = z.infer<typeof updateEpicSchema>;

export type Feature = typeof features.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type UpdateFeature = z.infer<typeof updateFeatureSchema>;

export type UserStory = typeof userStories.$inferSelect;
export type InsertUserStory = z.infer<typeof insertUserStorySchema>;
export type UpdateUserStory = z.infer<typeof updateUserStorySchema>;

export type Sprint = typeof sprints.$inferSelect;
export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type UpdateSprint = z.infer<typeof updateSprintSchema>;

export type Release = typeof releases.$inferSelect;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type UpdateRelease = z.infer<typeof updateReleaseSchema>;

export type ProductBacklogItem = typeof productBacklog.$inferSelect;
export type InsertProductBacklogItem = z.infer<typeof insertProductBacklogSchema>;
export type UpdateProductBacklogItem = z.infer<typeof updateProductBacklogSchema>;

export type RoadmapItem = typeof roadmapItems.$inferSelect;
export type InsertRoadmapItem = z.infer<typeof insertRoadmapItemSchema>;
export type UpdateRoadmapItem = z.infer<typeof updateRoadmapItemSchema>;

// Extended types with relations
export type ProductWithEpics = Product & {
  epics: Epic[];
};

export type EpicWithFeatures = Epic & {
  features: Feature[];
};

export type FeatureWithStories = Feature & {
  userStories: UserStory[];
};

export type SprintWithStories = Sprint & {
  userStories: UserStory[];
  features: Feature[];
};

export type ReleaseWithFeatures = Release & {
  features: Feature[];
};
