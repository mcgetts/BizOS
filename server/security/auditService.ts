import { db } from '../db.js';
import { auditLogs, securityEvents, dataAccessLogs } from '@shared/schema';
import { sentryService } from '../monitoring/sentryService.js';
import type {
  PermissionResource,
  PermissionAction,
  Department
} from '@shared/permissions';
import type { Request } from 'express';
import { tryGetTenantContext } from '../tenancy/tenantContext';

interface AuditContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  location?: any;
  metadata?: Record<string, any>;
}

interface ChangeDetails {
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, any>;
}

interface SecurityEventData {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  riskScore?: number;
  isBlocked?: boolean;
  blockReason?: string;
  eventData?: Record<string, any>;
  correlationId?: string;
}

interface DataAccessDetails {
  accessMethod?: string;
  purpose?: string;
  fieldsAccessed?: string[];
  recordCount?: number;
  exportFormat?: string;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  isPersonalData?: boolean;
  isFinancialData?: boolean;
}

export class AuditService {
  /**
   * Log a general audit event
   */
  async logAudit(
    action: string,
    resource: PermissionResource,
    context: AuditContext,
    options: {
      resourceId?: string;
      department?: Department;
      changes?: ChangeDetails;
      severity?: 'info' | 'warning' | 'critical';
      category?: string;
      isSensitive?: boolean;
      requiresReview?: boolean;
      description?: string;
      tags?: string[];
    } = {}
  ): Promise<void> {
    try {
      // Multi-tenant: Get organizationId from tenant context if available
      const tenantContext = tryGetTenantContext();

      await db.insert(auditLogs).values({
        userId: context.userId,
        sessionId: context.sessionId,
        organizationId: tenantContext?.organizationId, // Multi-tenant isolation
        action,
        resource,
        resourceId: options.resourceId,
        department: options.department,
        oldValues: options.changes?.oldValues,
        newValues: options.changes?.newValues,
        changes: options.changes?.changes,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceInfo: context.deviceInfo,
        location: context.location,
        severity: options.severity || 'info',
        category: options.category || 'user_action',
        isSensitive: options.isSensitive || false,
        requiresReview: options.requiresReview || false,
        metadata: context.metadata,
        tags: options.tags,
        description: options.description || `${action} on ${resource}`,
      });

      // Add breadcrumb for debugging
      sentryService.addBreadcrumb(
        `Audit: ${action} on ${resource}`,
        {
          userId: context.userId,
          resource,
          resourceId: options.resourceId,
          severity: options.severity,
          isSensitive: options.isSensitive
        },
        options.severity === 'critical' ? 'error' : 'info'
      );

    } catch (error) {
      console.error('Failed to log audit event:', error);
      sentryService.captureException(error as Error, {
        feature: 'audit_logging',
        userId: context.userId
      });
    }
  }

