import { hasPermission, ROLE_PERMISSION_TEMPLATES } from '../shared/permissions';
import type { EnhancedUserRole, Department, PermissionResource, PermissionAction } from '../shared/permissions';

/**
 * Test user permissions to verify the fix
 */

console.log('🧪 Testing User Permissions\n');
console.log('═'.repeat(80));

// Test cases
const testCases: Array<{
  user: string;
  role: EnhancedUserRole;
  department: Department;
  testActions: Array<{ resource: PermissionResource; action: PermissionAction }>;
}> = [
  {
    user: 'steven@mcgettigan.co.uk (admin)',
    role: 'admin',
    department: 'admin',
    testActions: [
      { resource: 'projects', action: 'create' },
      { resource: 'projects', action: 'read' },
      { resource: 'projects', action: 'update' },
      { resource: 'projects', action: 'delete' },
      { resource: 'tasks', action: 'create' },
      { resource: 'clients', action: 'create' },
      { resource: 'users', action: 'create' }
    ]
  },
  {
    user: 'steven@mcgettigan.com (super_admin)',
    role: 'super_admin',
    department: 'admin',
    testActions: [
      { resource: 'projects', action: 'create' },
      { resource: 'projects', action: 'delete' },
      { resource: 'users', action: 'admin' },
      { resource: 'system_settings', action: 'admin' }
    ]
  },
  {
    user: 'Regular Employee',
    role: 'employee',
    department: 'operations',
    testActions: [
      { resource: 'projects', action: 'create' }, // Should FAIL
      { resource: 'projects', action: 'read' },   // Should PASS
      { resource: 'tasks', action: 'create' },    // Should PASS
      { resource: 'tasks', action: 'read' }       // Should PASS
    ]
  }
];

for (const test of testCases) {
  console.log(`\n👤 User: ${test.user}`);
  console.log(`   Role: ${test.role}, Department: ${test.department}`);
  console.log(`   Testing permissions:\n`);

  for (const { resource, action } of test.testActions) {
    const hasAccess = hasPermission(test.role, test.department, resource, action);
    const status = hasAccess ? '✅ GRANTED' : '❌ DENIED';
    const permission = `${test.department}:${resource}:${action}`;

    console.log(`   ${status} - ${permission}`);
  }

  console.log('   ─'.repeat(40));
}

console.log('\n📋 Admin Role Permissions Summary:');
console.log('═'.repeat(80));

const adminPerms = ROLE_PERMISSION_TEMPLATES.admin;
console.log(`Description: ${adminPerms.description}`);
console.log(`Departments: ${adminPerms.departments.join(', ')}`);
console.log(`Total Permissions: ${adminPerms.permissions.length}`);
console.log('\nSample admin:* permissions:');
adminPerms.permissions
  .filter(p => p.startsWith('admin:'))
  .slice(0, 15)
  .forEach(p => console.log(`   - ${p}`));

console.log('\n✅ Permission test completed\n');
