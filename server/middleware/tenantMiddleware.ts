/**
 * Tenant Resolution Middleware
 * Extracts and validates tenant context from incoming requests
 */

import { RequestHandler } from 'express';
import { tenantStorage, type TenantContext, type Organization } from '../tenancy/tenantContext';
import { db } from '../db';
import { organizations, organizationMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Extract subdomain from hostname
 * Examples:
 *   acme.app.com -> acme
 *   localhost:3000 -> default (for development)
 *   app.com -> null (root domain)
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // For localhost, use 'default' subdomain
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'default';
  }

  // For Replit URLs (*.repl.co, *.replit.dev), use 'default' subdomain
  // This ensures consistency across dev, prod, and webview environments
  if (host.endsWith('.repl.co') || host.endsWith('.replit.dev')) {
    return 'default';
  }

  // Split by dots
  const parts = host.split('.');

  // If only domain.com (2 parts) or less, no subdomain
  if (parts.length <= 2) {
    return null;
  }

  // Return first part as subdomain
  return parts[0];
}

/**
 * Find organization by subdomain
 */
async function findOrganizationBySubdomain(
  subdomain: string
): Promise<Organization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.subdomain, subdomain))
    .limit(1);

  return org || null;
}

/**
 * Verify user membership in organization
 */
async function verifyOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<{ role: string; status: string } | null> {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return {
    role: membership.role || 'member',
    status: membership.status || 'active',
  };
}

/**
 * Middleware to resolve and validate tenant context
 * Should be applied after authentication middleware
 */
export const resolveTenant: RequestHandler = async (req: any, res, next) => {
  try {
    // Extract subdomain from request
    const subdomain = extractSubdomain(req.hostname);
    console.log(`🔍 Tenant middleware: hostname=${req.hostname}, extracted subdomain=${subdomain}`);

    if (!subdomain) {
      console.log(`❌ Tenant middleware: No subdomain found for hostname ${req.hostname}`);
      return res.status(400).json({
        error: 'Invalid tenant',
        message: 'No subdomain specified. Use format: tenant.app.com',
      });
    }

    // Find organization
    const org = await findOrganizationBySubdomain(subdomain);
    console.log(`🔍 Tenant middleware: Looking for org with subdomain '${subdomain}', found:`, org ? `${org.name} (${org.id})` : 'NULL');

    if (!org) {
      // In development, provide helpful message about default organization
      if (process.env.NODE_ENV === 'development' && subdomain === 'default') {
        return res.status(404).json({
          error: 'Default organization not found',
          message: 'The default organization has not been created yet. Please wait for the application to complete seeding, or restart the server.',
          hint: 'The seed script should create the default organization automatically on startup.',
        });
      }

      return res.status(404).json({
        error: 'Organization not found',
        message: `No organization found for subdomain: ${subdomain}`,
        subdomain: subdomain,
      });
    }

    // Check organization status
    if (org.status === 'suspended') {
      return res.status(403).json({
        error: 'Organization suspended',
        message: 'This organization has been suspended. Please contact support.',
      });
    }

    if (org.status === 'cancelled') {
      return res.status(403).json({
        error: 'Organization cancelled',
        message: 'This organization has been cancelled.',
      });
    }

    // If user is authenticated, verify membership
    let userRole: string | undefined;
    let membership = null;

    if (req.user && req.user.id) {
      membership = await verifyOrganizationMembership(req.user.id, org.id);

      if (!membership) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this organization.',
        });
      }

      if (membership.status !== 'active') {
        return res.status(403).json({
          error: 'Access denied',
          message: `Your membership status is: ${membership.status}`,
        });
      }

      userRole = membership.role;
    }

    // Create tenant context
    const context: TenantContext = {
      organizationId: org.id,
      organization: org,
      userId: req.user?.id,
      userRole: userRole,
      userEmail: req.user?.email,
    };

    // Attach to request for convenience
    req.tenant = context;

    // Store context and continue - wrap the ENTIRE remaining request chain
    // CRITICAL: The AsyncLocalStorage context must remain active through the entire
    // async request/response cycle. Express doesn't wait for the middleware callback
    // to complete, so we need to ensure the context stays alive.
    //
    // The key insight: We need to keep the tenantStorage.run() callback alive
    // throughout the request lifecycle. We do this by NOT returning from the callback
    // until after the response is finished.
    tenantStorage.run(context, () => {
      // Hook into response completion to maintain context throughout request lifecycle
      const originalEnd = res.end;
      const originalJson = res.json;
      const originalSend = res.send;

      let responseSent = false;

      // Wrap all response methods to detect when response is complete
      res.end = function(...args: any[]) {
        responseSent = true;
        return originalEnd.apply(this, args);
      };

      res.json = function(...args: any[]) {
        responseSent = true;
        return originalJson.apply(this, args);
      };

      res.send = function(...args: any[]) {
        responseSent = true;
        return originalSend.apply(this, args);
      };

      // Call next to continue request processing
      // The context will remain active because we're still inside tenantStorage.run()
      next();
    });
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({
      error: 'Tenant resolution failed',
      message: 'Unable to resolve tenant context',
    });
  }
};

/**
 * Middleware to require tenant context (fails if not present)
 * Use this for routes that MUST have tenant context
 */
export const requireTenant: RequestHandler = (req: any, res, next) => {
  if (!req.tenant || !req.tenant.organizationId) {
    return res.status(401).json({
      error: 'No tenant context',
      message: 'This request requires tenant context',
    });
  }
  next();
};

/**
 * Middleware to optionally load tenant if subdomain is present
 * Does not fail if no tenant is found (useful for public endpoints)
 */
export const optionalTenant: RequestHandler = async (req: any, res, next) => {
  try {
    const subdomain = extractSubdomain(req.hostname);

    if (subdomain) {
      const org = await findOrganizationBySubdomain(subdomain);

      if (org && org.status === 'active') {
        const context: TenantContext = {
          organizationId: org.id,
          organization: org,
          userId: req.user?.id,
        };

        return tenantStorage.run(context, () => {
          req.tenant = context;
          next();
        });
      }
    }

    // No tenant found, continue without tenant context
    next();
  } catch (error) {
    console.error('Optional tenant resolution error:', error);
    // Continue without tenant context on error
    next();
  }
};
