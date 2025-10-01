# Schema Updates for Multi-Tenancy

## Tables That Need organizationId Column

### Already Updated:
- ✅ users (has defaultOrganizationId)
- ✅ clients
- ✅ companies
- ✅ projects

### System Tables (NO organizationId needed):
- ❌ sessions (shared session storage)
- ❌ organizations (root table)
- ❌ organizationMembers (junction table)

### Remaining Tables to Update (43 tables):

1. tasks
2. timeEntries
3. invoices
4. expenses
5. documents
6. knowledgeArticles
7. marketingCampaigns
8. opportunityFileAttachments
9. supportTickets
10. supportTicketComments
11. slaConfigurations
12. ticketEscalations
13. companyGoals
14. systemVariables
15. clientInteractions
16. salesOpportunities
17. opportunityNextSteps
18. opportunityCommunications
19. opportunityStakeholders
20. opportunityActivityHistory
21. projectTemplates
22. taskTemplates
23. taskDependencies
24. projectComments
25. taskComments
26. projectActivity
27. userCapacity
28. userAvailability
29. userSkills
30. resourceAllocations
31. budgetCategories
32. projectBudgets
33. timeEntryApprovals
34. workloadSnapshots
35. notifications
36. roles
37. userRoleAssignments
38. userSessions
39. auditLogs
40. securityEvents
41. dataAccessLogs
42. permissionExceptions
43. mfaTokens
44. systemSettings
45. userInvitations

## Pattern to Add:

After the `id` field, add:
```typescript
organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
```

At the end, add index (in the second parameter function):
```typescript
}, (table) => [
  index("idx_[tablename]_org").on(table.organizationId),
]);
```

## Special Cases:

- **userCapacity, userAvailability, userSkills**: User-specific data, still needs organizationId
- **systemSettings**: May want to keep shared across all orgs, or make org-specific (recommend org-specific)
- **roles**: Should be org-specific for custom roles
- **mfaTokens**: Keep org-specific for security audit trail
