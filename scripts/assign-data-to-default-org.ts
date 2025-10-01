/**
 * Data Migration Script: Assign Existing Data to Default Organization
 *
 * This script updates all existing records to belong to the default organization.
 * Run this AFTER the schema migration has added organizationId columns.
 *
 * Usage:
 *   npx tsx scripts/assign-data-to-default-org.ts
 */

import { db } from '../server/db';
import {
  organizations,
  clients,
  companies,
  projects,
  tasks,
  timeEntries,
  invoices,
  expenses,
  documents,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  supportTicketComments,
  slaConfigurations,
  ticketEscalations,
  companyGoals,
  systemVariables,
  clientInteractions,
  salesOpportunities,
  opportunityNextSteps,
  opportunityCommunications,
  opportunityStakeholders,
  opportunityActivityHistory,
  opportunityFileAttachments,
  projectTemplates,
  taskTemplates,
  taskDependencies,
  projectComments,
  taskComments,
  projectActivity,
  userCapacity,
  userAvailability,
  userSkills,
  resourceAllocations,
  budgetCategories,
  projectBudgets,
  timeEntryApprovals,
  workloadSnapshots,
  notifications,
  roles,
  userRoleAssignments,
  userSessions,
  auditLogs,
  securityEvents,
  dataAccessLogs,
  permissionExceptions,
  mfaTokens,
  systemSettings,
  userInvitations,
} from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function assignDataToDefaultOrganization() {
  console.log('🔄 Starting data migration to default organization...\n');

  try {
    // Get default organization
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.subdomain, 'default'))
      .limit(1);

    if (!defaultOrg) {
      console.error('❌ Default organization not found!');
      console.error('Please run the application first to create the default organization via seed.');
      process.exit(1);
    }

    console.log(`✅ Found default organization: ${defaultOrg.name} (${defaultOrg.id})\n`);

    // List of all tables with organizationId
    const tables = [
      { name: 'clients', table: clients },
      { name: 'companies', table: companies },
      { name: 'projects', table: projects },
      { name: 'tasks', table: tasks },
      { name: 'time_entries', table: timeEntries },
      { name: 'invoices', table: invoices },
      { name: 'expenses', table: expenses },
      { name: 'documents', table: documents },
      { name: 'knowledge_articles', table: knowledgeArticles },
      { name: 'marketing_campaigns', table: marketingCampaigns },
      { name: 'support_tickets', table: supportTickets },
      { name: 'support_ticket_comments', table: supportTicketComments },
      { name: 'sla_configurations', table: slaConfigurations },
      { name: 'ticket_escalations', table: ticketEscalations },
      { name: 'company_goals', table: companyGoals },
      { name: 'system_variables', table: systemVariables },
      { name: 'client_interactions', table: clientInteractions },
      { name: 'sales_opportunities', table: salesOpportunities },
      { name: 'opportunity_next_steps', table: opportunityNextSteps },
      { name: 'opportunity_communications', table: opportunityCommunications },
      { name: 'opportunity_stakeholders', table: opportunityStakeholders },
      { name: 'opportunity_activity_history', table: opportunityActivityHistory },
      { name: 'opportunity_file_attachments', table: opportunityFileAttachments },
      { name: 'project_templates', table: projectTemplates },
      { name: 'task_templates', table: taskTemplates },
      { name: 'task_dependencies', table: taskDependencies },
      { name: 'project_comments', table: projectComments },
      { name: 'task_comments', table: taskComments },
      { name: 'project_activity', table: projectActivity },
      { name: 'user_capacity', table: userCapacity },
      { name: 'user_availability', table: userAvailability },
      { name: 'user_skills', table: userSkills },
      { name: 'resource_allocations', table: resourceAllocations },
      { name: 'budget_categories', table: budgetCategories },
      { name: 'project_budgets', table: projectBudgets },
      { name: 'time_entry_approvals', table: timeEntryApprovals },
      { name: 'workload_snapshots', table: workloadSnapshots },
      { name: 'notifications', table: notifications },
      { name: 'roles', table: roles },
      { name: 'user_role_assignments', table: userRoleAssignments },
      { name: 'user_sessions', table: userSessions },
      { name: 'audit_logs', table: auditLogs },
      { name: 'security_events', table: securityEvents },
      { name: 'data_access_logs', table: dataAccessLogs },
      { name: 'permission_exceptions', table: permissionExceptions },
      { name: 'mfa_tokens', table: mfaTokens },
      { name: 'system_settings', table: systemSettings },
      { name: 'user_invitations', table: userInvitations },
    ];

    let totalUpdated = 0;
    const results: { table: string; count: number }[] = [];

    for (const { name, table } of tables) {
      try {
        // Count records with null organizationId
        const recordsToUpdate = await db
          .select()
          .from(table)
          .where(isNull((table as any).organizationId));

        if (recordsToUpdate.length === 0) {
          console.log(`⏭️  ${name}: 0 records to update (all already assigned)`);
          results.push({ table: name, count: 0 });
          continue;
        }

        // Update records to use default organizationId
        const result = await db
          .update(table)
          .set({ organizationId: defaultOrg.id } as any)
          .where(isNull((table as any).organizationId));

        const count = recordsToUpdate.length;
        totalUpdated += count;
        results.push({ table: name, count });
        console.log(`✅ ${name}: Updated ${count} record(s)`);
      } catch (error: any) {
        console.error(`❌ Error updating ${name}:`, error.message);
        results.push({ table: name, count: 0 });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total tables processed: ${tables.length}`);
    console.log(`Total records updated: ${totalUpdated}`);
    console.log('='.repeat(60));

    if (totalUpdated > 0) {
      console.log('\n✅ Data migration completed successfully!');
      console.log(`All ${totalUpdated} existing records are now assigned to: ${defaultOrg.name}`);
    } else {
      console.log('\n✅ No records needed migration (all already assigned)');
    }

    console.log('\n📋 Detailed Results:');
    results
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .forEach(r => {
        console.log(`  ${r.table.padEnd(35)} ${r.count.toString().padStart(6)} records`);
      });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
assignDataToDefaultOrganization()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
