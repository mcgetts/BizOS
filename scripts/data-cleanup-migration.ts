import { db } from "../server/db";
import { clients, companies } from "../shared/schema";
import { eq, isNull, and } from "drizzle-orm";

/**
 * Data Cleanup Migration Script
 *
 * This script addresses legacy data duplication in the clients table where
 * company information was stored directly in client records instead of
 * referencing the companies table.
 *
 * IMPORTANT: This is a data migration script that should be run carefully
 * and only after backing up the database.
 */

interface LegacyClient {
  id: string;
  name: string;
  companyId: string | null;
  // Legacy fields that duplicate company data
  company: string | null;
  industry: string | null;
  website: string | null;
  address: string | null;
}

async function analyzeDataDuplication() {
  console.log("🔍 Analyzing data duplication issues...");

  // Find clients with legacy company data but no companyId reference
  const clientsWithLegacyData = await db.select({
    id: clients.id,
    name: clients.name,
    companyId: clients.companyId,
    legacyCompany: clients.company,
    legacyIndustry: clients.industry,
    legacyWebsite: clients.website,
    legacyAddress: clients.address,
  }).from(clients)
    .where(
      and(
        isNull(clients.companyId),
        // Has legacy company data
        isNull(clients.company) === false
      )
    );

  console.log(`📊 Found ${clientsWithLegacyData.length} clients with legacy company data but no company reference`);

  // Find clients with both companyId and legacy data (potential conflicts)
  const clientsWithConflicts = await db.select({
    id: clients.id,
    name: clients.name,
    companyId: clients.companyId,
    legacyCompany: clients.company,
    legacyIndustry: clients.industry,
  }).from(clients)
    .where(
      and(
        isNull(clients.companyId) === false,
        isNull(clients.company) === false
      )
    );

  console.log(`⚠️  Found ${clientsWithConflicts.length} clients with both company references and legacy data`);

  return {
    legacyClients: clientsWithLegacyData,
    conflictClients: clientsWithConflicts
  };
}

async function createMissingCompanies(legacyClients: any[]) {
  console.log("🏢 Creating missing company records from legacy data...");

  const companiesToCreate = new Map<string, any>();

  // Group clients by company name to avoid duplicates
  for (const client of legacyClients) {
    if (client.legacyCompany && !companiesToCreate.has(client.legacyCompany)) {
      companiesToCreate.set(client.legacyCompany, {
        name: client.legacyCompany,
        industry: client.legacyIndustry,
        website: client.legacyWebsite,
        address: client.legacyAddress,
        description: `Migrated from legacy client data for ${client.name}`,
        isActive: true,
      });
    }
  }

  console.log(`📝 Creating ${companiesToCreate.size} new company records...`);

  const createdCompanies = [];
  for (const [companyName, companyData] of companiesToCreate) {
    try {
      const [newCompany] = await db.insert(companies)
        .values(companyData)
        .returning();

      createdCompanies.push({
        id: newCompany.id,
        name: companyName,
        originalData: companyData
      });

      console.log(`✅ Created company: ${companyName} (${newCompany.id})`);
    } catch (error) {
      console.error(`❌ Failed to create company ${companyName}:`, error);
    }
  }

  return createdCompanies;
}

async function linkClientsToCompanies(legacyClients: any[], createdCompanies: any[]) {
  console.log("🔗 Linking clients to their company records...");

  const companyLookup = new Map(
    createdCompanies.map(company => [company.name, company.id])
  );

  let updatedCount = 0;
  for (const client of legacyClients) {
    if (client.legacyCompany && companyLookup.has(client.legacyCompany)) {
      const companyId = companyLookup.get(client.legacyCompany);

      try {
        await db.update(clients)
          .set({ companyId })
          .where(eq(clients.id, client.id));

        console.log(`✅ Linked client ${client.name} to company ${client.legacyCompany}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to link client ${client.name}:`, error);
      }
    }
  }

  console.log(`🎉 Successfully linked ${updatedCount} clients to companies`);
}

