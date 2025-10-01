# Multi-Tenant SaaS Implementation Guide

## 🎯 Overview

This document outlines the multi-tenant architecture implementation for your SMB SaaS platform using a **shared schema approach** with tenant isolation via `organizationId`.

---

## ✅ Completed Work (Phase 1-2)

### 1. Database Schema Foundations

#### New Tables Created:
- **`organizations`**: Root tenant table
  - Subdomain-based routing (e.g., `acme.yourapp.com`)
  - Plan tiers (starter, professional, enterprise)
  - Billing status and limits
  - Organization settings (JSONB)

- **`organizationMembers`**: User-organization junction table
  - Multi-organization membership support
  - Role per organization (owner, admin, member)
  - Invitation and status tracking

#### Schema Updates:
- ✅ Added `organizationId` to: users (as defaultOrganizationId), clients, companies, projects, tasks, timeEntries, invoices, expenses
- ✅ Added performance indexes on organizationId columns
- ⏳ Remaining 40+ tables need organizationId (systematic update required)

### 2. Tenant Context Infrastructure

#### Files Created:

**`server/tenancy/tenantContext.ts`**:
- AsyncLocalStorage for thread-safe tenant context
- Functions: `getTenantContext()`, `getOrganizationId()`, `getUserId()`
- Context includes: organizationId, organization object, userId, userRole

**`server/middleware/tenantMiddleware.ts`**:
- `resolveTenant`: Extracts subdomain, validates organization, verifies membership
- `requireTenant`: Enforces tenant context (fails if missing)
- `optionalTenant`: Loads tenant if available, continues otherwise
- Automatic membership validation for authenticated users

**`server/tenancy/tenantDb.ts`**:
- Tenant-scoped database wrapper
- Auto-injects `organizationId` into INSERT operations
- Auto-filters SELECT/UPDATE/DELETE by `organizationId`
- Functions: `getTenantDb()`, `withTenantDb()`, `tenantBatchInsert()`

### 3. Data Migration Tools

**`scripts/migrate-to-multi-tenant.ts`**:
- Creates "Default Organization" for existing data
- Updates all records with organizationId
- Creates organizationMembers for all users
- Assigns roles based on existing enhancedRole
- Validation checks

---

## 📋 Remaining Work (Phases 3-9)

### Phase 3: Complete Schema Migration (HIGH PRIORITY)

#### Tasks:
1. ⏳ Add `organizationId` to remaining 40+ tables:
   - documents, knowledgeArticles, marketingCampaigns
   - supportTickets, supportTicketComments, slaConfigurations
   - salesOpportunities, opportunityNextSteps, opportunityCommunications
   - projectTemplates, taskTemplates, taskDependencies
   - userCapacity, userAvailability, userSkills
   - notifications, roles, auditLogs, securityEvents
   - And 20+ more...

2. ⏳ Add indexes to all organizationId columns

**Helper Script**: `scripts/add-org-id-to-schema.ts` (created but not run)

#### Approach:
```typescript
// Pattern for each table:
export const tableName = pgTable("table_name", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  // ... rest of fields
}, (table) => [
  index("idx_tablename_org").on(table.organizationId),
]);
```

---

### Phase 4: Update Storage Layer (CRITICAL - 250+ queries)

#### Current State:
All storage methods in `server/storage.ts` return global data without tenant filtering.

#### Required Changes:

**Example - Projects:**
```typescript
// BEFORE (single-tenant)
async getProjects(): Promise<Project[]> {
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

// AFTER (multi-tenant)
async getProjects(): Promise<Project[]> {
  const { organizationId } = getTenantContext();
  return await db.select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.createdAt));
}
```

#### Alternative Approach (Recommended):
Use the tenant-scoped database wrapper:
```typescript
import { getTenantDb } from '../tenancy/tenantDb';

async getProjects(): Promise<Project[]> {
  const tenantDb = getTenantDb();
  return await tenantDb.from(projects).orderBy(desc(projects.createdAt));
}
```

#### Scope:
- 47 tables × ~5-6 methods each = **235-280 query locations**
- Each method needs tenant filtering
- Foreign key joins must respect organizationId

---

### Phase 5: Update API Routes (70+ endpoints)

#### Current State:
Routes use `isAuthenticated` middleware but no tenant validation.

#### Required Changes:

