# Schema Migration Plan: Remove Legacy Data Duplication

## Overview
This document outlines the plan to remove legacy duplicate data fields from the clients table and ensure all data is properly normalized.

## Current Issues

### 1. Legacy Fields in `clients` Table
The following fields duplicate data that should be in the `companies` table:
- `company` (varchar) - Duplicates `companies.name`
- `industry` (varchar) - Duplicates `companies.industry`
- `website` (varchar) - Duplicates `companies.website`
- `address` (text) - Duplicates `companies.address`

### 2. Data Consistency Problems
- Some clients have `companyId` but also have legacy fields
- Some clients have legacy fields but no `companyId`
- Potential for data inconsistencies and confusion

## Migration Strategy

### Phase 1: Data Analysis and Cleanup ✅
- [x] Create centralized constants for shared data
- [x] Update schema with proper TypeScript types
- [x] Create reusable UI components
- [x] Create data analysis script

### Phase 2: Data Migration (Current)
- [ ] Run data analysis script to identify issues
- [ ] Create missing company records from legacy data
- [ ] Link all clients to proper companies
- [ ] Verify data integrity

### Phase 3: UI and API Updates
- [ ] Update all client forms to use company references
- [ ] Update client display components to show company data via relationship
- [ ] Remove any hardcoded references to legacy fields
- [ ] Update API endpoints to return joined company data

### Phase 4: Database Schema Cleanup
- [ ] Add NOT NULL constraint to `clients.companyId`
- [ ] Remove legacy fields from clients table
- [ ] Update database indexes
- [ ] Run final data integrity checks

## Implementation Steps

### Step 1: Run Data Analysis
```bash
npm run tsx scripts/data-cleanup-migration.ts analyze
```

### Step 2: Backup Database
```bash
# Create database backup before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Run Data Migration
```bash
npm run tsx scripts/data-cleanup-migration.ts migrate
```

### Step 4: Update Schema (After Verification)
```sql
-- Remove legacy fields (run after data migration is verified)
ALTER TABLE clients DROP COLUMN company;
ALTER TABLE clients DROP COLUMN industry;
ALTER TABLE clients DROP COLUMN website;
ALTER TABLE clients DROP COLUMN address;

-- Add NOT NULL constraint
ALTER TABLE clients ALTER COLUMN company_id SET NOT NULL;
```

## Rollback Plan

If issues arise during migration:

1. **Before Phase 4**: Data can be rolled back by restoring from backup
2. **After Phase 4**: More complex rollback requiring:
   - Restore backup
   - Re-run analysis
   - Fix any issues found
   - Re-attempt migration

## Verification Checklist

After each phase:

- [ ] All clients have valid `companyId` references
- [ ] No orphaned client records
- [ ] Company data is accessible via client relationships
- [ ] UI displays correct company information
- [ ] Forms work properly with new structure
- [ ] No references to legacy fields in code

## Risk Assessment

| Risk Level | Issue | Mitigation |
|------------|-------|------------|
| **LOW** | Data loss during migration | Full database backup before changes |
| **MEDIUM** | UI breaks after field removal | Thorough testing in staging environment |
| **LOW** | Performance impact | Proper indexing on foreign keys |
| **HIGH** | Business disruption | Gradual rollout with feature flags |

## Expected Benefits

1. **Data Consistency**: Single source of truth for company information
2. **Maintainability**: Easier to update company data in one place
3. **Performance**: Better query optimization with proper relationships
4. **Type Safety**: TypeScript constraints prevent invalid data
5. **Developer Experience**: Clear data model and relationships

## Post-Migration Tasks

1. Update documentation to reflect new data model
2. Add database constraints and indexes
3. Create monitoring for data integrity
4. Update backup and restore procedures
5. Train team on new data model

## Timeline

- **Phase 1**: ✅ Completed
- **Phase 2**: 1-2 hours (analysis + migration)
- **Phase 3**: 2-4 hours (UI updates)
- **Phase 4**: 1 hour (schema cleanup)

**Total Estimated Time**: 4-7 hours + testing

## Success Metrics

- Zero data duplication
- All client-company relationships properly established
- UI functions correctly with normalized data
- Database schema follows best practices
- No performance degradation