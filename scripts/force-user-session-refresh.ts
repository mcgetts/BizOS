#!/usr/bin/env tsx

import { db } from '../server/db';
import { users, sessions } from '../shared/schema';
import { eq, like, sql } from 'drizzle-orm';

async function forceSessionRefresh() {
  console.log('🔄 Forcing session refresh for Steven McGettigan...\n');

  try {
    // Find Steven's user records
    const stevens = await db.select()
      .from(users)
      .where(like(users.email, '%steven%mcgettigan%'));

    if (stevens.length === 0) {
      console.log('❌ No Steven McGettigan records found');
      process.exit(1);
    }

    console.log(`Found ${stevens.length} Steven McGettigan record(s)\n`);

    for (const steven of stevens) {
      console.log(`📧 Processing: ${steven.email}`);
      console.log(`   Current role: ${steven.role}`);
      console.log(`   Current enhancedRole: ${steven.enhancedRole}`);

      // Update the user's updatedAt timestamp to force cache invalidation
      await db.update(users)
        .set({
          updatedAt: new Date()
        })
        .where(eq(users.id, steven.id));

      // Delete all active sessions for this user to force re-login with fresh data
      // Sessions table stores session data as JSON with passport.user property
      const result = await db.execute(sql`
        DELETE FROM sessions
        WHERE sess::text LIKE '%"id":"' || ${steven.id} || '"%'
      `);

      console.log(`   ✅ Updated timestamp`);
      console.log(`   ✅ Deleted all active sessions for user`);
      console.log(`   ℹ️  User will need to login again to get fresh session data\n`);
    }

    console.log('✅ Session refresh complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Steven needs to logout from the production app');
    console.log('   2. Steven needs to login again');
    console.log('   3. The profile should now show "Admin" role\n');

    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

forceSessionRefresh();
