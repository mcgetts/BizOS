#!/usr/bin/env tsx
/**
 * Sync User Roles Script
 *
 * This script ensures that the 'role' and 'enhancedRole' fields are in sync for all users.
 *
 * Background:
 * - 'role' is used for basic authentication and permissions (super_admin, admin, manager, employee)
 * - 'enhancedRole' is used for UI display and fine-grained RBAC
 * - These should typically match for consistency
 *
 * Usage:
 *   npm run tsx scripts/sync-user-roles.ts [--dry-run] [--role-priority]
 *
 * Options:
 *   --dry-run: Show what would be changed without making changes
 *   --role-priority: Use 'role' as source of truth (default: use enhancedRole)
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, or, and, ne, isNull, isNotNull } from 'drizzle-orm';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const useRolePriority = args.includes('--role-priority');

interface UserRoleData {
  id: string;
  email: string;
  role: string | null;
  enhancedRole: string | null;
}

async function syncUserRoles() {
  console.log('🔄 User Role Sync Script');
  console.log('========================\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log(`📊 Strategy: ${useRolePriority ? 'Use role as source' : 'Use enhancedRole as source'}\n`);

  try {
    // Find users where role and enhancedRole don't match
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        enhancedRole: users.enhancedRole,
      })
      .from(users);

    const mismatched: UserRoleData[] = [];
    const nullFields: UserRoleData[] = [];
    const matched: UserRoleData[] = [];

    for (const user of allUsers) {
      if (user.role === null || user.enhancedRole === null) {
        nullFields.push(user as UserRoleData);
      } else if (user.role !== user.enhancedRole) {
        mismatched.push(user as UserRoleData);
      } else {
        matched.push(user as UserRoleData);
      }
    }

    console.log(`✅ Users with matching roles: ${matched.length}`);
    console.log(`⚠️  Users with mismatched roles: ${mismatched.length}`);
    console.log(`❌ Users with null role fields: ${nullFields.length}\n`);

    // Handle null fields
    if (nullFields.length > 0) {
      console.log('📝 Users with null role fields:');
      for (const user of nullFields) {
        console.log(`   - ${user.email}: role=${user.role || 'NULL'}, enhancedRole=${user.enhancedRole || 'NULL'}`);

        if (!isDryRun) {
          if (user.role === null && user.enhancedRole !== null) {
            await db.update(users)
              .set({ role: user.enhancedRole })
              .where(eq(users.id, user.id));
            console.log(`      → Set role to "${user.enhancedRole}"`);
          } else if (user.enhancedRole === null && user.role !== null) {
            await db.update(users)
              .set({ enhancedRole: user.role })
              .where(eq(users.id, user.id));
            console.log(`      → Set enhancedRole to "${user.role}"`);
          } else {
            // Both null - set default
            await db.update(users)
              .set({ role: 'employee', enhancedRole: 'employee' })
              .where(eq(users.id, user.id));
            console.log(`      → Set both to "employee" (default)`);
          }
        }
      }
      console.log();
    }

    // Handle mismatched fields
    if (mismatched.length > 0) {
      console.log('📝 Users with mismatched roles:');
      for (const user of mismatched) {
        console.log(`   - ${user.email}: role=${user.role}, enhancedRole=${user.enhancedRole}`);

        if (!isDryRun) {
          if (useRolePriority) {
            // Use 'role' as source of truth
            await db.update(users)
              .set({ enhancedRole: user.role })
              .where(eq(users.id, user.id));
            console.log(`      → Updated enhancedRole to "${user.role}"`);
          } else {
            // Use 'enhancedRole' as source of truth (default)
            await db.update(users)
              .set({ role: user.enhancedRole })
              .where(eq(users.id, user.id));
            console.log(`      → Updated role to "${user.enhancedRole}"`);
          }
        } else {
          if (useRolePriority) {
            console.log(`      → Would update enhancedRole to "${user.role}"`);
          } else {
            console.log(`      → Would update role to "${user.enhancedRole}"`);
          }
        }
      }
      console.log();
    }

    // Summary
    console.log('✅ Sync completed successfully!');

    if (isDryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    } else {
      console.log(`\n📊 Updated ${mismatched.length + nullFields.length} user(s)`);
    }

  } catch (error) {
    console.error('❌ Error syncing user roles:', error);
    process.exit(1);
  }
}

// Run the sync
syncUserRoles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
