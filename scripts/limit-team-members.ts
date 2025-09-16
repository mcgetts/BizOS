#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { desc } from 'drizzle-orm';

async function limitTeamMembers() {
  console.log('🔍 Checking current team members...');

  // Get all users
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  console.log(`📊 Current team members: ${allUsers.length}`);

  if (allUsers.length <= 10) {
    console.log('✅ Team already has 10 or fewer members. No action needed.');
    return;
  }

  // Keep the first 10 users (by creation date - keep oldest)
  const usersToKeep = allUsers.slice(0, 10);
  const usersToRemove = allUsers.slice(10);

  console.log(`📋 Keeping ${usersToKeep.length} members:`);
  usersToKeep.forEach((user, i) => {
    console.log(`  ${i + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
  });

  console.log(`🗑️  Removing ${usersToRemove.length} members:`);
  usersToRemove.forEach((user, i) => {
    console.log(`  ${i + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
  });

  // Remove excess users
  for (const user of usersToRemove) {
    try {
      await db.delete(users).where(users.id === user.id);
      console.log(`❌ Removed: ${user.firstName} ${user.lastName}`);
    } catch (error) {
      console.error(`💥 Error removing ${user.firstName} ${user.lastName}:`, error);
    }
  }

  // Verify final count
  const finalUsers = await db.select().from(users);
  console.log(`✅ Final team member count: ${finalUsers.length}`);
}

// Run the script
limitTeamMembers()
  .then(() => {
    console.log('🎉 Team member limit applied successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error limiting team members:', error);
    process.exit(1);
  });