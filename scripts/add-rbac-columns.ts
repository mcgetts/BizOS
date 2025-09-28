#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function addRBACColumns() {
  console.log('🔄 Adding RBAC columns to users table...');

  try {
    // Add enhanced_role column
    try {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN enhanced_role VARCHAR DEFAULT 'employee'
      `);
      console.log('✅ Added enhanced_role column');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('ℹ️ enhanced_role column already exists');
      } else {
        throw error;
      }
    }

    // Add department column
    try {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN department VARCHAR
      `);
      console.log('✅ Added department column');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('ℹ️ department column already exists');
      } else {
        throw error;
      }
    }

    // Add other missing RBAC columns
    const columnsToAdd = [
      'mfa_enabled BOOLEAN DEFAULT false',
      'mfa_secret VARCHAR',
      'mfa_backup_codes TEXT[]',
      'session_limit INTEGER DEFAULT 5',
      'last_password_change TIMESTAMP',
      'password_expires_at TIMESTAMP',
      'login_attempts INTEGER DEFAULT 0',
      'locked_until TIMESTAMP',
      'two_factor_temp_token VARCHAR',
      'two_factor_temp_expires TIMESTAMP',
    ];

    for (const column of columnsToAdd) {
      try {
        await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN ${column}`));
        console.log(`✅ Added ${column.split(' ')[0]} column`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`ℹ️ ${column.split(' ')[0]} column already exists`);
        } else {
          console.warn(`⚠️ Failed to add ${column.split(' ')[0]} column:`, error.message);
        }
      }
    }

    // Update existing users to have default values
    console.log('🔄 Setting default values for existing users...');

    // Set department for admin users
    await db.execute(sql`
      UPDATE users
      SET
        enhanced_role = 'admin',
        department = 'it'
      WHERE role = 'admin'
    `);

    // Set department for manager users
    await db.execute(sql`
      UPDATE users
      SET
        enhanced_role = 'manager',
        department = COALESCE(department, 'general')
      WHERE role = 'manager'
    `);

    // Set department for employee users
    await db.execute(sql`
      UPDATE users
      SET
        enhanced_role = 'employee',
        department = COALESCE(department, 'general')
      WHERE role = 'employee' OR role IS NULL
    `);

    console.log('✅ Updated existing users with default RBAC values');
    console.log('🎉 RBAC columns migration completed successfully!');

  } catch (error) {
    console.error('❌ Error adding RBAC columns:', error);
    throw error;
  }
}

// Run the migration
addRBACColumns().catch(console.error);