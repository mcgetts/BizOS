import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

/**
 * Password hashing utilities for secure authentication
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a plain text password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a plain text password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random token for email verification or password reset
   */
  static generateSecureToken(): string {
    return nanoid(32);
  }

  /**
   * Generate a password reset token with expiration
   */
  static generatePasswordResetToken(): { token: string; expires: Date } {
    const token = this.generateSecureToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiration
    return { token, expires };
  }

  /**
   * Generate an email verification token
   */
  static generateEmailVerificationToken(): string {
    return this.generateSecureToken();
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number; // 0-4
  } {
    const errors: string[] = [];
    let score = 0;

    // Minimum length
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      score++;
    }

    // Has lowercase
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score++;
    }

    // Has uppercase
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score++;
    }

    // Has number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score++;
    }

    // Bonus for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score = Math.min(score + 0.5, 4);
    }

    // Bonus for length
    if (password.length >= 12) {
      score = Math.min(score + 0.5, 4);
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.floor(score)
    };
  }

  /**
   * Generate a secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a secure hash for sensitive data (non-password)
   */
  static createHash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    return crypto.createHash('sha256').update(data + actualSalt).digest('hex');
  }

  /**
   * Check if a token has expired
   */
  static isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date() > expiresAt;
  }
}

/**
 * Rate limiting utilities for authentication endpoints
 */
export class AuthRateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if an IP/user is rate limited
   */
  static isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) return false;

    // Reset if window has passed
    if (now > attempt.resetTime) {
      this.attempts.delete(identifier);
      return false;
    }

    return attempt.count >= this.MAX_ATTEMPTS;
  }

  /**
   * Record a failed attempt
   */
  static recordFailedAttempt(identifier: string): number {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetTime) {
      // New window or first attempt
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.WINDOW_MS
      });
      return 1;
    }

    // Increment existing attempt
    attempt.count++;
    this.attempts.set(identifier, attempt);
    return attempt.count;
  }

  /**
   * Clear attempts for a successful login
   */
  static clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining time until reset
   */
  static getResetTime(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return 0;

    const remaining = attempt.resetTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000)); // seconds
  }
}