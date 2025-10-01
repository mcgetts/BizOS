#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function deleteUserSimple() {
  console.log('🗑️ Deleting steven@mcgettigan.com using raw SQL...\n');

  try {
    const result = await db.execute(sql`
      DELETE FROM users
      WHERE email = 'steven@mcgettigan.com'
      RETURNING id, email, "firstName", "lastName"
    `);

    if (result.rowCount && result.rowCount > 0) {
      console.log('✅ User deleted successfully:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Name: ${result.rows[0].firstName} ${result.rows[0].lastName}\n`);
    } else {
      console.log('❌ User not found\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error);
    console.log('\nℹ️  This might fail due to foreign key constraints.');
    console.log('   You may need to manually update related tables first.\n');
    process.exit(1);
  }
}

deleteUserSimple();
