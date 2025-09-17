#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from "drizzle-orm";

async function runDatabaseMigration() {
  console.log("🔄 Starting database schema migration...\n");

  try {
    // Step 1: Create companies table
    console.log("🏢 Creating companies table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        industry VARCHAR,
        website VARCHAR,
        address TEXT,
        phone VARCHAR,
        email VARCHAR,
        description TEXT,
        size VARCHAR,
        revenue DECIMAL(12, 2),
        founded_year INTEGER,
        linkedin_url VARCHAR,
        twitter_url VARCHAR,
        tags TEXT[],
        assigned_to VARCHAR REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Companies table created");

    // Step 2: Create sales_opportunities table
    console.log("💼 Creating sales_opportunities table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sales_opportunities (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        description TEXT,
        company_id VARCHAR REFERENCES companies(id),
        contact_id VARCHAR REFERENCES clients(id),
        assigned_to VARCHAR REFERENCES users(id),
        stage VARCHAR DEFAULT 'lead',
        value DECIMAL(10, 2),
        probability INTEGER DEFAULT 50,
        expected_close_date TIMESTAMP,
        actual_close_date TIMESTAMP,
        source VARCHAR,
        priority VARCHAR DEFAULT 'medium',
        tags TEXT[],
        notes TEXT,
        last_activity_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Sales opportunities table created");

    // Step 3: Add new columns to clients table
    console.log("👥 Updating clients table...");

    // Add new columns to clients table
    const clientColumns = [
      { name: 'company_id', type: 'VARCHAR REFERENCES companies(id)' },
      { name: 'position', type: 'VARCHAR' },
      { name: 'department', type: 'VARCHAR' },
      { name: 'is_primary_contact', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const column of clientColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE clients ADD COLUMN ${column.name} ${column.type}`));
        console.log(`✅ Added ${column.name} to clients table`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Column ${column.name} already exists in clients table`);
        } else {
          throw error;
        }
      }
    }

    // Step 4: Add company_id to projects table
    console.log("📋 Updating projects table...");
    try {
      await db.execute(sql`ALTER TABLE projects ADD COLUMN company_id VARCHAR REFERENCES companies(id)`);
      console.log("✅ Added company_id to projects table");
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log("⚠️ Column company_id already exists in projects table");
      } else {
        throw error;
      }
    }

    // Step 5: Add company_id to invoices table
    console.log("💰 Updating invoices table...");
    try {
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN company_id VARCHAR REFERENCES companies(id)`);
      console.log("✅ Added company_id to invoices table");
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log("⚠️ Column company_id already exists in invoices table");
      } else {
        throw error;
      }
    }

    console.log("\n🎉 Database migration completed successfully!");
    console.log("=" .repeat(50));
    console.log("✅ Companies table created");
    console.log("✅ Sales opportunities table created");
    console.log("✅ Clients table updated with new columns");
    console.log("✅ Projects table updated with company_id");
    console.log("✅ Invoices table updated with company_id");
    console.log("=" .repeat(50));

  } catch (error) {
    console.error("❌ Error during database migration:", error);
    throw error;
  }
}

// Run the migration
runDatabaseMigration()
  .then(() => {
    console.log("\n✅ Database schema migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Database migration failed:", error);
    process.exit(1);
  });