# Storage Layer Tenant Filtering Update Plan

## Progress Summary
✅ Import added: `import { getOrganizationId } from "./tenancy/tenantContext";`
✅ Client methods (5/5 complete)
✅ Company methods (5/5 complete)
⏳ Remaining: ~116 methods

## Pattern to Apply

### For SELECT queries (get/list methods):
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

### For SELECT with WHERE clause:
```typescript
// BEFORE:
async getItem(id: string): Promise<Item | undefined> {
  const [item] = await db.select().from(items).where(eq(items.id, id));
  return item;
}

// AFTER:
async getItem(id: string): Promise<Item | undefined> {
  const organizationId = getOrganizationId();
  const [item] = await db.select().from(items)
    .where(and(eq(items.id, id), eq(items.organizationId, organizationId)));
  return item;
}
```

### For INSERT queries (create methods):
```typescript
// BEFORE:
async createItem(item: InsertItem): Promise<Item> {
  const [newItem] = await db.insert(items).values(item).returning();
  return newItem;
}

// AFTER:
async createItem(item: InsertItem): Promise<Item> {
  const organizationId = getOrganizationId();
  const [newItem] = await db.insert(items).values({
    ...item,
    organizationId
  }).returning();
  return newItem;
}
```

### For UPDATE queries:
```typescript
// BEFORE:
async updateItem(id: string, item: Partial<InsertItem>): Promise<Item> {
  const [updated] = await db.update(items)
    .set(item)
    .where(eq(items.id, id))
    .returning();
  return updated;
}

// AFTER:
async updateItem(id: string, item: Partial<InsertItem>): Promise<Item> {
  const organizationId = getOrganizationId();
  const [updated] = await db.update(items)
    .set(item)
    .where(and(eq(items.id, id), eq(items.organizationId, organizationId)))
    .returning();
  return updated;
}
```

### For DELETE queries:
```typescript
// BEFORE:
async deleteItem(id: string): Promise<void> {
  await db.delete(items).where(eq(items.id, id));
}

// AFTER:
async deleteItem(id: string): Promise<void> {
  const organizationId = getOrganizationId();
  await db.delete(items).where(and(eq(items.id, id), eq(items.organizationId, organizationId)));
}
```

### For JOINs - CRITICAL:
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

## Methods by Category

### ✅ Client Methods (5/5) - COMPLETE
- getClients()
- getClient(id)
- createClient(client)
- updateClient(id, client)
- deleteClient(id)

### ✅ Company Methods (5/5) - COMPLETE
- getCompanies()
- getCompany(id)
- createCompany(company)
- updateCompany(id, company)
- deleteCompany(id)

### ⏳ Remaining Methods to Update:

#### Projects (6 methods):
- getProjects()
- getProject(id)
- getProjectsByClient(clientId)
- createProject(project)
- updateProject(id, project)
- deleteProject(id)

#### Tasks (7 methods):
- getTasks()
- getTask(id)
- getTasksByProject(projectId)
- getTasksByUser(userId)
- createTask(task)
- updateTask(id, task)
- deleteTask(id)

#### Sales Opportunities (15+ methods):
- getSalesOpportunities()
- getSalesOpportunity(id)
- getSalesOpportunitiesByStage(stage)
- createSalesOpportunity(opportunity)
- updateSalesOpportunity(id, opportunity)
- deleteSalesOpportunity(id)
- getOpportunityNextSteps(opportunityId)
- getOpportunityNextStep(id)
- createOpportunityNextStep(nextStep)
- updateOpportunityNextStep(id, nextStep)
- deleteOpportunityNextStep(id)
- getOpportunityCommunications(opportunityId)
- getOpportunityCommunication(id)
- createOpportunityCommunication(communication)
- updateOpportunityCommunication(id, communication)
- deleteOpportunityCommunication(id)
- getOpportunityStakeholders(opportunityId)
- getOpportunityStakeholder(id)
- createOpportunityStakeholder(stakeholder)
- updateOpportunityStakeholder(id, stakeholder)
- deleteOpportunityStakeholder(id)

#### Invoices & Expenses (10 methods):
- getInvoices()
- getInvoice(id)
- createInvoice(invoice)
- updateInvoice(id, invoice)
- deleteInvoice(id)
- getExpenses()
- getExpense(id)
- createExpense(expense)
- updateExpense(id, expense)
- deleteExpense(id)

#### Documents & Knowledge (10 methods):
- getKnowledgeArticles()
- getKnowledgeArticle(id)
- createKnowledgeArticle(article)
- updateKnowledgeArticle(id, article)
- deleteKnowledgeArticle(id)
- getMarketingCampaigns()
- getMarketingCampaign(id)
- createMarketingCampaign(campaign)
- updateMarketingCampaign(id, campaign)
- (documents likely similar)

#### Support Tickets (25+ methods):
- getSupportTickets()
- getSupportTicket(id)
- createSupportTicket(ticket)
- updateSupportTicket(id, ticket)
- deleteSupportTicket(id)
- getSupportTicketComments(ticketId)
- createSupportTicketComment(comment)
- updateSupportTicketComment(id, comment)
- deleteSupportTicketComment(id)
- getSlaConfigurations()
- getSlaConfiguration(id)
- createSlaConfiguration(config)
- updateSlaConfiguration(id, config)
- deleteSlaConfiguration(id)
- getTicketEscalations(ticketId)
- createTicketEscalation(escalation)
- updateTicketSlaMetrics(ticketId, metrics)
- getOverdueTickets()
- getTicketsNeedingEscalation()
- getSupportAnalytics(timeRange)
- getAgentPerformanceMetrics(timeRange)
- getSupportTrends(timeRange)
- getTicketVolumeByCategory(timeRange)
- getResponseTimeMetrics(timeRange)
- getSLAComplianceReport(timeRange)

#### System Variables & Settings (10 methods):
- getSystemVariables()
- getSystemVariable(key)
- createSystemVariable(variableData)
- updateSystemVariable(key, variableData)
- deleteSystemVariable(key)
- getSystemSetting(key)
- upsertSystemSetting(key, value)
- getAllSystemSettings()
- getUserInvitations()
- getUserInvitation(token)
- createUserInvitation(invitationData)
- updateUserInvitation(token, data)
- deleteUserInvitation(token)

#### Dashboard & Analytics (5 methods):
- getDashboardKPIs()
- getRevenueTrends(months)
- getTimeEntries(options)
- createTimeEntry(data)
- updateTimeEntry(id, data)
- deleteTimeEntry(id)
- getTimeProductivityAnalytics(options)

## Next Steps

Due to file size (2127 lines), the most efficient approach is:
1. Continue updating methods in batches
2. Focus on high-priority methods first (projects, tasks, sales)
3. Test after each batch
4. Use search-replace patterns where possible

## Estimated Time
- Projects: 30 mins (6 methods)
- Tasks: 30 mins (7 methods)
- Sales Opportunities: 2 hours (21 methods with complex joins)
- Invoices/Expenses: 1 hour (10 methods)
- Documents/Knowledge: 1 hour (10 methods)
- Support Tickets: 3 hours (25+ methods, complex analytics)
- System Variables: 1 hour (13 methods)
- Dashboard/Analytics: 1 hour (7 methods, complex queries)
- Time Entries: 30 mins (7 methods)

**Total Estimated Time**: 10-12 hours for all 116 methods
