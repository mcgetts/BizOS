#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkUserStatus() {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'newuser-test@example.com'));

  if (user) {
    console.log('✅ User found:');
    console.log(`Email: ${user.email}`);
    console.log(`Email Verified: ${user.emailVerified}`);
    console.log(`Verification Token: ${user.emailVerificationToken || 'null'}`);
    console.log(`Active: ${user.isActive}`);
  } else {
    console.log('❌ User not found');
  }
}

checkUserStatus().catch(console.error);