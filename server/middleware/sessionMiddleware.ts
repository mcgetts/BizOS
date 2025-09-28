import { Request, Response, NextFunction } from 'express';
import { sessionManager } from '../security/sessionManager.js';
import { auditService } from '../security/auditService.js';
import { sentryService } from '../monitoring/sentryService.js';

/**
 * Middleware to track session activity and validate sessions
 */
export function sessionTrackingMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip session tracking for public routes
      if (!req.user || !req.sessionID) {
        return next();
      }

      // Validate and update session activity
      const isValidSession = await sessionManager.validateSession(req.sessionID, req.user.id);

      if (!isValidSession) {
        // Session is invalid, clear authentication
        req.logout((err) => {
          if (err) {
            console.error('Logout error:', err);
          }
        });

        return res.status(401).json({
          message: 'Session expired or invalid',
          code: 'SESSION_EXPIRED'
        });
      }

      // Update session activity
      await sessionManager.updateSessionActivity(req.sessionID, req.user.id);

      next();

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_tracking_middleware',
        userId: req.user?.id,
        additionalData: { sessionId: req.sessionID }
      });

      // Don't block request on session tracking errors
      next();
    }
  };
}

/**
 * Middleware to create session on successful authentication
 */
export function sessionCreationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only create session for authenticated users without existing session tracking
      if (req.user && req.sessionID) {
        // Check if session already exists in our tracking system
        const existingSessions = await sessionManager.getActiveSessions(req.user.id);
        const currentSessionExists = existingSessions.some(session => session.id === req.sessionID);

        if (!currentSessionExists) {
          // Create new session record
          await sessionManager.createSession(
            req.user.id,
            req.sessionID,
            req,
            {
              loginMethod: req.body?.loginMethod || 'standard',
              mfaUsed: req.body?.mfaUsed || false
            }
          );
        }
      }

      next();

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_creation_middleware',
        userId: req.user?.id,
        additionalData: { sessionId: req.sessionID }
      });

      // Don't block authentication on session creation errors
      next();
    }
  };
}

/**
 * Middleware to handle session cleanup on logout
 */
export function sessionCleanupMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user && req.sessionID) {
        // Destroy session in our tracking system
        await sessionManager.destroySession(req.sessionID, req.user.id);

        await auditService.logSecurityEvent(
          auditService.createContextFromRequest(req),
          {
            eventType: 'user_logout',
            severity: 'low',
            riskScore: 0,
            eventData: {
              sessionId: req.sessionID,
              logoutMethod: 'user_initiated'
            }
          }
        );
      }

      next();

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_cleanup_middleware',
        userId: req.user?.id,
        additionalData: { sessionId: req.sessionID }
      });

      // Don't block logout on cleanup errors
      next();
    }
  };
}

/**
 * Middleware to enforce concurrent session limits
 */
export function sessionLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only check limits during authentication
      if (req.user && req.path.includes('/auth/login')) {
        const statistics = await sessionManager.getSessionStatistics(req.user.id);

        if (statistics.activeSessions >= statistics.sessionLimit) {
          await auditService.logSecurityEvent(
            auditService.createContextFromRequest(req),
            {
              eventType: 'session_limit_exceeded_rejected',
              severity: 'medium',
              riskScore: 30,
              eventData: {
                activeSessions: statistics.activeSessions,
                sessionLimit: statistics.sessionLimit,
                action: 'login_rejected'
              }
            }
          );

          return res.status(429).json({
            message: `Session limit exceeded. Maximum ${statistics.sessionLimit} concurrent sessions allowed.`,
            code: 'SESSION_LIMIT_EXCEEDED',
            data: {
              currentSessions: statistics.activeSessions,
              maxSessions: statistics.sessionLimit
            }
          });
        }
      }

      next();

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'session_limit_middleware',
        userId: req.user?.id
      });

      // Don't block on session limit check errors
      next();
    }
  };
}

/**
 * Scheduled cleanup function for expired sessions
 */
export async function scheduleSessionCleanup(): Promise<void> {
  try {
    const cleanedUpCount = await sessionManager.cleanupExpiredSessions();

    if (cleanedUpCount > 0) {
      console.log(`Session cleanup: Removed ${cleanedUpCount} expired sessions`);

      // Log global cleanup event
      await auditService.logAudit(
        'scheduled_session_cleanup',
        'system_settings',
        { metadata: { source: 'scheduled_task' } },
        {
          severity: 'info',
          category: 'system_maintenance',
          description: `Scheduled session cleanup removed ${cleanedUpCount} expired sessions`,
          changes: {
            newValues: { cleanedUpSessions: cleanedUpCount }
          }
        }
      );
    }

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'scheduled_session_cleanup'
    });
    console.error('Scheduled session cleanup failed:', error);
  }
}

/**
 * Initialize session cleanup scheduler
 */
export function initializeSessionCleanup(): void {
  // Run cleanup every 15 minutes
  setInterval(scheduleSessionCleanup, 15 * 60 * 1000);

  // Run initial cleanup
  setTimeout(scheduleSessionCleanup, 5000); // 5 seconds after startup

  console.log('Session cleanup scheduler initialized');
}