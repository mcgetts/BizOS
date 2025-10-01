#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, or } from 'drizzle-orm';

async function emergencyAdminOverride() {
  console.log('🚨 EMERGENCY ADMIN OVERRIDE - Granting Super Admin privileges\n');

  try {
    // Update BOTH Steven accounts to super_admin (highest privilege level)
    const stevenEmails = ['steven@mcgettigan.co.uk', 'steven@mcgettigan.com'];

    for (const email of stevenEmails) {
      const [updated] = await db.update(users)
        .set({
          role: 'super_admin' as const,
          enhancedRole: 'super_admin' as const,
          department: 'Management',
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.email, email))
        .returning();

      if (updated) {
        console.log(`✅ SUPER ADMIN ACCESS GRANTED: ${email}`);
        console.log(`   ID: ${updated.id}`);
        console.log(`   Role: ${updated.role}`);
        console.log(`   Enhanced Role: ${updated.enhancedRole}`);
        console.log(`   Department: ${updated.department}`);
        console.log(`   Active: ${updated.isActive}\n`);
      } else {
        console.log(`⚠️  Account not found: ${email}\n`);
      }
    }

    // Verify the updates
    console.log('🔍 VERIFICATION - Checking current status...\n');

    const allStevens = await db.select()
      .from(users)
      .where(or(
        eq(users.email, 'steven@mcgettigan.co.uk'),
        eq(users.email, 'steven@mcgettigan.com')
      ));

    console.log('📊 Current Database Status:');
    for (const user of allStevens) {
      console.log(`\n   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Enhanced Role: ${user.enhancedRole}`);
      console.log(`   Department: ${user.department}`);
      console.log(`   Is Active: ${user.isActive}`);
    }

    console.log('\n✅ EMERGENCY OVERRIDE COMPLETE!');
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Steven must LOGOUT from production app');
    console.log('   2. Clear browser cache (Ctrl+Shift+F5)');
    console.log('   3. LOGIN again with steven@mcgettigan.co.uk');
    console.log('   4. Should now see "Super Admin" privileges\n');
    console.log('⚠️  NOTE: If this STILL does not work, production may be using:');
    console.log('   - Cached build (needs rebuild/redeploy)');
    console.log('   - Different database connection');
    console.log('   - Old server code (restart required)\n');

    process.exit(0);
  } catch (error) {
    console.error('💥 ERROR:', error);
    process.exit(1);
  }
}

emergencyAdminOverride();
