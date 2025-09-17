#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from "drizzle-orm";
import {
  users,
  clients,
  companies,
  salesOpportunities,
  projects,
  invoices,
} from "@shared/schema";

async function migrateCRMData() {
  console.log("🔄 Starting CRM data migration...\n");

  try {
    // Step 0: Add missing column to clients table if needed
    try {
      await db.execute(sql`ALTER TABLE clients ADD COLUMN is_active BOOLEAN DEFAULT true`);
      console.log("✅ Added is_active column to clients table");
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log("⚠️ Column is_active already exists in clients table");
      }
    }

    // Step 1: Get all existing clients
    const existingClients = await db.select().from(clients);
    console.log(`📋 Found ${existingClients.length} existing clients to migrate`);

    // Step 2: Create companies from existing client data
    console.log("🏢 Creating companies from client data...");
    const companyMap = new Map<string, string>(); // company name -> company ID

    for (const client of existingClients) {
      if (client.company && !companyMap.has(client.company)) {
        const companyData = {
          name: client.company,
          industry: client.industry || null,
          website: client.website || null,
          address: client.address || null,
          phone: client.phone || null,
          email: client.email || null,
          assignedTo: client.assignedTo,
          tags: client.tags || [],
        };

        const [newCompany] = await db.insert(companies).values(companyData).returning();
        companyMap.set(client.company, newCompany.id);
        console.log(`✅ Created company: ${newCompany.name}`);
      }
    }

    // Step 3: Create sales opportunities from existing client statuses
    console.log("\n💼 Creating sales opportunities from client statuses...");
    let opportunityCount = 0;

    for (const client of existingClients) {
      if (client.status && client.status !== "inactive") {
        // Map old statuses to new stages
        const stageMapping: Record<string, string> = {
          "lead": "lead",
          "qualified": "qualified",
          "proposal": "proposal",
          "client": "closed_won"
        };

        const stage = stageMapping[client.status] || "lead";
        const companyId = client.company ? companyMap.get(client.company) : null;

        const opportunityData = {
          title: `${client.company || client.name} - ${stage === "closed_won" ? "Partnership" : "Sales Opportunity"}`,
          description: client.notes || `Sales opportunity for ${client.company || client.name}`,
          companyId,
          contactId: client.id,
          assignedTo: client.assignedTo,
          stage,
          value: client.totalValue ? parseFloat(client.totalValue) : null,
          probability: stage === "closed_won" ? 100 : stage === "proposal" ? 75 : stage === "qualified" ? 50 : 25,
          source: client.source || null,
          lastActivityDate: client.lastContactDate || new Date(),
          tags: client.tags || [],
        };

        const [newOpportunity] = await db.insert(salesOpportunities).values(opportunityData).returning();
        opportunityCount++;
        console.log(`✅ Created opportunity: ${newOpportunity.title} (${newOpportunity.stage})`);
      }
    }

    // Step 4: Update clients to link to companies and remove old fields
    console.log("\n👥 Updating client records...");
    for (const client of existingClients) {
      const companyId = client.company ? companyMap.get(client.company) : null;

      // Update client with new structure (removing old fields)
      await db.update(clients)
        .set({
          companyId,
          position: null, // Will need to be filled in manually
          department: null,
          isPrimaryContact: true, // Assume existing contacts are primary
          // Remove status, industry, website, address, totalValue
          updatedAt: new Date(),
        })
        .where(sql`id = ${client.id}`);
    }

    // Step 5: Update projects to link to companies
    console.log("\n📋 Updating project records...");
    const existingProjects = await db.select().from(projects);

    for (const project of existingProjects) {
      if (project.clientId) {
        // Find the client and get their company
        const client = existingClients.find(c => c.id === project.clientId);
        if (client && client.company) {
          const companyId = companyMap.get(client.company);
          if (companyId) {
            await db.update(projects)
              .set({
                companyId,
                updatedAt: new Date(),
              })
              .where(sql`id = ${project.id}`);
          }
        }
      }
    }

    // Step 6: Update invoices to link to companies
    console.log("\n💰 Updating invoice records...");
    const existingInvoices = await db.select().from(invoices);

    for (const invoice of existingInvoices) {
      if (invoice.clientId) {
        // Find the client and get their company
        const client = existingClients.find(c => c.id === invoice.clientId);
        if (client && client.company) {
          const companyId = companyMap.get(client.company);
          if (companyId) {
            await db.update(invoices)
              .set({
                companyId,
                updatedAt: new Date(),
              })
              .where(sql`id = ${invoice.id}`);
          }
        }
      }
    }

    console.log("\n🎉 CRM Data Migration Complete!");
    console.log("=" .repeat(50));
    console.log(`✅ Companies created: ${companyMap.size}`);
    console.log(`✅ Sales opportunities created: ${opportunityCount}`);
    console.log(`✅ Clients updated: ${existingClients.length}`);
    console.log(`✅ Projects updated: ${existingProjects.length}`);
    console.log(`✅ Invoices updated: ${existingInvoices.length}`);
    console.log("=" .repeat(50));
    console.log("\n📋 Next Steps:");
    console.log("1. Review company records and add missing information");
    console.log("2. Update client positions and departments");
    console.log("3. Verify sales opportunity stages and values");
    console.log("4. Test the new CRM interface");

  } catch (error) {
    console.error("❌ Error during CRM migration:", error);
    throw error;
  }
}

// Run the migration
migrateCRMData()
  .then(() => {
    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });