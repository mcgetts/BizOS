#!/usr/bin/env tsx

/**
 * CREATE ADMIN USER - Steven McGettigan
 *
 * Creates a fresh admin user with proper authentication setup
 * Default password: Admin123! (change after first login)
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { PasswordUtils } from '../server/utils/authUtils';

async function createAdminSteven() {
  console.log('👤 CREATING FRESH ADMIN USER: Steven McGettigan\n');

  try {
    const email = 'steven@mcgettigan.co.uk';
    const defaultPassword = 'Admin123!'; // CHANGE AFTER FIRST LOGIN

    console.log(`   Email: ${email}`);
    console.log(`   Default Password: ${defaultPassword}`);
    console.log(`   ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!\n`);

    // Check if user already exists (and is active)
    const [existing] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing && existing.isActive) {
      console.log(`   ❌ User already exists and is active: ${email}`);
      console.log(`   User ID: ${existing.id}`);
      console.log(`   Current Role: ${existing.role}`);
      console.log(`   Enhanced Role: ${existing.enhancedRole}\n`);
      console.log(`   If you need to reset this account, run:`);
      console.log(`   npx tsx scripts/reset-steven-password.ts\n`);
      process.exit(1);
    }

    // Hash the password
    console.log('   🔐 Hashing password...');
    const passwordHash = await PasswordUtils.hashPassword(defaultPassword);
    console.log('   ✅ Password hashed\n');

    // Create the new user
    console.log('   📝 Creating user in database...');
    const [newUser] = await db.insert(users)
      .values({
        email,
        firstName: 'Steven',
        lastName: 'McGettigan',
        role: 'super_admin',
        enhancedRole: 'super_admin',
        department: 'Management',
        passwordHash,
        authProvider: 'local',
        emailVerified: true, // Auto-verify to allow immediate login
        isActive: true,
        position: 'Administrator'
      })
      .returning();

    console.log('   ✅ User created successfully!\n');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ FRESH ADMIN USER CREATED\n');
    console.log('   Email: ' + newUser.email);
    console.log('   ID: ' + newUser.id);
    console.log('   Name: ' + newUser.firstName + ' ' + newUser.lastName);
    console.log('   Role: ' + newUser.role);
    console.log('   Enhanced Role: ' + newUser.enhancedRole);
    console.log('   Department: ' + newUser.department);
    console.log('   Has Password: YES ✅');
    console.log('   Email Verified: YES ✅');
    console.log('   Auth Provider: ' + newUser.authProvider);
    console.log('   Is Active: ' + (newUser.isActive ? 'YES ✅' : 'NO'));
    console.log('\n═══════════════════════════════════════════════════════\n');

    console.log('📝 LOGIN CREDENTIALS:\n');
    console.log('   URL: [Your Production URL]');
    console.log('   Email: steven@mcgettigan.co.uk');
    console.log('   Password: Admin123!');
    console.log('\n   ⚠️  IMPORTANT: Change password after first login!\n');

    console.log('📋 NEXT STEPS:\n');
    console.log('   1. Navigate to production URL');
    console.log('   2. Click "Login"');
    console.log('   3. Enter credentials above');
    console.log('   4. Should see "Super Admin" role immediately ✅');
    console.log('   5. Go to profile settings and change password\n');

    process.exit(0);
  } catch (error: any) {
    console.error('💥 ERROR:', error);

    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      console.log('\n   ℹ️  User already exists. To reset, run:');
      console.log('   npx tsx scripts/reset-steven-password.ts\n');
    }

    process.exit(1);
  }
}

createAdminSteven();
