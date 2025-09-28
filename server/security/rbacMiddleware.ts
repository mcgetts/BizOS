import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { users, roles, userRoleAssignments, permissionExceptions } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import {
  hasPermission,
  getUserPermissions,
  requiresAuditLog,
  isSensitiveResource,
  requiresApproval,
  type PermissionResource,
  type PermissionAction,
  type Department,
  type EnhancedUserRole
} from '@shared/permissions';
import { auditService } from './auditService.js';
import { sentryService } from '../monitoring/sentryService.js';

// Extend Express User interface to include enhanced security fields
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      enhancedRole: EnhancedUserRole;
      department: Department;
      mfaEnabled: boolean;
      permissions?: string[];
      sessionLimit?: number;
      isActive: boolean;
    }
  }
}

interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
  department?: Department;
  ownResourceOnly?: boolean; // Only allow access to user's own resources
  requireMFA?: boolean;
  customCheck?: (req: Request) => Promise<boolean>;
}

export class RBACMiddleware {
  /**
   * Check if user has required permission
   */
  static requirePermission(check: PermissionCheck) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Basic authentication check
        if (!req.user) {
          return res.status(401).json({
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Account status check
        if (!req.user.isActive) {
          return res.status(403).json({
            message: 'Account is deactivated',
            code: 'ACCOUNT_DEACTIVATED'
          });
        }

        // MFA requirement check
        if (check.requireMFA && !req.user.mfaEnabled) {
          await auditService.logSecurityEvent(
            auditService.createContextFromRequest(req),
            {
              eventType: 'mfa_required_access_denied',
              severity: 'medium',
              riskScore: 40,
              eventData: {
                resource: check.resource,
                action: check.action,
                reason: 'MFA required but not enabled'
              }
            }
          );

          return res.status(403).json({
            message: 'Multi-factor authentication required for this action',
            code: 'MFA_REQUIRED'
          });
        }

        // Load user permissions if not already loaded
        if (!req.user.permissions) {
          req.user.permissions = await RBACMiddleware.loadUserPermissions(req.user.id);
        }

        // Department check (if specified)
        const userDepartment = check.department || req.user.department;
        if (!userDepartment) {
          return res.status(403).json({
            message: 'Department assignment required',
            code: 'DEPARTMENT_REQUIRED'
          });
        }

        // Permission check
        const hasRequiredPermission = hasPermission(
          req.user.enhancedRole,
          userDepartment,
          check.resource,
          check.action
        );

        // Check for permission exceptions (temporary elevated access)
        let hasException = false;
        if (!hasRequiredPermission) {
          hasException = await RBACMiddleware.checkPermissionException(
            req.user.id,
            check.resource,
            check.action
          );
        }

        if (!hasRequiredPermission && !hasException) {
          await auditService.logAudit(
            'access_denied',
            check.resource,
            auditService.createContextFromRequest(req),
            {
              severity: 'warning',
              category: 'access_control',
              description: `Access denied: ${check.action} on ${check.resource}`,
              tags: ['access_denied', 'permission_check'],
              metadata: {
                requiredPermission: `${userDepartment}:${check.resource}:${check.action}`,
                userRole: req.user.enhancedRole,
                userDepartment
              }
            }
          );

          return res.status(403).json({
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: `${userDepartment}:${check.resource}:${check.action}`
          });
        }

        // Custom permission check
        if (check.customCheck) {
          const customCheckPassed = await check.customCheck(req);
          if (!customCheckPassed) {
            await auditService.logAudit(
              'custom_check_failed',
              check.resource,
              auditService.createContextFromRequest(req),
              {
                severity: 'warning',
                category: 'access_control',
                description: `Custom permission check failed for ${check.action} on ${check.resource}`
              }
            );

            return res.status(403).json({
              message: 'Custom permission check failed',
              code: 'CUSTOM_CHECK_FAILED'
            });
          }
        }

        // Own resource check
        if (check.ownResourceOnly) {
          const resourceId = req.params.id || req.params.userId || req.body.userId;
          if (resourceId && resourceId !== req.user.id) {
            await auditService.logAudit(
              'own_resource_violation',
              check.resource,
              auditService.createContextFromRequest(req),
              {
                resourceId,
                severity: 'warning',
                category: 'access_control',
                description: `Attempted access to resource owned by another user`
              }
            );

            return res.status(403).json({
              message: 'Can only access your own resources',
              code: 'OWN_RESOURCE_ONLY'
            });
          }
        }

        // Log successful access for sensitive resources
        if (isSensitiveResource(check.resource)) {
          await auditService.logAudit(
            'sensitive_access_granted',
            check.resource,
            auditService.createContextFromRequest(req),
            {
              severity: 'info',
              category: 'access_control',
              isSensitive: true,
              description: `Sensitive resource access: ${check.action} on ${check.resource}`,
              tags: ['sensitive_access', 'granted']
            }
          );
        }

        // Track permission exception usage
        if (hasException) {
          await RBACMiddleware.trackExceptionUsage(
            req.user.id,
            check.resource,
            check.action
          );
        }

        next();

      } catch (error) {
        sentryService.captureException(error as Error, {
          feature: 'rbac_middleware',
          userId: req.user?.id,
          additionalData: {
            resource: check.resource,
            action: check.action
          }
        });

        res.status(500).json({
          message: 'Permission check failed',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * Require specific role
   */
  static requireRole(role: EnhancedUserRole | EnhancedUserRole[]) {
    const roles = Array.isArray(role) ? role : [role];

    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!roles.includes(req.user.enhancedRole)) {
        auditService.logAudit(
          'role_access_denied',
          'users',
          auditService.createContextFromRequest(req),
          {
            severity: 'warning',
            category: 'access_control',
            description: `Role access denied. Required: ${roles.join('|')}, User has: ${req.user.enhancedRole}`,
            tags: ['role_denied']
          }
        );

        return res.status(403).json({
          message: 'Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          required: roles,
          current: req.user.enhancedRole
        });
      }

      next();
    };
  }

  /**
   * Require specific department
   */
  static requireDepartment(department: Department | Department[]) {
    const departments = Array.isArray(department) ? department : [department];

    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!req.user.department || !departments.includes(req.user.department)) {
        return res.status(403).json({
          message: 'Department access required',
          code: 'DEPARTMENT_ACCESS_REQUIRED',
          required: departments,
          current: req.user.department
        });
      }

      next();
    };
  }

  /**
   * Audit middleware - logs all requests to sensitive resources
   */
  static auditRequest(resource: PermissionResource, options?: {
    logSensitiveOnly?: boolean;
    includeRequestBody?: boolean;
    includeResponseBody?: boolean;
  }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const shouldLog = options?.logSensitiveOnly ? isSensitiveResource(resource) : true;

      if (shouldLog && req.user) {
        const context = auditService.createContextFromRequest(req);
        const action = RBACMiddleware.methodToAction(req.method);

        // Log the request
        await auditService.logAudit(
          `${action}_requested`,
          resource,
          context,
          {
            resourceId: req.params.id,
            department: req.user.department,
            severity: isSensitiveResource(resource) ? 'warning' : 'info',
            category: 'api_access',
            isSensitive: isSensitiveResource(resource),
            description: `API request: ${req.method} ${req.path}`,
            tags: ['api_request'],
            metadata: {
              requestBody: options?.includeRequestBody ? req.body : undefined,
              query: req.query
            }
          }
        );

        // Hook into response to log completion
        const originalSend = res.send;
        res.send = function(body) {
          // Log response (async, don't block response)
          setImmediate(async () => {
            await auditService.logAudit(
              `${action}_completed`,
              resource,
              context,
              {
                resourceId: req.params.id,
                severity: res.statusCode >= 400 ? 'warning' : 'info',
                category: 'api_response',
                description: `API response: ${res.statusCode} for ${req.method} ${req.path}`,
                tags: ['api_response'],
                metadata: {
                  statusCode: res.statusCode,
                  responseBody: options?.includeResponseBody && res.statusCode < 400 ? body : undefined
                }
              }
            );
          });

          return originalSend.call(this, body);
        };
      }

      next();
    };
  }

