#!/usr/bin/env tsx

import { db } from '../server/db';
import { clients, companies, salesOpportunities } from "@shared/schema";

async function checkData() {
  console.log("🔍 Checking current data...\n");

  try {
    const allClients = await db.select().from(clients);
    console.log(`📋 Clients: ${allClients.length}`);
    if (allClients.length > 0) {
      console.log("Sample client:", JSON.stringify(allClients[0], null, 2));
    }

    const allCompanies = await db.select().from(companies);
    console.log(`\n🏢 Companies: ${allCompanies.length}`);
    if (allCompanies.length > 0) {
      console.log("Sample company:", JSON.stringify(allCompanies[0], null, 2));
    }

    const allOpportunities = await db.select().from(salesOpportunities);
    console.log(`\n💼 Sales Opportunities: ${allOpportunities.length}`);
    if (allOpportunities.length > 0) {
      console.log("Sample opportunity:", JSON.stringify(allOpportunities[0], null, 2));
    }

  } catch (error) {
    console.error("❌ Error checking data:", error);
  }
}

checkData();