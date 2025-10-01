import { storage } from './storage';
import { ROLES } from './config/constants';
import { db } from './db';
import { organizations, organizationMembers } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Seeds essential data for production deployment
 * Ensures the first user gets admin privileges and sets up basic data
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    // Ensure default organization exists for multi-tenant support
    await ensureDefaultOrganization();

    // Check if any admin users exist
    const allUsers = await storage.getUsers();
    const adminUsers = allUsers.filter(user => user.role === ROLES.ADMIN);
    
    if (adminUsers.length === 0) {
      console.log('👤 No admin users found in database');
      
      if (allUsers.length === 0) {
        console.log('📝 Database is empty - admin will be created on first login');
        console.log('✅ Seeding setup complete - first user will become admin');
        return;
      }
      
      // Promote the first user (oldest by creation date) to admin
      const firstUser = allUsers.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      )[0];
      
      if (firstUser) {
        await storage.updateUser(firstUser.id, { role: ROLES.ADMIN });
        console.log(`✅ Promoted user ${firstUser.email} (${firstUser.firstName} ${firstUser.lastName}) to admin`);
      }
    } else {
      console.log(`✅ Found ${adminUsers.length} admin user(s) - no promotion needed`);
    }

    // Initialize system configuration variables
    try {
      const autoProjectVar = await storage.getSystemVariable('auto_create_project_from_won_opportunity');
      if (!autoProjectVar) {
        // Get the first admin user to use as the creator
        const adminUser = adminUsers.length > 0 ? adminUsers[0] : allUsers[0];
        if (adminUser) {
          await storage.createSystemVariable({
            key: 'auto_create_project_from_won_opportunity',
            value: 'true',
            description: 'Automatically create a project when an opportunity is marked as "Closed Won"',
            dataType: 'boolean',
            category: 'automation',
            isEditable: true,
            updatedBy: adminUser.id
          });
          console.log('✅ Created system variable for automatic project creation (enabled by default)');
        } else {
          console.log('⚠️ No users found - cannot create system variables');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not initialize system variables:', error.message);
    }

    console.log('🌱 Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    // Don't throw - allow app to start even if seeding fails
  }
}

/**
 * Special seeding function for first-time users
 * Called when a new user is created via authentication
 */
export async function ensureFirstUserIsAdmin(userId: string): Promise<void> {
  try {
    console.log(`🔍 Checking admin status for user ${userId}...`);

    const allUsers = await storage.getUsers();
    const adminUsers = allUsers.filter(user => user.role === ROLES.ADMIN);

    console.log(`📊 Database stats: ${allUsers.length} total users, ${adminUsers.length} admins`);

    // If no admin exists, make this user admin (regardless of total user count)
    if (adminUsers.length === 0) {
      console.log(`👑 No admin exists - promoting user ${userId} to admin`);
      await storage.updateUser(userId, { role: ROLES.ADMIN });
      console.log(`✅ User ${userId} successfully promoted to admin`);
    } else {
      console.log(`ℹ️ Admin users already exist - no promotion needed for ${userId}`);
    }

    // Ensure user is member of default organization
    await ensureUserInDefaultOrganization(userId);
  } catch (error) {
    console.error('❌ Error ensuring first user admin status:', error);
  }
}

/**
 * Ensures the default organization exists
 * This organization is used for development and for existing users in migration
 */
async function ensureDefaultOrganization(): Promise<void> {
  try {
    console.log('🏢 Checking for default organization...');

    // Check if default organization exists (by slug which is more reliable)
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'default'))
      .limit(1);

    if (existingOrg) {
      console.log(`✅ Default organization already exists: ${existingOrg.name} (slug: ${existingOrg.slug})`);
      return;
    }

    // Create default organization
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: 'Default Organization',
        subdomain: 'default',
        slug: 'default', // URL-safe identifier required by schema
        status: 'active',
        planTier: 'enterprise', // Give default org full features
        maxUsers: 1000,
      })
      .returning();

    console.log(`✅ Created default organization: ${newOrg.name} (${newOrg.subdomain})`);

    // Assign all existing users to default organization
    const allUsers = await storage.getUsers();
    if (allUsers.length > 0) {
      console.log(`👥 Assigning ${allUsers.length} existing users to default organization...`);

      for (const user of allUsers) {
        await ensureUserInOrganization(user.id, newOrg.id, 'owner');

        // Set as user's default organization if they don't have one
        if (!user.defaultOrganizationId) {
          await storage.updateUser(user.id, { defaultOrganizationId: newOrg.id });
        }
      }

      console.log(`✅ Assigned all existing users to default organization`);
    }
  } catch (error) {
    console.error('❌ Error ensuring default organization:', error);
  }
}

/**
 * Ensures a user is a member of the default organization
 */
export async function ensureUserInDefaultOrganization(userId: string): Promise<void> {
  try {
    // Get default organization (by slug which is more reliable)
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'default'))
      .limit(1);

    if (!defaultOrg) {
      console.log('⚠️ Default organization not found - cannot assign user');
      return;
    }

    await ensureUserInOrganization(userId, defaultOrg.id, 'member');

    // Set as user's default organization if they don't have one
    const user = await storage.getUser(userId);
    if (user && !user.defaultOrganizationId) {
      await storage.updateUser(userId, { defaultOrganizationId: defaultOrg.id });
      console.log(`✅ Set default organization for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error ensuring user in default organization:', error);
  }
}

/**
 * Ensures a user is a member of a specific organization
 */
async function ensureUserInOrganization(
  userId: string,
  organizationId: string,
  role: string = 'member'
): Promise<void> {
  try {
    // Check if membership already exists
    const [existingMembership] = await db
      .select()
      .from(organizationMembers)
      .where(
        eq(organizationMembers.userId, userId)
      )
      .limit(1);

    if (existingMembership) {
      return; // Membership already exists
    }

    // Create membership
    await db
      .insert(organizationMembers)
      .values({
        organizationId,
        userId,
        role,
        status: 'active',
      });

    console.log(`✅ Added user ${userId} to organization ${organizationId} as ${role}`);
  } catch (error) {
    console.error('❌ Error ensuring user in organization:', error);
  }
}