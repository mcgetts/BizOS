import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import twilio from 'twilio';
import { db } from '../db.js';
import { users, mfaTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { auditService } from './auditService.js';
import { sentryService } from '../monitoring/sentryService.js';

interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromPhoneNumber: string;
}

export class MFAService {
  private twilioClient?: ReturnType<typeof twilio>;
  private smsConfig?: SMSConfig;

  constructor() {
    this.initializeSMS();
  }

  /**
   * Initialize SMS service if credentials are available
   */
  private initializeSMS(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhoneNumber = process.env.TWILIO_FROM_PHONE;

    if (accountSid && authToken && fromPhoneNumber) {
      this.smsConfig = { accountSid, authToken, fromPhoneNumber };
      this.twilioClient = twilio(accountSid, authToken);
      console.log('SMS MFA service initialized with Twilio');
    } else {
      console.log('SMS MFA not available - missing Twilio configuration');
    }
  }

  /**
   * Generate TOTP secret and QR code for user
   */
  async setupTOTP(userId: string, email: string): Promise<MFASetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Business Platform (${email})`,
        issuer: 'Business Platform',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store in database
      await db.insert(mfaTokens).values({
        userId,
        type: 'totp',
        secret: secret.base32,
        backupCodes,
        isActive: false, // Will be activated when user verifies
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'mfa_setup_initiated',
          severity: 'low',
          riskScore: 0,
          eventData: { method: 'totp' }
        }
      );

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'mfa_setup',
        userId
      });
      throw new Error('Failed to setup TOTP MFA');
    }
  }

  /**
   * Verify TOTP token and activate MFA
   */
  async verifyAndActivateTOTP(userId: string, token: string): Promise<boolean> {
    try {
      // Get stored secret
      const mfaRecord = await db
        .select()
        .from(mfaTokens)
        .where(eq(mfaTokens.userId, userId))
        .limit(1);

      if (!mfaRecord.length || mfaRecord[0].type !== 'totp') {
        return false;
      }

      const record = mfaRecord[0];

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: record.secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 30 seconds before/after
      });

      if (verified) {
        // Activate MFA
        await Promise.all([
          // Update MFA token as active
          db.update(mfaTokens)
            .set({ isActive: true, lastUsedAt: new Date(), updatedAt: new Date() })
            .where(eq(mfaTokens.id, record.id)),

          // Update user MFA status
          db.update(users)
            .set({ mfaEnabled: true })
            .where(eq(users.id, userId))
        ]);

        await auditService.logSecurityEvent(
          { userId },
          {
            eventType: 'mfa_activated',
            severity: 'low',
            riskScore: 0,
            eventData: { method: 'totp' }
          }
        );

        return true;
      }

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'mfa_verification_failed',
          severity: 'medium',
          riskScore: 30,
          eventData: { method: 'totp', reason: 'invalid_token' }
        }
      );

      return false;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'mfa_verify',
        userId
      });
      return false;
    }
  }

  /**
   * Verify TOTP token for login
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    try {
      // Get active TOTP secret
      const mfaRecord = await db
        .select()
        .from(mfaTokens)
        .where(eq(mfaTokens.userId, userId))
        .limit(1);

      if (!mfaRecord.length || !mfaRecord[0].isActive || mfaRecord[0].type !== 'totp') {
        return false;
      }

      const record = mfaRecord[0];

      // Check if it's a backup code
      if (record.backupCodes && record.backupCodes.includes(token)) {
        // Remove used backup code
        const updatedCodes = record.backupCodes.filter(code => code !== token);
        await db.update(mfaTokens)
          .set({ backupCodes: updatedCodes, lastUsedAt: new Date() })
          .where(eq(mfaTokens.id, record.id));

        await auditService.logSecurityEvent(
          { userId },
          {
            eventType: 'mfa_backup_code_used',
            severity: 'medium',
            riskScore: 20,
            eventData: { remainingCodes: updatedCodes.length }
          }
        );

        return true;
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: record.secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (verified) {
        await db.update(mfaTokens)
          .set({ lastUsedAt: new Date() })
          .where(eq(mfaTokens.id, record.id));

        await auditService.logSecurityEvent(
          { userId },
          {
            eventType: 'mfa_login_success',
            severity: 'low',
            riskScore: 0,
            eventData: { method: 'totp' }
          }
        );

        return true;
      }

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'mfa_login_failed',
          severity: 'medium',
          riskScore: 40,
          eventData: { method: 'totp', reason: 'invalid_token' }
        }
      );

      return false;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'mfa_login_verify',
        userId
      });
      return false;
    }
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<boolean> {
    if (!this.twilioClient || !this.smsConfig) {
      throw new Error('SMS MFA not configured');
    }

    try {
      // Generate 6-digit code
      const code = this.generateSMSCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store SMS code
      await db.insert(mfaTokens).values({
        userId,
        type: 'sms',
        secret: code,
        phoneNumber,
        expiresAt,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Send SMS
      await this.twilioClient.messages.create({
        body: `Your Business Platform verification code is: ${code}. This code expires in 5 minutes.`,
        from: this.smsConfig.fromPhoneNumber,
        to: phoneNumber
      });

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'sms_code_sent',
          severity: 'low',
          riskScore: 0,
          eventData: { phoneNumber: this.maskPhoneNumber(phoneNumber) }
        }
      );

      return true;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'sms_send',
        userId
      });

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'sms_send_failed',
          severity: 'medium',
          riskScore: 20,
          eventData: { phoneNumber: this.maskPhoneNumber(phoneNumber) }
        }
      );

      return false;
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId: string, code: string): Promise<boolean> {
    try {
      // Get recent SMS code
      const mfaRecord = await db
        .select()
        .from(mfaTokens)
        .where(eq(mfaTokens.userId, userId))
        .limit(1);

      if (!mfaRecord.length) {
        return false;
      }

      const record = mfaRecord[0];

      // Check if code matches and hasn't expired
      if (record.type === 'sms' &&
          record.secret === code &&
          record.expiresAt &&
          record.expiresAt > new Date()) {

        // Mark as used (delete the record)
        await db.delete(mfaTokens).where(eq(mfaTokens.id, record.id));

        await auditService.logSecurityEvent(
          { userId },
          {
            eventType: 'sms_verification_success',
            severity: 'low',
            riskScore: 0,
            eventData: { phoneNumber: this.maskPhoneNumber(record.phoneNumber || '') }
          }
        );

        return true;
      }

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'sms_verification_failed',
          severity: 'medium',
          riskScore: 30,
          eventData: {
            phoneNumber: this.maskPhoneNumber(record.phoneNumber || ''),
            reason: record.expiresAt && record.expiresAt < new Date() ? 'expired' : 'invalid_code'
          }
        }
      );

      return false;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'sms_verify',
        userId
      });
      return false;
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<boolean> {
    try {
      await Promise.all([
        // Delete MFA tokens
        db.delete(mfaTokens).where(eq(mfaTokens.userId, userId)),

        // Update user MFA status
        db.update(users)
          .set({ mfaEnabled: false })
          .where(eq(users.id, userId))
      ]);

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'mfa_disabled',
          severity: 'high',
          riskScore: 50,
          eventData: { reason: 'user_requested' }
        }
      );

      return true;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'mfa_disable',
        userId
      });
      return false;
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();

      await db.update(mfaTokens)
        .set({ backupCodes, updatedAt: new Date() })
        .where(eq(mfaTokens.userId, userId));

      await auditService.logSecurityEvent(
        { userId },
        {
          eventType: 'backup_codes_regenerated',
          severity: 'medium',
          riskScore: 10,
          eventData: { codeCount: backupCodes.length }
        }
      );

      return backupCodes;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'backup_codes_regen',
        userId
      });
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const user = await db
        .select({ mfaEnabled: users.mfaEnabled })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user.length > 0 && user[0].mfaEnabled;

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'mfa_check',
        userId
      });
      return false;
    }
  }

  /**
   * Get MFA status and methods for user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    methods: string[];
    backupCodesRemaining?: number;
  }> {
    try {
      const [user, mfaTokens] = await Promise.all([
        db.select({ mfaEnabled: users.mfaEnabled })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),

        db.select()
          .from(mfaTokens)
          .where(eq(mfaTokens.userId, userId))
      ]);

      const enabled = user.length > 0 && user[0].mfaEnabled;
      const methods = mfaTokens
        .filter(token => token.isActive)
        .map(token => token.type);

      const totpToken = mfaTokens.find(token => token.type === 'totp' && token.isActive);
      const backupCodesRemaining = totpToken?.backupCodes?.length || 0;

      return {
        enabled,
        methods,
        backupCodesRemaining
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        feature: 'mfa_status',
        userId
      });
      return { enabled: false, methods: [] };
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(this.generateRandomCode(8));
    }
    return codes;
  }

  /**
   * Generate SMS verification code
   */
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate random alphanumeric code
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '***';
    return phoneNumber.slice(0, -4).replace(/./g, '*') + phoneNumber.slice(-4);
  }
}

// Singleton instance
export const mfaService = new MFAService();