import { storage } from './storage';
import { ROLES } from './config/constants';

/**
 * Seeds essential data for production deployment
 * Ensures the first user gets admin privileges and sets up basic data
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
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
  } catch (error) {
    console.error('❌ Error ensuring first user admin status:', error);
  }
}