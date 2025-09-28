// Temporarily disabled to fix startup issue
// import * as Sentry from '@sentry/node';
import type { Express } from 'express';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
}

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  requestId?: string;
  feature?: string;
  additionalData?: Record<string, any>;
}

export class SentryService {
  private config: SentryConfig;
  private initialized = false;

  constructor(config: SentryConfig) {
    this.config = config;
  }

  init(): void {
    console.log('Sentry temporarily disabled for development');
    this.initialized = false;
  }

  setupExpress(app: Express): void {
    console.log('Sentry Express middleware disabled');
  }

  setupErrorHandler(app: Express): void {
    console.log('Sentry error handler disabled');
  }

  captureException(error: Error, context?: ErrorContext): string | undefined {
    console.error('Sentry disabled - Error:', error);
    return undefined;
  }

  captureMessage(message: string, level: any = 'info', context?: ErrorContext): string | undefined {
    console.log('Sentry disabled - Message:', message);
    return undefined;
  }

  startTransaction(name: string, op: string): any {
    return undefined;
  }

  addBreadcrumb(message: string, data?: Record<string, any>, level?: any): void {
    // No-op
  }

  setUser(user: { id: string; email?: string; firstName?: string; lastName?: string }): void {
    // No-op
  }

  clearUser(): void {
    // No-op
  }

  setTag(key: string, value: string): void {
    // No-op
  }

  setExtra(key: string, extra: any): void {
    // No-op
  }

  async flush(timeout = 2000): Promise<boolean> {
    return true;
  }

  monitorDatabase(operation: string, query?: string): any {
    return undefined;
  }

  monitorAPICall(service: string, endpoint: string): any {
    return undefined;
  }

  monitorEmail(recipient: string, subject: string): any {
    return undefined;
  }

  getClient(): any {
    return undefined;
  }

  isInitialized(): boolean {
    return false;
  }
}

// Factory function to create Sentry service with environment-based config
export function createSentryService(): SentryService {
  const config: SentryConfig = {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    enabled: false // Temporarily disabled
  };

  return new SentryService(config);
}

// Global instance
export const sentryService = createSentryService();