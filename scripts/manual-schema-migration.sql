-- Manual Schema Migration for Multi-Tenant Architecture
-- This script adds organizationId to all tables and creates necessary infrastructure
-- Run this before the data migration script

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR NOT NULL,
  subdomain VARCHAR NOT NULL UNIQUE,
  slug VARCHAR NOT NULL UNIQUE,
  plan_tier VARCHAR DEFAULT 'starter',
  status VARCHAR DEFAULT 'trial',
  billing_email VARCHAR,
  billing_status VARCHAR DEFAULT 'current',
  max_users INTEGER DEFAULT 5,
  settings JSONB,
  owner_id VARCHAR,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create organizationMembers table
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR,
  role VARCHAR DEFAULT 'member',
  status VARCHAR DEFAULT 'active',
  invited_by VARCHAR,
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- 3. Add defaultOrganizationId to users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='default_organization_id') THEN
    ALTER TABLE users ADD COLUMN default_organization_id VARCHAR REFERENCES organizations(id);
    CREATE INDEX idx_users_default_org ON users(default_organization_id);
  END IF;
END $$;

-- 4. Add organizationId to all tables (safe - only adds if doesn't exist)
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_update TEXT[] := ARRAY[
    'clients', 'companies', 'projects', 'tasks', 'time_entries', 'invoices', 'expenses',
    'sales_opportunities', 'opportunity_next_steps', 'opportunity_communications',
    'opportunity_stakeholders', 'opportunity_activity_history',
    'project_templates', 'task_templates', 'task_dependencies', 'project_comments',
    'task_comments', 'project_activity', 'user_capacity', 'user_availability',
    'user_skills', 'resource_allocations', 'workload_snapshots', 'budget_categories',
    'project_budgets', 'time_entry_approvals', 'notifications', 'roles',
    'user_role_assignments', 'user_sessions', 'audit_logs', 'security_events',
    'data_access_logs', 'permission_exceptions', 'mfa_tokens', 'documents',
    'knowledge_articles', 'opportunity_file_attachments', 'marketing_campaigns',
    'client_interactions', 'support_tickets', 'support_ticket_comments',
    'sla_configurations', 'ticket_escalations', 'company_goals', 'system_variables',
    'system_settings', 'user_invitations'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_update
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = tbl_name) THEN
      -- Add organizationId column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns c
                     WHERE c.table_name = tbl_name AND c.column_name = 'organization_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN organization_id VARCHAR REFERENCES organizations(id) ON DELETE CASCADE', tbl_name);
        EXECUTE format('CREATE INDEX idx_%s_org ON %I(organization_id)', tbl_name, tbl_name);
        RAISE NOTICE 'Added organization_id to %', tbl_name;
      ELSE
        RAISE NOTICE 'Skipped % - organization_id already exists', tbl_name;
      END IF;
    ELSE
      RAISE NOTICE 'Skipped % - table does not exist', tbl_name;
    END IF;
  END LOOP;
END $$;

-- 5. Handle the projects.opportunity_id unique constraint issue
-- Remove the unique constraint if it exists to allow drizzle-kit to recreate it properly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE table_name = 'projects' AND constraint_name = 'projects_opportunity_id_unique') THEN
    ALTER TABLE projects DROP CONSTRAINT projects_opportunity_id_unique;
    RAISE NOTICE 'Dropped projects_opportunity_id_unique constraint';
  END IF;
END $$;

-- Add it back as a partial unique index (allows multiple NULLs but unique non-NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS projects_opportunity_id_unique
  ON projects(opportunity_id)
  WHERE opportunity_id IS NOT NULL;
