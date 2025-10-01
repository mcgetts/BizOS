# Schema Multi-Tenant Update Status

## ✅ Completed Tables (22/47)

### Core Business Tables:
1. ✅ **users** - has defaultOrganizationId + index
2. ✅ **clients** - has organizationId + index
3. ✅ **companies** - has organizationId + index
4. ✅ **projects** - has organizationId + index
5. ✅ **tasks** - has organizationId + index
6. ✅ **timeEntries** - has organizationId + index
7. ✅ **invoices** - has organizationId + index
8. ✅ **expenses** - has organizationId + index

### CRM/Sales Tables:
9. ✅ **salesOpportunities** - has organizationId + index
10. ✅ **opportunityNextSteps** - has organizationId + index
11. ✅ **opportunityCommunications** - has organizationId + index
12. ✅ **opportunityStakeholders** - has organizationId + index
13. ✅ **opportunityActivityHistory** - has organizationId + index

### Template & Project Management:
14. ✅ **projectTemplates** - has organizationId + index
15. ✅ **taskTemplates** - has organizationId + index
16. ✅ **taskDependencies** - has organizationId + index
17. ✅ **projectComments** - has organizationId + index
18. ✅ **taskComments** - has organizationId + index
19. ✅ **projectActivity** - has organizationId + index

### Multi-Tenancy Tables:
20. ✅ **organizations** - root table (no organizationId needed)
21. ✅ **organizationMembers** - junction table (no organizationId needed)

### System Tables (No organizationId):
22. ✅ **sessions** - shared session storage (no organizationId needed)

---

## ⏳ Remaining Tables (25 tables)

### Resource Management (5 tables):
- [ ] userCapacity
- [ ] userAvailability
- [ ] userSkills
- [ ] resourceAllocations
- [ ] workloadSnapshots

### Budget & Financial (3 tables):
- [ ] budgetCategories
- [ ] projectBudgets
- [ ] timeEntryApprovals

### Documents & Knowledge (3 tables):
- [ ] documents
- [ ] knowledgeArticles
- [ ] opportunityFileAttachments

### Marketing & CRM (2 tables):
- [ ] marketingCampaigns
- [ ] clientInteractions

### Support & SLA (6 tables):
- [ ] supportTickets
- [ ] supportTicketComments
- [ ] slaConfigurations
- [ ] ticketEscalations
- [ ] companyGoals
- [ ] systemVariables

### Notifications (1 table):
- [ ] notifications

### Security & RBAC (7 tables):
- [ ] roles
- [ ] userRoleAssignments
- [ ] userSessions
- [ ] auditLogs
- [ ] securityEvents
- [ ] dataAccessLogs
- [ ] permissionExceptions
- [ ] mfaTokens

### System Settings (2 tables):
- [ ] systemSettings
- [ ] userInvitations

---

## 📝 Standard Pattern for Each Table

```typescript
export const tableName = pgTable("table_name", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  // ... rest of fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tablename_org").on(table.organizationId),
]);
```

---

## 🚀 Next Steps

1. **Batch Update Remaining 25 Tables**: Add organizationId + index to all
2. **Run Schema Migration**: `npm run db:push`
3. **Run Data Migration**: `npx tsx scripts/migrate-to-multi-tenant.ts`
4. **Verify**: Check all indexes created and data migrated correctly

---

## ⚠️ Special Considerations

### Tables That Should NOT Have organizationId:
- ✅ sessions (shared across all)
- ✅ organizations (root table)
- ✅ organizationMembers (junction table)

### User-Related Tables:
- **userCapacity**, **userAvailability**, **userSkills**: SHOULD have organizationId
  - Users can have different capacities/skills per organization
  - Tracks per-organization work settings

### System Configuration:
- **systemSettings**, **systemVariables**: SHOULD have organizationId
  - Each organization has its own settings
  - Allows per-tenant customization

### Security Tables:
- **All security tables** SHOULD have organizationId
  - Audit logs, sessions, events must be tenant-scoped
  - Critical for security and compliance

---

**Progress**: 22/47 complete (47%)
**Estimated Time to Completion**: 2-3 hours for remaining tables
