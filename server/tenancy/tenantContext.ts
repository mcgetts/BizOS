/**
 * Tenant Context Management using AsyncLocalStorage
 * Provides thread-safe tenant isolation for multi-tenant architecture
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  slug: string;
  planTier: string;
  status: string;
  maxUsers: number;
  settings?: Record<string, any>;
}

export interface TenantContext {
  organizationId: string;
  organization: Organization;
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

// AsyncLocalStorage provides thread-safe context storage
// Each request maintains its own isolated context
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current tenant context
 * @throws Error if no tenant context is available
 */
export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error(
      'No tenant context available. Ensure tenant middleware is applied to this route.'
    );
  }
  return context;
}

/**
 * Safely get tenant context without throwing
 * @returns TenantContext or undefined if not in tenant context
 */
export function tryGetTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Get organization ID from current context
 * @throws Error if no tenant context
 */
export function getOrganizationId(): string {
  const context = tryGetTenantContext();
  if (!context) {
    throw new Error(
      'No tenant context available. Ensure tenant middleware is applied to this route.'
    );
  }
  return context.organizationId;
}

/**
 * Get current user ID from context
 */
export function getUserId(): string | undefined {
  return getTenantContext().userId;
}

/**
 * Check if code is running within a tenant context
 */
export function hasTenantContext(): boolean {
  return tenantStorage.getStore() !== undefined;
}

/**
 * Run a function within a tenant context
 * Used primarily for testing and background jobs
 */
export function runInTenantContext<T>(
  context: TenantContext,
  fn: () => T
): T {
  return tenantStorage.run(context, fn);
}

/**
 * Run an async function within a tenant context
 */
export async function runInTenantContextAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    tenantStorage.run(context, async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Get the tenant storage instance (for advanced use cases)
 */
export function getTenantStorage() {
  return tenantStorage;
}

// Export for convenience
export { tenantStorage };
