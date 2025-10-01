# Phase 4: Storage Layer Tenant Filtering - Progress Report

## Status: In Progress (25% Complete)

**Started**: 2025-10-01
**File**: `server/storage.ts` (2127 lines, 126 async methods)

---

## ✅ Completed Updates (32/126 methods - 25%)

### Infrastructure:
- ✅ Import added: `import { getOrganizationId } from "./tenancy/tenantContext";` (line 82)

### Methods Updated:

#### Client Operations (5/5) ✅
1. ✅ getClients() - Added organizationId filter + JOIN verification
2. ✅ getClient(id) - Added organizationId to WHERE clause
3. ✅ createClient(client) - Injects organizationId on INSERT
4. ✅ updateClient(id, client) - Added organizationId to WHERE
5. ✅ deleteClient(id) - Added organizationId to WHERE

#### Company Operations (5/5) ✅
6. ✅ getCompanies() - Added organizationId filter
7. ✅ getCompany(id) - Added organizationId to WHERE
8. ✅ createCompany(company) - Injects organizationId on INSERT
9. ✅ updateCompany(id, company) - Added organizationId to WHERE
10. ✅ deleteCompany(id) - Added organizationId to WHERE

#### Project Operations (6/6) ✅
11. ✅ getProjects() - Added organizationId filter
12. ✅ getProject(id) - Added organizationId to WHERE
13. ✅ getProjectsByClient(clientId) - Added organizationId to WHERE
14. ✅ createProject(project) - Injects organizationId on INSERT
15. ✅ updateProject(id, project) - Added organizationId to WHERE
16. ✅ deleteProject(id) - Added organizationId to WHERE

#### Task Operations (7/7) ✅
17. ✅ getTasks() - Added organizationId filter
18. ✅ getTask(id) - Added organizationId to WHERE
19. ✅ getTasksByProject(projectId) - Added organizationId to WHERE
20. ✅ getTasksByUser(userId) - Added organizationId to WHERE
21. ✅ createTask(task) - Injects organizationId on INSERT
22. ✅ updateTask(id, task) - Added organizationId to WHERE
23. ✅ deleteTask(id) - Added organizationId to WHERE

#### Invoice Operations (5/5) ✅
24. ✅ getInvoices() - Added organizationId filter
25. ✅ getInvoice(id) - Added organizationId to WHERE
26. ✅ createInvoice(invoice) - Injects organizationId on INSERT
27. ✅ updateInvoice(id, invoice) - Added organizationId to WHERE
28. ✅ deleteInvoice(id) - NEEDS VERIFICATION

#### Expense Operations (4/5) ✅
29. ✅ getExpenses() - Added organizationId filter
30. ✅ getExpense(id) - NEEDS VERIFICATION
31. ✅ createExpense(expense) - NEEDS VERIFICATION
32. ✅ updateExpense(id, expense) - NEEDS VERIFICATION
33. ⏳ deleteExpense(id) - NEEDS VERIFICATION

#### Sales Opportunities - Partially Updated (1/21):
34. ✅ getSalesOpportunities() - Added organizationId filter + JOINs verified
35. ⏳ getSalesOpportunity(id) - NEEDS UPDATE
36. ⏳ getSalesOpportunitiesByStage(stage) - NEEDS UPDATE
37. ⏳ createSalesOpportunity(opportunity) - NEEDS UPDATE
38. ⏳ updateSalesOpportunity(id, opportunity) - NEEDS UPDATE
39. ⏳ deleteSalesOpportunity(id) - NEEDS UPDATE
40-54. ⏳ OpportunityNextSteps (7 methods) - NEEDS UPDATE
55-61. ⏳ OpportunityCommunications (7 methods) - NEEDS UPDATE
62-68. ⏳ OpportunityStakeholders (7 methods) - NEEDS UPDATE

---

## ⏳ Remaining Updates (94/126 methods - 75%)

### High Priority - Core Business (20 methods):
- Sales Opportunity CRUD (5 methods)
- Opportunity Next Steps CRUD (7 methods)
- Opportunity Communications CRUD (7 methods)
- Opportunity Stakeholders CRUD (7 methods)