**Apply tenant middleware to all routes:**
```typescript
// server/routes.ts

// Apply to ALL authenticated API routes
app.use('/api/*', isAuthenticated, resolveTenant);

// Routes now have automatic tenant context
app.get('/api/projects', async (req, res) => {
  // storage.getProjects() now auto-filters by organizationId
  const projects = await storage.getProjects();
  res.json(projects);
});
```

#### Special Considerations:
- WebSocket notifications need tenant filtering
- Audit logs must include organizationId
- Rate limiting should be per-tenant
- File uploads need tenant-scoped storage

---

### Phase 6: Update Authentication Flow

#### Changes Needed:

**1. Registration Flow:**
```typescript
// New endpoint: Create organization + user atomically
app.post('/api/auth/register-organization', async (req, res) => {
  // 1. Validate subdomain availability
  // 2. Create organization
  // 3. Create user as owner
  // 4. Create organizationMember link
  // 5. Return JWT with organizationId
});
```

**2. Login Flow:**
```typescript
// Update login to return user's organizations
app.post('/api/auth/login', async (req, res) => {
  // ... authenticate user

  // Get user's organizations
  const orgs = await getUserOrganizations(user.id);

  // Set default organization in session
  req.session.organizationId = orgs[0].id;

  res.json({ user, organizations: orgs });
});
```

**3. JWT/Session Updates:**
- Include `organizationId` in JWT claims
- Session should store: `{ userId, organizationId, role }`
- Update `replitAuth.ts` to handle organization context

---

### Phase 7: Frontend Updates

#### Required Changes:

**1. Organization Context:**
```typescript
// client/src/contexts/OrganizationContext.tsx
export const OrganizationProvider = ({ children }) => {
  const [currentOrg, setCurrentOrg] = useState<Organization>();
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);

  // Fetch on mount
  useEffect(() => {
    fetchCurrentOrganization();
  }, []);

  return (
    <OrgContext.Provider value={{ currentOrg, userOrgs, switchOrg }}>
      {children}
    </OrgContext.Provider>
  );
};
```

**2. Subdomain Routing:**
- Option A: Subdomain-based (tenant.app.com)
- Option B: Path-based (/tenant/dashboard)
- Recommended: Subdomain for production, path for development

**3. API Client Updates:**
```typescript
// Ensure all API calls respect tenant context
fetch(`https://${subdomain}.app.com/api/projects`)

// Or use header-based approach
headers: { 'X-Organization-Id': currentOrg.id }
```

**4. Organization Switcher UI:**
- Dropdown in header to switch between user's organizations
- Triggers full app re-fetch for new tenant

---

### Phase 8: Testing & Validation

#### Tenant Isolation Tests:

**File**: `server/__tests__/tenantIsolation.test.ts`
```typescript
describe('Tenant Isolation', () => {
  test('User from Org A cannot access Org B data', async () => {
    // Create two organizations
    const orgA = await createOrg('tenant-a');
    const orgB = await createOrg('tenant-b');

    // Create project in Org A
    const projectA = await createProject(orgA.id, { name: 'Project A' });

    // Try to access from Org B context
    const result = await withTenantContext(orgB.id, async () => {
      return await storage.getProject(projectA.id);
    });

    // Should return undefined or throw error
    expect(result).toBeUndefined();
  });

  test('Queries return only org-scoped data', async () => {
    // ... test implementation
  });

  test('Cross-tenant join attempts fail', async () => {
    // ... test implementation
  });
});
```

#### Security Audit:
- [ ] Review ALL 250+ query locations for tenant filtering
- [ ] Static analysis to find queries missing organizationId
- [ ] Penetration testing: attempt cross-tenant access
- [ ] Load testing with 50+ concurrent tenants

---

### Phase 9: Database Migration Execution

#### Pre-Migration Checklist:
- [ ] **BACKUP DATABASE** (critical!)
- [ ] Test migration on staging environment
- [ ] Verify all schema changes are in place
- [ ] Update storage layer methods
- [ ] Deploy tenant middleware

#### Migration Steps:
```bash
# 1. Run schema migration (add organizationId columns)
npm run db:push

# 2. Run data migration script
npx tsx scripts/migrate-to-multi-tenant.ts

# 3. Validate migration
npx tsx scripts/validate-multi-tenant.ts

