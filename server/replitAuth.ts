import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { BUSINESS_LIMITS } from "./config/constants";
import { ensureFirstUserIsAdmin } from "./seed";
import { PasswordUtils, AuthRateLimiter } from "./utils/authUtils";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

// Normalize domains and track registered dynamic strategies
const configuredDomains = process.env.REPLIT_DOMAINS.split(",").map(d => d.trim()).filter(Boolean);
const dynamicStrategies = new Set<string>(); // Track dynamically registered strategies
const MAX_DYNAMIC_STRATEGIES = 10; // Prevent memory abuse

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { 
    maxAge: 300 * 1000, // 5 minutes instead of 1 hour
    normalizer: () => `${process.env.ISSUER_URL}|${process.env.REPL_ID}` // Key cache to both ISSUER_URL and REPL_ID
  }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory store only when DATABASE_URL is not available
  if (!process.env.DATABASE_URL) {
    console.log('🔧 Using in-memory session store (no DATABASE_URL available)');
    return session({
      secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
      },
    });
  }
  
  // Use PostgreSQL session store with persistent sessions
  console.log('🔧 Using PostgreSQL session store with persistent sessions');
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Auto-create sessions table
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const TEAM_SIZE_LIMIT = BUSINESS_LIMITS.MAX_TEAM_MEMBERS;

  // Check if user already exists (this is an update, not new user)
  const existingUser = await storage.getUser(claims["sub"]);
  if (existingUser) {
    // User exists, proceed with update
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    return;
  }

  // New user - check team size limit
  const currentUsers = await storage.getUsers();
  if (currentUsers.length >= TEAM_SIZE_LIMIT) {
    throw new Error(`Team size limit reached. Maximum ${TEAM_SIZE_LIMIT} team members allowed.`);
  }

  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  // Ensure the first user gets admin privileges
  await ensureFirstUserIsAdmin(claims["sub"]);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Helper function to register or update strategy with current config
  const ensureStrategyWithCurrentConfig = async (domain: string, req?: any) => {
    const config = await getOidcConfig(); // Fetch fresh config each time
    const strategyName = `replitauth:${domain}`;
    
    // Remove existing strategy if it exists
    if ((passport as any)._strategies?.[strategyName]) {
      delete (passport as any)._strategies[strategyName];
    }
    
    // Use req.protocol if available, otherwise default to https for production
    const protocol = req?.protocol || 'https';
    
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${protocol}://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  };

  // Local authentication strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email: string, password: string, done) => {
      try {
        // Rate limiting check
        const identifier = email.toLowerCase();
        if (AuthRateLimiter.isRateLimited(identifier)) {
          const resetTime = AuthRateLimiter.getResetTime(identifier);
          return done(null, false, {
            message: `Too many login attempts. Try again in ${Math.ceil(resetTime / 60)} minutes.`
          });
        }

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email.toLowerCase()),
            eq(users.isActive, true)
          ))
          .limit(1);

        if (!user) {
          AuthRateLimiter.recordFailedAttempt(identifier);
          return done(null, false, { message: 'Invalid email or password.' });
        }

        // Check if user has a password (might be OAuth-only user)
        if (!user.passwordHash) {
          AuthRateLimiter.recordFailedAttempt(identifier);
          return done(null, false, {
            message: 'This account uses OAuth login. Please use the OAuth login button.'
          });
        }

        // Verify password
        const isValidPassword = await PasswordUtils.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          AuthRateLimiter.recordFailedAttempt(identifier);
          return done(null, false, { message: 'Invalid email or password.' });
        }

        // Check email verification
        if (!user.emailVerified) {
          return done(null, false, {
            message: 'Please verify your email address before logging in.'
          });
        }

        // Clear rate limiting on successful login
        AuthRateLimiter.clearAttempts(identifier);

        // Update last login time
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        // Create user session object
        const sessionUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          authProvider: user.authProvider,
          isLocal: true
        };

        return done(null, sessionUser);
      } catch (error) {
        console.error('Local authentication error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  app.get("/api/login", async (req, res, next) => {
    const currentDomain = req.hostname;
    const strategyName = `replitauth:${currentDomain}`;
    
    // Security check: only allow configured domains or reasonable dynamic registration
    if (!configuredDomains.includes(currentDomain)) {
      // Allow dynamic registration only if we haven't hit the limit
      if (dynamicStrategies.size >= MAX_DYNAMIC_STRATEGIES) {
        console.error(`❌ Too many dynamic strategies registered. Add '${currentDomain}' to REPLIT_DOMAINS.`);
        return res.status(500).json({ 
          error: "Authentication configuration error", 
          message: `Domain '${currentDomain}' not configured. Contact administrator.`
        });
      }
      
      console.warn(`⚠️  Domain '${currentDomain}' not in REPLIT_DOMAINS. Registering dynamic strategy.`);
      console.warn(`⚠️  Add '${currentDomain}' to REPLIT_DOMAINS in deployment secrets for better security`);
      dynamicStrategies.add(currentDomain);
    }
    
    try {
      // Always ensure strategy uses current config (fresh OIDC discovery)
      await ensureStrategyWithCurrentConfig(currentDomain, req);
      
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error(`❌ Failed to setup authentication strategy for domain '${currentDomain}':`, error);
      return res.status(500).json({ 
        error: "Authentication configuration error", 
        message: "Failed to initialize authentication. Please try again."
      });
    }
  });

  app.get("/api/callback", async (req, res, next) => {
    const currentDomain = req.hostname;
    const strategyName = `replitauth:${currentDomain}`;
    
    // Security check: ensure domain is allowed
    if (!configuredDomains.includes(currentDomain) && !dynamicStrategies.has(currentDomain)) {
      if (dynamicStrategies.size >= MAX_DYNAMIC_STRATEGIES) {
        console.error(`❌ Strategy '${strategyName}' not found and domain not allowed.`);
        return res.status(400).json({ 
          error: "Authentication error", 
          message: `Domain '${currentDomain}' not configured. Add to REPLIT_DOMAINS.`
        });
      }
      
      console.warn(`⚠️  Strategy '${strategyName}' missing during callback. Registering on-demand.`);
      dynamicStrategies.add(currentDomain);
    }
    
    try {
      // Always ensure strategy uses current config (fresh OIDC discovery)
      await ensureStrategyWithCurrentConfig(currentDomain, req);
      
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } catch (error) {
      console.error(`❌ Failed to setup authentication strategy for callback '${currentDomain}':`, error);
      return res.status(500).json({ 
        error: "Authentication configuration error", 
        message: "Failed to process authentication callback. Please try again."
      });
    }
  });

  app.get("/api/logout", async (req, res) => {
    try {
      const config = await getOidcConfig(); // Fetch fresh config for logout
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    } catch (error) {
      console.error(`❌ Failed to get OIDC config for logout:`, error);
      // Fallback to simple logout without redirect
      req.logout(() => {
        res.redirect("/");
      });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Handle local authentication (email/password login)
  if (user.isLocal) {
    // For local authentication, the session is enough - no token expiration check needed
    return next();
  }

  // Handle OAuth authentication (Replit OIDC)
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: "Forbidden: Insufficient privileges",
          required_roles: allowedRoles,
          user_role: user?.role || 'unknown'
        });
      }
      
      // Attach user data to request for further use
      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Error checking user role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
