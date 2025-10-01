#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, like } from 'drizzle-orm';

async function updateStevenRole() {
  console.log('🔍 Looking for Steven McGettigan...');

  // First, check if Steven McGettigan exists
  const steven = await db.select()
    .from(users)
    .where(like(users.email, '%steven%mcgettigan%'))
    .limit(1);

  if (steven.length === 0) {
    console.log('👤 Steven McGettigan not found. Creating new user...');

    // Create Steven McGettigan as Admin
    const newSteven = {
      id: 'user-admin-steven',
      email: 'steven@mcgettigan.co.uk',
      firstName: 'Steven',
      lastName: 'McGettigan',
      role: 'admin' as const,
      enhancedRole: 'admin' as const, // UI reads from enhancedRole field
      department: 'Management',
      position: 'Technical Director',
      profileImageUrl: null,
      phone: '+44-7700-900123',
      address: 'London, UK',
      skills: ['Leadership', 'Strategy', 'Technology'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(users).values(newSteven);
    console.log('✅ Created Steven McGettigan as Admin');
    return newSteven;
  } else {
    console.log(`📋 Found Steven McGettigan: ${steven[0].email} (current role: ${steven[0].role})`);

    if (steven[0].role === 'admin') {
      console.log('✅ Steven is already an Admin - no changes needed');
      return steven[0];
    }

    // Update Steven's role to Admin (both role fields for UI compatibility)
    const updatedSteven = await db.update(users)
      .set({
        role: 'admin',
        enhancedRole: 'admin', // UI reads from enhancedRole field
        updatedAt: new Date()
      })
      .where(eq(users.id, steven[0].id))
      .returning();

    console.log('✅ Updated Steven McGettigan role to Admin');
    return updatedSteven[0];
  }
}

// Run the script
updateStevenRole()
  .then((steven) => {
    console.log('\n👑 Steven McGettigan Admin Status:');
    console.log(`   Name: ${steven.firstName} ${steven.lastName}`);
    console.log(`   Email: ${steven.email}`);
    console.log(`   Role: ${steven.role.toUpperCase()}`);
    console.log(`   Department: ${steven.department || 'Management'}`);
    console.log('\n🎉 Steven McGettigan role update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error updating Steven McGettigan role:', error);
    process.exit(1);
  });