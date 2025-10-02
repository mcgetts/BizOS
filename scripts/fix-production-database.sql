-- Fix Production Database for Multi-Tenant organizationId Issues
-- Run these commands on your PRODUCTION database

-- STEP 1: Get the production organization ID
-- Run this first and note the ID
SELECT id, name, slug FROM organizations LIMIT 5;

-- STEP 2: Fix system variables (replace [ORG_ID] with actual ID from step 1)
-- This enables auto-project creation and other system features
UPDATE system_variables
SET organization_id = 'e09c77e2-45f3-4188-8c5a-e9f028c357a4'
WHERE organization_id IS NULL;

-- Verify system variables were fixed
SELECT key, value, organization_id
FROM system_variables
WHERE key = 'auto_create_project_from_won_opportunity';

-- STEP 3: Fix existing projects with NULL organization_id
-- This makes previously created projects visible
UPDATE projects
SET organization_id = 'e09c77e2-45f3-4188-8c5a-e9f028c357a4'
WHERE organization_id IS NULL;

-- Count how many projects were fixed
SELECT COUNT(*) as fixed_projects_count
FROM projects
WHERE organization_id = 'e09c77e2-45f3-4188-8c5a-e9f028c357a4';

-- STEP 4: Verify all data has organization_id
-- These should all return 0 (no NULL values)
SELECT COUNT(*) as projects_without_org FROM projects WHERE organization_id IS NULL;
SELECT COUNT(*) as tasks_without_org FROM tasks WHERE organization_id IS NULL;
SELECT COUNT(*) as opportunities_without_org FROM sales_opportunities WHERE organization_id IS NULL;
SELECT COUNT(*) as clients_without_org FROM clients WHERE organization_id IS NULL;
SELECT COUNT(*) as companies_without_org FROM companies WHERE organization_id IS NULL;

-- SUCCESS!
-- If all counts are 0, your production database is fixed.
