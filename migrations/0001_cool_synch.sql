CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"action" varchar NOT NULL,
	"resource" varchar NOT NULL,
	"resource_id" varchar,
	"department" varchar,
	"old_values" jsonb,
	"new_values" jsonb,
	"changes" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"device_info" jsonb,
	"location" jsonb,
	"severity" varchar DEFAULT 'info',
	"category" varchar,
	"is_sensitive" boolean DEFAULT false,
	"requires_review" boolean DEFAULT false,
	"metadata" jsonb,
	"tags" text[],
	"description" text,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_access_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"resource" varchar NOT NULL,
	"resource_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"access_method" varchar,
	"purpose" text,
	"approved_by" varchar,
	"fields_accessed" text[],
	"record_count" integer DEFAULT 1,
	"export_format" varchar,
	"data_classification" varchar DEFAULT 'internal',
	"is_personal_data" boolean DEFAULT false,
	"is_financial_data" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mfa_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"secret" text NOT NULL,
	"phone_number" varchar,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT false,
	"backup_codes" jsonb,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar,
	"role" varchar DEFAULT 'member',
	"status" varchar DEFAULT 'active',
	"invited_by" varchar,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"subdomain" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"plan_tier" varchar DEFAULT 'starter',
	"status" varchar DEFAULT 'trial',
	"billing_email" varchar,
	"billing_status" varchar DEFAULT 'current',
	"max_users" integer DEFAULT 5,
	"settings" jsonb,
	"owner_id" varchar,
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "permission_exceptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"resource" varchar NOT NULL,
	"action" varchar NOT NULL,
	"reason" text NOT NULL,
	"approved_by" varchar NOT NULL,
	"requested_by" varchar NOT NULL,
	"starts_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"times_used" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"description" text,
	"department" varchar,
	"is_system_role" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"permissions" text[],
	"inherit_from" varchar,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar,
	"event_type" varchar NOT NULL,
	"severity" varchar DEFAULT 'info' NOT NULL,
	"source" varchar,
	"ip_address" varchar,
	"user_agent" text,
	"device_fingerprint" varchar,
	"location" jsonb,
	"risk_score" integer DEFAULT 0,
	"is_blocked" boolean DEFAULT false,
	"block_reason" text,
	"is_investigated" boolean DEFAULT false,
	"investigated_by" varchar,
	"investigated_at" timestamp,
	"resolution" text,
	"event_data" jsonb,
	"correlation_id" varchar,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sla_configurations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"priority" varchar NOT NULL,
	"category" varchar,
	"business_impact" varchar,
	"response_time_hours" integer NOT NULL,
	"resolution_time_hours" integer NOT NULL,
	"escalation_levels" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_ticket_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT true,
	"attachments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"key" varchar NOT NULL,
	"value" jsonb,
	"description" text,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"task_id" varchar,
	"user_id" varchar,
	"content" text NOT NULL,
	"type" varchar DEFAULT 'comment',
	"mentioned_users" text[],
	"attachments" jsonb,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_escalations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"from_user_id" varchar,
	"to_user_id" varchar NOT NULL,
	"escalation_level" integer NOT NULL,
	"reason" text NOT NULL,
	"automated_rule" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"email" varchar NOT NULL,
	"role" varchar DEFAULT 'employee',
	"invited_by" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"accepted_at" timestamp,
	"accepted_by_user_id" varchar,
	"expires_at" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"device_info" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"location" jsonb,
	"is_active" boolean DEFAULT true,
	"last_activity" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "epics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'planned',
	"priority" varchar DEFAULT 'medium',
	"start_date" timestamp,
	"target_date" timestamp,
	"completed_at" timestamp,
	"progress" integer DEFAULT 0,
	"roadmap_phase" varchar,
	"roadmap_url" varchar,
	"business_value" integer,
	"effort" integer,
	"confidence" varchar DEFAULT 'medium',
	"owner_id" varchar,
	"tags" text[],
	"dependencies" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"epic_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"acceptance_criteria" jsonb,
	"status" varchar DEFAULT 'backlog',
	"priority" varchar DEFAULT 'medium',
	"estimated_effort" integer,
	"actual_effort" integer,
	"business_value" integer,
	"technical_risk" varchar DEFAULT 'medium',
	"user_impact" varchar,
	"release_id" varchar,
	"sprint_id" varchar,
	"target_date" timestamp,
	"completed_at" timestamp,
	"owner_id" varchar,
	"assigned_to" varchar,
	"project_id" varchar,
	"tags" text[],
	"dependencies" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_backlog" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"item_type" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"priority" integer NOT NULL,
	"priority_reason" text,
	"priority_framework" varchar,
	"rice_score" jsonb,
	"moscow_category" varchar,
	"value_score" integer,
	"effort_score" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"product_type" varchar DEFAULT 'internal',
	"owner_id" varchar,
	"team_id" varchar,
	"status" varchar DEFAULT 'discovery',
	"vision" text,
	"target_audience" text,
	"goals" jsonb,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"launched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"version" varchar NOT NULL,
	"name" varchar,
	"description" text,
	"release_date" timestamp,
	"status" varchar DEFAULT 'planned',
	"release_notes" text,
	"changelog_url" varchar,
	"deployment_environment" varchar,
	"deployment_url" varchar,
	"features_count" integer,
	"bug_fixes_count" integer,
	"breaking_changes" boolean DEFAULT false,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"epic_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"timeframe" varchar,
	"start_month" varchar,
	"end_month" varchar,
	"status" varchar DEFAULT 'planned',
	"confidence" varchar DEFAULT 'medium',
	"theme" varchar,
	"category" varchar,
	"color" varchar,
	"order" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"name" varchar NOT NULL,
	"goal" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar DEFAULT 'planning',
	"capacity" integer,
	"committed_points" integer,
	"completed_points" integer,
	"velocity_previous" integer,
	"velocity_average" integer,
	"retrospective_notes" text,
	"action_items" jsonb,
	"burndown_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_stories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"product_id" varchar,
	"feature_id" varchar,
	"epic_id" varchar,
	"title" varchar NOT NULL,
	"as_a" varchar,
	"i_want" text,
	"so_that" text,
	"acceptance_criteria" jsonb,
	"status" varchar DEFAULT 'backlog',
	"priority" varchar DEFAULT 'medium',
	"story_points" integer,
	"estimated_hours" numeric(5, 2),
	"actual_hours" numeric(5, 2),
	"sprint_id" varchar,
	"sprint_order" integer,
	"assigned_to" varchar,
	"created_by" varchar,
	"task_id" varchar,
	"tags" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "budget_categories" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "company_goals" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_activity_history" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_communications" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_file_attachments" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_next_steps" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_stakeholders" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "project_activity" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "project_budgets" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "project_comments" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "project_templates" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "requirements" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "success_criteria" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "conversion_date" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "original_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_opportunities" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "first_response_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "sla_breach_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "escalated_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "escalation_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "business_impact" varchar DEFAULT 'low';--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "urgency" varchar DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "response_time_hours" integer;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "resolution_time_hours" integer;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "actual_response_minutes" integer;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "actual_resolution_minutes" integer;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "sla_status" varchar DEFAULT 'on_track';--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "last_activity_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "system_variables" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "task_templates" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entry_approvals" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "user_availability" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "user_capacity" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "user_skills" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_organization_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "enhanced_role" varchar DEFAULT 'employee';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_secret" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_backup_codes" text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_limit" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_password_change" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_temp_token" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_temp_expires" timestamp;--> statement-breakpoint
