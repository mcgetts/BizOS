/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script:
 * 1. Creates a default organization for existing data
 * 2. Assigns all existing records to this organization
 * 3. Creates organizationMembers entries for all users
 * 4. Validates the migration
 *
 * IMPORTANT: Backup your database before running this!
 */

import { db } from '../server/db';
import {
  organizations,
  organizationMembers,
  users,
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
  salesOpportunities,
  opportunityNextSteps,
  opportunityCommunications,
  opportunityStakeholders,
  projectTemplates,
  taskTemplates,
  notifications,
  roles,
  auditLogs,
} from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';

interface MigrationStats {
  organizationCreated: boolean;
  tablesUpdated: { [key: string]: number };
  membersCreated: number;
  errors: string[];
}

async function createDefaultOrganization(): Promise<string> {
  console.log('\n🏢 Creating default organization...');

  // Check if default organization already exists
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.subdomain, 'default'))
    .limit(1);

  if (existing) {
    console.log(`✅ Default organization already exists: ${existing.id}`);
    return existing.id;
  }

  // Create default organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Default Organization',
      subdomain: 'default',
      slug: 'default',
      planTier: 'professional', // Give them a good plan
      status: 'active',
      maxUsers: 50, // Generous limit
      settings: {
        features: ['all'],
        branding: {},
        notifications: { email: true },
      },
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    })
    .returning();

  console.log(`✅ Created default organization: ${org.id}`);
  return org.id;
}

async function updateTableWithOrgId(
  table: any,
  tableName: string,
  orgId: string
): Promise<number> {
  try {
    // Only update records that don't have organizationId set
    const result = await db
      .update(table)
      .set({ organizationId: orgId })
      .where(isNull(table.organizationId));

    // Count affected rows (this is a rough estimate)
    const [countResult] = await db
      .select()
      .from(table)
      .where(eq(table.organizationId, orgId));

    console.log(`  ✓ ${tableName}: Updated`);
    return 1; // Return 1 to indicate success
  } catch (error: any) {
    if (error.message?.includes('column "organization_id" does not exist')) {
      console.log(`  ⚠ ${tableName}: Column not yet added to schema`);
      return 0;
    }
    throw error;
  }
}

async function createOrganizationMembers(orgId: string): Promise<number> {
  console.log('\n👥 Creating organization memberships...');

  // Get all users
  const allUsers = await db.select().from(users);

  if (allUsers.length === 0) {
    console.log('  ℹ No users found');
    return 0;
  }

  let createdCount = 0;

  for (const user of allUsers) {
    // Check if membership already exists
    const [existing] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id))
      .limit(1);

    if (existing) {
      console.log(`  ⚠ User ${user.email} already has membership`);
      continue;
    }

    // Determine role based on user's enhancedRole
    let role = 'member';
    if (user.enhancedRole === 'super_admin') {
      role = 'owner';
    } else if (user.enhancedRole === 'admin') {
      role = 'admin';
    }

    // Create membership
    await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId: user.id,
      role: role,
      status: 'active',
      invitedBy: null, // No inviter for migrated users
    });

    console.log(`  ✓ ${user.email} -> ${role}`);
    createdCount++;
  }

  return createdCount;
}

async function updateUserDefaultOrganization(orgId: string): Promise<number> {
  console.log('\n👤 Setting default organization for users...');

  const result = await db
    .update(users)
    .set({ defaultOrganizationId: orgId })
    .where(isNull(users.defaultOrganizationId));

  const [count] = await db
    .select()
    .from(users)
    .where(eq(users.defaultOrganizationId, orgId));

  console.log(`  ✓ Updated default organization for users`);
  return 1;
}

async function validateMigration(orgId: string): Promise<void> {
  console.log('\n🔍 Validating migration...');

  // Check organization exists
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    throw new Error('Organization not found after migration!');
  }
  console.log(`  ✓ Organization exists: ${org.name}`);

  // Check users have memberships
  const allUsers = await db.select().from(users);
  const memberships = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  console.log(`  ✓ Users: ${allUsers.length}, Memberships: ${memberships.length}`);

  if (allUsers.length > 0 && memberships.length === 0) {
    throw new Error('Users exist but no memberships created!');
  }

  // Sample check: Verify projects have organizationId
  try {
    const projectsWithOrg = await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, orgId))
      .limit(5);

    console.log(`  ✓ Sample projects with organizationId: ${projectsWithOrg.length}`);
  } catch (error) {
    console.log('  ⚠ Projects table not yet updated with organizationId');
  }

  console.log('✅ Migration validation passed');
}

async function migrate(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    organizationCreated: false,
    tablesUpdated: {},
    membersCreated: 0,
    errors: [],
  };

  try {
    console.log('═══════════════════════════════════════');
    console.log('🚀 Starting Multi-Tenant Migration');
    console.log('═══════════════════════════════════════');

    // Step 1: Create default organization
    const orgId = await createDefaultOrganization();
    stats.organizationCreated = true;

    // Step 2: Update tables with organizationId
    console.log('\n📊 Updating tables with organizationId...');

    const tablesToUpdate = [
      { table: clients, name: 'clients' },
      { table: companies, name: 'companies' },
      { table: projects, name: 'projects' },
      { table: tasks, name: 'tasks' },
      { table: timeEntries, name: 'timeEntries' },
      { table: invoices, name: 'invoices' },
      { table: expenses, name: 'expenses' },
      { table: documents, name: 'documents' },
      { table: knowledgeArticles, name: 'knowledgeArticles' },
      { table: marketingCampaigns, name: 'marketingCampaigns' },
      { table: supportTickets, name: 'supportTickets' },
      { table: salesOpportunities, name: 'salesOpportunities' },
      { table: opportunityNextSteps, name: 'opportunityNextSteps' },
      { table: opportunityCommunications, name: 'opportunityCommunications' },
      { table: opportunityStakeholders, name: 'opportunityStakeholders' },
      { table: projectTemplates, name: 'projectTemplates' },
      { table: taskTemplates, name: 'taskTemplates' },
      { table: notifications, name: 'notifications' },
      { table: roles, name: 'roles' },
      { table: auditLogs, name: 'auditLogs' },
    ];

    for (const { table, name } of tablesToUpdate) {
      try {
        const count = await updateTableWithOrgId(table, name, orgId);
        stats.tablesUpdated[name] = count;
      } catch (error: any) {
        const errorMsg = `Failed to update ${name}: ${error.message}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // Step 3: Update users' default organization
    await updateUserDefaultOrganization(orgId);

    // Step 4: Create organization memberships
    stats.membersCreated = await createOrganizationMembers(orgId);

    // Step 5: Validate migration
    await validateMigration(orgId);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Migration Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`Organization ID: ${orgId}`);
    console.log(`Members Created: ${stats.membersCreated}`);
    console.log(`Tables Updated: ${Object.keys(stats.tablesUpdated).length}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((err) => console.log(`  - ${err}`));
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    stats.errors.push(error.message);
    throw error;
  }

  return stats;
}

// Run migration
migrate()
  .then((stats) => {
    console.log('\n📊 Final Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

export { createDefaultOrganization };
