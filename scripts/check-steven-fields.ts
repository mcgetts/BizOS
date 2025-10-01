#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { like } from 'drizzle-orm';

async function checkStevenFields() {
  console.log('🔍 Checking Steven McGettigan fields...\n');

  const steven = await db.select()
    .from(users)
    .where(like(users.email, '%steven%'))
    .limit(1);

  if (steven.length === 0) {
    console.log('❌ Steven McGettigan not found');
    process.exit(1);
  }

  const user = steven[0];
  console.log('📋 Steven McGettigan Status:');
  console.log('   Email:', user.email);
  console.log('   role:', user.role);
  console.log('   enhancedRole:', user.enhancedRole);
  console.log('   department:', user.department);
  console.log('   isActive:', user.isActive);

  if (user.role !== 'admin' || user.enhancedRole !== 'admin') {
    console.log('\n⚠️  ISSUE FOUND: Role fields are not both set to admin');
  } else {
    console.log('\n✅ All role fields correctly set to admin');
  }

  process.exit(0);
}

checkStevenFields().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});
