# Single-Tenant Deployment Guide

## Overview

This guide explains how to deploy the Business Management Platform as a **single-tenant application** instead of the default multi-tenant SaaS architecture. This is useful for:

- **Private deployments** for a single organization
- **On-premise installations** with simplified architecture
- **Standalone instances** without subdomain requirements
- **Simpler hosting** without wildcard DNS/SSL

**Current System**: Multi-tenant SaaS with subdomain routing
**This Guide**: Converting to single-tenant deployment

---

## Table of Contents

1. [Architecture Comparison](#architecture-comparison)
2. [Prerequisites](#prerequisites)
3. [Conversion Steps](#conversion-steps)
4. [Database Configuration](#database-configuration)
5. [Code Modifications](#code-modifications)
6. [Authentication Changes](#authentication-changes)
7. [Deployment](#deployment)
8. [Environment Configuration](#environment-configuration)
9. [Testing](#testing)
10. [Reverting to Multi-Tenant](#reverting-to-multi-tenant)

---

## Architecture Comparison

### Multi-Tenant (Current)
```
┌──────────────────────────────────────┐
│   acme.yourdomain.com                │
│   → Acme Corporation (Org 1)         │
├──────────────────────────────────────┤
│   contoso.yourdomain.com             │
│   → Contoso Ltd (Org 2)              │
├──────────────────────────────────────┤
│   Shared Database with orgId filter  │
└──────────────────────────────────────┘
```

### Single-Tenant (After Conversion)
```
┌──────────────────────────────────────┐
│   yourdomain.com                     │
│   → Single Organization              │
├──────────────────────────────────────┤
│   Database (no tenant filtering)     │
└──────────────────────────────────────┘
```

**Key Differences**:

| Feature | Multi-Tenant | Single-Tenant |
|---------|-------------|---------------|
| **Organizations** | Multiple | Single |
| **Subdomain Routing** | Required | Not needed |
| **Tenant Middleware** | Active | Disabled |
| **organizationId Filtering** | Automatic | Fixed value |
| **DNS Configuration** | Wildcard DNS | Simple DNS |
| **SSL Certificates** | Wildcard SSL | Standard SSL |
| **Complexity** | Higher | Lower |

---

## Prerequisites

- Current multi-tenant installation
- Database backup
- Access to environment variables
- Understanding of database migrations

---

## Conversion Steps

### Step 1: Backup Your Database

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use the backup script
npx tsx scripts/create-backup.ts
```

### Step 2: Choose Your Single Organization

Decide which organization will be the single tenant:

```bash
# List existing organizations
psql $DATABASE_URL -c "SELECT id, name, subdomain FROM organizations;"

# Example output:
# id                                   | name                  | subdomain
# -------------------------------------|----------------------|----------
# org-123-abc                          | Default Organization | default
# org-456-def                          | Acme Corporation     | acme
```

**Option A: Use Default Organization**
```bash
export SINGLE_ORG_ID="org-123-abc"
```

**Option B: Create New Organization**
```bash
psql $DATABASE_URL <<EOF
INSERT INTO organizations (id, name, subdomain, slug, status, plan_tier)
VALUES (gen_random_uuid(), 'My Company', 'mycompany', 'mycompany', 'active', 'enterprise')
RETURNING id;
EOF
```

### Step 3: Migrate All Data to Single Organization

If you have data in multiple organizations that you want to consolidate:

```bash
# Create migration script
cat > scripts/consolidate-to-single-org.ts << 'EOF'
import { db } from '../server/db';
import {
  clients, companies, projects, tasks,
  timeEntries, invoices, expenses
} from '../shared/schema';
import { eq } from 'drizzle-orm';

const TARGET_ORG_ID = process.env.SINGLE_ORG_ID!;

async function consolidate() {
  console.log(`Consolidating all data to organization: ${TARGET_ORG_ID}`);

  const tables = [
    { table: clients, name: 'clients' },
    { table: companies, name: 'companies' },
    { table: projects, name: 'projects' },
    { table: tasks, name: 'tasks' },
    // ... add all tables with organizationId
  ];

  for (const { table, name } of tables) {
    const result = await db
      .update(table)
      .set({ organizationId: TARGET_ORG_ID });

    console.log(`✓ ${name}: Updated`);
  }

  console.log('✅ Consolidation complete');
}

consolidate().then(() => process.exit(0));
EOF

# Run consolidation
SINGLE_ORG_ID=$SINGLE_ORG_ID npx tsx scripts/consolidate-to-single-org.ts
```

### Step 4: Simplify Database Schema (Optional)

**Option 1: Keep organizationId columns** (Recommended for easier future migration)
- Keep all organizationId columns
- Set them to a fixed value
- Simpler to revert to multi-tenant later

**Option 2: Remove organizationId columns** (True single-tenant)
- Remove organizationId from all tables
- Remove organizations and organizationMembers tables
- Cannot revert to multi-tenant without re-migration

For this guide, we'll use **Option 1** (keep columns).

---

## Code Modifications

### 1. Disable Tenant Middleware

**File**: `server/routes.ts`

```typescript
// BEFORE (Multi-tenant)
import { resolveTenant, requireTenant } from "./middleware/tenantMiddleware";

app.use('/api/*', isAuthenticated, resolveTenant, requireTenant);

// AFTER (Single-tenant)
// Comment out tenant middleware
// app.use('/api/*', isAuthenticated, resolveTenant, requireTenant);
app.use('/api/*', isAuthenticated);
```

### 2. Configure Fixed Organization Context

Create a new file for single-tenant context:

**File**: `server/tenancy/singleTenantContext.ts`

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import type { TenantContext } from './tenantContext';

// Fixed organization ID for single-tenant deployment
const SINGLE_ORG_ID = process.env.SINGLE_ORG_ID || 'default-org-id';

const singleTenantContext: TenantContext = {
  organizationId: SINGLE_ORG_ID,
  organization: {
    id: SINGLE_ORG_ID,
    name: 'My Company',
    subdomain: 'mycompany',
    slug: 'mycompany',
    planTier: 'enterprise',
    status: 'active',
    maxUsers: 999,
  },
};

const contextStorage = new AsyncLocalStorage<TenantContext>();

// Initialize context with fixed organization
export function initializeSingleTenantContext() {
  return (req: any, res: any, next: any) => {
    contextStorage.run(singleTenantContext, () => {
      req.tenant = singleTenantContext;
      next();
    });
  };
}

// Get tenant context (always returns single tenant)
export function getTenantContext(): TenantContext {
  return singleTenantContext;
}

export function getOrganizationId(): string {
  return SINGLE_ORG_ID;
}

export { contextStorage as tenantStorage };
```

### 3. Use Single-Tenant Context

**File**: `server/routes.ts`

```typescript
// BEFORE (Multi-tenant)
import { resolveTenant } from './middleware/tenantMiddleware';
import { getTenantContext, getOrganizationId } from './tenancy/tenantContext';

app.use('/api/*', isAuthenticated, resolveTenant);

// AFTER (Single-tenant)
import { initializeSingleTenantContext, getTenantContext, getOrganizationId } from './tenancy/singleTenantContext';

app.use('/api/*', isAuthenticated, initializeSingleTenantContext());
```

### 4. Update Storage Layer

**File**: `server/storage.ts`

The storage layer will continue to work with the fixed organization ID:

```typescript
// No changes needed - getOrganizationId() now returns fixed ID
import { getOrganizationId } from './tenancy/singleTenantContext'; // Changed import

export const storage = {
  async getClients(): Promise<Client[]> {
    const orgId = getOrganizationId(); // Returns fixed SINGLE_ORG_ID

    return await db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, orgId));
  },
  // ... rest of storage methods work the same
};
```

### 5. Disable Organization Management UI

**File**: `client/src/components/OrganizationIndicator.tsx`

```typescript
// BEFORE (Multi-tenant)
export function OrganizationIndicator() {
  const [subdomain, setSubdomain] = useState<string>("default");

  useEffect(() => {
    const hostname = window.location.hostname;
    const extracted = extractSubdomain(hostname);
    setSubdomain(extracted);
  }, []);

  return <div>Organization: {subdomain}</div>;
}

// AFTER (Single-tenant)
export function OrganizationIndicator() {
  // Simply display company name from environment or config
  const companyName = import.meta.env.VITE_COMPANY_NAME || "My Company";

  return <div>{companyName}</div>;
}
```

### 6. Simplify Authentication

**File**: `server/replitAuth.ts`

```typescript
// BEFORE (Multi-tenant)
async function upsertUser(claims: any) {
  const user = await storage.createUser({ ... });
  await ensureUserInDefaultOrganization(user.id);
  return user;
}

// AFTER (Single-tenant)
async function upsertUser(claims: any) {
  const user = await storage.createUser({ ... });
  // No organization assignment needed
  return user;
}
```

---

## Environment Configuration

### Single-Tenant Environment Variables

**File**: `.env` (or Replit Secrets)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Node Environment
NODE_ENV=production
PORT=5000

# Single-Tenant Configuration
SINGLE_TENANT_MODE=true
SINGLE_ORG_ID=org-123-abc  # Your organization ID
COMPANY_NAME="My Company"

# Session
SESSION_SECRET=your-secret-key

# Authentication (if using OAuth)
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
REPLIT_DOMAINS=yourdomain.com  # No wildcard needed
```

### Frontend Environment

**File**: `.env` (client-side)

```bash
VITE_COMPANY_NAME="My Company"
VITE_SINGLE_TENANT=true
```

---

## Deployment

### Option 1: Replit Deployment (Simplified)

**File**: `.replit`

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[env]
PORT = "5000"
NODE_ENV = "production"
SINGLE_TENANT_MODE = "true"
# No REPLIT_DOMAINS wildcard needed
```

### Option 2: Traditional Server Deployment

```bash
# Clone repository
git clone <your-repo>
cd <your-repo>

# Install dependencies
npm ci --production

# Set environment variables
export SINGLE_TENANT_MODE=true
export SINGLE_ORG_ID=org-123-abc
export DATABASE_URL=postgresql://...

# Build application
npm run build

# Start with PM2
pm2 start npm --name "bizos-single" -- start
pm2 save
```

### DNS Configuration (Simplified)

**No wildcard needed**:

```
Type: A
Name: @
Value: <your-server-ip>

# Optional subdomain (e.g., app.yourdomain.com)
Type: A
Name: app
Value: <your-server-ip>
```

### SSL Configuration (Standard)

```bash
# Standard certificate (no wildcard)
sudo certbot certonly \
  --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com
```

---

## Testing

### Verify Single-Tenant Configuration

```bash
# Check organization ID is set
echo $SINGLE_ORG_ID

# Verify all data belongs to single org
psql $DATABASE_URL <<EOF
SELECT
  (SELECT COUNT(DISTINCT organization_id) FROM clients) as client_orgs,
  (SELECT COUNT(DISTINCT organization_id) FROM projects) as project_orgs,
  (SELECT COUNT(DISTINCT organization_id) FROM tasks) as task_orgs;
EOF

# Should return 1 for all counts
```

### Test Application Access

```bash
# Test main domain (no subdomain)
curl https://yourdomain.com

# Should work without subdomain routing
curl https://yourdomain.com/api/clients

# Should NOT require subdomain
curl https://app.yourdomain.com  # Optional
```

### Run Application Tests

```bash
# Run test suite (should pass with single org)
npm test

# Test API endpoints
npm run test:api
```

---

## Reverting to Multi-Tenant

If you need to revert to multi-tenant architecture:

### Step 1: Restore Tenant Middleware

```typescript
// server/routes.ts
import { resolveTenant, requireTenant } from './middleware/tenantMiddleware';

app.use('/api/*', isAuthenticated, resolveTenant, requireTenant);
```

### Step 2: Restore Original Context

```typescript
// Change imports back
import { getTenantContext, getOrganizationId } from './tenancy/tenantContext';
```

### Step 3: Update Environment

```bash
# Remove single-tenant config
unset SINGLE_TENANT_MODE
unset SINGLE_ORG_ID

# Add multi-tenant config
export REPLIT_DOMAINS=yourdomain.com,*.yourdomain.com
```

### Step 4: Restore DNS & SSL

```bash
# Add wildcard DNS
# Type: A, Name: *, Value: <ip>

# Get wildcard SSL
sudo certbot certonly -d yourdomain.com -d '*.yourdomain.com'
```

---

## Advantages of Single-Tenant

### Pros
✅ **Simpler Architecture**: No tenant routing complexity
✅ **Easier Deployment**: Standard DNS and SSL
✅ **Lower Hosting Costs**: No wildcard certificate required
✅ **Better Performance**: No tenant resolution overhead
✅ **Simpler Testing**: No cross-tenant isolation to verify

### Cons
❌ **No Multi-Tenancy**: Cannot host multiple organizations
❌ **Limited Scalability**: Must deploy new instance per customer
❌ **Manual Data Separation**: Cannot separate data by organization

---

## When to Use Single-Tenant

**Use Single-Tenant When**:
- Deploying for a single organization
- On-premise/private cloud deployment
- Simplified hosting requirements
- No need for organization isolation
- Want to minimize complexity

**Use Multi-Tenant When**:
- SaaS platform serving multiple customers
- Need organization-level data isolation
- Want to scale with multiple tenants
- Subdomain routing is acceptable
- Have wildcard DNS/SSL capability

---

## Summary

Converting to single-tenant involves:

1. ✅ Backup database
2. ✅ Choose/create single organization
3. ✅ Consolidate data to one organization
4. ✅ Disable tenant middleware
5. ✅ Configure fixed organization context
6. ✅ Update environment variables
7. ✅ Simplify DNS and SSL
8. ✅ Test deployment

**Key Files Modified**:
- `server/routes.ts` - Disable tenant middleware
- `server/tenancy/singleTenantContext.ts` - New fixed context
- `server/storage.ts` - Updated import
- `.env` - Single-tenant configuration
- `.replit` - Simplified deployment

**Result**: Application runs with all data in a single organization, no subdomain routing required.

For multi-tenant deployment, see [MULTI_TENANT_GUIDE.md](./MULTI_TENANT_GUIDE.md).
