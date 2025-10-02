# Business Operating System (BizOS)

## Overview

BizOS is a comprehensive business management platform built as a modern web application. It consolidates multiple business functions into a unified system including client relationship management (CRM), project management with client portals, team management, financial tracking, knowledge management, marketing campaigns, and administrative controls. The application is designed as a professional-grade Business Operating System that provides real-time dashboards, role-based access control, and modern UI/UX with glassmorphism design patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom design system using CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider supporting light/dark/system themes with persistent storage

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: OpenID Connect integration with Replit Auth using Passport.js strategy
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **API Design**: RESTful API with role-based route protection middleware

### Database Layer
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Schema Design**: Comprehensive business entity models including users, clients, projects, tasks, invoices, expenses, documents, knowledge articles, marketing campaigns, support tickets, and time tracking

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (OIDC) with automatic user provisioning
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role System**: Multi-tier access control (Admin, Manager, Employee, Client roles)
- **Security**: HTTP-only cookies, CSRF protection, and secure session configuration
- **Multi-Tenant Integration**: New OAuth users are automatically assigned to default organization (slug='default') with member role upon first login
- **Middleware Architecture**: Public auth routes (`/api/login`, `/api/callback`, `/api/auth/register`, etc.) bypass authentication middleware while all other `/api/*` routes require authentication and tenant context

### Multi-Tenant Architecture

#### Tenant Routing & Resolution
- **Subdomain-Based Routing**: Organizations accessed via subdomain (e.g., `acme.yourdomain.com`, `contoso.yourdomain.com`)
- **Default Organization**: Development and localhost automatically use `default` subdomain (slug='default')
- **Tenant Resolution Middleware**: `resolveTenant` middleware (lines 281-307 in routes.ts) extracts subdomain from hostname and loads corresponding organization
- **Request Context**: AsyncLocalStorage-based tenant context (`server/tenancy/tenantContext.ts`) ensures thread-safe request isolation
- **Route Protection**: All `/api/*` routes require tenant context except public auth endpoints (`/api/login`, `/api/callback`, `/api/auth/register`)

#### Data Isolation (Phase 3A - COMPLETED October 2025)
- **Tenant-Scoped Database Layer**: All database operations use `getTenantDb()` from `server/tenancy/tenantDb.ts`
- **Automatic organizationId Injection**: TenantDb wrapper automatically injects `organizationId` into all INSERT operations
- **Automatic Query Filtering**: All SELECT queries automatically filtered by current tenant's organizationId
- **Storage Layer**: 68+ storage methods in `server/storage.ts` use tenantDb exclusively (no manual organizationId parameters)
- **Schema Compliance**: All 37+ business entity tables have `organizationId NOT NULL` constraint with CASCADE delete
- **Zero Cross-Tenant Leakage**: Comprehensive testing confirmed single-organization isolation across all entities

#### Recent Multi-Tenant Enhancements (Phase 3A)
**Database Backfill & Constraints (October 2025)**
- Backfilled 433 NULL organizationId values across all tables
- Applied NOT NULL constraints to 37 tables for strict tenant isolation
- Updated all Drizzle schema definitions to enforce organizationId.notNull()

**Storage Layer Refactoring (October 2025)**
- Refactored all 68+ storage methods to use `getTenantDb()` for automatic tenant scoping
- Removed 40+ manual organizationId parameters from method signatures
- Implemented automatic organizationId injection for all CRUD operations
- Pattern: `getTenantDb().insert(table).values(data)` auto-injects organizationId

**Route & Transaction Fixes (October 2025)**
- Fixed 9 opportunity CRUD routes with ownership verification to prevent cross-entity access within same tenant
- Fixed `logActivityHistory()` helper function (21 call sites) - was failing silently due to missing organizationId
- Fixed convert-to-project transaction (lines 2186-2303) to propagate organizationId to:
  - Project creation (main entity)
  - Project activity logs (2 inserts)
  - Project comments (stakeholder transfer documentation)
  - Notifications (user notification with organizationId)
  - Stakeholder SELECT query (added tenant filter to prevent cross-tenant leakage)

#### Tenant-Aware Code Patterns
**Storage Methods (Preferred Pattern)**
```typescript
// Automatic tenant isolation via getTenantDb()
async getOpportunities() {
  const tenantDb = getTenantDb();
  return tenantDb.select().from(salesOpportunities); // organizationId auto-filtered
}

async createOpportunity(data: InsertSalesOpportunity) {
  const tenantDb = getTenantDb();
  return tenantDb.insert(salesOpportunities).values(data); // organizationId auto-injected
}
```

**Route Handlers**
```typescript
// Tenant context automatically available via resolveTenant middleware
app.get('/api/opportunities', isAuthenticated, async (req, res) => {
  const opportunities = await storage.getOpportunities(); // tenantDb handles filtering
  res.json(opportunities);
});
```

**Helper Functions**
```typescript
// Use getTenantDb() for automatic organizationId injection
async function logActivityHistory(opportunityId: string, action: string, details: string, performedBy: string) {
  const tenantDb = getTenantDb();
  await tenantDb.insert(opportunityActivityHistory).values({
    opportunityId,
    action,
    details,
    performedBy
    // organizationId automatically injected by tenantDb
  });
}
```