async function generateCleanupReport() {
  console.log("📋 Generating cleanup recommendations...");

  const report = {
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        action: "Remove Legacy Fields",
        description: "After data migration is complete and verified, remove legacy fields from clients table",
        fields: ["company", "industry", "website", "address"],
        risk: "LOW",
        impact: "Reduces data duplication and potential inconsistencies"
      },
      {
        action: "Update UI Components",
        description: "Ensure all forms and displays use company reference instead of legacy fields",
        files: [
          "client/src/pages/Clients.tsx",
          "client/src/components/ClientForm.tsx"
        ],
        risk: "MEDIUM",
        impact: "Ensures UI consistency with normalized data model"
      },
      {
        action: "Add Database Constraints",
        description: "Add foreign key constraints and validation rules",
        constraints: [
          "NOT NULL constraint on clients.companyId after migration",
          "Cascade delete rules for company-client relationships"
        ],
        risk: "LOW",
        impact: "Enforces data integrity at database level"
      }
    ],
    metrics: {
      clientsNeedingMigration: 0,
      companiesCreated: 0,
      dataIntegrityScore: "GOOD"
    }
  };

  return report;
}

async function runDataAnalysis() {
  try {
    console.log("🚀 Starting data cleanup analysis...");

    const analysis = await analyzeDataDuplication();
    const report = await generateCleanupReport();

    // Update metrics
    report.metrics.clientsNeedingMigration = analysis.legacyClients.length;
    report.metrics.dataIntegrityScore = analysis.conflictClients.length === 0 ? "EXCELLENT" : "NEEDS_ATTENTION";

    console.log("\n📊 DATA CLEANUP SUMMARY:");
    console.log("========================");
    console.log(`Legacy clients found: ${analysis.legacyClients.length}`);
    console.log(`Conflicting clients: ${analysis.conflictClients.length}`);
    console.log(`Data integrity: ${report.metrics.dataIntegrityScore}`);

    console.log("\n💡 RECOMMENDATIONS:");
    console.log("==================");
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.action} (${rec.risk} risk)`);
      console.log(`   ${rec.description}`);
    });

    console.log("\n✅ Analysis complete!");

    return {
      analysis,
      report,
      shouldProceedWithMigration: analysis.legacyClients.length > 0
    };

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    throw error;
  }
}

async function runDataMigration() {
  try {
    console.log("🚀 Starting data migration...");

    const analysis = await analyzeDataDuplication();

    if (analysis.legacyClients.length === 0) {
      console.log("✅ No legacy data found - migration not needed!");
      return;
    }

    // Step 1: Create missing companies
    const createdCompanies = await createMissingCompanies(analysis.legacyClients);

    // Step 2: Link clients to companies
    await linkClientsToCompanies(analysis.legacyClients, createdCompanies);

    console.log("🎉 Data migration completed successfully!");
    console.log("\n⚠️  NEXT STEPS:");
    console.log("1. Verify the migration by checking client-company relationships");
    console.log("2. Update any remaining UI components to use company references");
    console.log("3. Consider removing legacy fields after verification period");

  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  }
}

// Export functions for individual use
export {
  runDataAnalysis,
  runDataMigration,
  analyzeDataDuplication,
  createMissingCompanies,
  linkClientsToCompanies
};

// Main execution
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'analyze':
      runDataAnalysis()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'migrate':
      console.log("⚠️  WARNING: This will modify your database!");
      console.log("   Make sure you have a backup before proceeding.");
      console.log("   Run 'npm run analyze-data' first to review what will be changed.\n");

      runDataMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    default:
      console.log("Usage:");
      console.log("  npm run analyze-data    - Analyze data duplication issues");
      console.log("  npm run migrate-data    - Perform data migration (with backup!)");
      process.exit(1);
  }
}