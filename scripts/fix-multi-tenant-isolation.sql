-- Multi-Tenant Isolation Database Fix Script
-- Fixes NULL organizationId values across all business data tables
-- Run this on BOTH development and production databases

-- ============================================
-- STEP 1: Get your organization ID
-- ============================================
SELECT id, name, slug, subdomain FROM organizations WHERE status = 'active';

-- Copy the organization ID from above and replace 'YOUR_ORG_ID_HERE' below

-- ============================================
-- STEP 2: Fix all NULL organizationId values
-- ============================================

-- IMPORTANT: Replace 'YOUR_ORG_ID_HERE' with actual organization ID
DO $$
DECLARE
    org_id TEXT := 'YOUR_ORG_ID_HERE'; -- REPLACE THIS!
BEGIN
    -- Update all tables with NULL organizationId
    UPDATE system_variables SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE projects SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE tasks SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE sales_opportunities SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE clients SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE companies SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE time_entries SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE expenses SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE invoices SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE support_tickets SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE marketing_campaigns SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE knowledge_articles SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE documents SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE client_interactions SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE notifications SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE project_comments SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE project_activity SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE task_comments SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE task_dependencies SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE ticket_escalations SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE audit_logs SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE security_events SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE data_access_logs SET organization_id = org_id WHERE organization_id IS NULL;

    RAISE NOTICE 'Successfully updated all NULL organizationId values to: %', org_id;
END $$;

-- ============================================
-- STEP 3: Verify no NULL values remain
-- ============================================
SELECT 'system_variables' as table_name, COUNT(*) as null_count FROM system_variables WHERE organization_id IS NULL
UNION ALL SELECT 'projects', COUNT(*) FROM projects WHERE organization_id IS NULL
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks WHERE organization_id IS NULL
UNION ALL SELECT 'sales_opportunities', COUNT(*) FROM sales_opportunities WHERE organization_id IS NULL
UNION ALL SELECT 'clients', COUNT(*) FROM clients WHERE organization_id IS NULL
UNION ALL SELECT 'companies', COUNT(*) FROM companies WHERE organization_id IS NULL
UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries WHERE organization_id IS NULL
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses WHERE organization_id IS NULL
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE organization_id IS NULL
UNION ALL SELECT 'support_tickets', COUNT(*) FROM support_tickets WHERE organization_id IS NULL
UNION ALL SELECT 'marketing_campaigns', COUNT(*) FROM marketing_campaigns WHERE organization_id IS NULL
UNION ALL SELECT 'knowledge_articles', COUNT(*) FROM knowledge_articles WHERE organization_id IS NULL
UNION ALL SELECT 'documents', COUNT(*) FROM documents WHERE organization_id IS NULL
UNION ALL SELECT 'client_interactions', COUNT(*) FROM client_interactions WHERE organization_id IS NULL
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications WHERE organization_id IS NULL
UNION ALL SELECT 'project_comments', COUNT(*) FROM project_comments WHERE organization_id IS NULL
UNION ALL SELECT 'project_activity', COUNT(*) FROM project_activity WHERE organization_id IS NULL
UNION ALL SELECT 'task_comments', COUNT(*) FROM task_comments WHERE organization_id IS NULL
UNION ALL SELECT 'task_dependencies', COUNT(*) FROM task_dependencies WHERE organization_id IS NULL
UNION ALL SELECT 'ticket_escalations', COUNT(*) FROM ticket_escalations WHERE organization_id IS NULL
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs WHERE organization_id IS NULL
UNION ALL SELECT 'security_events', COUNT(*) FROM security_events WHERE organization_id IS NULL
UNION ALL SELECT 'data_access_logs', COUNT(*) FROM data_access_logs WHERE organization_id IS NULL
ORDER BY null_count DESC;

-- All counts should be 0. If any are > 0, re-run STEP 2 with correct organization ID.

-- ============================================
-- SUCCESS!
-- ============================================
-- If all verification counts show 0, your database is now fully multi-tenant compliant.
