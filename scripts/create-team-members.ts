#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';

const teamMembers = [
  {
    id: 'user-admin-001',
    email: 'admin@company.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    department: 'Management',
    position: 'System Administrator'
  },
  {
    id: 'user-manager-001',
    email: 'sarah.johnson@company.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'manager' as const,
    department: 'Engineering',
    position: 'Engineering Manager'
  },
  {
    id: 'user-manager-002',
    email: 'david.garcia@company.com',
    firstName: 'David',
    lastName: 'Garcia',
    role: 'manager' as const,
    department: 'Sales',
    position: 'Sales Manager'
  },
  {
    id: 'user-employee-001',
    email: 'michael.chen@company.com',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'employee' as const,
    department: 'Engineering',
    position: 'Senior Developer'
  },
  {
    id: 'user-employee-002',
    email: 'emma.davis@company.com',
    firstName: 'Emma',
    lastName: 'Davis',
    role: 'employee' as const,
    department: 'Engineering',
    position: 'Frontend Developer'
  },
  {
    id: 'user-employee-003',
    email: 'james.wilson@company.com',
    firstName: 'James',
    lastName: 'Wilson',
    role: 'employee' as const,
    department: 'Engineering',
    position: 'Backend Developer'
  },
  {
    id: 'user-employee-004',
    email: 'lisa.brown@company.com',
    firstName: 'Lisa',
    lastName: 'Brown',
    role: 'employee' as const,
    department: 'Design',
    position: 'UX Designer'
  },
  {
    id: 'user-employee-005',
    email: 'robert.taylor@company.com',
    firstName: 'Robert',
    lastName: 'Taylor',
    role: 'employee' as const,
    department: 'Marketing',
    position: 'Marketing Specialist'
  },
  {
    id: 'user-employee-006',
    email: 'jessica.lee@company.com',
    firstName: 'Jessica',
    lastName: 'Lee',
    role: 'employee' as const,
    department: 'Sales',
    position: 'Account Executive'
  },
  {
    id: 'user-employee-007',
    email: 'thomas.martin@company.com',
    firstName: 'Thomas',
    lastName: 'Martin',
    role: 'employee' as const,
    department: 'Support',
    position: 'Customer Support Specialist'
  }
];

async function createTeamMembers() {
  console.log('👥 Creating 10 team members...');

  for (const member of teamMembers) {
    try {
      await db.insert(users).values({
        ...member,
        profileImageUrl: null,
        phone: '+1-555-0123',
        address: '123 Business Ave, Business City, BC 12345',
        skills: member.department === 'Engineering' ? ['JavaScript', 'TypeScript', 'React'] : [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();

      console.log(`✅ Created: ${member.firstName} ${member.lastName} (${member.role})`);
    } catch (error) {
      console.error(`💥 Error creating ${member.firstName} ${member.lastName}:`, error);
    }
  }

  // Verify final count
  const finalUsers = await db.select().from(users);
  console.log(`\n📊 Total team members: ${finalUsers.length}`);

  // Show team structure
  console.log('\n👥 Team Structure:');
  const admins = finalUsers.filter(u => u.role === 'admin');
  const managers = finalUsers.filter(u => u.role === 'manager');
  const employees = finalUsers.filter(u => u.role === 'employee');

  console.log(`   👑 Admins: ${admins.length}`);
  console.log(`   📋 Managers: ${managers.length}`);
  console.log(`   👤 Employees: ${employees.length}`);
}

// Run the script
createTeamMembers()
  .then(() => {
    console.log('\n🎉 Team members created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error creating team members:', error);
    process.exit(1);
  });