# 4. Deploy updated application code
npm run build
npm run start
```

#### Post-Migration Validation:
- [ ] All users can login
- [ ] All users have organization membership
- [ ] Projects, tasks, clients show correct data
- [ ] No data leakage between default org and new orgs
- [ ] Audit logs working correctly

---

## 🛡️ Security Safeguards

### 1. Mandatory Tenant Context
```typescript
// All queries MUST go through tenant context
const tenantDb = getTenantDb(); // Throws if no context
```

### 2. Automatic Injection
```typescript
// Use TenantScopedDB wrapper to auto-inject organizationId
tenantDb.insert(projects).values({ name: 'New Project' });
// Automatically adds: organizationId: currentOrgId
```

### 3. Foreign Key Validation
```typescript
// All joins must check organizationId match
.leftJoin(companies, and(
  eq(projects.companyId, companies.id),
  eq(companies.organizationId, organizationId) // Required!
))
```

### 4. Middleware Chain
```
isAuthenticated → resolveTenant → requireTenant → route handler
```

### 5. Audit Trail
- Log all cross-tenant access attempts
- Security events include organizationId
- Monitor for suspicious queries

---

## 📊 Implementation Timeline

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| 1-2 | Schema + Infrastructure | 4 days | ✅ Complete |
| 3 | Complete schema migration | 2 days | ⏳ In Progress |
| 4 | Update storage layer (250+ queries) | 5 days | 🔜 Next |
| 5 | Update API routes | 2 days | 🔜 Pending |
| 6 | Update authentication | 2 days | 🔜 Pending |
| 7 | Frontend updates | 3 days | 🔜 Pending |
| 8 | Testing & security audit | 3 days | 🔜 Pending |
| 9 | Migration execution | 2 days | 🔜 Pending |
| **Total** | **Full implementation** | **23 days** | **17% Complete** |

---

## 🚀 Next Steps

### Immediate (This Week):
1. ✅ Complete adding `organizationId` to all 47 tables
2. ✅ Run database migration to add columns
3. ✅ Update 5-10 critical storage methods as proof-of-concept

### Short Term (Next Week):
4. Update remaining storage layer methods (235+ locations)
5. Apply tenant middleware to all API routes
6. Run data migration script on staging
7. Begin frontend organization context implementation

### Medium Term (Week 3-4):
8. Complete frontend updates
9. Comprehensive tenant isolation testing
10. Security audit and penetration testing
11. Production migration planning

---

## 📚 Key Files Reference

### Core Infrastructure:
- `shared/schema.ts` - Database schema with organizationId
- `server/tenancy/tenantContext.ts` - Tenant context management
- `server/middleware/tenantMiddleware.ts` - Tenant resolution
- `server/tenancy/tenantDb.ts` - Tenant-scoped database wrapper

### Migration Scripts:
- `scripts/migrate-to-multi-tenant.ts` - Data migration
- `scripts/add-org-id-to-schema.ts` - Schema update helper

### To Be Created:
- `server/routes/organizationRoutes.ts` - Organization CRUD endpoints
- `server/__tests__/tenantIsolation.test.ts` - Security tests
- `client/src/contexts/OrganizationContext.tsx` - Frontend context
- `client/src/components/OrganizationSwitcher.tsx` - UI component

---

## ⚠️ Critical Warnings

1. **Data Loss Risk**: Always backup database before running migrations
2. **Security Risk**: Missing ONE `WHERE organizationId = X` clause can leak all tenant data
3. **Performance**: Ensure all organizationId columns are indexed
4. **Breaking Changes**: Authentication flow will change - coordinate with frontend
5. **Testing Required**: MUST test cross-tenant isolation before production

---

## 💡 Tips for Success

1. **Incremental Rollout**: Start with non-critical tables, expand gradually
2. **Feature Flags**: Use feature flags to toggle multi-tenant mode
3. **Monitoring**: Add metrics for cross-tenant access attempts
4. **Documentation**: Update API docs with tenant context requirements
5. **Team Communication**: Ensure all developers understand tenant isolation rules

---

## 🆘 Rollback Plan

If critical issues arise:
1. Keep single-tenant code in `feature/single-tenant` branch
2. Migration script can be reversed (drop organizationId columns)
3. Restore database from pre-migration backup
4. Gradual rollout allows partial revert per-route

---

## 📞 Support

For questions or issues during implementation:
- Review this document
- Check tenant context is properly established
- Verify organizationId is present in all queries
- Test in isolated staging environment first

---

**Last Updated**: 2025-10-01
**Implementation Status**: Phase 1-2 Complete (17%)
**Next Milestone**: Complete Schema Migration (Phase 3)
