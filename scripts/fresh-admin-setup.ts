#!/usr/bin/env tsx

/**
 * FRESH ADMIN SETUP SCRIPT
 *
 * This script:
 * 1. Deletes the problematic steven@mcgettigan.co.uk account
 * 2. Creates a fresh admin user with proper authentication setup
 * 3. Sets password, verifies email, and grants admin privileges
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { PasswordUtils } from '../server/utils/authUtils';

async function freshAdminSetup() {
  console.log('🔄 FRESH ADMIN SETUP - Clean slate approach\n');

  try {
    // STEP 1: Delete the problematic steven@mcgettigan.co.uk account
    console.log('📋 STEP 1: Deleting problematic account...\n');

    const emailToDelete = 'steven@mcgettigan.co.uk';

    // First, get the user ID
    const [userToDelete] = await db.select()
      .from(users)
      .where(eq(users.email, emailToDelete))
      .limit(1);

    if (userToDelete) {
      console.log(`   Found user: ${userToDelete.email}`);
      console.log(`   ID: ${userToDelete.id}`);
      console.log(`   Current state:`);
      console.log(`     - Role: ${userToDelete.role}`);
      console.log(`     - Enhanced Role: ${userToDelete.enhancedRole}`);
      console.log(`     - Has Password: ${userToDelete.passwordHash ? 'YES' : 'NO'}`);
      console.log(`     - Email Verified: ${userToDelete.emailVerified ? 'YES' : 'NO'}`);
      console.log(`     - Auth Provider: ${userToDelete.authProvider}\n`);

      // Delete all sessions for this user
      await db.execute(sql`
        DELETE FROM sessions
        WHERE sess::text LIKE '%"id":"' || ${userToDelete.id} || '"%'
      `);
      console.log(`   ✅ Deleted all sessions`);

      // Delete the user (this will fail if there are foreign key constraints)
      try {
        await db.delete(users)
          .where(eq(users.id, userToDelete.id));
        console.log(`   ✅ Deleted user: ${emailToDelete}\n`);
      } catch (error: any) {
        if (error.message?.includes('foreign key')) {
          console.log(`   ⚠️  Cannot delete due to foreign key constraints`);
          console.log(`   💡 Setting user to inactive instead...\n`);

          await db.update(users)
            .set({
              isActive: false,
              email: `deleted_${Date.now()}_${emailToDelete}` // Change email to free it up
            })
            .where(eq(users.id, userToDelete.id));

          console.log(`   ✅ Deactivated user and freed up email\n`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`   ℹ️  User ${emailToDelete} not found (already deleted?)\n`);
    }

    // STEP 2: Prompt for new password
    console.log('📋 STEP 2: Creating fresh admin user...\n');

    console.log('   ⚠️  IMPORTANT: Set a password for the new admin account\n');
    console.log('   Choose a strong password that Steven can use for production.\n');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askPassword = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question('   Enter password for steven@mcgettigan.co.uk: ', (password: string) => {
          if (!password || password.length < 8) {
            console.log('   ❌ Password must be at least 8 characters. Try again.\n');
            askPassword().then(resolve);
          } else {
            rl.close();
            resolve(password);
          }
        });
      });
    };

    const password = await askPassword();

    // Hash the password
    const passwordHash = await PasswordUtils.hashPassword(password);

    // Create the new user
    const [newUser] = await db.insert(users)
      .values({
        email: emailToDelete,
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

    console.log('\n   ✅ Created fresh admin user:');
    console.log(`      Email: ${newUser.email}`);
    console.log(`      ID: ${newUser.id}`);
    console.log(`      Role: ${newUser.role}`);
    console.log(`      Enhanced Role: ${newUser.enhancedRole}`);
    console.log(`      Has Password: YES`);
    console.log(`      Email Verified: YES`);
    console.log(`      Auth Provider: ${newUser.authProvider}\n`);

    console.log('✅ FRESH ADMIN SETUP COMPLETE!\n');
    console.log('📝 NEXT STEPS:\n');
    console.log('   1. Navigate to production URL');
    console.log('   2. Click "Login"');
    console.log('   3. Use credentials:');
    console.log(`      Email: ${emailToDelete}`);
    console.log(`      Password: [the password you just set]`);
    console.log('   4. Should see "Super Admin" role immediately ✅\n');

    process.exit(0);
  } catch (error) {
    console.error('💥 ERROR:', error);
    process.exit(1);
  }
}

freshAdminSetup();
