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

  /**
   * Initialize Sentry with configuration
   */
  init(): void {
    if (!this.config.enabled || !this.config.dsn) {
      console.log('Sentry monitoring is disabled or not configured');
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
          new Sentry.Integrations.Express({ app: undefined as any }), // Will be set later
        ],
        beforeSend(event) {
          // Filter out noise and sensitive data
          if (event.request?.url?.includes('/health')) {
            return null; // Don't send health check errors
          }

          // Remove sensitive headers
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }

          return event;
        },
        beforeSendTransaction(event) {
          // Don't send health check transactions
          if (event.request?.url?.includes('/health')) {
            return null;
          }
          return event;
        }
      });

      this.initialized = true;
      console.log(`Sentry initialized for environment: ${this.config.environment}`);
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Setup Sentry middleware for Express app
   */
  setupExpress(app: Express): void {
    if (!this.initialized) {
      console.log('Sentry not initialized, skipping Express setup');
      return;
    }

    // Request handler must be the first middleware
    app.use(Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'firstName', 'lastName'],
      request: ['method', 'url', 'headers', 'data'],
      serverName: false
    }));

    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());

    console.log('Sentry Express middleware configured');
  }

  /**
   * Setup Sentry error handler for Express app (must be after all routes)
   */
  setupErrorHandler(app: Express): void {
    if (!this.initialized) {
      return;
    }

    app.use(Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only send 4xx and 5xx errors to Sentry
        return error.status === undefined || error.status >= 400;
      }
    }));
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error, context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      console.error('Sentry not initialized:', error);
      return undefined;
    }

    return Sentry.withScope(scope => {
      if (context) {
        if (context.userId) {
          scope.setUser({
            id: context.userId,
            email: context.userEmail
          });
        }

        if (context.feature) {
          scope.setTag('feature', context.feature);
        }

        if (context.requestId) {
          scope.setTag('requestId', context.requestId);
        }

        if (context.additionalData) {
          scope.setContext('additionalData', context.additionalData);
        }
      }

      return Sentry.captureException(error);
    });
  }

  /**
   * Capture a message with level and context
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: ErrorContext
  ): string | undefined {
    if (!this.initialized) {
      console.log('Sentry not initialized:', message);
      return undefined;
    }

    return Sentry.withScope(scope => {
      scope.setLevel(level);

      if (context) {
        if (context.userId) {
          scope.setUser({
            id: context.userId,
            email: context.userEmail
          });
        }

        if (context.feature) {
          scope.setTag('feature', context.feature);
        }

        if (context.requestId) {
          scope.setTag('requestId', context.requestId);
        }

        if (context.additionalData) {
          scope.setContext('additionalData', context.additionalData);
        }
      }

      return Sentry.captureMessage(message, level);
    });
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string): Sentry.Transaction | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.startTransaction({ name, op });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, any>, level?: Sentry.SeverityLevel): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb({
      message,
      data,
      level: level || 'info',
      timestamp: Date.now() / 1000
    });
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; firstName?: string; lastName?: string }): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Set custom tag
   */
  setTag(key: string, value: string): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set extra context data
   */
  setExtra(key: string, extra: any): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setExtra(key, extra);
  }

  /**
   * Flush pending events (useful for serverless)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    return await Sentry.flush(timeout);
  }

  /**
   * Monitor database operations
   */
  monitorDatabase(operation: string, query?: string): Sentry.Span | undefined {
    if (!this.initialized) {
      return undefined;
    }

    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (!transaction) {
      return undefined;
    }

    return transaction.startChild({
      op: 'db.query',
      description: operation,
      data: query ? { query } : undefined
    });
  }

  /**
   * Monitor external API calls
   */
  monitorAPICall(service: string, endpoint: string): Sentry.Span | undefined {
    if (!this.initialized) {
      return undefined;
    }

    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (!transaction) {
      return undefined;
    }

    return transaction.startChild({
      op: 'http.client',
      description: `${service} ${endpoint}`
    });
  }

  /**
   * Monitor email sending
   */
  monitorEmail(recipient: string, subject: string): Sentry.Span | undefined {
    if (!this.initialized) {
      return undefined;
    }

    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (!transaction) {
      return undefined;
    }

    return transaction.startChild({
      op: 'email.send',
      description: `Email to ${recipient}: ${subject}`
    });
  }

  /**
   * Get Sentry client for advanced operations
   */
  getClient(): Sentry.NodeClient | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.getCurrentHub().getClient() as Sentry.NodeClient;
  }

  /**
   * Check if Sentry is properly initialized
   */
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