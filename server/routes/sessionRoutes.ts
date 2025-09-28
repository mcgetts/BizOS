import { Router } from 'express';
import { sessionManager } from '../security/sessionManager.js';
import { auditService } from '../security/auditService.js';
import { sentryService } from '../monitoring/sentryService.js';
import { db } from '../db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const destroySessionSchema = z.object({
  sessionId: z.string().min(1)
});

const updateSessionLimitSchema = z.object({
  sessionLimit: z.number().min(1).max(20)
});

/**
 * @route   GET /api/sessions/active
 * @desc    Get active sessions for authenticated user
 * @access  Private
 */
router.get('/active', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const activeSessions = await sessionManager.getActiveSessions(req.user.id);

    // Mask sensitive information for security
    const maskedSessions = activeSessions.map(session => ({
      id: session.id,
      deviceInfo: {
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        device: session.deviceInfo.device,
        isMobile: session.deviceInfo.isMobile
      },
      location: {
        ipAddress: session.location.ipAddress.split('.').slice(0, 3).join('.') + '.***', // Mask last octet
        country: session.location.country,
        city: session.location.city
      },
      activity: session.activity,
      isCurrent: session.id === req.sessionID
    }));

    res.json({
      message: 'Active sessions retrieved successfully',
      data: {
        sessions: maskedSessions,
        total: maskedSessions.length
      }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'get_active_sessions',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to retrieve active sessions',
      code: 'SESSION_RETRIEVAL_ERROR'
    });
  }
});

/**
 * @route   GET /api/sessions/statistics
 * @desc    Get session statistics for authenticated user
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const statistics = await sessionManager.getSessionStatistics(req.user.id);

    res.json({
      message: 'Session statistics retrieved successfully',
      data: statistics
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'get_session_statistics',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to retrieve session statistics',
      code: 'SESSION_STATISTICS_ERROR'
    });
  }
});

/**
 * @route   POST /api/sessions/destroy
 * @desc    Destroy a specific session
 * @access  Private
 */
router.post('/destroy', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const validation = destroySessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { sessionId } = validation.data;

    // Prevent user from destroying their current session through this endpoint
    if (sessionId === req.sessionID) {
      return res.status(400).json({
        message: 'Cannot destroy current session. Use logout instead.',
        code: 'CANNOT_DESTROY_CURRENT_SESSION'
      });
    }

    const destroyed = await sessionManager.destroySession(sessionId, req.user.id);

    if (destroyed) {
      await auditService.logSecurityEvent(
        auditService.createContextFromRequest(req),
        {
          eventType: 'session_manually_destroyed',
          severity: 'medium',
          riskScore: 20,
          eventData: {
            destroyedSessionId: sessionId,
            reason: 'user_requested'
          }
        }
      );

      res.json({
        message: 'Session destroyed successfully',
        data: { sessionId, destroyed: true }
      });
    } else {
      res.status(400).json({
        message: 'Failed to destroy session',
        code: 'SESSION_DESTROY_ERROR'
      });
    }

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'destroy_session',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to destroy session',
      code: 'SESSION_DESTROY_ERROR'
    });
  }
});

/**
 * @route   POST /api/sessions/destroy-all
 * @desc    Destroy all sessions except current one
 * @access  Private
 */
router.post('/destroy-all', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const destroyedCount = await sessionManager.destroyAllUserSessions(
      req.user.id,
      req.sessionID
    );

    await auditService.logSecurityEvent(
      auditService.createContextFromRequest(req),
      {
        eventType: 'all_sessions_manually_destroyed',
        severity: 'high',
        riskScore: 40,
        eventData: {
          sessionsDestroyed: destroyedCount,
          reason: 'user_requested_security_action'
        }
      }
    );

    res.json({
      message: 'All other sessions destroyed successfully',
      data: {
        destroyedSessions: destroyedCount,
        currentSessionPreserved: true
      }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'destroy_all_sessions',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to destroy sessions',
      code: 'SESSION_DESTROY_ALL_ERROR'
    });
  }
});

/**
 * @route   POST /api/sessions/cleanup
 * @desc    Cleanup expired sessions for authenticated user
 * @access  Private
 */
router.post('/cleanup', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const cleanedUpCount = await sessionManager.cleanupExpiredSessions(req.user.id);

    res.json({
      message: 'Session cleanup completed successfully',
      data: {
        cleanedUpSessions: cleanedUpCount
      }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'session_cleanup',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to cleanup sessions',
      code: 'SESSION_CLEANUP_ERROR'
    });
  }
});

/**
 * @route   POST /api/sessions/update-limit
 * @desc    Update session limit for authenticated user (admin only)
 * @access  Private (Admin)
 */
router.post('/update-limit', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.enhancedRole !== 'super_admin') {
      return res.status(403).json({
        message: 'Administrator privileges required',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    const validation = updateSessionLimitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid session limit',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { sessionLimit } = validation.data;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        message: 'Target user ID required',
        code: 'MISSING_TARGET_USER'
      });
    }

    // Update user session limit
    await db.update(users)
      .set({ sessionLimit })
      .where(eq(users.id, targetUserId));

    await auditService.logAudit(
      'session_limit_updated',
      'users',
      auditService.createContextFromRequest(req),
      {
        resourceId: targetUserId,
        severity: 'warning',
        category: 'admin_action',
        description: `Session limit updated to ${sessionLimit}`,
        changes: {
          newValues: { sessionLimit }
        }
      }
    );

    res.json({
      message: 'Session limit updated successfully',
      data: {
        targetUserId,
        newSessionLimit: sessionLimit
      }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'update_session_limit',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to update session limit',
      code: 'SESSION_LIMIT_UPDATE_ERROR'
    });
  }
});

/**
 * @route   POST /api/sessions/validate
 * @desc    Validate current session
 * @access  Private
 */
router.post('/validate', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const isValid = await sessionManager.validateSession(req.sessionID, req.user.id);

    res.json({
      message: 'Session validation completed',
      data: {
        sessionId: req.sessionID,
        isValid,
        userId: req.user.id
      }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'session_validation',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Session validation failed',
      code: 'SESSION_VALIDATION_ERROR'
    });
  }
});

export { router as sessionRoutes };