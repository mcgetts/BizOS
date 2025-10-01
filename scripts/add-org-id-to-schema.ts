/**
 * Script to add organizationId field to all tables in schema.ts
 * This is a one-time migration helper
 */

import * as fs from 'fs';
import * as path from 'path';

// Tables that should NOT have organizationId
const EXCLUDED_TABLES = new Set([
  'sessions', // Shared session storage
  'organizations', // Root table
  'organizationMembers', // Junction table
]);

// Tables that already have organizationId
const ALREADY_UPDATED = new Set([
  'users', // Has defaultOrganizationId
  'clients',
  'companies',
  'projects',
  'tasks',
  'timeEntries',
  'invoices',
  'expenses',
]);

const schemaPath = path.join(__dirname, '..', 'shared', 'schema.ts');

function addOrganizationIdToTable(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Find pgTable definitions
    const match = line.match(/^export const (\w+) = pgTable\(/);

    if (match) {
      const tableName = match[1];

      // Check if this table should be skipped
      if (EXCLUDED_TABLES.has(tableName) || ALREADY_UPDATED.has(tableName)) {
        result.push(line);
        i++;
        continue;
      }

      // Add current line
      result.push(line);
      i++;

      // Skip to the opening brace and first field (id)
      while (i < lines.length && !lines[i].includes('id: varchar("id")')) {
        result.push(lines[i]);
        i++;
      }

      // Add the id line
      if (i < lines.length) {
        result.push(lines[i]);
        i++;

        // Now insert organizationId right after id
        result.push(`  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),`);
      }

      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

function addIndexesToTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Find table closing with simple });
    if (line.trim() === '});' && i > 0) {
      // Look back to find table name
      let tableLine = '';
      for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
        if (lines[j].includes('= pgTable(')) {
          tableLine = lines[j];
          break;
        }
      }

      const match = tableLine.match(/^export const (\w+) = pgTable\(/);
      if (match) {
        const tableName = match[1];

        // Skip excluded or already indexed tables
        if (!EXCLUDED_TABLES.has(tableName) && !ALREADY_UPDATED.has(tableName)) {
          // Replace }); with }, (table) => [ ... ]);
          result.push(`}, (table) => [`);
          result.push(`  index("idx_${tableName}_org").on(table.organizationId),`);
          result.push(`]);`);
          i++;
          continue;
        }
      }
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

async function main() {
  console.log('Reading schema.ts...');
  let content = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Adding organizationId fields...');
  content = addOrganizationIdToTable(content);

  console.log('Adding indexes...');
  content = addIndexesToTables(content);

  // Write backup
  const backupPath = schemaPath + '.backup';
  fs.writeFileSync(backupPath, fs.readFileSync(schemaPath));
  console.log(`Backup created at: ${backupPath}`);

  // Write updated schema
  fs.writeFileSync(schemaPath, content);
  console.log('Schema updated successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the changes in schema.ts');
  console.log('2. Run database migration');
  console.log('3. Update storage layer to filter by organizationId');
}

main().catch(console.error);
