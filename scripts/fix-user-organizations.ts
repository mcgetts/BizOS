/**
 * Fix User Organization Memberships
 * 
 * This script ensures all users with a default_organization_id
 * have a corresponding entry in organization_members table.
 * 
 * Run: npx tsx scripts/fix-user-organizations.ts
 */

import { db } from '../server/db';
import { users, organizations, organizationMembers } from '../shared/schema';
import { eq, and, notInArray, sql } from 'drizzle-orm';

async function fixUserOrganizations() {
  console.log('🔧 Starting user organization membership fix...\n');

  try {
    // Get default organization
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'default'))
      .limit(1);

    if (!defaultOrg) {
      console.error('❌ Default organization not found!');
      console.log('💡 Tip: Run the server once to create default organization via seed script');
      process.exit(1);
    }

    console.log(`✅ Found default organization: ${defaultOrg.name} (${defaultOrg.id})\n`);

    // Find all users without organization membership
    const allUsers = await db.select().from(users);
    const memberships = await db.select().from(organizationMembers);
    const membershipUserIds = new Set(memberships.map(m => m.userId));

    const usersWithoutMembership = allUsers.filter(u => !membershipUserIds.has(u.id));

    if (usersWithoutMembership.length === 0) {
      console.log('✅ All users already have organization memberships!');
      return;
    }

    console.log(`📋 Found ${usersWithoutMembership.length} user(s) without organization membership:\n`);

    // Fix each user
    let fixed = 0;
    for (const user of usersWithoutMembership) {
      console.log(`  👤 ${user.email} (${user.id})`);

      try {
        // Create organization membership
        await db.insert(organizationMembers).values({
          userId: user.id,
          organizationId: defaultOrg.id,
          role: 'member', // Default role for regular users
          status: 'active',
        });

        // Update user's default organization if not set
        if (!user.defaultOrganizationId) {
          await db
            .update(users)
            .set({ defaultOrganizationId: defaultOrg.id })
            .where(eq(users.id, user.id));
        }

        console.log(`     ✅ Added to organization with 'member' role`);
        fixed++;
      } catch (error: any) {
        console.error(`     ❌ Failed: ${error.message}`);
      }
    }

    console.log(`\n✅ Fixed ${fixed}/${usersWithoutMembership.length} users`);
    console.log('\n🎉 User organization membership fix complete!');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixUserOrganizations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