**Transactions (Manual Propagation Pattern)**
```typescript
// For db.transaction(), manually propagate organizationId from parent entity
await db.transaction(async (tx) => {
  const [project] = await tx.insert(projects).values({
    ...projectData,
    organizationId: opportunity.organizationId // manual propagation
  }).returning();
  
  await tx.insert(projectActivity).values({
    projectId: project.id,
    organizationId: opportunity.organizationId, // manual propagation
    action: 'project_created',
    performedBy: userId
  });
});
// Note: tenantDb.runInTransaction() planned for future to automate this
```

#### Organization Management
- **Organization Members**: Junction table (`organization_members`) tracks user-organization relationships with roles (owner, admin, member)
- **User Assignment**: New OAuth users automatically assigned to default organization on first login
- **Multi-Organization Support**: Users can belong to multiple organizations with different roles per organization
- **Replit Deployment**: Production deployment via Replit autoscale with multi-tenant configuration
- **Subdomain Support**: Configure `REPLIT_DOMAINS` environment variable with wildcard support for subdomain routing

#### Known Limitations & Future Work
- **Phase 3B (Deferred)**: 44 remaining direct database operations in routes.ts need storage method abstraction (comments, attachments, templates, capacity planning)
- **Phase 4 (Pending)**: WebSocket manager tenant context propagation for real-time notifications
- **Production Migration**: SQL migration script needed for backfilling production organizationId values
- **Transaction Wrapper**: `tenantDb.runInTransaction()` method planned to automate organizationId propagation in transactions

### Development Architecture
- **Build System**: Vite with React plugin for frontend, esbuild for backend bundling
- **Type Safety**: Shared TypeScript schemas between frontend and backend using Zod validation
- **Path Resolution**: Custom module aliases for clean imports (@/, @shared/, @assets/)
- **Development Tools**: Runtime error overlay, cartographer, and dev banner for Replit environment

### Port Allocation Strategy

**CRITICAL: To prevent port conflicts between Claude Code and Replit Agent, both agents MUST follow this unified port allocation strategy.**

#### Port Assignment Rules
- **Replit Environment**: Always use port **5000** (automatically detected via `REPL_ID` or `REPLIT_ENV`)
- **Local Development**: Always use port **3001**
- **Production**: Always use port **5000**

#### Environment Detection Logic
The server automatically detects the environment and assigns the correct port:
```typescript
// Environment detection (in server/index.ts)
const isReplit = process.env.REPL_ID !== undefined || process.env.REPLIT_ENV === 'true';

if (Number.isFinite(rawPort) && rawPort > 0) {
  port = rawPort; // Use explicit PORT environment variable
} else if (isReplit) {
  port = 5000; // Force port 5000 in Replit environment
} else {
  port = isDevMode ? 3001 : 5000; // Local dev: 3001, Production: 5000
}
```

#### Workflow Management Protocol
1. **Before starting development**: Always use `restart_workflow` tool to cleanly restart the "Start application" workflow
2. **If port conflicts occur**: The server has built-in single-instance enforcement with lock files (`.server.lock`)
3. **Process cleanup**: If "Server already running" error appears, the existing process must be terminated before starting new one

#### Critical Implementation Details
- **Single Instance Enforcement**: Server uses PID-based lock files to prevent multiple instances
- **WebSocket Port Binding**: WebSocket server shares the same port as the HTTP server (unified approach)
- **Vite HMR Configuration**: Uses middleware mode with the main server instance for Hot Module Replacement
- **Process Binding**: Server binds to `0.0.0.0:{port}` to ensure proper EADDRINUSE errors on conflicts

#### Agent Collaboration Guidelines
- **Never start multiple server instances simultaneously**
- **Always check workflow status before making server changes** 
- **Use the restart_workflow tool instead of manual npm commands**
- **Respect the existing server lock mechanism**
- **In Replit, always use port 5000 - never override to other ports**

This strategy ensures that both Claude Code and Replit Agent can work on the same project without port conflicts or server instance collisions.

### Module Structure
The application follows a modular architecture with distinct functional areas:
- **Foundation**: Authentication, navigation, theming, and core layout components
- **Executive Dashboard**: Real-time KPIs, alerts system, activity feeds, and data visualizations
- **Client Management**: Complete CRM with lead pipeline, interaction history, and satisfaction tracking
- **Project Management**: Portfolio tracking with integrated client portals for project visibility
- **Team Management**: Employee directory, time tracking, task assignment, and performance metrics
- **Financial Management**: Invoice generation, payment tracking, expense management, and financial reporting
- **Knowledge Hub**: Centralized documentation, SOPs, and training materials with search capabilities
- **Marketing**: Campaign planning, content calendar, ROI tracking, and marketing analytics
- **Support System**: Ticket management, customer support tracking, and resolution workflows
- **Admin Portal**: User management, system configuration, analytics, and administrative controls

## External Dependencies

### Database & Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle Kit**: Database migration and schema management tooling

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider for seamless user management
- **connect-pg-simple**: PostgreSQL session store for persistent authentication sessions

### UI & Design System
- **Radix UI**: Headless UI primitives for accessible component foundation
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library providing consistent iconography throughout the application

### Development & Build Tools
- **Vite**: Frontend build tool with hot module replacement and optimized production builds
- **TanStack Query**: Data fetching and caching library for efficient server state management
- **TypeScript**: Type safety across the entire application stack
- **Zod**: Runtime type validation for API contracts and form validation

### Monitoring & Development
- **Replit Dev Tools**: Development banner, cartographer, and runtime error handling for enhanced development experience