ALTER TABLE "workload_snapshots" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_tokens" ADD CONSTRAINT "mfa_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_tokens" ADD CONSTRAINT "mfa_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_exceptions" ADD CONSTRAINT "permission_exceptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_exceptions" ADD CONSTRAINT "permission_exceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_exceptions" ADD CONSTRAINT "permission_exceptions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_exceptions" ADD CONSTRAINT "permission_exceptions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_inherit_from_roles_id_fk" FOREIGN KEY ("inherit_from") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_investigated_by_users_id_fk" FOREIGN KEY ("investigated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_configurations" ADD CONSTRAINT "sla_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_configurations" ADD CONSTRAINT "sla_configurations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_data_access_logs_org" ON "data_access_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_mfa_tokens_org" ON "mfa_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_members_unique" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_permission_exceptions_org" ON "permission_exceptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_roles_org" ON "roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_security_events_org" ON "security_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sla_configurations_org" ON "sla_configurations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_support_ticket_comments_org" ON "support_ticket_comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_system_settings_org" ON "system_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_task_comments_org" ON "task_comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_escalations_org" ON "ticket_escalations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_org" ON "user_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_assignments_org" ON "user_role_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_org" ON "user_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_epics_org" ON "epics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_epics_product" ON "epics" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_epics_status" ON "epics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_features_org" ON "features" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_features_epic" ON "features" USING btree ("epic_id");--> statement-breakpoint
CREATE INDEX "idx_features_sprint" ON "features" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "idx_features_release" ON "features" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "idx_features_status" ON "features" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_backlog_org" ON "product_backlog" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_backlog_product" ON "product_backlog" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_backlog_priority" ON "product_backlog" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_products_org" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_products_owner" ON "products" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_releases_org" ON "releases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_releases_product" ON "releases" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_roadmap_org" ON "roadmap_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_roadmap_product" ON "roadmap_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_roadmap_timeframe" ON "roadmap_items" USING btree ("timeframe");--> statement-breakpoint
CREATE INDEX "idx_sprints_org" ON "sprints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sprints_product" ON "sprints" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_sprints_status" ON "sprints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_stories_org" ON "user_stories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_stories_feature" ON "user_stories" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_user_stories_sprint" ON "user_stories" USING btree ("sprint_id");--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_goals" ADD CONSTRAINT "company_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activity_history" ADD CONSTRAINT "opportunity_activity_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_communications" ADD CONSTRAINT "opportunity_communications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_file_attachments" ADD CONSTRAINT "opportunity_file_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_next_steps" ADD CONSTRAINT "opportunity_next_steps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stakeholders" ADD CONSTRAINT "opportunity_stakeholders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_opportunities" ADD CONSTRAINT "sales_opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_variables" ADD CONSTRAINT "system_variables_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry_approvals" ADD CONSTRAINT "time_entry_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_capacity" ADD CONSTRAINT "user_capacity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_organization_id_organizations_id_fk" FOREIGN KEY ("default_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workload_snapshots" ADD CONSTRAINT "workload_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budget_categories_org" ON "budget_categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_client_interactions_org" ON "client_interactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_clients_org" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_companies_org" ON "companies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_company_goals_org" ON "company_goals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_documents_org" ON "documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_org" ON "expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_org" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_articles_org" ON "knowledge_articles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_org" ON "marketing_campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_org" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activity_history_org" ON "opportunity_activity_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_communications_org" ON "opportunity_communications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_file_attachments_org" ON "opportunity_file_attachments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_next_steps_org" ON "opportunity_next_steps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_stakeholders_org" ON "opportunity_stakeholders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_project_activity_org" ON "project_activity" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_project_budgets_org" ON "project_budgets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_project_comments_org" ON "project_comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_project_templates_org" ON "project_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_projects_org" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_resource_allocations_org" ON "resource_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sales_opportunities_org" ON "sales_opportunities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_org" ON "support_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_system_variables_org" ON "system_variables" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_task_dependencies_org" ON "task_dependencies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_task_templates_org" ON "task_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_org" ON "tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_time_entries_org" ON "time_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_time_entry_approvals_org" ON "time_entry_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_availability_org" ON "user_availability" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_capacity_org" ON "user_capacity" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_skills_org" ON "user_skills" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_users_default_org" ON "users" USING btree ("default_organization_id");--> statement-breakpoint
CREATE INDEX "idx_workload_snapshots_org" ON "workload_snapshots" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_opportunity_id_unique" UNIQUE("opportunity_id");