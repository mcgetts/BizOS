import * as Sentry from '@sentry/node';
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
    if (!this.config.enabled || !this.config.dsn) {
      console.log('Sentry disabled - no DSN provided or explicitly disabled');
      this.initialized = false;
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        sampleRate: this.config.sampleRate,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: undefined }),
          new Sentry.Integrations.Postgres(),
        ],
        beforeSend(event) {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;
            if (event.request.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.cookie;
            }
          }
          return event;
        }
      });

      this.initialized = true;
      console.log(`Sentry initialized for ${this.config.environment} environment`);
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      this.initialized = false;
    }
  }

  setupExpress(app: Express): void {
    if (!this.initialized) {
      return;
    }

    // The request handler must be the first middleware on the app
    app.use(Sentry.Handlers.requestHandler({
      ip: false, // Don't capture IP addresses for privacy
    }));

    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
  }

  setupErrorHandler(app: Express): void {
    if (!this.initialized) {
      return;
    }

    // The error handler must be registered before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all 4xx and 5xx errors
        return error.status === undefined || error.status >= 400;
      }
    }));
  }

  captureException(error: Error, context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      console.error('Sentry not initialized - Error:', error);
      return undefined;
    }

    return Sentry.withScope(scope => {
      if (context) {
        if (context.userId) scope.setUser({ id: context.userId, email: context.userEmail });
        if (context.requestId) scope.setTag('requestId', context.requestId);
        if (context.feature) scope.setTag('feature', context.feature);
        if (context.additionalData) {
          Object.entries(context.additionalData).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
      }

      return Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: any = 'info', context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      console.log('Sentry not initialized - Message:', message);
      return undefined;
    }

    return Sentry.withScope(scope => {
      if (context) {
        if (context.userId) scope.setUser({ id: context.userId, email: context.userEmail });
        if (context.requestId) scope.setTag('requestId', context.requestId);
        if (context.feature) scope.setTag('feature', context.feature);
        if (context.additionalData) {
          Object.entries(context.additionalData).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
      }

      return Sentry.captureMessage(message, level);
    });
  }

  startTransaction(name: string, op: string): any {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.startTransaction({ name, op });
  }

  addBreadcrumb(message: string, data?: Record<string, any>, level?: any): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb({
      message,
      data,
      level: level || 'info'
    });
  }

  setUser(user: { id: string; email?: string; firstName?: string; lastName?: string }): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  clearUser(): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(null);
  }

  setTag(key: string, value: string): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setTag(key, value);
  }

  setExtra(key: string, extra: any): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setExtra(key, extra);
  }

  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    return Sentry.flush(timeout);
  }

  monitorDatabase(operation: string, query?: string): any {
    if (!this.initialized) {
      return undefined;
    }

    const transaction = Sentry.startTransaction({
      name: `database.${operation}`,
      op: 'db.query'
    });

    if (query) {
      transaction.setData('query', query.substring(0, 200)); // Limit query length
    }

    return transaction;
  }

  monitorAPICall(service: string, endpoint: string): any {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.startTransaction({
      name: `api.${service}.${endpoint}`,
      op: 'http.client'
    });
  }

  monitorEmail(recipient: string, subject: string): any {
    if (!this.initialized) {
      return undefined;
    }

    const transaction = Sentry.startTransaction({
      name: 'email.send',
      op: 'email'
    });

    transaction.setTag('recipient_domain', recipient.split('@')[1]);
    transaction.setData('subject', subject);

    return transaction;
  }

  getClient(): any {
    return Sentry.getCurrentHub().getClient();
  }

  isInitialized(): boolean {
    return this.initialized;
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
    enabled: process.env.SENTRY_ENABLED === 'true' || process.env.NODE_ENV === 'production'
  };

  return new SentryService(config);
}

// Global instance
export const sentryService = createSentryService();