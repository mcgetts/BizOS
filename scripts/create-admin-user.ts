import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, organizations } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';
import bcrypt from 'bcryptjs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminUser() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Creating Admin User for Production\n');

  // Get user details
  const email = await question('Enter admin email: ');
  const firstName = await question('Enter first name: ');
  const lastName = await question('Enter last name: ');
  const password = await question('Enter password: ');

  if (!email || !firstName || !lastName || !password) {
    console.error('❌ All fields are required');
    rl.close();
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      console.log(`\n⚠️  User with email ${email} already exists`);
      console.log(`User ID: ${existingUser[0].id}`);
      console.log(`Current Role: ${existingUser[0].role}`);
      
      const updateRole = await question('\nUpdate this user to admin role? (yes/no): ');
      
      if (updateRole.toLowerCase() === 'yes' || updateRole.toLowerCase() === 'y') {
        await db.update(users)
          .set({ role: 'admin' })
          .where(eq(users.email, email));
        
        console.log(`\n✅ Updated ${email} to admin role`);
      }
      
      rl.close();
      return;
    }

    // Get or create default organization
    let defaultOrg = await db.select().from(organizations).where(eq(organizations.subdomain, 'default')).limit(1);
    
    if (defaultOrg.length === 0) {
      console.log('\n📦 Creating default organization...');
      defaultOrg = await db.insert(organizations).values({
        name: 'Default Organization',
        subdomain: 'default',
        slug: 'default',
        settings: {},
      }).returning();
    }

    const orgId = defaultOrg[0].id;

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const newUser = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: 'admin',
      emailVerified: true,
      defaultOrganizationId: orgId,
    }).returning();

    console.log('\n✅ Admin user created successfully!');
    console.log('\nUser Details:');
    console.log(`  Email: ${newUser[0].email}`);
    console.log(`  Name: ${newUser[0].firstName} ${newUser[0].lastName}`);
    console.log(`  Role: ${newUser[0].role}`);
    console.log(`  Organization: ${defaultOrg[0].name} (${defaultOrg[0].subdomain})`);
    console.log('\n🔐 You can now log in with these credentials\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdminUser();
