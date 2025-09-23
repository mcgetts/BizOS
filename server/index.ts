import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { wsManager } from "./websocketManager";
import fs from "fs";
import path from "path";

const app = express();
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
  // Single-instance enforcement using lock file
  const lockFile = path.join(process.cwd(), '.server.lock');

  // Check for existing lock file
  if (fs.existsSync(lockFile)) {
    try {
      const pid = fs.readFileSync(lockFile, 'utf8').trim();
      // Check if process is still running
      process.kill(parseInt(pid), 0);
      log(`❌ Server already running (PID: ${pid}). Use 'npm run dev:clean' to restart.`);
      process.exit(1);
    } catch {
      // Process not running, remove stale lock file
      fs.unlinkSync(lockFile);
      log('🧹 Removed stale lock file');
    }
  }

  // Create lock file with current PID
  fs.writeFileSync(lockFile, process.pid.toString());
  log(`🔒 Server instance locked (PID: ${process.pid})`);

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 3001 for development, 5000 for production if not specified.
  // This serves both the API and the client.

  const rawPort = Number(process.env.PORT);
  const isDevMode = process.env.NODE_ENV === 'development';
  const isReplit = process.env.REPL_ID !== undefined;

  // In Replit, always use port 5000 regardless of environment
  let port: number;
  if (isReplit) {
    port = 5000;
    log(`Replit dev detected – forcing port 5000`);
  } else if (Number.isFinite(rawPort) && rawPort > 0) {
    port = rawPort;
    log(`Using PORT environment variable: ${port}`);
  } else {
    port = isDevMode ? 3001 : 5000;
    log(`Using default port for ${isDevMode ? 'development' : 'production'}: ${port}`);
  }
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