  /**
   * Log a security event (login attempts, MFA, etc.)
   */
  async logSecurityEvent(
    context: AuditContext,
    eventData: SecurityEventData
  ): Promise<void> {
    try {
      const tenantContext = tryGetTenantContext();

      await db.insert(securityEvents).values({
        userId: context.userId,
        organizationId: tenantContext?.organizationId, // Multi-tenant isolation
        eventType: eventData.eventType,
        severity: eventData.severity,
        source: eventData.source || 'web',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceFingerprint: this.generateDeviceFingerprint(context),
        location: context.location,
        riskScore: eventData.riskScore || 0,
        isBlocked: eventData.isBlocked || false,
        blockReason: eventData.blockReason,
        eventData: eventData.eventData,
        correlationId: eventData.correlationId,
      });

      // Log critical security events to Sentry
      if (eventData.severity === 'critical' || eventData.severity === 'high') {
        sentryService.captureMessage(
          `Security Event: ${eventData.eventType}`,
          eventData.severity === 'critical' ? 'error' : 'warning',
          {
            feature: 'security_monitoring',
            userId: context.userId,
            additionalData: {
              eventType: eventData.eventType,
              severity: eventData.severity,
              riskScore: eventData.riskScore,
              isBlocked: eventData.isBlocked
            }
          }
        );
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
      sentryService.captureException(error as Error, {
        feature: 'security_logging',
        userId: context.userId
      });
    }
  }

  /**
   * Log data access for sensitive resources
   */
  async logDataAccess(
    context: AuditContext,
    resource: PermissionResource,
    resourceId: string,
    action: PermissionAction,
    details: DataAccessDetails
  ): Promise<void> {
    try {
      const tenantContext = tryGetTenantContext();

      await db.insert(dataAccessLogs).values({
        userId: context.userId!,
        organizationId: tenantContext?.organizationId, // Multi-tenant isolation
        resource,
        resourceId,
        action,
        accessMethod: details.accessMethod || 'ui',
        purpose: details.purpose,
        fieldsAccessed: details.fieldsAccessed,
        recordCount: details.recordCount || 1,
        exportFormat: details.exportFormat,
        dataClassification: details.dataClassification || 'internal',
        isPersonalData: details.isPersonalData || false,
        isFinancialData: details.isFinancialData || false,
      });

      // Also log as general audit event for sensitive data
      if (details.dataClassification === 'confidential' || details.dataClassification === 'restricted') {
        await this.logAudit(action, resource, context, {
          resourceId,
          severity: 'warning',
          category: 'data_access',
          isSensitive: true,
          description: `Sensitive data access: ${resource}`,
          tags: ['sensitive_data', details.dataClassification]
        });
      }

    } catch (error) {
      console.error('Failed to log data access:', error);
      sentryService.captureException(error as Error, {
        feature: 'data_access_logging',
        userId: context.userId
      });
    }
  }

  /**
   * Create audit context from Express request
   */
  createContextFromRequest(req: Request): AuditContext {
    return {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      deviceInfo: this.extractDeviceInfo(req),
      location: req.body?.location || req.headers['x-user-location'],
      metadata: {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(
    eventType: 'login_success' | 'login_failed' | 'logout' | 'password_changed' | 'mfa_enabled' | 'mfa_disabled' | 'account_locked',
    context: AuditContext,
    details?: Record<string, any>
  ): Promise<void> {
    const severityMap = {
      login_success: 'low' as const,
      login_failed: 'medium' as const,
      logout: 'low' as const,
      password_changed: 'medium' as const,
      mfa_enabled: 'low' as const,
      mfa_disabled: 'high' as const,
      account_locked: 'high' as const
    };

    const riskScoreMap = {
      login_success: 0,
      login_failed: 30,
      logout: 0,
      password_changed: 10,
      mfa_enabled: 0,
      mfa_disabled: 50,
      account_locked: 80
    };

    await this.logSecurityEvent(context, {
      eventType,
      severity: severityMap[eventType],
      riskScore: riskScoreMap[eventType],
      eventData: details,
      correlationId: context.sessionId
    });
  }

  /**
   * Log user permission changes
   */
  async logPermissionChange(
    action: 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked',
    targetUserId: string,
    context: AuditContext,
    details: {
      role?: string;
      permission?: string;
      reason?: string;
      expiresAt?: Date;
    }
  ): Promise<void> {
    await this.logAudit(action, 'users', context, {
      resourceId: targetUserId,
      severity: 'warning',
      category: 'permission_change',
      isSensitive: true,
      requiresReview: true,
      description: `${action} for user ${targetUserId}`,
      tags: ['permission_change', action],
      changes: {
        newValues: details
      }
    });
  }

  /**
   * Log administrative actions
   */
  async logAdminAction(
    action: string,
    resource: PermissionResource,
    context: AuditContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logAudit(action, resource, context, {
      severity: 'warning',
      category: 'admin_action',
      isSensitive: true,
      requiresReview: true,
      description: `Admin action: ${action} on ${resource}`,
      tags: ['admin_action'],
      changes: {
        newValues: details
      }
    });
  }

  /**
   * Log system configuration changes
   */
  async logSystemChange(
    action: string,
    context: AuditContext,
    changes: ChangeDetails,
    options?: {
      severity?: 'info' | 'warning' | 'critical';
      requiresReview?: boolean;
    }
  ): Promise<void> {
    await this.logAudit(action, 'system_settings', context, {
      severity: options?.severity || 'warning',
      category: 'system_change',
      isSensitive: true,
      requiresReview: options?.requiresReview || true,
      description: `System configuration change: ${action}`,
      tags: ['system_change'],
      changes
    });
  }

  /**
   * Get audit trail for a specific user
   */
  async getUserAuditTrail(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actions?: string[];
      resources?: PermissionResource[];
      severity?: string[];
    } = {}
  ) {
    // This would implement the query logic to retrieve audit logs
    // For now, returning a placeholder structure
    return {
      logs: [],
      total: 0,
      ...options
    };
  }

  /**
   * Get security events for investigation
   */
  async getSecurityEvents(
    options: {
      userId?: string;
      eventTypes?: string[];
      severity?: string[];
      startDate?: Date;
      endDate?: Date;
      isBlocked?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    // This would implement the query logic to retrieve security events
    // For now, returning a placeholder structure
    return {
      events: [],
      total: 0,
      ...options
    };
  }

  /**
   * Generate device fingerprint for tracking
   */
  private generateDeviceFingerprint(context: AuditContext): string {
    const components = [
      context.userAgent,
      context.ipAddress,
      JSON.stringify(context.deviceInfo)
    ].filter(Boolean);

    return Buffer.from(components.join('|')).toString('base64');
  }

  /**
   * Extract client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Extract device information from request
   */
  private extractDeviceInfo(req: Request): any {
    const userAgent = req.get('User-Agent') || '';

    return {
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
      device: this.extractDevice(userAgent),
      mobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
    };
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private extractDevice(userAgent: string): string {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    return 'Desktop';
  }
}

// Singleton instance
export const auditService = new AuditService();