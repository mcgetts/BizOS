#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { users } from '@shared/schema';

async function checkUsers() {
  console.log('🔍 Checking users in database...');

  try {
    const allUsers = await db.select().from(users);
    console.log(`✅ Found ${allUsers.length} users in database:`);

    allUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}, Enhanced: ${user.enhancedRole}, Dept: ${user.department}, Active: ${user.isActive}`);
    });

    if (allUsers.length === 0) {
      console.log('❌ No users found in database!');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

// Run the check
checkUsers().catch(console.error);