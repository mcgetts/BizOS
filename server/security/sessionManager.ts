import { db } from '../db.js';
import { userSessions, users } from '@shared/schema';
import { eq, and, lt, or } from 'drizzle-orm';
import { auditService } from './auditService.js';
import { sentryService } from '../monitoring/sentryService.js';
import type { Request } from 'express';

interface SessionInfo {
  id: string;
  userId: string;
  sessionData?: Record<string, any>;
  deviceInfo: {
    userAgent: string;
    fingerprint: string;
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
  };
  location: {
    ipAddress: string;
    country?: string;
    city?: string;
  };
  activity: {
    lastActivity: Date;
    loginTime: Date;
    isActive: boolean;
  };
}

interface SessionLimits {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  forceLogoutOnLimit: boolean;
}

export class SessionManager {
  private static readonly DEFAULT_LIMITS: SessionLimits = {
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 24 * 60, // 24 hours
    idleTimeoutMinutes: 30,
    forceLogoutOnLimit: true
  };

  /**
   * Create a new user session
   */
  static async createSession(
    userId: string,
    sessionId: string,
    req: Request,
    sessionData?: Record<string, any>
  ): Promise<SessionInfo> {
    try {
      // Get user session limits
      const user = await db
        .select({ sessionLimit: users.sessionLimit })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const sessionLimit = user[0]?.sessionLimit || this.DEFAULT_LIMITS.maxConcurrentSessions;

      // Clean up expired sessions first
      await this.cleanupExpiredSessions(userId);

      // Check if user has reached session limit
      const activeSessions = await this.getActiveSessions(userId);

      if (activeSessions.length >= sessionLimit) {
        if (this.DEFAULT_LIMITS.forceLogoutOnLimit) {
          // Remove oldest session
          const oldestSession = activeSessions
            .sort((a, b) => a.activity.lastActivity.getTime() - b.activity.lastActivity.getTime())[0];

          await this.destroySession(oldestSession.id);

          await auditService.logSecurityEvent(
            { userId, sessionId, ipAddress: this.getClientIP(req) },
            {
              eventType: 'session_limit_exceeded',
              severity: 'medium',
              riskScore: 20,
              eventData: {
                action: 'oldest_session_removed',
                removedSessionId: oldestSession.id,
                activeSessionCount: activeSessions.length,
                sessionLimit
              }
            }
          );
        } else {
          throw new Error(`Session limit exceeded. Maximum ${sessionLimit} concurrent sessions allowed.`);
        }
      }

      // Generate device fingerprint
      const deviceInfo = this.extractDeviceInfo(req);
      const fingerprint = this.generateDeviceFingerprint(req);

      // Create session record
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.DEFAULT_LIMITS.sessionTimeoutMinutes * 60 * 1000);

      await db.insert(userSessions).values({
        id: sessionId,
        userId,
        deviceFingerprint: fingerprint,
        userAgent: req.get('User-Agent') || '',
        ipAddress: this.getClientIP(req),
        location: this.extractLocation(req),
        sessionData: sessionData || {},
        isActive: true,
        lastActivityAt: now,
        expiresAt,
        createdAt: now,
      });

      await auditService.logSecurityEvent(
        { userId, sessionId, ipAddress: this.getClientIP(req) },
        {
          eventType: 'session_created',
          severity: 'low',
          riskScore: 0,
          eventData: {
            deviceInfo: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            sessionTimeout: this.DEFAULT_LIMITS.sessionTimeoutMinutes
          }
        }
      );

      return {
        id: sessionId,
        userId,
        sessionData,
        deviceInfo: {
          ...deviceInfo,
          fingerprint
        },
        location: {
          ipAddress: this.getClientIP(req),
          ...this.extractLocation(req)
        },
        activity: {
          lastActivity: now,
          loginTime: now,
          isActive: true
        }
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_create',
        userId
      });
      throw error;
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string, userId: string): Promise<void> {
    try {
      const now = new Date();

      await db
        .update(userSessions)
        .set({
          lastActivityAt: now,
          isActive: true
        })
        .where(
          and(
            eq(userSessions.id, sessionId),
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        );

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_activity_update',
        userId,
        additionalData: { sessionId }
      });
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        );

      return sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        sessionData: session.sessionData,
        deviceInfo: {
          userAgent: session.userAgent,
          fingerprint: session.deviceFingerprint,
          browser: this.extractBrowser(session.userAgent),
          os: this.extractOS(session.userAgent),
          device: this.extractDevice(session.userAgent),
          isMobile: /Mobile|Android|iPhone|iPad/.test(session.userAgent)
        },
        location: {
          ipAddress: session.ipAddress,
          ...session.location
        },
        activity: {
          lastActivity: session.lastActivityAt,
          loginTime: session.createdAt,
          isActive: session.isActive
        }
      }));

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'get_active_sessions',
        userId
      });
      return [];
    }
  }

  /**
   * Destroy a specific session
   */
  static async destroySession(sessionId: string, userId?: string): Promise<boolean> {
    try {
      const whereClause = userId
        ? and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId))
        : eq(userSessions.id, sessionId);

      const result = await db
        .update(userSessions)
        .set({
          isActive: false,
          loggedOutAt: new Date()
        })
        .where(whereClause);

      if (userId) {
        await auditService.logSecurityEvent(
          { userId, sessionId },
          {
            eventType: 'session_destroyed',
            severity: 'low',
            riskScore: 0,
            eventData: { reason: 'user_logout' }
          }
        );
      }

      return true;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_destroy',
        userId,
        additionalData: { sessionId }
      });
      return false;
    }
  }

  /**
   * Destroy all sessions for a user
   */
  static async destroyAllUserSessions(userId: string, currentSessionId?: string): Promise<number> {
    try {
      const whereClause = currentSessionId
        ? and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true),
            eq(userSessions.id, currentSessionId)
          )
        : and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          );

      const sessionsToDestroy = await db
        .select({ id: userSessions.id })
        .from(userSessions)
        .where(whereClause);

      await db
        .update(userSessions)
        .set({
          isActive: false,
          loggedOutAt: new Date()
        })
        .where(whereClause);

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'all_sessions_destroyed',
          severity: 'medium',
          riskScore: 30,
          eventData: {
            sessionsDestroyed: sessionsToDestroy.length,
            keepCurrentSession: !!currentSessionId
          }
        }
      );

      return sessionsToDestroy.length;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'destroy_all_sessions',
        userId
      });
      return 0;
    }
  }

  /**
   * Check if session is valid and active
   */
  static async validateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.id, sessionId),
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        )
        .limit(1);

      if (!session.length) {
        return false;
      }

      const sessionRecord = session[0];
      const now = new Date();

      // Check session expiration
      if (sessionRecord.expiresAt && sessionRecord.expiresAt < now) {
        await this.destroySession(sessionId, userId);
        return false;
      }

      // Check idle timeout
      const idleTimeout = new Date(now.getTime() - this.DEFAULT_LIMITS.idleTimeoutMinutes * 60 * 1000);
      if (sessionRecord.lastActivityAt < idleTimeout) {
        await this.destroySession(sessionId, userId);

        await auditService.logSecurityEvent(
          { userId, sessionId },
          {
            eventType: 'session_idle_timeout',
            severity: 'low',
            riskScore: 10,
            eventData: {
              lastActivity: sessionRecord.lastActivityAt,
              idleTimeoutMinutes: this.DEFAULT_LIMITS.idleTimeoutMinutes
            }
          }
        );

        return false;
      }

      // Update activity
      await this.updateSessionActivity(sessionId, userId);

      return true;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_validation',
        userId,
        additionalData: { sessionId }
      });
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(userId?: string): Promise<number> {
    try {
      const now = new Date();
      const idleTimeout = new Date(now.getTime() - this.DEFAULT_LIMITS.idleTimeoutMinutes * 60 * 1000);

      const whereClause = userId
        ? and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true),
            or(
              lt(userSessions.expiresAt, now),
              lt(userSessions.lastActivityAt, idleTimeout)
            )
          )
        : and(
            eq(userSessions.isActive, true),
            or(
              lt(userSessions.expiresAt, now),
              lt(userSessions.lastActivityAt, idleTimeout)
            )
          );

      const expiredSessions = await db
        .select({ id: userSessions.id, userId: userSessions.userId })
        .from(userSessions)
        .where(whereClause);

      if (expiredSessions.length > 0) {
        await db
          .update(userSessions)
          .set({
            isActive: false,
            loggedOutAt: now
          })
          .where(whereClause);

        // Log cleanup for audit
        if (userId) {
          await auditService.logSecurityEvent(
            { userId },
            {
              eventType: 'sessions_cleaned_up',
              severity: 'low',
              riskScore: 0,
              eventData: {
                expiredSessions: expiredSessions.length,
                cleanupType: 'user_specific'
              }
            }
          );
        }
      }

      return expiredSessions.length;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_cleanup',
        userId
      });
      return 0;
    }
  }

  /**
   * Get session statistics for a user
   */
  static async getSessionStatistics(userId: string): Promise<{
    activeSessions: number;
    totalSessions: number;
    sessionLimit: number;
    recentLogins: number;
  }> {
    try {
      const [user, sessions, recentSessions] = await Promise.all([
        db.select({ sessionLimit: users.sessionLimit })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),

        db.select()
          .from(userSessions)
          .where(eq(userSessions.userId, userId)),

        db.select()
          .from(userSessions)
          .where(
            and(
              eq(userSessions.userId, userId),
              eq(userSessions.isActive, true),
              lt(userSessions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
            )
          )
      ]);

      const activeSessions = sessions.filter(s => s.isActive).length;
      const sessionLimit = user[0]?.sessionLimit || this.DEFAULT_LIMITS.maxConcurrentSessions;

      return {
        activeSessions,
        totalSessions: sessions.length,
        sessionLimit,
        recentLogins: recentSessions.length
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_statistics',
        userId
      });

      return {
        activeSessions: 0,
        totalSessions: 0,
        sessionLimit: this.DEFAULT_LIMITS.maxConcurrentSessions,
        recentLogins: 0
      };
    }
  }

  /**
   * Generate device fingerprint
   */
  private static generateDeviceFingerprint(req: Request): string {
    const components = [
      req.get('User-Agent'),
      req.get('Accept-Language'),
      req.get('Accept-Encoding'),
      this.getClientIP(req)
    ].filter(Boolean);

    return Buffer.from(components.join('|')).toString('base64');
  }

  /**
   * Extract device information from request
   */
  private static extractDeviceInfo(req: Request) {
    const userAgent = req.get('User-Agent') || '';

    return {
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
      device: this.extractDevice(userAgent),
      isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
    };
  }

  /**
   * Extract location information from request
   */
  private static extractLocation(req: Request): Record<string, any> {
    return {
      country: req.get('CF-IPCountry') || req.get('X-Country'),
      city: req.get('CF-IPCity') || req.get('X-City'),
      timezone: req.get('CF-Timezone') || req.get('X-Timezone')
    };
  }

  /**
   * Get client IP address
   */
  private static getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Extract browser from user agent
   */
  private static extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Extract OS from user agent
   */
  private static extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Extract device from user agent
   */
  private static extractDevice(userAgent: string): string {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    return 'Desktop';
  }
}

// Export singleton instance
export const sessionManager = SessionManager;