  /**
   * Load user permissions from database
   */
  private static async loadUserPermissions(userId: string): Promise<string[]> {
    try {
      const userWithRoles = await db
        .select({
          role: roles.permissions,
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(
          and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.isActive, true),
            eq(roles.isActive, true)
          )
        );

      // Flatten permissions from all roles
      const permissions = new Set<string>();
      userWithRoles.forEach(({ role }) => {
        if (role) {
          role.forEach(permission => permissions.add(permission));
        }
      });

      return Array.from(permissions);

    } catch (error) {
      console.error('Failed to load user permissions:', error);
      return [];
    }
  }

  /**
   * Check for temporary permission exceptions
   */
  private static async checkPermissionException(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction
  ): Promise<boolean> {
    try {
      const exceptions = await db
        .select()
        .from(permissionExceptions)
        .where(
          and(
            eq(permissionExceptions.userId, userId),
            eq(permissionExceptions.resource, resource),
            eq(permissionExceptions.action, action),
            eq(permissionExceptions.isActive, true)
          )
        );

      const now = new Date();
      return exceptions.some(exception =>
        exception.startsAt <= now && exception.expiresAt > now
      );

    } catch (error) {
      console.error('Failed to check permission exception:', error);
      return false;
    }
  }

  /**
   * Track usage of permission exceptions
   */
  private static async trackExceptionUsage(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction
  ): Promise<void> {
    try {
      await db
        .update(permissionExceptions)
        .set({
          timesUsed: sql`${permissionExceptions.timesUsed} + 1`,
          lastUsedAt: new Date()
        })
        .where(
          and(
            eq(permissionExceptions.userId, userId),
            eq(permissionExceptions.resource, resource),
            eq(permissionExceptions.action, action),
            eq(permissionExceptions.isActive, true)
          )
        );
    } catch (error) {
      console.error('Failed to track exception usage:', error);
    }
  }

