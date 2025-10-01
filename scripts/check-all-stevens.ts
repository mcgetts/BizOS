#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { or, like } from 'drizzle-orm';

async function checkAllStevens() {
  console.log('🔍 Checking all Steven McGettigan records...\n');

  const stevens = await db.select()
    .from(users)
    .where(
      or(
        like(users.email, '%steven%mcgettigan%'),
        like(users.email, '%steven%')
      )
    );

  console.log(`Found ${stevens.length} matching record(s):\n`);

  stevens.forEach((user, index) => {
    console.log(`Record ${index + 1}:`);
    console.log('   ID:', user.id);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Email:', user.email);
    console.log('   role:', user.role);
    console.log('   enhancedRole:', user.enhancedRole);
    console.log('   department:', user.department);
    console.log('   isActive:', user.isActive);
    console.log('');
  });

  process.exit(0);
}

checkAllStevens().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});
