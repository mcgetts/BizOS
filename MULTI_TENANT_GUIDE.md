# Multi-Tenant SaaS Architecture Guide

## Overview

This guide provides comprehensive documentation for the multi-tenant architecture implemented in the Business Management Platform. The system uses **subdomain-based tenant routing** to provide complete data isolation between organizations while sharing a single application and database instance.

**Architecture Type**: Subdomain-based Multi-Tenancy
**Deployment Status**: Production Deployed on Replit
**Database**: PostgreSQL with row-level tenant filtering
**Isolation Method**: AsyncLocalStorage-based tenant context

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Tenant Context Management](#tenant-context-management)
4. [Tenant Middleware](#tenant-middleware)
5. [Tenant-Scoped Database Layer](#tenant-scoped-database-layer)
6. [Storage Layer Integration](#storage-layer-integration)
7. [Authentication & User Assignment](#authentication--user-assignment)
8. [Development Workflow](#development-workflow)
9. [Migration from Single-Tenant](#migration-from-single-tenant)
10. [Testing Multi-Tenant Isolation](#testing-multi-tenant-isolation)
11. [Deployment & Configuration](#deployment--configuration)
12. [Security Considerations](#security-considerations)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Subdomain-Based Routing

Each organization gets its own subdomain for accessing the platform:

```
https://acme.yourdomain.com     → Acme Corporation
https://contoso.yourdomain.com  → Contoso Ltd
https://default.yourdomain.com  → Default Organization (development)
localhost:5000                  → Default Organization (local dev)
```

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Request Flow                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Tenant Middleware (tenantMiddleware.ts)                 │
│     - Extract subdomain from hostname                        │
│     - Load organization from database                        │
│     - Validate organization status                           │
│     - Verify user membership                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Tenant Context (tenantContext.ts)                       │
│     - Store context in AsyncLocalStorage                     │
│     - Make context available to all downstream code          │
│     - Provide type-safe accessors                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Tenant-Scoped Database (tenantDb.ts)                    │
│     - Automatically inject organizationId on INSERT          │
│     - Automatically filter by organizationId on SELECT       │
│     - Prevent cross-tenant UPDATE/DELETE                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Storage Layer (storage.ts)                              │
│     - Use tenant context for all operations                  │
│     - Transparent multi-tenant data isolation                │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Organizations Table

**Purpose**: Root table for managing tenants (organizations)

**Schema** (`shared/schema.ts`):

```typescript
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  subdomain: varchar("subdomain").notNull().unique(), // For routing
  slug: varchar("slug").notNull().unique(),          // URL-safe identifier

  // Billing & plan information
  planTier: varchar("plan_tier").default("starter"),        // starter, professional, enterprise
  status: varchar("status").default("trial"),               // trial, active, suspended, cancelled
  billingEmail: varchar("billing_email"),
  billingStatus: varchar("billing_status").default("current"),

  // Limits & features
  maxUsers: integer("max_users").default(5),
  settings: jsonb("settings").$type<{
    features?: string[];
    branding?: { logo?: string; primaryColor?: string };
    notifications?: { email?: boolean; slack?: boolean };
  }>(),

  // Ownership
  ownerId: varchar("owner_id"), // References users.id

  // Timestamps
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Organization Members Table

**Purpose**: Junction table for user-organization relationships

**Schema**:

```typescript
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  // Role within this organization
  role: varchar("role").default("member"), // owner, admin, member

  // Status
  status: varchar("status").default("active"), // active, invited, suspended
  invitedBy: varchar("invited_by"), // User ID who sent the invitation
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at").defaultNow(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Business Data Tables with organizationId

All business data tables include an `organizationId` column:

```typescript
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  // ... other fields
}, (table) => [
  index("idx_clients_org").on(table.organizationId),
]);
```

**Tables with organizationId**:
- clients
- companies
- projects
- tasks
- timeEntries
- invoices
- expenses
- documents
- knowledgeArticles
- marketingCampaigns
- supportTickets
- salesOpportunities
- projectTemplates
- taskTemplates
- notifications
- roles
- auditLogs

**Tables WITHOUT organizationId** (system tables):
- sessions (shared across all tenants)
- organizations (root table)
- organizationMembers (junction table)

---

## Tenant Context Management

### AsyncLocalStorage-Based Context

**Location**: `server/tenancy/tenantContext.ts`

The system uses Node.js `AsyncLocalStorage` to maintain tenant context throughout the request lifecycle without manual parameter passing.

**Interface**:

```typescript
export interface TenantContext {
  organizationId: string;
  organization: Organization;
  userId?: string;
  userRole?: string;
  userEmail?: string;
}
```

**Key Functions**:

```typescript
// Get current tenant context (throws if not available)
export function getTenantContext(): TenantContext;

// Safely get tenant context (returns undefined if not available)
export function tryGetTenantContext(): TenantContext | undefined;

// Get organization ID from current context
export function getOrganizationId(): string;

// Check if code is running within a tenant context
export function hasTenantContext(): boolean;

// Run a function within a specific tenant context
export function runInTenantContext<T>(
  context: TenantContext,
  fn: () => T
): T;
```

**Example Usage**:

```typescript
import { getTenantContext, getOrganizationId } from './tenancy/tenantContext';

// Get full context
const context = getTenantContext();
console.log(`Current organization: ${context.organization.name}`);
console.log(`User ID: ${context.userId}`);
console.log(`User role in org: ${context.userRole}`);

// Get just the organization ID
const orgId = getOrganizationId();
```

---

## Tenant Middleware

### Subdomain Resolution Middleware

**Location**: `server/middleware/tenantMiddleware.ts`

The tenant middleware is responsible for:
1. Extracting the subdomain from the request hostname
2. Loading the corresponding organization from the database
3. Validating the organization status
4. Verifying user membership (if authenticated)
5. Storing the tenant context in AsyncLocalStorage

**Middleware Functions**:

#### `resolveTenant`
Primary middleware that resolves and validates tenant context:

```typescript
export const resolveTenant: RequestHandler = async (req, res, next) => {
  // Extract subdomain (e.g., "acme" from "acme.yourdomain.com")
  const subdomain = extractSubdomain(req.hostname);

  // Find organization by subdomain
  const org = await findOrganizationBySubdomain(subdomain);

  // Validate organization status
  if (org.status === 'suspended') {
    return res.status(403).json({ error: 'Organization suspended' });
  }

  // Verify user membership
  const membership = await verifyOrganizationMembership(req.user.id, org.id);

  // Create and store tenant context
  const context: TenantContext = {
    organizationId: org.id,
    organization: org,
    userId: req.user?.id,
    userRole: membership.role,
  };

  // Store in AsyncLocalStorage and continue
  tenantStorage.run(context, () => {
    req.tenant = context;
    next();
  });
};
```

#### `requireTenant`
Fails if tenant context is not present:

```typescript
export const requireTenant: RequestHandler = (req, res, next) => {
  if (!req.tenant) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  next();
};
```

#### `optionalTenant`
Loads tenant if subdomain is present, but doesn't fail if not found:

```typescript
export const optionalTenant: RequestHandler = async (req, res, next) => {
  const subdomain = extractSubdomain(req.hostname);
  if (subdomain) {
    const org = await findOrganizationBySubdomain(subdomain);
    if (org && org.status === 'active') {
      // Store context and continue
    }
  }
  // Continue without tenant context
  next();
};
```

### Subdomain Extraction

```typescript
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]; // Remove port

  // Localhost → default
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'default';
  }

  const parts = host.split('.');

  // If only domain.com (2 parts), no subdomain
  if (parts.length <= 2) {
    return null;
  }

  // Return first part as subdomain
  return parts[0]; // "acme" from "acme.yourdomain.com"
}
```

---

## Tenant-Scoped Database Layer

### Automatic organizationId Filtering

**Location**: `server/tenancy/tenantDb.ts`

The tenant-scoped database layer automatically injects `organizationId` into all queries, preventing cross-tenant data access.

**Key Features**:

```typescript
export class TenantScopedDB {
  // INSERT - Automatically inject organizationId
  insert<T>(table: T) {
    return {
      values: (data: any) => {
        if (hasOrganizationId(table)) {
          return db.insert(table).values({
            ...data,
            organizationId: this.orgId, // Injected automatically
          });
        }
        return db.insert(table).values(data);
      },
    };
  }

  // SELECT - Automatically filter by organizationId
  from<T>(table: T) {
    const query = db.select().from(table);
    if (hasOrganizationId(table)) {
      return query.where(eq(table.organizationId, this.orgId));
    }
    return query;
  }

  // UPDATE - Only update rows belonging to current tenant
  update<T>(table: T) {
    return {
      set: (data: any) => ({
        where: (condition: SQL) => {
          const tenantWhere = and(
            eq(table.organizationId, this.orgId),
            condition
          );
          return db.update(table).set(data).where(tenantWhere);
        },
      }),
    };
  }

  // DELETE - Only delete rows belonging to current tenant
  delete<T>(table: T) {
    return {
      where: (condition?: SQL) => {
        const tenantWhere = and(
          eq(table.organizationId, this.orgId),
          condition
        );
        return db.delete(table).where(tenantWhere);
      },
    };
  }
}
```

**Usage**:

```typescript
import { getTenantDb } from './tenancy/tenantDb';

// Get tenant-scoped database instance
const tenantDb = getTenantDb();

// INSERT - organizationId automatically injected
const client = await tenantDb.insert(clients).values({
  name: 'Acme Corp',
  email: 'contact@acme.com',
  // No need to specify organizationId!
});

// SELECT - automatically filtered by organizationId
const allClients = await tenantDb.from(clients);
// Only returns clients for current organization

// UPDATE - can only update current tenant's data
await tenantDb.update(clients)
  .set({ name: 'New Name' })
  .where(eq(clients.id, clientId));
// Can't update clients from other organizations

// DELETE - can only delete current tenant's data
await tenantDb.delete(clients)
  .where(eq(clients.id, clientId));
// Can't delete clients from other organizations
```

---

## Storage Layer Integration

### Tenant-Aware Storage

**Location**: `server/storage.ts`

The storage layer uses tenant context to automatically filter all operations:

```typescript
import { getOrganizationId } from './tenancy/tenantContext';

export const storage = {
  // Get all clients for current organization
  async getClients(): Promise<Client[]> {
    const orgId = getOrganizationId(); // From tenant context

    return await db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, orgId));
  },

  // Create client with automatic organizationId
  async createClient(data: InsertClient): Promise<Client> {
    const orgId = getOrganizationId();

    const [client] = await db
      .insert(clients)
      .values({
        ...data,
        organizationId: orgId, // Automatically added
      })
      .returning();

    return client;
  },

  // Update client (only if belongs to current organization)
  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client> {
    const orgId = getOrganizationId();

    const [client] = await db
      .update(clients)
      .set(data)
      .where(and(
        eq(clients.id, id),
        eq(clients.organizationId, orgId) // Ensures same org
      ))
      .returning();

    if (!client) {
      throw new Error('Client not found or access denied');
    }

    return client;
  },
};
```

---

## Authentication & User Assignment

### Multi-Tenant OAuth Flow

**Location**: `server/replitAuth.ts`

When a new user logs in via OAuth, they are automatically assigned to the default organization:

```typescript
async function upsertUser(claims: any) {
  const user = await storage.createUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.given_name,
    lastName: claims.family_name,
  });

  // Automatically assign to default organization
  await ensureUserInDefaultOrganization(user.id);

  return user;
}
```

**Seed Script** (`server/seed.ts`):

```typescript
export async function ensureUserInDefaultOrganization(userId: string) {
  // Get or create default organization
  const defaultOrg = await ensureDefaultOrganization();

  // Check if user already has membership
  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, defaultOrg.id)
      )
    );

  if (!existing) {
    // Create membership
    await db.insert(organizationMembers).values({
      organizationId: defaultOrg.id,
      userId: userId,
      role: 'member', // Default role
      status: 'active',
    });
  }

  // Set as user's default organization
  await db
    .update(users)
    .set({ defaultOrganizationId: defaultOrg.id })
    .where(eq(users.id, userId));
}
```

---

## Development Workflow

### Local Development

When developing locally, the system automatically routes to the **default** organization:

```bash
# Start development server
npm run dev:safe

# Access via localhost (automatically uses "default" subdomain)
http://localhost:5000
```

The middleware detects `localhost` and maps it to the `default` subdomain.

### Testing with Multiple Organizations

To test with multiple organizations locally:

1. **Create test organizations**:

```bash
npx tsx scripts/test-multi-tenant.ts
```

This creates `test-alpha` and `test-beta` organizations.

2. **Edit `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows)**:

```
127.0.0.1  default.localhost
127.0.0.1  test-alpha.localhost
127.0.0.1  test-beta.localhost
```

3. **Access different organizations**:

```
http://default.localhost:5000      → Default Organization
http://test-alpha.localhost:5000   → Test Organization Alpha
http://test-beta.localhost:5000    → Test Organization Beta
```

---

## Migration from Single-Tenant

### Migration Script

**Location**: `scripts/migrate-to-multi-tenant.ts`

This script migrates an existing single-tenant database to multi-tenant:

**What it does**:

1. Creates a default organization
2. Assigns all existing data to the default organization
3. Creates organization memberships for all users
4. Validates the migration

**Usage**:

```bash
# Run migration
npx tsx scripts/migrate-to-multi-tenant.ts
```

**Output**:

```
🌱 Starting Multi-Tenant Migration
═══════════════════════════════════════

🏢 Creating default organization...
✅ Created default organization: default-org-id

📊 Updating tables with organizationId...
  ✓ clients: Updated
  ✓ companies: Updated
  ✓ projects: Updated
  ✓ tasks: Updated
  [... 20+ more tables ...]

👥 Creating organization memberships...
  ✓ user@example.com -> owner
  ✓ member@example.com -> member

🔍 Validating migration...
  ✓ Organization exists: Default Organization
  ✓ Users: 5, Memberships: 5

✅ Migration Complete!
```

---

## Testing Multi-Tenant Isolation

### Test Script

**Location**: `scripts/test-multi-tenant.ts`

Comprehensive test suite that verifies multi-tenant data isolation:

**What it tests**:

1. ✅ Default organization exists
2. ✅ Can create test organizations
3. ✅ Can create test users
4. ✅ Can create organization memberships
5. ✅ Storage layer filters by organization (CREATE)
6. ✅ Storage layer filters by organization (READ)
7. ✅ Cross-tenant UPDATE is blocked
8. ✅ Cross-tenant DELETE is blocked
9. ✅ All records have correct organizationId

**Usage**:

```bash
# Run full test suite
npx tsx scripts/test-multi-tenant.ts
```

**Example Output**:

```
🧪 Starting Multi-Tenant System Tests...

✅ Default Organization: Default organization exists
✅ Create Test Org 1: Test Organization Alpha created
✅ Create Test Org 2: Test Organization Beta created
✅ User 1 → Org 1 Membership: User Alpha added to Organization Alpha
✅ Create Client in Org 1: Client created with correct organizationId
✅ Data Isolation - Read: Org 1 sees 1 client(s), Org 2 sees 1 client(s)
✅ Data Isolation - Update: Cross-tenant update correctly blocked
✅ Data Isolation - Delete: Cross-tenant delete correctly blocked

═══════════════════════════════════════════════════════
📊 TEST SUMMARY
═══════════════════════════════════════════════════════
Total Tests: 10
Passed: 10 ✅
Failed: 0 ❌
Pass Rate: 100.0%

🎉 ALL TESTS PASSED! Multi-tenant system is working correctly!
```

---

## Deployment & Configuration

### Replit Deployment

**Platform**: Replit Autoscale
**Environment**: Production
**Configuration File**: `.replit`

**Key Environment Variables**:

```bash
# Required
DATABASE_URL=postgresql://user:pass@host/db
NODE_ENV=production
PORT=5000
REPLIT_ENV=true

# Multi-Tenant Configuration
REPLIT_DOMAINS=yourdomain.com,*.yourdomain.com  # Wildcard for subdomains

# Authentication
SESSION_SECRET=<secure-random-string>
ISSUER_URL=https://replit.com/oidc
REPL_ID=<your-repl-id>
```

**Startup Flow**:

1. Application starts on port 5000
2. Seed script runs automatically:
   - Creates default organization if it doesn't exist
   - Ensures first user is admin
3. Middleware is attached to all protected routes
4. Tenant context is resolved on every request

### Custom Domain Setup

For production deployment with custom domains:

1. **DNS Configuration**:

```
Type: A
Name: @
Value: <your-server-ip>

Type: A
Name: *
Value: <your-server-ip>
```

2. **SSL Certificate** (wildcard):

```bash
# Using Let's Encrypt with DNS challenge
sudo certbot certonly \
  --dns-cloudflare \
  -d yourdomain.com \
  -d '*.yourdomain.com'
```

3. **Update Environment**:

```bash
REPLIT_DOMAINS=yourdomain.com,*.yourdomain.com
```

---

## Security Considerations

### Data Isolation

**Primary Defense**: Row-level filtering via `organizationId`

```typescript
// Every business data query is automatically scoped
const clients = await storage.getClients();
// SQL: SELECT * FROM clients WHERE organization_id = $1
```

**Secondary Defense**: Middleware validation

```typescript
// User must be a member of the organization
const membership = await verifyOrganizationMembership(userId, orgId);
if (!membership || membership.status !== 'active') {
  throw new Error('Access denied');
}
```

### Preventing Cross-Tenant Access

1. **Database Layer**: Automatic `organizationId` filtering
2. **Middleware Layer**: Membership verification
3. **Application Layer**: Tenant context validation
4. **Foreign Keys**: Cascade delete on organization removal

### Audit Logging

All multi-tenant operations are logged:

```typescript
// Log tenant context changes
console.log(`[Tenant: ${orgId}] User ${userId} accessed ${resource}`);

// Audit table includes organizationId
await db.insert(auditLogs).values({
  organizationId: orgId,
  userId: userId,
  action: 'read',
  resource: 'clients',
  timestamp: new Date(),
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Organization not found" Error

**Symptom**: 404 error when accessing subdomain

**Solutions**:

```bash
# Check if organization exists
psql $DATABASE_URL -c "SELECT * FROM organizations WHERE subdomain='yoursubdomain';"

# Create organization if missing
psql $DATABASE_URL -c "INSERT INTO organizations (name, subdomain, slug, status) VALUES ('Your Org', 'yoursubdomain', 'yoursubdomain', 'active');"
```

#### 2. "No tenant context" Error

**Symptom**: 401 error, "No tenant context available"

**Causes**:
- Middleware not applied to route
- Public route accidentally requiring tenant context
- AsyncLocalStorage context lost

**Solutions**:

```typescript
// Ensure middleware is applied
app.use('/api/*', isAuthenticated, resolveTenant);

// For public routes, use optionalTenant
app.get('/api/public/data', optionalTenant, handler);
```

#### 3. User Can't Access Organization

**Symptom**: 403 error, "You are not a member of this organization"

**Solutions**:

```bash
# Check user membership
psql $DATABASE_URL -c "SELECT * FROM organization_members WHERE user_id='user-id' AND organization_id='org-id';"

# Add user to organization
psql $DATABASE_URL -c "INSERT INTO organization_members (organization_id, user_id, role, status) VALUES ('org-id', 'user-id', 'member', 'active');"
```

#### 4. Cross-Tenant Data Visible

**Symptom**: Users see data from other organizations

**Critical Check**:

```typescript
// Verify tenant-scoped queries
const clients = await db
  .select()
  .from(clients)
  .where(eq(clients.organizationId, getOrganizationId())); // Must include this!
```

**Solutions**:
- Always use `getTenantDb()` for queries
- Never bypass tenant context
- Add `organizationId` to all WHERE clauses if using raw db

### Debug Mode

Enable debug logging:

```typescript
// In tenantMiddleware.ts
console.log('[Tenant Debug]', {
  hostname: req.hostname,
  subdomain: extractSubdomain(req.hostname),
  organizationId: org?.id,
  userId: req.user?.id,
  membership: membership?.role,
});
```

---

## Best Practices

### 1. Always Use Tenant Context

```typescript
// ✅ Good - Uses tenant context
import { getOrganizationId } from './tenancy/tenantContext';

const orgId = getOrganizationId();
const clients = await db
  .select()
  .from(clients)
  .where(eq(clients.organizationId, orgId));

// ❌ Bad - Hardcoded organization ID
const clients = await db
  .select()
  .from(clients)
  .where(eq(clients.organizationId, 'hardcoded-id'));
```

### 2. Use Tenant-Scoped Database

```typescript
// ✅ Good - Automatic filtering
import { getTenantDb } from './tenancy/tenantDb';

const tenantDb = getTenantDb();
const clients = await tenantDb.from(clients); // Automatically filtered

// ⚠️ Acceptable - Manual filtering (but verbose)
const orgId = getOrganizationId();
const clients = await db
  .select()
  .from(clients)
  .where(eq(clients.organizationId, orgId));
```

### 3. Validate Organization Status

```typescript
// ✅ Good - Check status before operations
if (org.status === 'suspended' || org.status === 'cancelled') {
  throw new Error('Organization is not active');
}

// Proceed with operation
```

### 4. Handle Missing Tenant Context

```typescript
// ✅ Good - Graceful handling
import { tryGetTenantContext } from './tenancy/tenantContext';

const context = tryGetTenantContext();
if (!context) {
  // Handle case where tenant context is not available
  return res.status(401).json({ error: 'Authentication required' });
}

// ❌ Bad - Unhandled exception
const context = getTenantContext(); // Throws if no context
```

---

## Summary

The multi-tenant architecture provides:

✅ **Complete Data Isolation**: Row-level filtering via `organizationId`
✅ **Automatic Filtering**: Transparent tenant-scoped queries
✅ **Type-Safe Context**: AsyncLocalStorage-based tenant context
✅ **Security**: Multi-layer validation (middleware, database, application)
✅ **Scalability**: Single database, multiple organizations
✅ **Production-Ready**: Deployed on Replit with full testing

**Key Files**:
- `server/tenancy/tenantContext.ts` - Tenant context management
- `server/tenancy/tenantDb.ts` - Tenant-scoped database layer
- `server/middleware/tenantMiddleware.ts` - Subdomain resolution
- `shared/schema.ts` - Database schema with organizationId
- `scripts/migrate-to-multi-tenant.ts` - Migration tool
- `scripts/test-multi-tenant.ts` - Test suite

For single-tenant deployment, see [SINGLE_TENANT_DEPLOYMENT.md](./SINGLE_TENANT_DEPLOYMENT.md).

---

**Questions or Issues?**
See [Troubleshooting](#troubleshooting) or check the test suite output for validation.
