# Product Management Module - Technical Specification

**Version**: 1.0
**Status**: Approved - Ready for Implementation
**Created**: 2025-10-03
**Owner**: Product & Engineering Teams

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Integration Points](#integration-points)
7. [Implementation Phases](#implementation-phases)
8. [Success Metrics](#success-metrics)

---

## 🎯 Executive Summary

### Purpose
Add a comprehensive Product Management layer to BizOS that enables teams to:
- Plan product features and roadmaps
- Manage backlogs with epics, stories, and tasks
- Run agile sprints with velocity tracking
- Track releases and versions
- Prioritize work using RICE, MoSCoW, and Value vs Effort frameworks

### Strategic Value
- **Dogfooding**: Use it to manage BizOS development itself
- **Market Differentiation**: Few PM tools have integrated product management
- **Enterprise Appeal**: Attracts product-led companies
- **Revenue Growth**: Premium feature for Professional/Enterprise tiers

### Effort Estimate
- **MVP**: 2-3 weeks
- **Full Implementation**: 6-8 weeks
- **ROI**: High - differentiation + internal use + revenue potential

---

## 🏗️ Architecture Overview

### Hierarchy Model

```
Organization
  └─ Product (e.g., "BizOS Platform", "Client Product X")
      ├─ Roadmap Items (visual planning)
      ├─ Epics (e.g., "Phase 11: UX Enhancement")
      │   ├─ Features (e.g., "Command Palette")
      │   │   ├─ User Stories (e.g., "As a power user...")
      │   │   │   └─ Tasks (existing tasks table)
      │   │   └─ (Optional) Projects (for client work)
      │   └─ Link to Sprints
      └─ Releases (e.g., "v10.1", "v10.2")
```

### Relationship to Existing System

```
Product Management (NEW)          │   Project Management (EXISTING)
                                   │
Product                            │   (may reference)
  ├─ Epics                         │         │
  │   └─ Features                  │         ↓
  │       └─ User Stories ─────────┼──→ Tasks
  │                                │         │
  └─ Sprints                       │         ↓
      └─ User Stories ─────────────┼──→ Projects (client work)
                                   │
```

### Key Principles

1. **Strategy ↔ Execution**: Product layer for planning, Projects layer for delivery
2. **Flexibility**: Works for internal products AND client products
3. **Integration**: Links to existing Tasks, Projects, Time Tracking
4. **Multi-tenant**: Full organizationId support throughout
5. **Agile-Ready**: Built for sprint-based workflows

---

## 💾 Database Schema

### Table Overview

| Table | Purpose | Key Fields | Relationships |
|-------|---------|------------|---------------|
| products | Top-level product definition | name, vision, status | → epics, features, sprints, releases |
| epics | Large bodies of work | title, roadmapPhase, progress | → features, sprints |
| features | Discrete capabilities | title, businessValue, effort | → userStories, releases |
| userStories | User-centric requirements | asA, iWant, soThat | → tasks (existing) |
| sprints | Time-boxed iterations | startDate, endDate, capacity | → userStories, features |
| releases | Version releases | version, releaseDate | → features |
| productBacklog | Prioritized work queue | priority, riceScore | references epics/features/stories |
| roadmapItems | Visual roadmap entries | timeframe, theme | → epics |

### Detailed Schema

#### 1. Products Table

```typescript
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),

  // Basic Info
  name: varchar("name").notNull(),
  description: text("description"),
  productType: varchar("product_type").default("internal"), // internal, client, saas

  // Ownership
  ownerId: varchar("owner_id").references(() => users.id), // Product Manager
  teamId: varchar("team_id"), // Optional team assignment

  // Status & Planning
  status: varchar("status").default("discovery"),
  // discovery, development, launched, maintenance, sunset
  vision: text("vision"), // Product vision statement
  targetAudience: text("target_audience"),
  goals: jsonb("goals"), // [{goal, targetDate, metrics}]

  // Metadata
  tags: text("tags").array(),
  metadata: jsonb("metadata"), // Flexible additional data

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  launchedAt: timestamp("launched_at"),
}, (table) => [
  index("idx_products_org").on(table.organizationId),
  index("idx_products_owner").on(table.ownerId),
]);
```

#### 2. Epics Table

```typescript
export const epics = pgTable("epics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),

  // Basic Info
  title: varchar("title").notNull(), // "Phase 11: UX Enhancement"
  description: text("description"),

  // Status & Priority
  status: varchar("status").default("planned"),
  // planned, in_progress, completed, cancelled
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
  confidence: varchar("confidence"), // low, medium, high

  // Ownership
  ownerId: varchar("owner_id").references(() => users.id),

  // Metadata
  tags: text("tags").array(),
  dependencies: jsonb("dependencies"), // [{epicId, type}]

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_epics_org").on(table.organizationId),
  index("idx_epics_product").on(table.productId),
  index("idx_epics_status").on(table.status),
]);
```

#### 3. Features Table

```typescript
export const features = pgTable("features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),
  epicId: varchar("epic_id")
    .references(() => epics.id, { onDelete: "set null" }),

  // Basic Info
  title: varchar("title").notNull(), // "Command Palette"
  description: text("description"),

  // Acceptance Criteria
  acceptanceCriteria: jsonb("acceptance_criteria"),
  // [{id, description, completed}]

  // Status & Priority
  status: varchar("status").default("backlog"),
  // backlog, planned, in_progress, in_review, completed, cancelled
  priority: varchar("priority").default("medium").$type<Priority>(),

  // Estimation
  estimatedEffort: integer("estimated_effort"), // Story points
  actualEffort: integer("actual_effort"),

  // Value & Risk
  businessValue: integer("business_value"), // 1-100
  technicalRisk: varchar("technical_risk").default("medium"), // low, medium, high
  userImpact: varchar("user_impact"), // low, medium, high

  // Planning
  releaseId: varchar("release_id")
    .references(() => releases.id, { onDelete: "set null" }),
  sprintId: varchar("sprint_id")
    .references(() => sprints.id, { onDelete: "set null" }),
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),

  // Ownership
  ownerId: varchar("owner_id").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),

  // Integration
  projectId: varchar("project_id")
    .references(() => projects.id, { onDelete: "set null" }),
  // Link to existing project for client work

  // Metadata
  tags: text("tags").array(),
  dependencies: jsonb("dependencies"), // [{featureId, type}]

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_features_org").on(table.organizationId),
  index("idx_features_epic").on(table.epicId),
  index("idx_features_sprint").on(table.sprintId),
  index("idx_features_release").on(table.releaseId),
]);
```

#### 4. User Stories Table

```typescript
export const userStories = pgTable("user_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),
  featureId: varchar("feature_id")
    .references(() => features.id, { onDelete: "cascade" }),
  epicId: varchar("epic_id")
    .references(() => epics.id, { onDelete: "set null" }),

  // Story Format: "As a [type of user], I want [goal], so that [reason]"
  title: varchar("title").notNull(), // Short title
  asA: varchar("as_a"), // "As a power user"
  iWant: text("i_want"), // "I want keyboard shortcuts"
  soThat: text("so_that"), // "So that I can work faster"

  // Acceptance Criteria
  acceptanceCriteria: jsonb("acceptance_criteria"),
  // [{id, description, completed}]

  // Status & Priority
  status: varchar("status").default("backlog"),
  // backlog, ready, in_progress, in_review, completed
  priority: varchar("priority").default("medium").$type<Priority>(),

  // Estimation
  storyPoints: integer("story_points"), // Fibonacci: 1, 2, 3, 5, 8, 13
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),

  // Sprint Planning
  sprintId: varchar("sprint_id")
    .references(() => sprints.id, { onDelete: "set null" }),
  sprintOrder: integer("sprint_order"), // Order within sprint

  // Ownership
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),

  // Integration with Tasks
  taskId: varchar("task_id")
    .references(() => tasks.id, { onDelete: "set null" }),
  // Link to existing task system

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
```

#### 5. Sprints Table

```typescript
export const sprints = pgTable("sprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),

  // Basic Info
  name: varchar("name").notNull(), // "Sprint 23" or "Week of Oct 7-18"
  goal: text("goal"), // Sprint objective/theme

  // Dates
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),

  // Status
  status: varchar("status").default("planning"),
  // planning, active, completed, cancelled

  // Capacity Planning
  capacity: integer("capacity"), // Team capacity in story points
  committedPoints: integer("committed_points"), // Committed at start
  completedPoints: integer("completed_points"), // Actually completed

  // Velocity (for planning)
  velocityPrevious: integer("velocity_previous"), // Last sprint
  velocityAverage: integer("velocity_average"), // Last 3 sprints avg

  // Retrospective
  retrospectiveNotes: text("retrospective_notes"),
  actionItems: jsonb("action_items"), // [{action, owner, done}]

  // Metrics
  burndownData: jsonb("burndown_data"),
  // [{date, remaining, ideal}] for burndown chart

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_sprints_org").on(table.organizationId),
  index("idx_sprints_product").on(table.productId),
  index("idx_sprints_status").on(table.status),
]);
```

#### 6. Releases Table

```typescript
export const releases = pgTable("releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),

  // Version Info
  version: varchar("version").notNull(), // "10.1", "10.2", "2.0.0"
  name: varchar("name"), // "Performance Update", "Mobile Launch"
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
  // production, staging, qa
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
```

#### 7. Product Backlog Table

```typescript
export const productBacklog = pgTable("product_backlog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),

  // Item Reference (polymorphic)
  itemType: varchar("item_type").notNull(), // epic, feature, story
  itemId: varchar("item_id").notNull(), // ID of epic/feature/story

  // Priority
  priority: integer("priority").notNull(), // Ordered: 1, 2, 3...
  priorityReason: text("priority_reason"),

  // Prioritization Framework
  priorityFramework: varchar("priority_framework"),
  // rice, moscow, value_effort, custom

  // RICE Scoring
  riceScore: jsonb("rice_score"),
  // {reach: 1000, impact: 2, confidence: 0.8, effort: 4, total: 400}

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
```

#### 8. Roadmap Items Table

```typescript
export const roadmapItems = pgTable("roadmap_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" }),
  epicId: varchar("epic_id")
    .references(() => epics.id, { onDelete: "cascade" }),

  // Basic Info
  title: varchar("title").notNull(),
  description: text("description"),

  // Timeline
  timeframe: varchar("timeframe"), // Q1_2025, Q2_2025, H1_2025, 2025
  startMonth: varchar("start_month"), // 2025-01, 2025-02
  endMonth: varchar("end_month"),

  // Status
  status: varchar("status").default("planned"),
  // planned, in_progress, completed, delayed, cancelled
  confidence: varchar("confidence").default("medium"), // low, medium, high

  // Categorization
  theme: varchar("theme"),
  // performance, ux, features, infrastructure, security
  category: varchar("category"),

  // Display
  color: varchar("color"), // For roadmap visualization
  order: integer("order"), // Display order

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_roadmap_org").on(table.organizationId),
  index("idx_roadmap_product").on(table.productId),
  index("idx_roadmap_timeframe").on(table.timeframe),
]);
```

### Database Relations

```typescript
// Products Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [products.ownerId],
    references: [users.id],
  }),
  epics: many(epics),
  features: many(features),
  sprints: many(sprints),
  releases: many(releases),
  roadmapItems: many(roadmapItems),
  backlogItems: many(productBacklog),
}));

// Epics Relations
export const epicsRelations = relations(epics, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [epics.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [epics.productId],
    references: [products.id],
  }),
  owner: one(users, {
    fields: [epics.ownerId],
    references: [users.id],
  }),
  features: many(features),
  roadmapItems: many(roadmapItems),
}));

// Features Relations
export const featuresRelations = relations(features, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [features.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [features.productId],
    references: [products.id],
  }),
  epic: one(epics, {
    fields: [features.epicId],
    references: [epics.id],
  }),
  release: one(releases, {
    fields: [features.releaseId],
    references: [releases.id],
  }),
  sprint: one(sprints, {
    fields: [features.sprintId],
    references: [sprints.id],
  }),
  project: one(projects, {
    fields: [features.projectId],
    references: [projects.id],
  }),
  userStories: many(userStories),
}));

// User Stories Relations
export const userStoriesRelations = relations(userStories, ({ one }) => ({
  organization: one(organizations, {
    fields: [userStories.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [userStories.productId],
    references: [products.id],
  }),
  feature: one(features, {
    fields: [userStories.featureId],
    references: [features.id],
  }),
  epic: one(epics, {
    fields: [userStories.epicId],
    references: [epics.id],
  }),
  sprint: one(sprints, {
    fields: [userStories.sprintId],
    references: [sprints.id],
  }),
  task: one(tasks, {
    fields: [userStories.taskId],
    references: [tasks.id],
  }),
  assignee: one(users, {
    fields: [userStories.assignedTo],
    references: [users.id],
  }),
}));

// Sprints Relations
export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sprints.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [sprints.productId],
    references: [products.id],
  }),
  userStories: many(userStories),
  features: many(features),
}));

// Releases Relations
export const releasesRelations = relations(releases, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [releases.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [releases.productId],
    references: [products.id],
  }),
  features: many(features),
}));
```

---

## 🔌 API Endpoints

### Products API

```typescript
// List all products
GET /api/products
Query params: ?status=launched&type=internal
Response: Product[]

// Create product
POST /api/products
Body: {
  name: string,
  description?: string,
  productType: "internal" | "client" | "saas",
  vision?: string,
  ownerId?: string
}
Response: Product

// Get product details
GET /api/products/:id
Response: Product & {
  epics: Epic[],
  activeSprintCount: number,
  featuresCount: { backlog, inProgress, completed }
}

// Update product
PATCH /api/products/:id
Body: Partial<Product>
Response: Product

// Delete product
DELETE /api/products/:id
Response: { success: boolean }

// Get product metrics
GET /api/products/:id/metrics
Response: {
  velocityTrend: number[],
  completionRate: number,
  activeFeatures: number,
  upcomingReleases: Release[]
}
```

### Epics API

```typescript
// List epics for product
GET /api/products/:productId/epics
Query: ?status=in_progress&roadmapPhase=Phase%2011
Response: Epic[]

// Create epic
POST /api/products/:productId/epics
Body: {
  title: string,
  description?: string,
  roadmapPhase?: string,
  priority?: Priority,
  businessValue?: number,
  effort?: number
}
Response: Epic

// Get epic details
GET /api/epics/:id
Response: Epic & {
  features: Feature[],
  progress: { completed, total, percentage }
}

// Update epic
PATCH /api/epics/:id
Body: Partial<Epic>
Response: Epic

// Delete epic
DELETE /api/epics/:id
Response: { success: boolean }

// Update epic progress (auto-calculated from features)
POST /api/epics/:id/calculate-progress
Response: { progressPercentage: number }
```

### Features API

```typescript
// List features
GET /api/epics/:epicId/features
GET /api/products/:productId/features
Query: ?status=in_progress&sprint=current
Response: Feature[]

// Create feature
POST /api/features
Body: {
  productId: string,
  epicId?: string,
  title: string,
  description?: string,
  acceptanceCriteria?: Array<{description: string}>,
  priority?: Priority,
  estimatedEffort?: number,
  businessValue?: number
}
Response: Feature

// Get feature details
GET /api/features/:id
Response: Feature & {
  userStories: UserStory[],
  tasks: Task[],
  progress: number
}

// Update feature
PATCH /api/features/:id
Body: Partial<Feature>
Response: Feature

// Move feature (change epic, sprint, or release)
PATCH /api/features/:id/move
Body: {
  epicId?: string,
  sprintId?: string,
  releaseId?: string
}
Response: Feature

// Link to project
POST /api/features/:id/link-project
Body: { projectId: string }
Response: Feature

// Convert to user stories
POST /api/features/:id/generate-stories
Body: {
  storyTemplates?: Array<{title, asA, iWant, soThat}>
}
Response: UserStory[]
```

### User Stories API

```typescript
// List stories
GET /api/features/:featureId/stories
GET /api/sprints/:sprintId/stories
Response: UserStory[]

// Create story
POST /api/stories
Body: {
  productId: string,
  featureId?: string,
  title: string,
  asA?: string,
  iWant?: string,
  soThat?: string,
  acceptanceCriteria?: Array<{description: string}>,
  storyPoints?: number
}
Response: UserStory

// Get story details
GET /api/stories/:id
Response: UserStory & {
  task?: Task,
  comments: Comment[]
}

// Update story
PATCH /api/stories/:id
Body: Partial<UserStory>
Response: UserStory

// Convert to task
POST /api/stories/:id/create-task
Response: Task

// Estimate story points
PATCH /api/stories/:id/estimate
Body: { storyPoints: number }
Response: UserStory
```

### Sprints API

```typescript
// List sprints
GET /api/products/:productId/sprints
Query: ?status=active&limit=10
Response: Sprint[]

// Get current sprint
GET /api/products/:productId/sprints/current
Response: Sprint

// Create sprint
POST /api/sprints
Body: {
  productId: string,
  name: string,
  startDate: Date,
  endDate: Date,
  goal?: string,
  capacity?: number
}
Response: Sprint

// Get sprint details
GET /api/sprints/:id
Response: Sprint & {
  userStories: UserStory[],
  features: Feature[],
  burndown: { date, remaining, ideal }[],
  velocity: number
}

// Update sprint
PATCH /api/sprints/:id
Body: Partial<Sprint>
Response: Sprint

// Start sprint
POST /api/sprints/:id/start
Response: Sprint

// Complete sprint
POST /api/sprints/:id/complete
Body: {
  retrospectiveNotes?: string,
  actionItems?: Array<{action, owner}>
}
Response: Sprint & { velocity: number }

// Get burndown data
GET /api/sprints/:id/burndown
Response: {
  data: Array<{ date, remaining, ideal }>,
  currentVelocity: number,
  projectedCompletion: Date
}

// Get velocity metrics
GET /api/sprints/:id/velocity
Response: {
  current: number,
  average: number,
  trend: number[]
}

// Move stories to sprint
POST /api/sprints/:id/add-stories
Body: { storyIds: string[] }
Response: { added: number }
```

### Backlog API

```typescript
// Get prioritized backlog
GET /api/products/:productId/backlog
Query: ?itemType=feature&limit=50
Response: Array<{
  item: Epic | Feature | UserStory,
  backlogEntry: ProductBacklog
}>

// Add to backlog
POST /api/backlog
Body: {
  productId: string,
  itemType: "epic" | "feature" | "story",
  itemId: string,
  priority?: number,
  priorityFramework?: string
}
Response: ProductBacklog

// Reorder backlog
PATCH /api/backlog/reorder
Body: {
  productId: string,
  reorderedIds: string[] // In new priority order
}
Response: { updated: number }

// Calculate RICE score
POST /api/backlog/:id/score/rice
Body: {
  reach: number,        // 1-10000
  impact: number,       // 0.25, 0.5, 1, 2, 3
  confidence: number,   // 0-100 (percentage)
  effort: number        // person-months
}
Response: {
  riceScore: number,
  priorityRecommendation: number
}

// Set MoSCoW category
PATCH /api/backlog/:id/moscow
Body: { category: "must" | "should" | "could" | "wont" }
Response: ProductBacklog

// Bulk prioritization
POST /api/backlog/bulk-prioritize
Body: {
  productId: string,
  framework: "rice" | "moscow" | "value_effort",
  items: Array<{ id, scores }>
}
Response: { updated: number }
```

### Releases API

```typescript
// List releases
GET /api/products/:productId/releases
Query: ?status=released&limit=10
Response: Release[]

// Create release
POST /api/releases
Body: {
  productId: string,
  version: string,
  name?: string,
  releaseDate?: Date,
  description?: string
}
Response: Release

// Get release details
GET /api/releases/:id
Response: Release & {
  features: Feature[],
  progress: { completed, total, percentage }
}

// Update release
PATCH /api/releases/:id
Body: Partial<Release>
Response: Release

// Get features in release
GET /api/releases/:id/features
Response: Feature[]

// Add features to release
POST /api/releases/:id/features
Body: { featureIds: string[] }
Response: { added: number }

// Generate release notes
POST /api/releases/:id/generate-notes
Response: { releaseNotes: string } // Markdown format

// Mark as released
POST /api/releases/:id/release
Body: { releaseDate?: Date }
Response: Release
```

### Roadmap API

```typescript
// Get roadmap items
GET /api/products/:productId/roadmap
Query: ?timeframe=Q1_2025&theme=performance
Response: RoadmapItem[]

// Create roadmap item
POST /api/roadmap
Body: {
  productId: string,
  epicId?: string,
  title: string,
  timeframe: string,
  theme: string,
  confidence: "low" | "medium" | "high"
}
Response: RoadmapItem

// Update roadmap item
PATCH /api/roadmap/:id
Body: Partial<RoadmapItem>
Response: RoadmapItem

// Get roadmap view (formatted for visualization)
GET /api/products/:productId/roadmap/view
Query: ?view=timeline|swimlane|now_next_later
Response: {
  lanes: Array<{
    label: string,
    items: RoadmapItem[]
  }>
}

// Sync with ROADMAP.md
POST /api/products/:productId/roadmap/sync
Response: {
  created: number,
  updated: number,
  items: RoadmapItem[]
}
```

---

## 🎨 Frontend Components

### Pages (4 new pages)

#### 1. Product Management Hub (`/product`)

**Purpose**: Main entry point for product management
**Route**: `/product`
**Access**: All authenticated users

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Product Management Hub                      │
├─────────────────────────────────────────────┤
│ [+ Create Product]         [Search...]      │
├─────────────────────────────────────────────┤
│ ┌─────────────┬─────────────┬─────────────┐ │
│ │ 5 Products  │ 12 Active   │ 3 Upcoming  │ │
│ │             │ Sprints     │ Releases    │ │
│ └─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────┤
│ Products List                               │
│ ┌─────────────────────────────────────────┐ │
│ │ 📱 BizOS Platform              Internal │ │
│ │ Owner: Product Team • 23 features      │ │
│ │ [Progress: ▓▓▓▓░░░░░░ 45%]           │ │
│ │ Sprint 24 Active • Release 10.2 Soon  │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🏢 Client Portal              Client   │ │
│ │ Owner: Alex Kim • 8 features          │ │
│ │ [Progress: ▓▓▓▓▓▓▓░░░ 78%]          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Components**:
- Product cards with metrics
- Quick action buttons (Create Epic, Start Sprint)
- Recent activity feed
- Upcoming milestones

#### 2. Product Detail (`/product/:id`)

**Purpose**: Product overview and management
**Route**: `/product/:productId`
**Access**: Product team members

**Layout**:
```
┌─────────────────────────────────────────────┐
│ BizOS Platform                     [⚙️ Edit] │
├─────────────────────────────────────────────┤
│ Tabs: [Overview] [Roadmap] [Backlog]       │
│       [Sprints] [Releases]                  │
├─────────────────────────────────────────────┤
│ OVERVIEW TAB                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Vision: Enterprise business management  │ │
│ │ Status: 🟢 Development • Owner: Team    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Active Epics (3)                            │
│ ┌─────────────────────────────────────────┐ │
│ │ Phase 11: UX Enhancement     [7/15] 47% │ │
│ │ Phase 12: Performance        [0/19]  0% │ │
│ │ Phase 13: Collaboration      [0/18]  0% │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Current Sprint: Sprint 24                   │
│ ┌─────────────────────────────────────────┐ │
│ │ Goal: Complete UX quick wins            │ │
│ │ 5 days remaining • 12/18 points done    │ │
│ │ [Burndown Chart]                        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Components**:
- ProductOverview
- EpicsList with progress bars
- ActiveSprintSummary
- UpcomingReleases
- RecentActivity

#### 3. Backlog Management (`/product/:id/backlog`)

**Purpose**: Prioritize and manage product backlog
**Route**: `/product/:productId/backlog`
**Access**: Product managers, team leads

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Product Backlog                             │
├─────────────────────────────────────────────┤
│ [Filter: All ▼] [Priority: RICE ▼]         │
│ [+ Add Epic] [+ Add Feature] [Bulk Edit]   │
├─────────────────────────────────────────────┤
│ Prioritized Items (drag to reorder)        │
│ ┌─────────────────────────────────────────┐ │
│ │ ☰ 1. Command Palette        RICE: 425  │ │
│ │    Epic: Phase 11 • 2d effort          │ │
│ │    [Edit] [Move to Sprint]             │ │
│ ├─────────────────────────────────────────┤ │
│ │ ☰ 2. Database Indexing      RICE: 380  │ │
│ │    Epic: Phase 12 • 3d effort          │ │
│ │    [Edit] [Move to Sprint]             │ │
│ ├─────────────────────────────────────────┤ │
│ │ ☰ 3. Bundle Optimization    RICE: 350  │ │
│ │    Epic: Phase 12 • 3d effort          │ │
│ │    [Edit] [Move to Sprint]             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Sidebar: RICE Calculator                   │
│ ┌─────────────────────────────────────────┐ │
│ │ Reach:      [1000    ] users/month     │ │
│ │ Impact:     [○ 0.25 ● 0.5 ○ 1 ○ 2]    │ │
│ │ Confidence: [80      ]%                │ │
│ │ Effort:     [2       ] person-months   │ │
│ │ ────────────────────────────           │ │
│ │ RICE Score: 200                        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Components**:
- DraggableBacklogList
- BacklogItem cards
- RICEScoreCalculator
- MoSCoWCategorizer
- ValueEffortMatrix
- BulkPrioritization modal
- SprintPlanningMode

#### 4. Sprint Board (`/product/:id/sprint/:sprintId`)

**Purpose**: Manage active sprint with Kanban board
**Route**: `/product/:productId/sprint/:sprintId`
**Access**: Team members

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Sprint 24: Oct 7-18                         │
│ Goal: Complete UX quick wins                │
├─────────────────────────────────────────────┤
│ [Burndown] [Velocity] [Team View]           │
├─────────────────────────────────────────────┤
│ To Do      │ In Progress │ Review │ Done   │
├────────────┼─────────────┼────────┼────────┤
│ ┌────────┐ │ ┌─────────┐ │ ┌────┐ │ ┌────┐│
│ │Command │ │ │Database │ │ │Skel│ │ │CSV │││
│ │Palette │ │ │Indexing │ │ │load│ │ │Exp │││
│ │2 pts   │ │ │3 pts    │ │ │2pt │ │ │3pt │││
│ │@Sarah  │ │ │@Mike    │ │ │@Al │ │ │@Jo │││
│ └────────┘ │ └─────────┘ │ └────┘ │ └────┘││
│            │             │        │        │
│ ┌────────┐ │ ┌─────────┐ │        │ ┌────┐│
│ │Bundle  │ │ │Empty    │ │        │ │Res │││
│ │Optim   │ │ │States   │ │        │ │Com │││
│ │3 pts   │ │ │2 pts    │ │        │ │1pt │││
│ │        │ │ │@Jordan  │ │        │ │@All│││
│ └────────┘ │ └─────────┘ │        │ └────┘││
└────────────┴─────────────┴────────┴────────┘
│ Sprint Metrics                              │
│ Committed: 18 pts | Completed: 12 pts       │
│ Velocity: 67% | 5 days remaining            │
└─────────────────────────────────────────────┘
```

**Components**:
- KanbanBoard with drag-drop
- StoryCard
- BurndownChart
- VelocityChart
- SprintMetrics
- DailyStandupView
- SprintRetrospectiveModal

### Reusable Components

#### Component Library

```typescript
// 1. RoadmapTimeline
<RoadmapTimeline
  productId={productId}
  view="timeline" // timeline | swimlane | now_next_later
  timeframe="Q1_2025"
/>

// 2. EpicCard
<EpicCard
  epic={epic}
  showProgress={true}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

// 3. FeatureCard
<FeatureCard
  feature={feature}
  draggable={true}
  onStatusChange={handleStatusChange}
/>

// 4. UserStoryCard
<UserStoryCard
  story={story}
  format="detailed" // compact | detailed
  showAcceptanceCriteria={true}
/>

// 5. SprintBoard
<SprintBoard
  sprintId={sprintId}
  onStoryMove={handleMove}
  enableDragDrop={true}
/>

// 6. BurndownChart
<BurndownChart
  sprintId={sprintId}
  data={burndownData}
  height={300}
/>

// 7. BacklogPrioritizer
<BacklogPrioritizer
  productId={productId}
  framework="rice" // rice | moscow | value_effort
  onReorder={handleReorder}
/>

// 8. RICEScoreCalculator
<RICEScoreCalculator
  onCalculate={handleCalculate}
  initialValues={riceValues}
/>

// 9. VelocityChart
<VelocityChart
  productId={productId}
  sprints={sprints}
  showTrend={true}
/>

// 10. ReleasePlan
<ReleasePlan
  releases={releases}
  view="timeline" // timeline | calendar
/>

// 11. StoryPointEstimator
<StoryPointEstimator
  story={story}
  onEstimate={handleEstimate}
  mode="planning_poker" // planning_poker | t_shirt | fibonacci
/>

// 12. SprintRetrospective
<SprintRetrospective
  sprintId={sprintId}
  onSave={handleSave}
  template="start_stop_continue" // mad_sad_glad | start_stop_continue
/>
```

---

## 🔗 Integration Points

### 1. ROADMAP.md Sync

**Bidirectional synchronization** between ROADMAP.md and database

```typescript
// Script: scripts/sync-roadmap.ts
interface RoadmapSync {
  // Parse ROADMAP.md
  parseRoadmap(): {
    phases: Array<{ name, items }>,
    items: Array<{ title, status, effort, dependencies }>
  };

  // Create/Update Epics and Features
  syncToDatabase(): {
    epicsCreated: number,
    featuresCreated: number,
    updated: number
  };

  // Update ROADMAP.md from database
  syncFromDatabase(): {
    phaseProgress: Map<string, number>,
    statusUpdates: Array<{ item, oldStatus, newStatus }>
  };
}

// Sync flow:
// 1. Parse ROADMAP.md sections (Phases → Epics)
// 2. Parse items within phases (Items → Features)
// 3. Map checkboxes to feature status:
//    [ ] → backlog
//    [x] → completed
// 4. Map progress percentages to epic.progressPercentage
// 5. Auto-create database entries
// 6. Update ROADMAP.md when features completed in UI
```

**Sync Schedule**:
- Manual: `npm run sync-roadmap`
- Automatic: On feature status change in UI
- Git hook: Pre-commit hook to update percentages

### 2. Tasks Integration

**Link User Stories to existing Tasks**

```typescript
// When converting story to task:
POST /api/stories/:id/create-task
Creates task with:
- title from story.title
- description from story (asA/iWant/soThat format)
- estimatedHours from story.estimatedHours
- assignedTo from story.assignedTo
- projectId from feature.projectId (if exists)

// Bidirectional link:
userStory.taskId → task.id
task.userStoryId → userStory.id (new field in tasks table)

// Status sync:
story.status = "in_progress" → task.status = "in_progress"
task.status = "completed" → story.status = "completed"
```

### 3. Projects Integration

**Link Features to Projects for client work**

```typescript
// Schema change to tasks table:
ALTER TABLE tasks ADD COLUMN user_story_id VARCHAR;

// Link feature to project:
feature.projectId → existing client project

// Use case:
1. Create Feature: "Build client portal for Acme Corp"
2. Link to Project: Acme Corp project
3. Break down into User Stories
4. User Stories → Tasks
5. Tasks tracked in project Gantt chart
6. Progress rolls up to Feature → Epic → Product
```

### 4. Time Tracking Integration

**Track time against user stories**

```typescript
// Enhanced time entry:
timeEntry.userStoryId = story.id (new field)
timeEntry.taskId = task.id (existing)

// Story actual hours calculation:
story.actualHours = SUM(timeEntries WHERE userStoryId = story.id)

// Roll up to feature:
feature.actualEffort = SUM(stories.actualHours) / 8 // Convert to days
```

### 5. Sprint → Gantt Chart

**Visualize sprint stories on Gantt chart**

```typescript
// Gantt view mode: "Sprint View"
// Shows user stories with:
- Start date: sprint.startDate
- End date: calculated from story points + velocity
- Dependencies: story dependencies
- Assignees: story.assignedTo
- Critical path: based on dependencies

// Reuse existing GanttChart component:
<GanttChart
  items={userStories}
  viewMode="sprint"
  dateRange={{ start: sprint.startDate, end: sprint.endDate }}
/>
```

### 6. Navigation Integration

**Add to existing sidebar**

```typescript
// Update client/src/components/Sidebar.tsx:
const navigationGroups = [
  // ... existing groups
  {
    title: "PRODUCT",
    items: [
      {
        title: "Products",
        href: "/product",
        icon: Layers,
      },
      {
        title: "Backlog",
        href: "/product/backlog", // Smart route to active product
        icon: ListChecks,
      },
      {
        title: "Sprints",
        href: "/product/sprints",
        icon: Calendar,
      },
    ]
  },
];
```

---

## 📅 Implementation Phases

### Phase 1: MVP Foundation (Week 1-2) ⭐

**Goal**: Basic product management with ROADMAP.md sync

**Tasks**:
- [ ] Database schema (products, epics, features, roadmapItems)
- [ ] Basic CRUD APIs (products, epics, features)
- [ ] Product list page
- [ ] Product detail page with epics/features list
- [ ] ROADMAP.md parsing and sync script
- [ ] Simple roadmap timeline visualization

**Deliverables**:
- Create products in UI
- View epics and features
- Import ROADMAP.md automatically
- Basic roadmap timeline view

**Success Criteria**:
- Can create BizOS product
- All ROADMAP.md phases imported as epics
- All items imported as features
- Visual roadmap shows Q1-Q4 timeline

---

### Phase 2: Backlog Management (Week 3)

**Goal**: Prioritization and backlog management

**Tasks**:
- [ ] Product backlog table and APIs
- [ ] Backlog management page
- [ ] Drag-and-drop prioritization
- [ ] RICE score calculator component
- [ ] MoSCoW categorization
- [ ] Value vs Effort matrix view
- [ ] Bulk prioritization tools

**Deliverables**:
- Prioritized backlog view
- RICE scoring for features
- Reorder backlog with drag-drop
- Multiple prioritization frameworks

**Success Criteria**:
- RICE scores calculated correctly
- Backlog order persists
- Can bulk-categorize with MoSCoW
- Value/Effort matrix shows quadrants

---

### Phase 3: Sprint Management (Week 4-5)

**Goal**: Agile sprint planning and execution

**Tasks**:
- [ ] Sprints and user stories tables
- [ ] Sprint APIs (CRUD, start, complete, metrics)
- [ ] User story creation and management
- [ ] Sprint board (Kanban) component
- [ ] Drag-drop stories between columns
- [ ] Burndown chart component
- [ ] Velocity tracking
- [ ] Sprint planning interface
- [ ] Link stories to existing tasks

**Deliverables**:
- Create and manage sprints
- Sprint board with To Do/In Progress/Review/Done
- Burndown chart updates in real-time
- Velocity calculated from completed sprints
- Stories convert to tasks seamlessly

**Success Criteria**:
- Can plan 2-week sprint
- Drag stories through Kanban board
- Burndown chart shows actual vs ideal
- Velocity auto-calculated
- Stories → Tasks linkage works

---

### Phase 4: Advanced Features (Week 6)

**Goal**: Release management and roadmap enhancements

**Tasks**:
- [ ] Releases table and APIs
- [ ] Release planning page
- [ ] Link features to releases
- [ ] Auto-generate release notes
- [ ] Changelog generation
- [ ] Now-Next-Later roadmap view
- [ ] Swimlane roadmap view
- [ ] Dependency visualization
- [ ] Sprint retrospective tool

**Deliverables**:
- Plan releases with features
- Generate release notes automatically
- Multiple roadmap visualization options
- Retrospective board for sprints

**Success Criteria**:
- Can create v10.1 release
- Features assigned to releases
- Release notes generated from features
- Retrospective saved per sprint

---

### Phase 5: Integration & Polish (Week 7-8)

**Goal**: Deep integration with existing system

**Tasks**:
- [ ] Bidirectional ROADMAP.md sync
- [ ] Auto-update ROADMAP.md on feature completion
- [ ] Link features to projects (client work)
- [ ] Time tracking against stories
- [ ] Sprint view in Gantt chart
- [ ] Epic → Project conversion flow
- [ ] Mobile optimization for sprint board
- [ ] Performance optimization
- [ ] Documentation and user guides
- [ ] Migration scripts for existing data

**Deliverables**:
- ROADMAP.md stays in sync automatically
- Client features linked to projects
- Time entries track story progress
- Comprehensive user documentation

**Success Criteria**:
- Completing feature in UI updates ROADMAP.md
- Client features create/link projects
- Time tracking works end-to-end
- All pages mobile-optimized

---

## 📊 Success Metrics

### Product Metrics

| Metric | Baseline | Target (30 days) | Target (90 days) |
|--------|----------|------------------|------------------|
| Products Created | 0 | 3+ | 10+ |
| Features Tracked | 0 (manual in ROADMAP.md) | 100+ | 300+ |
| Sprints Completed | 0 | 2 | 8 |
| Backlog Items Prioritized | 0 | 50+ | 150+ |
| Stories → Tasks Conversion | 0 | 80% | 95% |

### Usage Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users (Product Module) | 60% of team |
| Features moved per week | 20+ |
| Sprint velocity accuracy | ±15% of estimated |
| ROADMAP.md sync accuracy | 100% |

### Business Metrics

| Metric | Target |
|--------|--------|
| Time saved in planning | 4 hours/week |
| Prioritization confidence | +40% (survey) |
| Feature completion rate | +25% |
| Cross-team visibility | +60% (survey) |

### Technical Metrics

| Metric | Target |
|--------|--------|
| API response time (p95) | <300ms |
| UI page load time | <2s |
| Data sync lag | <1s |
| Mobile usability score | >85 |

---

## 🚀 Quick Start Guide

### For Developers

```bash
# 1. Create database tables
npm run db:push

# 2. Seed sample product data (optional)
npx tsx scripts/seed-product-data.ts

# 3. Sync ROADMAP.md to database
npx tsx scripts/sync-roadmap.ts

# 4. Start development server
npm run dev

# 5. Navigate to /product
open http://localhost:5000/product
```

### For Product Managers

```markdown
1. Navigate to /product
2. Click "Create Product"
3. Fill in product details:
   - Name: "BizOS Platform"
   - Type: Internal
   - Vision: "Enterprise business management"
4. Click "Sync from ROADMAP.md"
5. Epics and Features automatically imported
6. Start prioritizing backlog!
```

---

## 📝 Next Steps

### Immediate (This Week)
1. Review and approve this specification
2. Assign developer(s) to Phase 1
3. Create GitHub issues for Phase 1 tasks
4. Set up project tracking (dogfooding!)
5. Begin database schema implementation

### Short-term (Next 2 Weeks)
1. Complete Phase 1 MVP
2. Internal testing with development team
3. Gather feedback
4. Iterate on UX
5. Plan Phase 2

### Long-term (Next 3 Months)
1. Complete all 5 phases
2. Roll out to all teams
3. Measure success metrics
4. Plan enhancements based on usage
5. Consider as premium feature for clients

---

## 🎉 Conclusion

This Product Management Module transforms BizOS from a project execution tool into a complete **strategy-to-delivery platform**. By building it ourselves, we:

✅ **Perfect Integration**: Works seamlessly with existing projects/tasks
✅ **Customization**: Tailored exactly to our workflow
✅ **Cost Savings**: No per-user Jira/Linear/ProductBoard fees
✅ **Dogfooding**: Use it to build itself
✅ **Differentiation**: Unique selling point for enterprise clients
✅ **Control**: Own our data and roadmap

**Ready to build!** 🚀

---

**Document Version**: 1.0
**Last Updated**: 2025-10-03
**Status**: ✅ Approved
**Next Review**: After Phase 1 MVP completion
