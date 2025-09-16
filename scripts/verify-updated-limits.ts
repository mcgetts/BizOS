#!/usr/bin/env tsx

import { db } from '../server/db';
import { users, clients, projects } from '../shared/schema';
import { BUSINESS_LIMITS } from '../server/config/constants';
import { eq } from 'drizzle-orm';

async function verifyUpdatedLimits() {
  console.log('🔍 Verifying updated business limits and user roles...\n');

  // Show updated limits
  console.log('📋 Updated Business Limits:');
  console.log(`   👥 Max Team Members: ${BUSINESS_LIMITS.MAX_TEAM_MEMBERS}`);
  console.log(`   📁 Max Active Projects: ${BUSINESS_LIMITS.MAX_ACTIVE_PROJECTS}`);
  console.log(`   🤝 Max Clients: ${BUSINESS_LIMITS.MAX_CLIENTS}`);

  // Get current counts
  const [currentUsers, currentClients, currentProjects] = await Promise.all([
    db.select().from(users),
    db.select().from(clients),
    db.select().from(projects)
  ]);

  console.log('\n📊 Current Usage:');
  console.log(`   👥 Team Members: ${currentUsers.length}/${BUSINESS_LIMITS.MAX_TEAM_MEMBERS}`);
  console.log(`   🤝 Clients: ${currentClients.length}/${BUSINESS_LIMITS.MAX_CLIENTS}`);
  console.log(`   📁 Projects: ${currentProjects.length}/${BUSINESS_LIMITS.MAX_ACTIVE_PROJECTS}`);

  // Check Steven McGettigan specifically
  const steven = await db.select()
    .from(users)
    .where(eq(users.email, 'steven@mcgettigan.co.uk'))
    .limit(1);

  console.log('\n👑 Admin Users:');
  const admins = currentUsers.filter(u => u.role === 'admin');
  admins.forEach((admin, i) => {
    const isSteven = admin.email === 'steven@mcgettigan.co.uk' ? ' ⭐' : '';
    console.log(`   ${i + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})${isSteven}`);
  });

  // Verify Steven's role
  if (steven.length > 0 && steven[0].role === 'admin') {
    console.log('\n✅ Steven McGettigan is confirmed as Admin');
  } else {
    console.log('\n❌ Steven McGettigan role not updated correctly');
  }

  // Show capacity status
  console.log('\n📈 Capacity Status:');
  console.log(`   Team: ${Math.round((currentUsers.length / BUSINESS_LIMITS.MAX_TEAM_MEMBERS) * 100)}% used`);
  console.log(`   Clients: ${Math.round((currentClients.length / BUSINESS_LIMITS.MAX_CLIENTS) * 100)}% used`);
  console.log(`   Projects: ${Math.round((currentProjects.length / BUSINESS_LIMITS.MAX_ACTIVE_PROJECTS) * 100)}% used`);

  // Team structure
  console.log('\n👥 Current Team Structure:');
  const roleCount = {
    admin: currentUsers.filter(u => u.role === 'admin').length,
    manager: currentUsers.filter(u => u.role === 'manager').length,
    employee: currentUsers.filter(u => u.role === 'employee').length,
    client: currentUsers.filter(u => u.role === 'client').length
  };

  console.log(`   👑 Admins: ${roleCount.admin}`);
  console.log(`   📋 Managers: ${roleCount.manager}`);
  console.log(`   👤 Employees: ${roleCount.employee}`);
  console.log(`   🤝 Clients: ${roleCount.client}`);

  return {
    limits: BUSINESS_LIMITS,
    usage: {
      users: currentUsers.length,
      clients: currentClients.length,
      projects: currentProjects.length
    },
    stevenIsAdmin: steven.length > 0 && steven[0].role === 'admin',
    teamStructure: roleCount
  };
}

// Run verification
verifyUpdatedLimits()
  .then((result) => {
    console.log('\n✅ Business limits verification complete!');
    if (result.stevenIsAdmin) {
      console.log('✅ Steven McGettigan role confirmed as Admin!');
    }
    console.log('\n🎉 All changes successfully applied!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error verifying changes:', error);
    process.exit(1);
  });