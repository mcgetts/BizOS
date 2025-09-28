import { Router } from 'express';
import passport from 'passport';
import { mfaService } from '../security/mfaService.js';
import { auditService } from '../security/auditService.js';
import { sentryService } from '../monitoring/sentryService.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginWithMfaSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().optional(),
  mfaMethod: z.enum(['totp', 'sms']).optional()
});

/**
 * @route   POST /api/auth/login-mfa
 * @desc    Login with MFA verification
 * @access  Public
 */
router.post('/login-mfa', async (req, res, next) => {
  try {
    const validation = loginWithMfaSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors
      });
    }

    const { email, password, mfaToken, mfaMethod } = validation.data;

    // First, authenticate with username/password
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        sentryService.captureException(err, {
          feature: 'auth_mfa_login',
          additionalData: { email }
        });
        return res.status(500).json({
          message: 'Authentication failed',
          code: 'AUTH_ERROR'
        });
      }

      if (!user) {
        await auditService.logSecurityEvent(
          { ipAddress: req.ip, userAgent: req.get('User-Agent') },
          {
            eventType: 'login_failed',
            severity: 'medium',
            riskScore: 30,
            eventData: { email, reason: 'invalid_credentials' }
          }
        );

        return res.status(401).json({
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if user has MFA enabled
      const mfaEnabled = await mfaService.isMFAEnabled(user.id);

      if (mfaEnabled) {
        // MFA is required
        if (!mfaToken || !mfaMethod) {
          return res.status(200).json({
            message: 'MFA verification required',
            code: 'MFA_REQUIRED',
            data: {
              userId: user.id,
              mfaRequired: true,
              availableMethods: ['totp', 'sms'] // Could be dynamic based on user's setup
            }
          });
        }

        // Verify MFA token
        let mfaVerified = false;

        if (mfaMethod === 'totp') {
          mfaVerified = await mfaService.verifyTOTP(user.id, mfaToken);
        } else if (mfaMethod === 'sms') {
          mfaVerified = await mfaService.verifySMSCode(user.id, mfaToken);
        }

        if (!mfaVerified) {
          await auditService.logSecurityEvent(
            { userId: user.id, ipAddress: req.ip, userAgent: req.get('User-Agent') },
            {
              eventType: 'mfa_login_failed',
              severity: 'medium',
              riskScore: 40,
              eventData: {
                email,
                mfaMethod,
                reason: 'invalid_mfa_token'
              }
            }
          );

          return res.status(401).json({
            message: 'Invalid MFA token',
            code: 'INVALID_MFA_TOKEN'
          });
        }

        // MFA verified successfully
        await auditService.logSecurityEvent(
          { userId: user.id, ipAddress: req.ip, userAgent: req.get('User-Agent') },
          {
            eventType: 'mfa_login_success',
            severity: 'low',
            riskScore: 0,
            eventData: { email, mfaMethod }
          }
        );
      }

      // Complete login process
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          sentryService.captureException(err, {
            feature: 'auth_mfa_login_complete',
            userId: user.id
          });
          return res.status(500).json({
            message: 'Login failed',
            code: 'LOGIN_ERROR'
          });
        }

        // Log successful login
        auditService.logSecurityEvent(
          { userId: user.id, ipAddress: req.ip, userAgent: req.get('User-Agent') },
          {
            eventType: 'login_success',
            severity: 'low',
            riskScore: 0,
            eventData: {
              email,
              mfaUsed: mfaEnabled,
              mfaMethod: mfaEnabled ? mfaMethod : null
            }
          }
        );

        res.json({
          message: 'Login successful',
          code: 'LOGIN_SUCCESS',
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              mfaEnabled: user.mfaEnabled
            }
          }
        });
      });

    })(req, res, next);

  } catch (error) {
    console.error('Login with MFA error:', error);
    sentryService.captureException(error as Error, {
      feature: 'auth_mfa_login',
      additionalData: { email: req.body?.email }
    });

    res.status(500).json({
      message: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * @route   POST /api/auth/request-sms-login
 * @desc    Request SMS code for login
 * @access  Public (requires valid email/password first)
 */
router.post('/request-sms-login', async (req, res, next) => {
  try {
    const { email, password, phoneNumber } = req.body;

    if (!email || !password || !phoneNumber) {
      return res.status(400).json({
        message: 'Email, password, and phone number are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify user credentials first
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err || !user) {
        return res.status(401).json({
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if user has MFA enabled
      const mfaEnabled = await mfaService.isMFAEnabled(user.id);
      if (!mfaEnabled) {
        return res.status(400).json({
          message: 'MFA not enabled for this account',
          code: 'MFA_NOT_ENABLED'
        });
      }

      // Send SMS code
      const sent = await mfaService.sendSMSCode(user.id, phoneNumber);

      if (sent) {
        res.json({
          message: 'SMS verification code sent',
          code: 'SMS_SENT',
          data: { userId: user.id }
        });
      } else {
        res.status(500).json({
          message: 'Failed to send SMS code',
          code: 'SMS_SEND_ERROR'
        });
      }

    })(req, res, next);

  } catch (error) {
    console.error('Request SMS login error:', error);
    sentryService.captureException(error as Error, {
      feature: 'auth_sms_request',
      additionalData: { email: req.body?.email }
    });

    res.status(500).json({
      message: 'Failed to request SMS code',
      code: 'SMS_REQUEST_ERROR'
    });
  }
});

export { router as authMfaRoutes };