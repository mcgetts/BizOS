#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from "drizzle-orm";
import {
  clients,
  companies,
  salesOpportunities,
} from "@shared/schema";

async function fixMigration() {
  console.log("🔧 Fixing CRM data migration...\n");

  try {
    // Step 1: Get all existing clients
    const existingClients = await db.select().from(clients);
    console.log(`📋 Found ${existingClients.length} existing clients to process`);

    // Step 2: Create companies from client names (treating each "client" as a company)
    console.log("🏢 Creating companies from client data...");

    const clientToCompanyMap = new Map<string, string>(); // client ID -> company ID

    for (const client of existingClients) {
      // Create a company for each client (since the sample data treats client names as company names)
      const companyData = {
        name: client.name, // Use the client name as company name
        email: client.email,
        phone: client.phone,
        assignedTo: client.assignedTo,
        tags: client.tags || [],
        description: client.notes || `Company profile for ${client.name}`,
      };

      const [newCompany] = await db.insert(companies).values(companyData).returning();
      clientToCompanyMap.set(client.id, newCompany.id);
      console.log(`✅ Created company: ${newCompany.name}`);

      // Update the client to be a contact for this company
      await db.update(clients)
        .set({
          companyId: newCompany.id,
          name: "Primary Contact", // Change client name to generic contact name
          position: "Key Contact",
          isPrimaryContact: true,
          updatedAt: new Date(),
        })
        .where(sql`id = ${client.id}`);
    }

    // Step 3: Create sales opportunities for companies
    console.log("\n💼 Creating sales opportunities...");

    const salesStages = ["lead", "qualified", "proposal", "negotiation", "closed_won"];
    let opportunityCount = 0;

    const companyList = await db.select().from(companies);

    for (const company of companyList) {
      // Create 1-3 opportunities per company
      const numOpportunities = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numOpportunities; i++) {
        const stage = salesStages[Math.floor(Math.random() * salesStages.length)];
        const value = Math.floor(Math.random() * 100000) + 10000; // $10k-$110k

        const opportunityData = {
          title: `${company.name} - ${stage === "closed_won" ? "Partnership" : "Sales Opportunity"}`,
          description: `Sales opportunity for ${company.name}`,
          companyId: company.id,
          contactId: null, // Will link to primary contact later
          assignedTo: company.assignedTo,
          stage,
          value: value.toString(),
          probability: stage === "closed_won" ? 100 :
                      stage === "negotiation" ? 75 :
                      stage === "proposal" ? 50 :
                      stage === "qualified" ? 30 : 20,
          source: ["website", "referral", "marketing", "cold_outreach"][Math.floor(Math.random() * 4)],
          priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
          expectedCloseDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000), // Within 90 days
          lastActivityDate: new Date(),
          tags: company.tags?.slice(0, 2) || [],
        };

        const [newOpportunity] = await db.insert(salesOpportunities).values(opportunityData).returning();
        opportunityCount++;
        console.log(`✅ Created opportunity: ${newOpportunity.title} ($${value} - ${stage})`);
      }
    }

    // Step 4: Update existing projects to link to companies
    console.log("\n📋 Updating projects to link to companies...");
    const projects = await db.select().from(db.select().from(sql`projects`));

    // This is a simplified approach - link projects to companies based on client relationships
    for (const clientId of clientToCompanyMap.keys()) {
      const companyId = clientToCompanyMap.get(clientId);
      if (companyId) {
        await db.execute(sql`
          UPDATE projects
          SET company_id = ${companyId}, updated_at = NOW()
          WHERE client_id = ${clientId}
        `);
      }
    }

    // Step 5: Update existing invoices to link to companies
    console.log("💰 Updating invoices to link to companies...");
    for (const clientId of clientToCompanyMap.keys()) {
      const companyId = clientToCompanyMap.get(clientId);
      if (companyId) {
        await db.execute(sql`
          UPDATE invoices
          SET company_id = ${companyId}, updated_at = NOW()
          WHERE client_id = ${clientId}
        `);
      }
    }

    console.log("\n🎉 CRM Data Migration Fixed!");
    console.log("=" .repeat(50));
    console.log(`✅ Companies created: ${clientToCompanyMap.size}`);
    console.log(`✅ Sales opportunities created: ${opportunityCount}`);
    console.log(`✅ Clients updated: ${existingClients.length}`);
    console.log("=" .repeat(50));

  } catch (error) {
    console.error("❌ Error during migration fix:", error);
    throw error;
  }
}

// Run the fix
fixMigration()
  .then(() => {
    console.log("\n✅ Migration fix completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration fix failed:", error);
    process.exit(1);
  });