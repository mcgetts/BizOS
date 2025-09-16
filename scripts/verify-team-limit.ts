#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { BUSINESS_LIMITS } from '../server/config/constants';

async function verifyTeamLimit() {
  console.log('🔍 Verifying team member limit implementation...\n');

  // Check current team size
  const currentUsers = await db.select().from(users);
  console.log(`📊 Current team members: ${currentUsers.length}`);
  console.log(`🎯 Team size limit: ${BUSINESS_LIMITS.MAX_TEAM_MEMBERS}`);

  if (currentUsers.length > BUSINESS_LIMITS.MAX_TEAM_MEMBERS) {
    console.log('❌ Team size exceeds limit!');
    return false;
  } else if (currentUsers.length === BUSINESS_LIMITS.MAX_TEAM_MEMBERS) {
    console.log('✅ Team is at maximum capacity');
  } else {
    console.log(`✅ Team has ${BUSINESS_LIMITS.MAX_TEAM_MEMBERS - currentUsers.length} slots available`);
  }

  // Show team composition
  console.log('\n👥 Team Composition:');
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

  console.log('\n📋 Team Members:');
  currentUsers.forEach((user, i) => {
    const roleIcon = {
      'admin': '👑',
      'manager': '📋',
      'employee': '👤',
      'client': '🤝'
    }[user.role] || '❓';

    console.log(`   ${i + 1}. ${roleIcon} ${user.firstName} ${user.lastName} (${user.email})`);
  });

  console.log('\n✅ Team limit verification complete!');

  return {
    currentSize: currentUsers.length,
    maxSize: BUSINESS_LIMITS.MAX_TEAM_MEMBERS,
    isWithinLimit: currentUsers.length <= BUSINESS_LIMITS.MAX_TEAM_MEMBERS,
    availableSlots: BUSINESS_LIMITS.MAX_TEAM_MEMBERS - currentUsers.length,
    teamComposition: roleCount
  };
}

// Run verification
verifyTeamLimit()
  .then((result) => {
    if (result.isWithinLimit) {
      console.log('\n🎉 Team size limit successfully implemented and verified!');
    } else {
      console.log('\n💥 Team size exceeds limit - manual intervention required!');
    }
    process.exit(result.isWithinLimit ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Error verifying team limit:', error);
    process.exit(1);
  });