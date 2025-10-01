import { db } from '../db.js';
import { systemSettings, userInvitations, users } from '@shared/schema';
import { eq, and, or, lt, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auditService } from './auditService.js';
import { sentryService } from '../monitoring/sentryService.js';

export interface AllowedDomainsConfig {
  domains: string[];
  requireDomain: boolean; // If true, users must have an allowed domain or invitation
}

export interface InvitationDetails {
  email: string;
  role?: string;
  invitedBy: string;
  expiresInDays?: number;
  notes?: string;
}

export class AccessControlService {
  private static readonly SETTINGS_KEY_ALLOWED_DOMAINS = 'auth.allowed_domains';
  private static readonly DEFAULT_INVITATION_EXPIRY_DAYS = 7;

  /**
   * Get allowed email domains for auto-approval
   */
  async getAllowedDomains(): Promise<AllowedDomainsConfig> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, AccessControlService.SETTINGS_KEY_ALLOWED_DOMAINS))
        .limit(1);

      if (!setting || !setting.value) {
        // Default: no domain restrictions, first user becomes admin
        return {
          domains: [],
          requireDomain: false
        };
      }

      return setting.value as AllowedDomainsConfig;
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_get_domains'
      });
      throw new Error('Failed to retrieve allowed domains');
    }
  }

  /**
   * Update allowed email domains
   */
  async updateAllowedDomains(
    config: AllowedDomainsConfig,
    updatedBy: string
  ): Promise<void> {
    try {
      // Normalize domains to lowercase
      const normalizedConfig = {
        ...config,
        domains: config.domains.map(d => d.toLowerCase().trim())
      };

      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, AccessControlService.SETTINGS_KEY_ALLOWED_DOMAINS))
        .limit(1);

      if (existing) {
        await db
          .update(systemSettings)
          .set({
            value: normalizedConfig,
            updatedBy,
            updatedAt: new Date()
          })
          .where(eq(systemSettings.id, existing.id));
      } else {
        await db.insert(systemSettings).values({
          key: AccessControlService.SETTINGS_KEY_ALLOWED_DOMAINS,
          value: normalizedConfig,
          description: 'Email domains allowed for automatic user registration',
          updatedBy
        });
      }

      await auditService.logSecurityEvent(
        { userId: updatedBy },
        {
          eventType: 'allowed_domains_updated',
          severity: 'medium',
          riskScore: 30,
          eventData: { config: normalizedConfig }
        }
      );
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_update_domains',
        userId: updatedBy
      });
      throw new Error('Failed to update allowed domains');
    }
  }

  /**
   * Check if an email is from an allowed domain
   */
  async isEmailDomainAllowed(email: string): Promise<boolean> {
    try {
      const config = await this.getAllowedDomains();
      
      if (config.domains.length === 0) {
        // No domain restrictions - allow all
        return true;
      }

      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (!emailDomain) {
        return false;
      }

      return config.domains.includes(emailDomain);
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_check_domain',
        email
      });
      return false;
    }
  }

  /**
   * Create a new invitation
   */
  async createInvitation(details: InvitationDetails): Promise<{ token: string; expiresAt: Date }> {
    try {
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (details.expiresInDays || AccessControlService.DEFAULT_INVITATION_EXPIRY_DAYS));

      await db.insert(userInvitations).values({
        token,
        email: details.email.toLowerCase(),
        role: details.role || 'employee',
        invitedBy: details.invitedBy,
        expiresAt,
        status: 'pending',
        notes: details.notes
      });

      await auditService.logSecurityEvent(
        { userId: details.invitedBy },
        {
          eventType: 'invitation_created',
          severity: 'low',
          riskScore: 10,
          eventData: { email: details.email, role: details.role }
        }
      );

      return { token, expiresAt };
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_create_invitation',
        userId: details.invitedBy
      });
      throw new Error('Failed to create invitation');
    }
  }

  /**
   * Validate an invitation token
   */
  async validateInvitation(token: string, email?: string): Promise<{
    valid: boolean;
    invitation?: typeof userInvitations.$inferSelect;
    reason?: string;
  }> {
    try {
      const [invitation] = await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.token, token))
        .limit(1);

      if (!invitation) {
        return { valid: false, reason: 'Invitation not found' };
      }

      if (invitation.status !== 'pending') {
        return { valid: false, reason: `Invitation ${invitation.status}` };
      }

      if (new Date() > invitation.expiresAt) {
        // Auto-expire the invitation
        await db
          .update(userInvitations)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(userInvitations.id, invitation.id));
        
        return { valid: false, reason: 'Invitation expired' };
      }

      // If email is provided, check if it matches
      if (email && invitation.email.toLowerCase() !== email.toLowerCase()) {
        return { valid: false, reason: 'Email does not match invitation' };
      }

      return { valid: true, invitation };
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_validate_invitation',
        token
      });
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Accept an invitation (mark as used)
   */
  async acceptInvitation(token: string, userId: string): Promise<void> {
    try {
      await db
        .update(userInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedByUserId: userId,
          updatedAt: new Date()
        })
        .where(eq(userInvitations.token, token));

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'invitation_accepted',
          severity: 'low',
          riskScore: 0,
          eventData: { token }
        }
      );
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_accept_invitation',
        userId
      });
      throw new Error('Failed to accept invitation');
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(token: string, revokedBy: string): Promise<void> {
    try {
      await db
        .update(userInvitations)
        .set({
          status: 'revoked',
          updatedAt: new Date()
        })
        .where(eq(userInvitations.token, token));

      await auditService.logSecurityEvent(
        { userId: revokedBy },
        {
          eventType: 'invitation_revoked',
          severity: 'low',
          riskScore: 5,
          eventData: { token }
        }
      );
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_revoke_invitation',
        userId: revokedBy
      });
      throw new Error('Failed to revoke invitation');
    }
  }

  /**
   * Get all invitations
   */
  async getAllInvitations(filters?: {
    status?: string;
    invitedBy?: string;
    includeExpired?: boolean;
  }): Promise<typeof userInvitations.$inferSelect[]> {
    try {
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(userInvitations.status, filters.status));
      }

      if (filters?.invitedBy) {
        conditions.push(eq(userInvitations.invitedBy, filters.invitedBy));
      }

      if (!filters?.includeExpired) {
        conditions.push(gt(userInvitations.expiresAt, new Date()));
      }

      const query = conditions.length > 0
        ? db.select().from(userInvitations).where(and(...conditions))
        : db.select().from(userInvitations);

      return await query;
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_get_invitations'
      });
      throw new Error('Failed to retrieve invitations');
    }
  }

  /**
   * Check if user can register (main access control check)
   */
  async canUserRegister(email: string, invitationToken?: string): Promise<{
    allowed: boolean;
    reason?: string;
    invitation?: typeof userInvitations.$inferSelect;
  }> {
    try {
      // Check if this is the first user (always allow for initial setup)
      const userCount = await db.select().from(users);
      if (userCount.length === 0) {
        return { allowed: true, reason: 'First user setup' };
      }

      // Get domain configuration first to determine access mode
      const config = await this.getAllowedDomains();

      // Check if invitation token is provided and valid (always takes precedence)
      if (invitationToken) {
        const inviteCheck = await this.validateInvitation(invitationToken, email);
        if (inviteCheck.valid) {
          return { allowed: true, reason: 'Valid invitation', invitation: inviteCheck.invitation };
        }
      }

      // Determine access mode based on configuration
      const hasDomains = config.domains.length > 0;
      const emailDomain = email.split('@')[1]?.toLowerCase();

      if (config.requireDomain) {
        // Strict mode: require domain match or invitation
        if (!hasDomains) {
          // Invitation-only mode: domains=[], requireDomain=true
          return { allowed: false, reason: 'Invitation required. Please contact your administrator for access.' };
        }
        // Domain-restricted mode: check if email domain is in allowed list
        if (emailDomain && config.domains.includes(emailDomain)) {
          return { allowed: true, reason: 'Allowed email domain' };
        }
        return { allowed: false, reason: 'Access restricted to specific email domains. Please contact your administrator for access.' };
      } else {
        // Permissive mode: allow if domain matches (when configured) or open signup
        if (hasDomains) {
          // Domain preference mode: prefer allowed domains but don't require them
          if (emailDomain && config.domains.includes(emailDomain)) {
            return { allowed: true, reason: 'Allowed email domain' };
          }
          // Domain configured but not matched - could allow or deny based on business needs
          // For now, deny if domains are configured (safer default)
          return { allowed: false, reason: 'Access restricted. Please use a company email or request an invitation.' };
        }
        // Open signup mode: no domains configured, no restrictions
        return { allowed: true, reason: 'Open signup enabled' };
      }
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_can_register',
        email
      });
      return { allowed: false, reason: 'Access control check failed' };
    }
  }

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await db
        .update(userInvitations)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(
          and(
            eq(userInvitations.status, 'pending'),
            lt(userInvitations.expiresAt, new Date())
          )
        );

      return result.rowCount || 0;
    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'access_control_cleanup'
      });
      return 0;
    }
  }
}

// Export singleton instance
export const accessControlService = new AccessControlService();
