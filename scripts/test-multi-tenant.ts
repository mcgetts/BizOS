/**
 * Multi-Tenant System Test Suite
 *
 * Tests the following:
 * 1. Organization creation
 * 2. User-organization membership
 * 3. Cross-tenant data isolation
 * 4. Storage layer tenant filtering
 * 5. Data integrity
 *
 * Usage:
 *   npx tsx scripts/test-multi-tenant.ts
 */

import { db } from '../server/db';
import {
  organizations,
  organizationMembers,
  users,
  clients,
  projects,
  tasks,
} from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../server/storage';
import { tenantStorage, type TenantContext } from '../server/tenancy/tenantContext';

// Test results
interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, message: string, details?: any) {
  results.push({ test, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

async function runTests() {
  console.log('🧪 Starting Multi-Tenant System Tests...\n');

  try {
    // ========================================
    // Test 1: Verify Default Organization Exists
    // ========================================
    console.log('📋 Test 1: Verify Default Organization Exists');
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.subdomain, 'default'))
      .limit(1);

    if (defaultOrg) {
      logTest(
        'Default Organization',
        true,
        'Default organization exists',
        { id: defaultOrg.id, name: defaultOrg.name, subdomain: defaultOrg.subdomain }
      );
    } else {
      logTest(
        'Default Organization',
        false,
        'Default organization not found - run seed script first'
      );
      return; // Can't continue without default org
    }

    // ========================================
    // Test 2: Create Test Organizations
    // ========================================
    console.log('\n📋 Test 2: Create Test Organizations');

    // Create test organization 1 (or get existing)
    let testOrg1 = await db
      .select()
      .from(organizations)
      .where(eq(organizations.subdomain, 'test-alpha'))
      .limit(1)
      .then(rows => rows[0]);

    if (!testOrg1) {
      const result = await db
        .insert(organizations)
        .values({
          name: 'Test Organization Alpha',
          subdomain: 'test-alpha',
          status: 'active',
          plan: 'professional',
          maxUsers: 50,
          maxProjects: 500,
        })
        .returning();
      testOrg1 = result[0];
    }

    logTest(
      'Create Test Org 1',
      !!testOrg1,
      'Test Organization Alpha created',
      { id: testOrg1.id, subdomain: testOrg1.subdomain }
    );

    // Create test organization 2 (or get existing)
    let testOrg2 = await db
      .select()
      .from(organizations)
      .where(eq(organizations.subdomain, 'test-beta'))
      .limit(1)
      .then(rows => rows[0]);

    if (!testOrg2) {
      const result = await db
        .insert(organizations)
        .values({
          name: 'Test Organization Beta',
          subdomain: 'test-beta',
          status: 'active',
          plan: 'professional',
          maxUsers: 50,
          maxProjects: 500,
        })
        .returning();
      testOrg2 = result[0];
    }

    logTest(
      'Create Test Org 2',
      !!testOrg2,
      'Test Organization Beta created',
      { id: testOrg2.id, subdomain: testOrg2.subdomain }
    );

    // ========================================
    // Test 3: Create Test Users
    // ========================================
    console.log('\n📋 Test 3: Create Test Users');

    // Get or create test user 1
    let testUser1 = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test-user-alpha@example.com'))
      .limit(1)
      .then(rows => rows[0]);

    if (!testUser1) {
      const result = await db
        .insert(users)
        .values({
          email: 'test-user-alpha@example.com',
          firstName: 'Alice',
          lastName: 'Alpha',
          role: 'admin',
          defaultOrganizationId: testOrg1.id,
          isActive: true,
        })
        .returning();
      testUser1 = result[0];
    } else {
      // Update defaultOrganizationId if needed
      const result = await db
        .update(users)
        .set({ defaultOrganizationId: testOrg1.id })
        .where(eq(users.email, 'test-user-alpha@example.com'))
        .returning();
      testUser1 = result[0];
    }

    logTest(
      'Create Test User 1',
      !!testUser1,
      'Test user Alpha created',
      { id: testUser1.id, email: testUser1.email }
    );

    // Get or create test user 2
    let testUser2 = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test-user-beta@example.com'))
      .limit(1)
      .then(rows => rows[0]);

    if (!testUser2) {
      const result = await db
        .insert(users)
        .values({
          email: 'test-user-beta@example.com',
          firstName: 'Bob',
          lastName: 'Beta',
          role: 'admin',
          defaultOrganizationId: testOrg2.id,
          isActive: true,
        })
        .returning();
      testUser2 = result[0];
    } else {
      // Update defaultOrganizationId if needed
      const result = await db
        .update(users)
        .set({ defaultOrganizationId: testOrg2.id })
        .where(eq(users.email, 'test-user-beta@example.com'))
        .returning();
      testUser2 = result[0];
    }

    logTest(
      'Create Test User 2',
      !!testUser2,
      'Test user Beta created',
      { id: testUser2.id, email: testUser2.email }
    );

    // ========================================
    // Test 4: Create Organization Memberships
    // ========================================
    console.log('\n📋 Test 4: Create Organization Memberships');

    // Add user 1 to org 1
    await db
      .insert(organizationMembers)
      .values({
        organizationId: testOrg1.id,
        userId: testUser1.id,
        role: 'owner',
        status: 'active',
      })
      .onConflictDoNothing();

    logTest(
      'User 1 → Org 1 Membership',
      true,
      'User Alpha added to Organization Alpha as owner'
    );

    // Add user 2 to org 2
    await db
      .insert(organizationMembers)
      .values({
        organizationId: testOrg2.id,
        userId: testUser2.id,
        role: 'owner',
        status: 'active',
      })
      .onConflictDoNothing();

    logTest(
      'User 2 → Org 2 Membership',
      true,
      'User Beta added to Organization Beta as owner'
    );

    // ========================================
    // Test 5: Test Storage Layer with Tenant Context - Org 1
    // ========================================
    console.log('\n📋 Test 5: Test Storage Layer - Organization Alpha');

    const org1Context: TenantContext = {
      organizationId: testOrg1.id,
      organization: testOrg1,
      userId: testUser1.id,
      userRole: 'owner',
      userEmail: testUser1.email || undefined,
    };

    // Create client in Org 1
    let org1ClientId: string = '';
    await tenantStorage.run(org1Context, async () => {
      const client = await storage.createClient({
        name: 'Alpha Client Inc',
        email: 'contact@alphaclient.com',
        phone: '555-0001',
        companyId: null,
      });
      org1ClientId = client.id;

      logTest(
        'Create Client in Org 1',
        !!client && client.organizationId === testOrg1.id,
        'Client created in Organization Alpha with correct organizationId',
        { clientId: client.id, orgId: client.organizationId }
      );
    });

    // ========================================
    // Test 6: Test Storage Layer with Tenant Context - Org 2
    // ========================================
    console.log('\n📋 Test 6: Test Storage Layer - Organization Beta');

    const org2Context: TenantContext = {
      organizationId: testOrg2.id,
      organization: testOrg2,
      userId: testUser2.id,
      userRole: 'owner',
      userEmail: testUser2.email || undefined,
    };

    // Create client in Org 2
    let org2ClientId: string = '';
    await tenantStorage.run(org2Context, async () => {
      const client = await storage.createClient({
        name: 'Beta Client Corp',
        email: 'contact@betaclient.com',
        phone: '555-0002',
        companyId: null,
      });
      org2ClientId = client.id;

      logTest(
        'Create Client in Org 2',
        !!client && client.organizationId === testOrg2.id,
        'Client created in Organization Beta with correct organizationId',
        { clientId: client.id, orgId: client.organizationId }
      );
    });

    // ========================================
    // Test 7: Cross-Tenant Data Isolation - Read Test
    // ========================================
    console.log('\n📋 Test 7: Cross-Tenant Data Isolation - Read Test');

    // Try to read clients from Org 1
    let org1Clients: any[] = [];
    await tenantStorage.run(org1Context, async () => {
      org1Clients = await storage.getClients();
    });

    // Try to read clients from Org 2
    let org2Clients: any[] = [];
    await tenantStorage.run(org2Context, async () => {
      org2Clients = await storage.getClients();
    });

    const org1HasOnlyOrg1Data = org1Clients.every(c => c.organizationId === testOrg1.id);
    const org2HasOnlyOrg2Data = org2Clients.every(c => c.organizationId === testOrg2.id);
    const noDataLeakage = !org1Clients.some(c => c.organizationId === testOrg2.id) &&
                          !org2Clients.some(c => c.organizationId === testOrg1.id);

    logTest(
      'Data Isolation - Read',
      org1HasOnlyOrg1Data && org2HasOnlyOrg2Data && noDataLeakage,
      `Org 1 sees ${org1Clients.length} client(s) (all Org 1), Org 2 sees ${org2Clients.length} client(s) (all Org 2)`,
      {
        org1ClientCount: org1Clients.length,
        org2ClientCount: org2Clients.length,
        org1HasCrossTenantData: !org1HasOnlyOrg1Data,
        org2HasCrossTenantData: !org2HasOnlyOrg2Data,
      }
    );

    // ========================================
    // Test 8: Cross-Tenant Data Isolation - Update Test
    // ========================================
    console.log('\n📋 Test 8: Cross-Tenant Data Isolation - Update Test');

    // Try to update Org 2's client from Org 1 context (should fail)
    let updateFailed = false;
    await tenantStorage.run(org1Context, async () => {
      try {
        await storage.updateClient(org2ClientId, { name: 'Hacked Name' });
        updateFailed = false; // Update succeeded (bad!)
      } catch (error) {
        updateFailed = true; // Update failed (good!)
      }
    });

    logTest(
      'Data Isolation - Update',
      updateFailed,
      updateFailed
        ? 'Cross-tenant update correctly blocked'
        : 'SECURITY ISSUE: Cross-tenant update succeeded!',
      { attemptedToUpdate: org2ClientId, fromOrgContext: testOrg1.id }
    );

    // ========================================
    // Test 9: Cross-Tenant Data Isolation - Delete Test
    // ========================================
    console.log('\n📋 Test 9: Cross-Tenant Data Isolation - Delete Test');

    // Try to delete Org 2's client from Org 1 context (should fail)
    let deleteFailed = false;
    await tenantStorage.run(org1Context, async () => {
      try {
        await storage.deleteClient(org2ClientId);
        deleteFailed = false; // Delete succeeded (bad!)
      } catch (error) {
        deleteFailed = true; // Delete failed (good!)
      }
    });

    logTest(
      'Data Isolation - Delete',
      deleteFailed,
      deleteFailed
        ? 'Cross-tenant delete correctly blocked'
        : 'SECURITY ISSUE: Cross-tenant delete succeeded!',
      { attemptedToDelete: org2ClientId, fromOrgContext: testOrg1.id }
    );

    // ========================================
    // Test 10: Verify organizationId in All Created Records
    // ========================================
    console.log('\n📋 Test 10: Verify organizationId in All Created Records');

    const [org1Client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, org1ClientId));

    const [org2Client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, org2ClientId));

    const correctOrgIds =
      org1Client?.organizationId === testOrg1.id &&
      org2Client?.organizationId === testOrg2.id;

    logTest(
      'OrganizationId Verification',
      correctOrgIds,
      correctOrgIds
        ? 'All records have correct organizationId'
        : 'ISSUE: Records have incorrect organizationId',
      {
        org1ClientOrgId: org1Client?.organizationId,
        expectedOrg1Id: testOrg1.id,
        org2ClientOrgId: org2Client?.organizationId,
        expectedOrg2Id: testOrg2.id,
      }
    );

    // ========================================
    // Test Summary
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('='.repeat(60));

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.message}`);
        });
    }

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Multi-tenant system is working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }

    // ========================================
    // Cleanup (Optional)
    // ========================================
    console.log('\n🧹 Cleanup: Test data preserved for manual inspection');
    console.log('   To remove test data, delete organizations with subdomain "test-alpha" and "test-beta"');

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const exitCode = passedTests === totalTests ? 0 : 1;

    console.log('\n✅ Test suite completed');
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
