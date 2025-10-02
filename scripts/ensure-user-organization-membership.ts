import { db } from '../server/db';
import { users, organizations, organizationMembers } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Ensure all users are assigned to the default organization
 * Fixes the "organizationId required" error for multi-tenant operations
 */

async function ensureUserOrganizationMembership() {
  console.log('🏢 Ensuring all users have organization membership...\n');

  try {
    // Get default organization
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'default'))
      .limit(1);

    if (!defaultOrg) {
      console.error('❌ Default organization not found!');
      console.log('   Run the seed script first to create the default organization');
      process.exit(1);
    }

    console.log(`✅ Found default organization: ${defaultOrg.name} (${defaultOrg.id})\n`);

    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} total users\n`);

    let addedCount = 0;
    let updatedCount = 0;
    let alreadyMemberCount = 0;

    for (const user of allUsers) {
      console.log(`👤 Processing: ${user.email}`);

      // Check if user is already a member
      const [existingMembership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, user.id),
            eq(organizationMembers.organizationId, defaultOrg.id)
          )
        )
        .limit(1);

      if (existingMembership) {
        console.log(`   ✓ Already member with role: ${existingMembership.role}`);
        alreadyMemberCount++;
      } else {
        // Determine appropriate role for the organization
        // Use enhancedRole if available, fallback to role
        const userRole = user.enhancedRole || user.role || 'employee';
        let orgRole: 'owner' | 'admin' | 'member' = 'member';

        if (userRole === 'super_admin' || userRole === 'admin') {
          orgRole = 'owner';
        } else if (userRole === 'manager') {
          orgRole = 'admin';
        }

        // Add user to organization
        await db.insert(organizationMembers).values({
          userId: user.id,
          organizationId: defaultOrg.id,
          role: orgRole,
          status: 'active',
          joinedAt: new Date()
        });

        console.log(`   ✅ Added as ${orgRole}`);
        addedCount++;
      }

      // Update user's defaultOrganizationId if not set
      if (!user.defaultOrganizationId) {
        await db
          .update(users)
          .set({ defaultOrganizationId: defaultOrg.id })
          .where(eq(users.id, user.id));

        console.log(`   ✅ Set default organization`);
        updatedCount++;
      }

      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Already members: ${alreadyMemberCount}`);
    console.log(`   Newly added: ${addedCount}`);
    console.log(`   Default org updated: ${updatedCount}`);
    console.log('═'.repeat(80));

    // Verify all users now have memberships
    console.log('\n🔍 Verifying memberships...');
    const memberships = await db
      .select({
        userId: organizationMembers.userId,
        userEmail: users.email,
        orgName: organizations.name,
        role: organizationMembers.role,
        status: organizationMembers.status
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id));

    console.log(`\n✅ Total memberships: ${memberships.length}\n`);
    console.log('Sample memberships:');
    memberships.slice(0, 10).forEach(m => {
      console.log(`   ${m.userEmail.padEnd(35)} | ${m.orgName.padEnd(25)} | ${m.role.padEnd(10)} | ${m.status}`);
    });

    if (memberships.length !== allUsers.length) {
      console.log(`\n⚠️  Warning: ${allUsers.length - memberships.length} users without memberships!`);
    } else {
      console.log('\n✅ All users have organization memberships!');
    }

    console.log('\n✅ Organization membership check completed successfully');

  } catch (error) {
    console.error('❌ Error ensuring organization memberships:', error);
    throw error;
  }
}

// Run the script
ensureUserOrganizationMembership()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
