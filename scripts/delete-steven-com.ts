#!/usr/bin/env tsx

import { db } from '../server/db';
import {
  users,
  projects,
  tasks,
  timeEntries,
  expenses,
  invoices,
  clientInteractions,
  documents,
  salesOpportunities,
  projectComments,
  projectActivity,
  notifications,
  auditLogs,
  sessions,
  clients,
  opportunityNextSteps,
  systemVariables
} from '../shared/schema';
import { eq, like, sql } from 'drizzle-orm';

async function deleteUser() {
  console.log('🗑️  Deleting user steven@mcgettigan.com and all related records...\n');

  try {
    // Find the user
    const userToDelete = await db.select()
      .from(users)
      .where(eq(users.email, 'steven@mcgettigan.com'))
      .limit(1);

    if (userToDelete.length === 0) {
      console.log('❌ User steven@mcgettigan.com not found');
      process.exit(1);
    }

    const user = userToDelete[0];
    const userId = user.id;

    console.log(`👤 Found user:`);
    console.log(`   ID: ${userId}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n🔍 Checking for related records...\n`);

    // Delete related records in order (respecting foreign key constraints)
    // Using try-catch for each operation since some tables may not exist in production

    let stats = {
      notifications: 0,
      auditLogs: 0,
      comments: 0,
      activity: 0,
      timeEntries: 0,
      documents: 0,
      interactions: 0,
      expenses: 0,
      invoices: 0,
      tasksUnassigned: 0,
      projectsUpdated: 0,
      opportunitiesUpdated: 0,
      clientsUpdated: 0,
      nextStepsUpdated: 0
    };

    // 1. Update opportunity next steps assigned to user (set to null)
    try {
      const updated = await db.update(opportunityNextSteps)
        .set({ assignedTo: null })
        .where(eq(opportunityNextSteps.assignedTo, userId))
        .returning();
      stats.nextStepsUpdated = updated.length;
      console.log(`   ✅ Removed assignment from ${updated.length} opportunity next steps`);
    } catch (e) {
      console.log(`   ⏭️  Skipped opportunity next steps updates (table may not exist)`);
    }

    // 2. Update clients assigned to user (set to null)
    try {
      const updated = await db.update(clients)
        .set({ assignedTo: null })
        .where(eq(clients.assignedTo, userId))
        .returning();
      stats.clientsUpdated = updated.length;
      console.log(`   ✅ Removed assignment from ${updated.length} clients`);
    } catch (e) {
      console.log(`   ⏭️  Skipped client updates (table may not exist)`);
    }

    // 2. Delete notifications
    try {
      const deleted = await db.delete(notifications)
        .where(eq(notifications.userId, userId))
        .returning();
      stats.notifications = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} notifications`);
    } catch (e) {
      console.log(`   ⏭️  Skipped notifications (table may not exist)`);
    }

    // 2. Delete audit logs
    try {
      const deleted = await db.delete(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .returning();
      stats.auditLogs = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} audit logs`);
    } catch (e) {
      console.log(`   ⏭️  Skipped audit logs (table may not exist)`);
    }

    // 3. Delete project comments
    try {
      const deleted = await db.delete(projectComments)
        .where(eq(projectComments.userId, userId))
        .returning();
      stats.comments = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} project comments`);
    } catch (e) {
      console.log(`   ⏭️  Skipped project comments (table may not exist)`);
    }

    // 4. Delete project activity
    try {
      const deleted = await db.delete(projectActivity)
        .where(eq(projectActivity.userId, userId))
        .returning();
      stats.activity = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} project activities`);
    } catch (e) {
      console.log(`   ⏭️  Skipped project activity (table may not exist)`);
    }

    // 5. Delete time entries
    try {
      const deleted = await db.delete(timeEntries)
        .where(eq(timeEntries.userId, userId))
        .returning();
      stats.timeEntries = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} time entries`);
    } catch (e) {
      console.log(`   ⏭️  Skipped time entries (table may not exist)`);
    }

    // 6. Delete documents uploaded by user
    try {
      const deleted = await db.delete(documents)
        .where(eq(documents.uploadedBy, userId))
        .returning();
      stats.documents = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} documents`);
    } catch (e) {
      console.log(`   ⏭️  Skipped documents (table may not exist)`);
    }

    // 7. Delete client interactions
    try {
      const deleted = await db.delete(clientInteractions)
        .where(eq(clientInteractions.userId, userId))
        .returning();
      stats.interactions = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} client interactions`);
    } catch (e) {
      console.log(`   ⏭️  Skipped client interactions (table may not exist)`);
    }

    // 8. Delete expenses
    try {
      const deleted = await db.delete(expenses)
        .where(eq(expenses.userId, userId))
        .returning();
      stats.expenses = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} expenses`);
    } catch (e) {
      console.log(`   ⏭️  Skipped expenses (table may not exist)`);
    }

    // 9. Delete invoices
    try {
      const deleted = await db.delete(invoices)
        .where(eq(invoices.createdBy, userId))
        .returning();
      stats.invoices = deleted.length;
      console.log(`   ✅ Deleted ${deleted.length} invoices`);
    } catch (e) {
      console.log(`   ⏭️  Skipped invoices (table may not exist)`);
    }

    // 10. Update tasks assigned to user (set to null instead of deleting)
    try {
      const updated = await db.update(tasks)
        .set({ assignedTo: null })
        .where(eq(tasks.assignedTo, userId))
        .returning();
      stats.tasksUnassigned = updated.length;
      console.log(`   ✅ Unassigned ${updated.length} tasks`);
    } catch (e) {
      console.log(`   ⏭️  Skipped task updates (table may not exist)`);
    }

    // 11. Update projects managed by user (set to null)
    try {
      const updated = await db.update(projects)
        .set({ managerId: null })
        .where(eq(projects.managerId, userId))
        .returning();
      stats.projectsUpdated = updated.length;
      console.log(`   ✅ Removed manager from ${updated.length} projects`);
    } catch (e) {
      console.log(`   ⏭️  Skipped project updates (table may not exist)`);
    }

    // 12. Update sales opportunities assigned to user (CRITICAL - must run)
    const updatedAssigned = await db.update(salesOpportunities)
      .set({ assignedTo: null })
      .where(eq(salesOpportunities.assignedTo, userId))
      .returning();
    console.log(`   ✅ Removed assignment from ${updatedAssigned.length} sales opportunities (assignedTo)`);

    // 13. Update sales opportunities owned by user
    try {
      const updatedOwner = await db.update(salesOpportunities)
        .set({ ownerId: null })
        .where(eq(salesOpportunities.ownerId, userId))
        .returning();
      stats.opportunitiesUpdated = updatedOwner.length + updatedAssigned.length;
      console.log(`   ✅ Removed owner from ${updatedOwner.length} sales opportunities (ownerId)`);
    } catch (e) {
      console.log(`   ⏭️  Skipped opportunity owner updates (column may not exist)`);
      stats.opportunitiesUpdated = updatedAssigned.length;
    }

    // 14. Update system variables updated by user
    try {
      const updated = await db.update(systemVariables)
        .set({ updatedBy: null })
        .where(eq(systemVariables.updatedBy, userId))
        .returning();
      console.log(`   ✅ Removed updatedBy from ${updated.length} system variables`);
    } catch (e) {
      console.log(`   ⏭️  Skipped system variables (table may not exist)`);
    }

    // 15. Delete all sessions for this user
    await db.execute(sql`
      DELETE FROM sessions
      WHERE sess::text LIKE '%"id":"' || ${userId} || '"%'
    `);
    console.log(`   ✅ Deleted all sessions`);

    // 16. Finally, delete the user
    const deletedUser = await db.delete(users)
      .where(eq(users.id, userId))
      .returning();
    console.log(`\n   ✅ Deleted user: ${deletedUser[0].email}`);

    console.log('\n✅ User and all related records successfully deleted!\n');
    console.log('📊 Summary:');
    console.log(`   - Notifications: ${stats.notifications}`);
    console.log(`   - Audit Logs: ${stats.auditLogs}`);
    console.log(`   - Comments: ${stats.comments}`);
    console.log(`   - Activities: ${stats.activity}`);
    console.log(`   - Time Entries: ${stats.timeEntries}`);
    console.log(`   - Documents: ${stats.documents}`);
    console.log(`   - Client Interactions: ${stats.interactions}`);
    console.log(`   - Expenses: ${stats.expenses}`);
    console.log(`   - Invoices: ${stats.invoices}`);
    console.log(`   - Tasks Unassigned: ${stats.tasksUnassigned}`);
    console.log(`   - Projects Updated: ${stats.projectsUpdated}`);
    console.log(`   - Opportunities Updated: ${stats.opportunitiesUpdated}`);
    console.log(`   - Clients Updated: ${stats.clientsUpdated}`);
    console.log(`   - Next Steps Updated: ${stats.nextStepsUpdated}\n`);

    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

deleteUser();
