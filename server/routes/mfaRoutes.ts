import { Router } from 'express';
import { mfaService } from '../security/mfaService.js';
import { auditService } from '../security/auditService.js';
import { sentryService } from '../monitoring/sentryService.js';
import { RBACMiddleware } from '../security/rbacMiddleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const setupTOTPSchema = z.object({
  email: z.string().email()
});

const verifyTOTPSchema = z.object({
  token: z.string().min(6).max(8)
});

const sendSMSSchema = z.object({
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in international format (+1234567890)')
});

const verifySMSSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'SMS code must be 6 digits')
});

/**
 * @route   POST /api/mfa/setup/totp
 * @desc    Setup TOTP MFA for authenticated user
 * @access  Private
 */
router.post('/setup/totp', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const validation = setupTOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { email } = validation.data;

    // Verify email matches authenticated user
    if (email !== req.user.email) {
      return res.status(403).json({
        message: 'Email does not match authenticated user',
        code: 'EMAIL_MISMATCH'
      });
    }

    const result = await mfaService.setupTOTP(req.user.id, email);

    await auditService.logAudit(
      'mfa_setup_requested',
      'users',
      auditService.createContextFromRequest(req),
      {
        resourceId: req.user.id,
        severity: 'info',
        category: 'security',
        description: 'User requested TOTP MFA setup'
      }
    );

    res.json({
      message: 'TOTP setup initiated successfully',
      data: {
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes
      }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'mfa_setup_totp',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to setup TOTP MFA',
      code: 'MFA_SETUP_ERROR'
    });
  }
});

/**
 * @route   POST /api/mfa/verify/totp
 * @desc    Verify and activate TOTP MFA
 * @access  Private
 */
router.post('/verify/totp', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const validation = verifyTOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid token format',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { token } = validation.data;
    const verified = await mfaService.verifyAndActivateTOTP(req.user.id, token);

    if (verified) {
      await auditService.logAudit(
        'mfa_activated',
        'users',
        auditService.createContextFromRequest(req),
        {
          resourceId: req.user.id,
          severity: 'info',
          category: 'security',
          description: 'TOTP MFA successfully activated'
        }
      );

      res.json({
        message: 'TOTP MFA activated successfully',
        data: { activated: true }
      });
    } else {
      res.status(400).json({
        message: 'Invalid TOTP token',
        code: 'INVALID_TOKEN'
      });
    }

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'mfa_verify_totp',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to verify TOTP token',
      code: 'MFA_VERIFY_ERROR'
    });
  }
});

/**
 * @route   POST /api/mfa/sms/send
 * @desc    Send SMS verification code
 * @access  Private
 */
router.post('/sms/send', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const validation = sendSMSSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid phone number format',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { phoneNumber } = validation.data;
    const sent = await mfaService.sendSMSCode(req.user.id, phoneNumber);

    if (sent) {
      res.json({
        message: 'SMS verification code sent successfully',
        data: { sent: true }
      });
    } else {
      res.status(500).json({
        message: 'Failed to send SMS code',
        code: 'SMS_SEND_ERROR'
      });
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('not configured')) {
      return res.status(503).json({
        message: 'SMS MFA service not available',
        code: 'SMS_NOT_CONFIGURED'
      });
    }

    sentryService.captureException(error as Error, {
      feature: 'mfa_sms_send',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to send SMS verification code',
      code: 'SMS_SEND_ERROR'
    });
  }
});

/**
 * @route   POST /api/mfa/sms/verify
 * @desc    Verify SMS code
 * @access  Private
 */
router.post('/sms/verify', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const validation = verifySMSSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid SMS code format',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { code } = validation.data;
    const verified = await mfaService.verifySMSCode(req.user.id, code);

    if (verified) {
      res.json({
        message: 'SMS code verified successfully',
        data: { verified: true }
      });
    } else {
      res.status(400).json({
        message: 'Invalid or expired SMS code',
        code: 'INVALID_SMS_CODE'
      });
    }

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'mfa_sms_verify',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to verify SMS code',
      code: 'SMS_VERIFY_ERROR'
    });
  }
});

/**
 * @route   POST /api/mfa/disable
 * @desc    Disable MFA for user
 * @access  Private
 */
router.post('/disable', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const disabled = await mfaService.disableMFA(req.user.id);

    if (disabled) {
      await auditService.logAudit(
        'mfa_disabled',
        'users',
        auditService.createContextFromRequest(req),
        {
          resourceId: req.user.id,
          severity: 'warning',
          category: 'security',
          description: 'User disabled MFA authentication'
        }
      );

      res.json({
        message: 'MFA disabled successfully',
        data: { disabled: true }
      });
    } else {
      res.status(500).json({
        message: 'Failed to disable MFA',
        code: 'MFA_DISABLE_ERROR'
      });
    }

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'mfa_disable',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to disable MFA',
      code: 'MFA_DISABLE_ERROR'
    });
  }
});

/**
 * @route   POST /api/mfa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private
 */
router.post('/backup-codes/regenerate', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has MFA enabled
    const mfaEnabled = await mfaService.isMFAEnabled(req.user.id);
    if (!mfaEnabled) {
      return res.status(400).json({
        message: 'MFA must be enabled to regenerate backup codes',
        code: 'MFA_NOT_ENABLED'
      });
    }

    const backupCodes = await mfaService.regenerateBackupCodes(req.user.id);

    await auditService.logAudit(
      'backup_codes_regenerated',
      'users',
      auditService.createContextFromRequest(req),
      {
        resourceId: req.user.id,
        severity: 'info',
        category: 'security',
        description: 'User regenerated MFA backup codes'
      }
    );

    res.json({
      message: 'Backup codes regenerated successfully',
      data: { backupCodes }
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'mfa_backup_codes_regen',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to regenerate backup codes',
      code: 'BACKUP_CODES_ERROR'
    });
  }
});

/**
 * @route   GET /api/mfa/status
 * @desc    Get MFA status for user
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const status = await mfaService.getMFAStatus(req.user.id);

    res.json({
      message: 'MFA status retrieved successfully',
      data: status
    });

  } catch (error) {
    sentryService.captureException(error as Error, {
      feature: 'mfa_status',
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Failed to get MFA status',
      code: 'MFA_STATUS_ERROR'
    });
  }
});

export { router as mfaRoutes };