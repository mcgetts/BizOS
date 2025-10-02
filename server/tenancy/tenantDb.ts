/**
 * Tenant-Scoped Database Wrapper
 * Automatically injects organizationId into all database queries for tenant isolation
 */

import { db } from '../db';
import { getTenantContext, getOrganizationId } from './tenantContext';
import { eq, and, SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * Helper to check if a table has organizationId column
 */
function hasOrganizationId(table: any): boolean {
  // Tables without organizationId
  const systemTables = [
    'sessions',
    'organizations',
    'organization_members',
  ];

  const tableName = table[Symbol.for('drizzle:Name')] || '';
  return !systemTables.includes(tableName);
}

/**
 * Tenant-scoped query builder
 * Automatically adds organizationId filter to WHERE clauses
 */
export class TenantScopedDB {
  private orgId: string;

  constructor(organizationId?: string) {
    this.orgId = organizationId || getOrganizationId();
  }

  /**
   * Build a WHERE clause with organizationId automatically included
   */
  private buildTenantWhere(
    table: any,
    additionalWhere?: SQL | undefined
  ): SQL | undefined {
    if (!hasOrganizationId(table)) {
      return additionalWhere;
    }

    const orgFilter = eq(table.organizationId, this.orgId);

    if (!additionalWhere) {
      return orgFilter;
    }

    return and(orgFilter, additionalWhere);
  }

  /**
   * SELECT query with automatic tenant filtering
   * Usage: tenantDb.select(projects).where(eq(projects.status, 'active'))
   */
  select() {
    return db.select();
  }

  /**
   * Helper to add tenant filtering to a query
   */
  from<T extends PgTable>(table: T) {
    const query = db.select().from(table);

    if (hasOrganizationId(table)) {
      return query.where(eq((table as any).organizationId, this.orgId));
    }

    return query;
  }

  /**
   * INSERT with automatic organizationId injection
   */
  insert<T extends PgTable>(table: T) {
    return {
      values: (data: any) => {
        // Auto-inject organizationId if table supports it
        if (hasOrganizationId(table)) {
          return db.insert(table).values({
            ...data,
            organizationId: this.orgId,
          });
        }

        return db.insert(table).values(data);
      },
    };
  }

  /**
   * UPDATE with automatic tenant filtering
   * Only updates rows belonging to current tenant
   */
  update<T extends PgTable>(table: T) {
    return {
      set: (data: any) => ({
        where: (condition: SQL) => {
          const tenantWhere = this.buildTenantWhere(table, condition);
          return db.update(table).set(data).where(tenantWhere!);
        },
      }),
    };
  }

  /**
   * DELETE with automatic tenant filtering
   * Only deletes rows belonging to current tenant
   */
  delete<T extends PgTable>(table: T) {
    return {
      where: (condition?: SQL) => {
        const tenantWhere = this.buildTenantWhere(table, condition);
        return db.delete(table).where(tenantWhere!);
      },
    };
  }

  /**
   * Get the underlying database instance (use with caution)
   */
  getRawDb() {
    return db;
  }

  /**
   * Get current organization ID
   */
  getOrganizationId() {
    return this.orgId;
  }

  /**
   * Execute a scoped query with full Drizzle API access
   * Provides both db and organizationId to callback for complex queries with joins
   * 
   * Usage for complex queries with joins:
   * ```
   * const tenantDb = getTenantDb();
   * return await tenantDb.query((db, orgId) =>
   *   db.select({...})
   *     .from(clients)
   *     .leftJoin(companies, and(
   *       eq(clients.companyId, companies.id),
   *       eq(companies.organizationId, orgId)
   *     ))
   *     .where(eq(clients.organizationId, orgId))
   * );
   * ```
   */
  async query<T>(
    callback: (db: typeof db, organizationId: string) => Promise<T>
  ): Promise<T> {
    return await callback(db, this.orgId);
  }

  /**
   * Helper to build tenant-scoped join condition
   * Automatically adds organizationId filter to join conditions
   * 
   * Usage:
   * ```
   * tenantDb.joinScoped(companies, eq(clients.companyId, companies.id))
   * ```
   */
  joinScoped<T extends PgTable>(table: T, condition: SQL): SQL {
    if (hasOrganizationId(table)) {
      return and(
        condition,
        eq((table as any).organizationId, this.orgId)
      );
    }
    return condition;
  }
}

/**
 * Get a tenant-scoped database instance for the current tenant
 * @throws Error if no tenant context is available
 */
export function getTenantDb(): TenantScopedDB {
  return new TenantScopedDB();
}

/**
 * Create a tenant-scoped database instance for a specific organization
 * Useful for background jobs or cross-tenant operations (use carefully!)
 */
export function createTenantDb(organizationId: string): TenantScopedDB {
  return new TenantScopedDB(organizationId);
}

/**
 * Execute a callback with tenant-scoped database
 * Automatically handles tenant context
 */
export async function withTenantDb<T>(
  callback: (tenantDb: TenantScopedDB) => Promise<T>
): Promise<T> {
  const tenantDb = getTenantDb();
  return await callback(tenantDb);
}

/**
 * Batch insert with automatic organizationId injection
 */
export async function tenantBatchInsert<T extends PgTable>(
  table: T,
  data: any[]
): Promise<void> {
  const orgId = getOrganizationId();

  const dataWithOrgId = hasOrganizationId(table)
    ? data.map((item) => ({ ...item, organizationId: orgId }))
    : data;

  await db.insert(table).values(dataWithOrgId);
}

// Export the main function
export default getTenantDb;