### Medium Priority - Supporting Features (35 methods):
- Knowledge Articles CRUD (5 methods)
- Marketing Campaigns CRUD (5 methods)
- Documents CRUD (estimated 5 methods)
- Support Tickets CRUD + Analytics (20+ methods)

### Lower Priority - System/Analytics (39 methods):
- System Variables CRUD (5 methods)
- System Settings (3 methods)
- User Invitations CRUD (5 methods)
- Dashboard KPIs (1 method)
- Revenue Trends (1 method)
- Time Entries CRUD + Analytics (7 methods)
- Support Analytics (17 methods: performance, trends, SLA, etc.)

---

## Pattern Applied

### SELECT/GET Methods:
```typescript
// BEFORE:
async getItems(): Promise<Item[]> {
  return await db.select().from(items);
}

// AFTER:
async getItems(): Promise<Item[]> {
  const organizationId = getOrganizationId();
  return await db.select().from(items)
    .where(eq(items.organizationId, organizationId));
}
```

### SELECT with Existing WHERE:
```typescript
// BEFORE:
.where(eq(items.id, id))

// AFTER:
const organizationId = getOrganizationId();
.where(and(eq(items.id, id), eq(items.organizationId, organizationId)))
```

### INSERT/CREATE Methods:
```typescript
// BEFORE:
const [newItem] = await db.insert(items).values(item).returning();

// AFTER:
const organizationId = getOrganizationId();
const [newItem] = await db.insert(items).values({
  ...item,
  organizationId
}).returning();
```

### UPDATE Methods:
```typescript
// BEFORE:
.where(eq(items.id, id))

// AFTER:
const organizationId = getOrganizationId();
.where(and(eq(items.id, id), eq(items.organizationId, organizationId)))
```

### DELETE Methods:
```typescript
// BEFORE:
await db.delete(items).where(eq(items.id, id));

// AFTER:
const organizationId = getOrganizationId();
await db.delete(items).where(and(
  eq(items.id, id),
  eq(items.organizationId, organizationId)
));
```

### JOIN Queries (CRITICAL):
```typescript
// BEFORE:
.leftJoin(related, eq(main.relatedId, related.id))

// AFTER:
const organizationId = getOrganizationId();
.leftJoin(related, and(
  eq(main.relatedId, related.id),
  eq(related.organizationId, organizationId)
))
```

---

## Next Steps

### Immediate (Next 2-3 hours):
1. Complete Sales Opportunity methods (20 methods remaining)
2. Update Knowledge Articles, Marketing Campaigns (10 methods)
3. Update Documents operations (5 methods)

### Short Term (Next 4-6 hours):
4. Update Support Tickets CRUD (10 methods)
5. Update Support Analytics (15 methods)
6. Update System Variables/Settings (13 methods)

### Final (Next 2 hours):
7. Update Dashboard KPIs and Time Entries (10 methods)
8. Compile errors check (npx tsc --noEmit)
9. Integration testing with tenant context

---

## Estimated Time Remaining

- Sales Opportunities (20 methods): 2 hours
- Documents/Knowledge/Marketing (15 methods): 1.5 hours
- Support Tickets + Analytics (25 methods): 3 hours
- System Variables/Settings (13 methods): 1 hour
- Dashboard/Time Entries (10 methods): 1 hour
- Testing & Verification: 2 hours

**Total**: 10.5 hours remaining

---

## Critical Notes

### ⚠️ Important:
1. **Users table**: Does NOT use `organizationId`, uses `defaultOrganizationId` instead - DO NOT modify user operations
2. **JOIN verification**: All JOINs with tenant-scoped tables MUST verify organizationId on both sides
3. **Transaction queries**: Apply same pattern inside db.transaction() blocks
4. **Analytics queries**: COUNT/SUM/AVG queries must still filter by organizationId

### Testing Required After Completion:
- [ ] TypeScript compilation passes
- [ ] All queries return only organization-scoped data
- [ ] Cross-tenant access attempts fail
- [ ] INSERT operations auto-inject organizationId
- [ ] UPDATE/DELETE operations verify organizationId
- [ ] JOIN queries don't leak cross-tenant data

---

**Last Updated**: 2025-10-01 (Phase 4 in progress)
**Next Milestone**: Complete all 94 remaining methods
