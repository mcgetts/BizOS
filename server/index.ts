import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { wsManager } from "./websocketManager";
import { sentryService } from "./monitoring/sentryService.js";
import { createBackupScheduler } from "./backup/backupScheduler.js";
import { createUptimeMonitor } from "./monitoring/uptimeMonitor.js";
import fs from "fs";
import path from "path";

// Initialize Sentry as early as possible
sentryService.init();

const app = express();

// Setup Sentry middleware before other middleware
sentryService.setupExpress(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Single-instance enforcement using atomic lock file
  const lockFile = path.join(process.cwd(), '.server.lock');

  try {
    // Atomic lock creation - fails if file already exists
    const lockFd = fs.openSync(lockFile, 'wx');
    fs.writeSync(lockFd, process.pid.toString());
    fs.closeSync(lockFd);
    log(`🔒 Server instance locked (PID: ${process.pid})`);
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      // Lock file exists, check if process is still running
      try {
        const pid = fs.readFileSync(lockFile, 'utf8').trim();
        process.kill(parseInt(pid), 0);
        log(`❌ Server already running (PID: ${pid}). Use workflow restart to cleanly restart the server.`);
        process.exit(1);
      } catch {
        // Process not running, remove stale lock file and retry
        fs.unlinkSync(lockFile);
        log('🧹 Removed stale lock file, retrying...');
        try {
          const lockFd = fs.openSync(lockFile, 'wx');
          fs.writeSync(lockFd, process.pid.toString());
          fs.closeSync(lockFd);
          log(`🔒 Server instance locked (PID: ${process.pid})`);
        } catch {
          log('❌ Failed to acquire server lock after cleanup');
          process.exit(1);
        }
      }
    } else {
      log(`❌ Failed to create lock file: ${error.message}`);
      process.exit(1);
    }
  }

  // Cleanup lock file on exit
  const cleanup = () => {
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        log('🔓 Server lock released');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // Run database seeding on startup
  await seedDatabase();
  
  const server = await registerRoutes(app);

  // Setup WebSocket server for real-time notifications
  wsManager.setup(server);

  // Initialize backup scheduler
  const backupScheduler = createBackupScheduler();
  backupScheduler.start();
  log('✅ Backup scheduler started');

  // Initialize uptime monitoring
  const uptimeMonitor = createUptimeMonitor();
  uptimeMonitor.start();
  log('✅ Uptime monitoring started');

  // Start escalation service for automatic ticket escalation (temporarily disabled for demo)
  // const { escalationService } = await import('./escalationService');
  // escalationService.start(30); // Check every 30 minutes
  log('✅ Escalation service ready (disabled for demo)');

  // Graceful shutdown for services
  const gracefulShutdown = async () => {
    log('🛑 Graceful shutdown initiated...');

    try {
      // Stop monitoring services
      backupScheduler.stop();
      log('📋 Backup scheduler stopped');

      uptimeMonitor.stop();
      log('📋 Uptime monitor stopped');

      // Flush Sentry events
      await sentryService.flush();
      log('📋 Sentry events flushed');

      // escalationService.stop();
      log('📋 Escalation service stopped');

    } catch (error) {
      log(`❌ Error during shutdown: ${error}`);
    }
  };

  process.on('SIGTERM', () => {
    gracefulShutdown().finally(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    gracefulShutdown().finally(() => process.exit(0));
  });

  // Setup Sentry error handler before other error handlers
  sentryService.setupErrorHandler(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Capture error in Sentry if not already captured
    if (status >= 500) {
      sentryService.captureException(err, {
        feature: 'server_error',
        additionalData: { status, message }
      });
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Unified port strategy: respect the PORT environment variable
  // In Replit: PORT is always 5000 (set in .replit config)
  // In local dev: PORT defaults to 3001 (set in package.json script)
  // In production: PORT defaults to 5000

  const rawPort = Number(process.env.PORT);
  const isDevMode = process.env.NODE_ENV === 'development';
  const isReplit = process.env.REPL_ID !== undefined || process.env.REPLIT_ENV === 'true';

  let port: number;
  if (Number.isFinite(rawPort) && rawPort > 0) {
    port = rawPort;
    log(`Using PORT environment variable: ${port}${isReplit ? ' (Replit)' : ''}`);
  } else if (isReplit) {
    // Force port 5000 in Replit environment to prevent conflicts
    port = 5000;
    log(`Enforcing Replit port policy: ${port} (detected Replit environment)`);
  } else {
    // Fallback logic for other environments
    port = isDevMode ? 3001 : 5000;
    log(`Using default port for ${isDevMode ? 'development' : 'production'}: ${port}`);
  }
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
