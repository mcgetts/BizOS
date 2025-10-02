import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Fix user permissions by properly setting enhancedRole and department
 *
 * Root Causes Found:
 * 1. RBAC middleware requires department but many users have NULL
 * 2. enhancedRole is 'employee' even though role is 'admin'
 * 3. Permission system checks enhancedRole + department combination
 * 4. Employees don't have 'create' permissions for most resources
 */

async function fixUserPermissions() {
  console.log('🔧 Starting user permission fix...\n');

  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} total users\n`);

    // Identify users needing fixes
    const usersNeedingFix = allUsers.filter(user => {
      const needsDepartment = !user.department;
      const roleEnhancedMismatch = user.role === 'admin' && user.enhancedRole === 'employee';
      const isSuperAdminMismatch = user.role === 'super_admin' && user.enhancedRole !== 'super_admin';

      return needsDepartment || roleEnhancedMismatch || isSuperAdminMismatch;
    });

    console.log(`Found ${usersNeedingFix.length} users needing fixes:\n`);

    for (const user of usersNeedingFix) {
      console.log(`📋 User: ${user.email}`);
      console.log(`   Current - Role: ${user.role}, EnhancedRole: ${user.enhancedRole}, Department: ${user.department || 'NULL'}`);

      // Determine correct values
      let newEnhancedRole = user.enhancedRole;
      let newDepartment = user.department;

      // Fix enhanced role mismatch
      if (user.role === 'super_admin' && user.enhancedRole !== 'super_admin') {
        newEnhancedRole = 'super_admin';
      } else if (user.role === 'admin' && user.enhancedRole === 'employee') {
        newEnhancedRole = 'admin';
      }

      // Fix missing department
      if (!newDepartment) {
        // Assign department based on role
        if (newEnhancedRole === 'super_admin' || newEnhancedRole === 'admin') {
          newDepartment = 'admin'; // Admin department has full permissions
        } else if (newEnhancedRole === 'manager') {
          newDepartment = 'operations'; // Managers typically in operations
        } else {
          newDepartment = 'operations'; // Default to operations for employees
        }
      }

      // Update user
      await db
        .update(users)
        .set({
          enhancedRole: newEnhancedRole,
          department: newDepartment,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      console.log(`   ✅ Fixed - Role: ${user.role}, EnhancedRole: ${newEnhancedRole}, Department: ${newDepartment}\n`);
    }

    // Show summary of all users after fix
    console.log('\n📊 Summary of all users after fix:');
    console.log('═'.repeat(100));

    const updatedUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      enhancedRole: users.enhancedRole,
      department: users.department
    }).from(users);

    for (const user of updatedUsers) {
      console.log(`${user.email.padEnd(35)} | Role: ${(user.role || 'NULL').padEnd(12)} | Enhanced: ${(user.enhancedRole || 'NULL').padEnd(12)} | Dept: ${user.department || 'NULL'}`);
    }

    console.log('═'.repeat(100));
    console.log(`\n✅ Successfully fixed ${usersNeedingFix.length} users`);
    console.log('\n🔑 Admin users now have:');
    console.log('   - enhancedRole: admin (or super_admin)');
    console.log('   - department: admin');
    console.log('   - Full create/update/delete permissions across all resources\n');

  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
    throw error;
  }
}

// Run the fix
fixUserPermissions()
  .then(() => {
    console.log('✅ Permission fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Permission fix failed:', error);
    process.exit(1);
  });
