#!/usr/bin/env tsx

/**
 * ROADMAP.md Sync Script
 *
 * This script synchronizes the ROADMAP.md file with the Product Management database.
 *
 * Features:
 * - Parses ROADMAP.md phases → Creates/Updates Epics
 * - Parses items within phases → Creates/Updates Features
 * - Maps checkbox status to feature status ([ ] = backlog, [x] = completed)
 * - Maps progress percentages to epic progress
 * - Bidirectional sync support (future enhancement)
 *
 * Usage:
 *   tsx scripts/sync-roadmap.ts [--product-id=<id>] [--dry-run]
 *
 * Options:
 *   --product-id=<id>  The product ID to sync to (required)
 *   --dry-run          Preview changes without applying them
 *   --help             Show this help message
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { products, epics, features } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface RoadmapPhase {
  title: string;
  description: string;
  items: RoadmapItem[];
  progressPercentage: number;
  completed: number;
  total: number;
}

interface RoadmapItem {
  title: string;
  description: string;
  completed: boolean;
  priority: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const productIdArg = args.find(arg => arg.startsWith('--product-id='));
const dryRun = args.includes('--dry-run');
const showHelp = args.includes('--help');

if (showHelp) {
  console.log(`
ROADMAP.md Sync Script

This script synchronizes the ROADMAP.md file with the Product Management database.

Usage:
  tsx scripts/sync-roadmap.ts --product-id=<id> [--dry-run]

Options:
  --product-id=<id>  The product ID to sync to (required)
  --dry-run          Preview changes without applying them
  --help             Show this help message

Examples:
  tsx scripts/sync-roadmap.ts --product-id=abc123
  tsx scripts/sync-roadmap.ts --product-id=abc123 --dry-run
  `);
  process.exit(0);
}

if (!productIdArg) {
  console.error('Error: --product-id is required');
  console.log('Run with --help for usage information');
  process.exit(1);
}

const productId = productIdArg.split('=')[1];

// Parse ROADMAP.md file
function parseRoadmap(filePath: string): RoadmapPhase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const phases: RoadmapPhase[] = [];

  // Split by phase headers (### Phase X:)
  const phaseRegex = /###\s+Phase\s+(\d+):\s+([^\n]+)/g;
  const sections = content.split(phaseRegex);

  // Skip the first section (before any phase)
  for (let i = 1; i < sections.length; i += 3) {
    const phaseNumber = sections[i];
    const phaseTitle = sections[i + 1];
    const phaseContent = sections[i + 2];

    if (!phaseContent) continue;

    // Extract progress from content (e.g., "**Progress**: 15/15 (100%)")
    const progressMatch = phaseContent.match(/\*\*Progress\*\*:\s*(\d+)\/(\d+)\s*\((\d+)%\)/);
    const completed = progressMatch ? parseInt(progressMatch[1]) : 0;
    const total = progressMatch ? parseInt(progressMatch[2]) : 0;
    const progressPercentage = progressMatch ? parseInt(progressMatch[3]) : 0;

    // Extract description (first paragraph after phase header)
    const descMatch = phaseContent.match(/\n\n([^\n]+)/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Parse items (- [ ] or - [x])
    const items: RoadmapItem[] = [];
    const itemRegex = /^- \[([ x])\]\s+\*\*([^*]+)\*\*\s*-?\s*([^\n]*)/gm;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(phaseContent)) !== null) {
      const isCompleted = itemMatch[1] === 'x';
      const title = itemMatch[2].trim();
      const itemDescription = itemMatch[3].trim();

      // Determine priority based on keywords
      let priority = 'medium';
      if (itemDescription.toLowerCase().includes('critical') || itemDescription.toLowerCase().includes('urgent')) {
        priority = 'urgent';
      } else if (itemDescription.toLowerCase().includes('high priority')) {
        priority = 'high';
      } else if (itemDescription.toLowerCase().includes('low priority')) {
        priority = 'low';
      }

      items.push({
        title,
        description: itemDescription,
        completed: isCompleted,
        priority,
      });
    }

    phases.push({
      title: `Phase ${phaseNumber}: ${phaseTitle}`,
      description,
      items,
      progressPercentage,
      completed,
      total,
    });
  }

  return phases;
}

// Sync phases to database
async function syncToDatabase(
  productId: string,
  phases: RoadmapPhase[],
  organizationId: string,
  dryRun: boolean
) {
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Starting sync for product ${productId}...\n`);

  let epicsCreated = 0;
  let epicsUpdated = 0;
  let featuresCreated = 0;
  let featuresUpdated = 0;

  for (const phase of phases) {
    console.log(`Processing: ${phase.title}`);

    // Check if epic exists (by title)
    const existingEpic = await db
      .select()
      .from(epics)
      .where(
        and(
          eq(epics.productId, productId),
          eq(epics.title, phase.title)
        )
      )
      .limit(1);

    let epicId: string;

    if (existingEpic.length > 0) {
      // Update existing epic
      epicId = existingEpic[0].id;

      if (!dryRun) {
        await db
          .update(epics)
          .set({
            description: phase.description,
            progressPercentage: phase.progressPercentage,
            status: phase.progressPercentage === 100 ? 'completed' : 'in_progress',
            updatedAt: new Date(),
          })
          .where(eq(epics.id, epicId));
      }

      console.log(`  ✓ Updated epic (${phase.completed}/${phase.total} items, ${phase.progressPercentage}%)`);
      epicsUpdated++;
    } else {
      // Create new epic
      if (!dryRun) {
        const newEpic = await db
          .insert(epics)
          .values({
            organizationId,
            productId,
            title: phase.title,
            description: phase.description,
            status: phase.progressPercentage === 100 ? 'completed' : 'in_progress',
            progressPercentage: phase.progressPercentage,
            roadmapPhase: phase.title,
            priority: 'medium',
          })
          .returning();

        epicId = newEpic[0].id;
      } else {
        epicId = 'dry-run-epic-id';
      }

      console.log(`  ✓ Created epic (${phase.completed}/${phase.total} items, ${phase.progressPercentage}%)`);
      epicsCreated++;
    }

    // Sync features
    for (const item of phase.items) {
      // Check if feature exists (by title and epic)
      const existingFeature = await db
        .select()
        .from(features)
        .where(
          and(
            eq(features.epicId, epicId),
            eq(features.title, item.title)
          )
        )
        .limit(1);

      if (existingFeature.length > 0) {
        // Update existing feature
        if (!dryRun) {
          await db
            .update(features)
            .set({
              description: item.description,
              status: item.completed ? 'completed' : 'backlog',
              priority: item.priority,
              updatedAt: new Date(),
              completedAt: item.completed ? new Date() : null,
            })
            .where(eq(features.id, existingFeature[0].id));
        }

        featuresUpdated++;
      } else {
        // Create new feature
        if (!dryRun) {
          await db
            .insert(features)
            .values({
              organizationId,
              productId,
              epicId,
              title: item.title,
              description: item.description,
              status: item.completed ? 'completed' : 'backlog',
              priority: item.priority,
              completedAt: item.completed ? new Date() : null,
            });
        }

        featuresCreated++;
      }
    }

    console.log(`    → ${phase.items.length} features processed`);
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Sync Summary:`);
  console.log(`  Epics created: ${epicsCreated}`);
  console.log(`  Epics updated: ${epicsUpdated}`);
  console.log(`  Features created: ${featuresCreated}`);
  console.log(`  Features updated: ${featuresUpdated}`);
  console.log(`  Total phases: ${phases.length}`);
  console.log(`  Total items: ${phases.reduce((sum, p) => sum + p.items.length, 0)}`);

  if (dryRun) {
    console.log(`\n✓ Dry run complete - no changes were made to the database`);
  } else {
    console.log(`\n✓ Sync complete!`);
  }
}

// Main execution
async function main() {
  try {
    // Verify product exists and get organization ID
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      console.error(`Error: Product with ID "${productId}" not found`);
      process.exit(1);
    }

    const organizationId = product[0].organizationId;

    console.log(`Product: ${product[0].name}`);
    console.log(`Organization ID: ${organizationId}`);

    // Parse ROADMAP.md
    const roadmapPath = path.join(process.cwd(), 'ROADMAP.md');

    if (!fs.existsSync(roadmapPath)) {
      console.error(`Error: ROADMAP.md not found at ${roadmapPath}`);
      process.exit(1);
    }

    console.log(`Reading: ${roadmapPath}`);
    const phases = parseRoadmap(roadmapPath);

    console.log(`Parsed: ${phases.length} phases`);

    // Sync to database
    await syncToDatabase(productId, phases, organizationId, dryRun);

    process.exit(0);
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }
}

main();
