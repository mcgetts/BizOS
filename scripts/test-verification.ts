#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testEmailVerification() {
  console.log('🧪 Testing email verification flow...');

  try {
    // Create a test user with unverified email
    const testToken = 'test-verification-token-12345';
    const testEmail = 'test-verification@example.com';

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (existingUser) {
      // Update existing user to be unverified for testing
      await db
        .update(users)
        .set({
          emailVerified: false,
          emailVerificationToken: testToken
        })
        .where(eq(users.email, testEmail));

      console.log('✅ Updated existing test user for verification testing');
    } else {
      // Create new test user
      await db.insert(users).values({
        email: testEmail,
        firstName: 'Test',
        lastName: 'Verification',
        passwordHash: '$2b$12$test.hash.for.verification.testing',
        authProvider: 'local',
        emailVerified: false,
        emailVerificationToken: testToken,
        role: 'employee',
        enhancedRole: 'employee',
        department: 'general',
        isActive: true
      });

      console.log('✅ Created new test user for verification testing');
    }

    console.log('\n📧 Test verification details:');
    console.log(`Email: ${testEmail}`);
    console.log(`Token: ${testToken}`);
    console.log(`Verification URL: http://localhost:5000/verify-email?token=${testToken}`);

    console.log('\n🔗 Test steps:');
    console.log('1. Open the verification URL in your browser');
    console.log('2. It should redirect to login page with success message');
    console.log('3. Try logging in with the verified account');

    // Test the verification API endpoint directly
    console.log('\n🧪 Testing API endpoint directly...');
    const testResponse = await fetch('http://localhost:5000/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: testToken }),
    });

    const testResult = await testResponse.json();
    console.log('API Response:', testResponse.status, testResult);

    if (testResponse.ok) {
      console.log('✅ Email verification API working correctly!');
    } else {
      console.log('❌ Email verification API failed:', testResult.message);
    }

  } catch (error) {
    console.error('❌ Error testing email verification:', error);
  }
}

// Run the test
testEmailVerification().catch(console.error);