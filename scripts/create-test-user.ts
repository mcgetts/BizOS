#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { PasswordUtils } from '../server/utils/authUtils.js';

async function createTestUser() {
  console.log('👤 Creating test user for verification flow...');

  try {
    const testEmail = 'verification-test-2@example.com';
    const testToken = 'verification-token-2025';
    const testPassword = 'TestPassword123!';

    // Remove existing user if exists
    await db
      .delete(users)
      .where(eq(users.email, testEmail));

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(testPassword);

    // Create new unverified test user
    await db.insert(users).values({
      email: testEmail,
      firstName: 'New',
      lastName: 'TestUser',
      passwordHash,
      authProvider: 'local',
      emailVerified: false,
      emailVerificationToken: testToken,
      role: 'employee',
      enhancedRole: 'employee',
      department: 'general',
      isActive: true
    });

    console.log('✅ Created test user successfully!');
    console.log('\n📧 Test user details:');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log(`Verification Token: ${testToken}`);

    console.log('\n🔗 Test verification URL:');
    console.log(`http://localhost:5000/verify-email?token=${testToken}`);

    console.log('\n📋 Test steps:');
    console.log('1. Try logging in with the unverified user (should fail)');
    console.log('2. Click the verification URL above');
    console.log('3. Should see verification success page and redirect to login');
    console.log('4. Login should now work with the verified account');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

// Run the creation
createTestUser().catch(console.error);