  /**
   * Convert HTTP method to permission action
   */
  private static methodToAction(method: string): PermissionAction {
    switch (method.toUpperCase()) {
      case 'GET': return 'read';
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'read';
    }
  }
}

// Export commonly used permission checks
export const PermissionChecks = {
  // User management
  manageUsers: {
    resource: 'users' as PermissionResource,
    action: 'admin' as PermissionAction,
    requireMFA: true
  },

  // Client data
  readClients: {
    resource: 'clients' as PermissionResource,
    action: 'read' as PermissionAction
  },
  writeClients: {
    resource: 'clients' as PermissionResource,
    action: 'create' as PermissionAction
  },

  // Project management
  readProjects: {
    resource: 'projects' as PermissionResource,
    action: 'read' as PermissionAction
  },
  writeProjects: {
    resource: 'projects' as PermissionResource,
    action: 'create' as PermissionAction
  },
  deleteProjects: {
    resource: 'projects' as PermissionResource,
    action: 'delete' as PermissionAction,
    requireMFA: true
  },

  // Financial data
  readFinancial: {
    resource: 'financial_reports' as PermissionResource,
    action: 'read' as PermissionAction,
    requireMFA: true
  },
  writeFinancial: {
    resource: 'financial_reports' as PermissionResource,
    action: 'create' as PermissionAction,
    requireMFA: true
  },

  // System administration
  manageSystem: {
    resource: 'system_settings' as PermissionResource,
    action: 'admin' as PermissionAction,
    requireMFA: true
  },
  manageBackups: {
    resource: 'backup_management' as PermissionResource,
    action: 'admin' as PermissionAction,
    requireMFA: true
  },

  // Data export
  exportData: {
    resource: 'reports' as PermissionResource,
    action: 'export' as PermissionAction,
    requireMFA: true
  }
};

export { RBACMiddleware };