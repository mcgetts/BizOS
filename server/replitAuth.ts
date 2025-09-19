import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { BUSINESS_LIMITS } from "./config/constants";
import { ensureFirstUserIsAdmin } from "./seed";

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
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory store for development or when DATABASE_URL is not set
  if (process.env.NODE_ENV !== 'production' || !process.env.DATABASE_URL) {
    console.log('🔧 Using in-memory session store for development');
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
  
  // Use PostgreSQL session store for production
  console.log('🔧 Using PostgreSQL session store for production');
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

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Register strategies for all configured domains  
  for (const domain of configuredDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const currentDomain = req.hostname;
    const strategyName = `replitauth:${currentDomain}`;
    
    // Check if strategy exists, if not register dynamically with security guards
    if (!passport._strategy || !passport._strategy[strategyName]) {
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
      
      // Register strategy for this domain
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${currentDomain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const currentDomain = req.hostname;
    const strategyName = `replitauth:${currentDomain}`;
    
    // Ensure strategy exists (should rarely happen if /api/login was called first)
    if (!passport._strategy || !passport._strategy[strategyName]) {
      console.error(`❌ Strategy '${strategyName}' not found during callback. This should not happen.`);
      return res.redirect("/api/login");
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
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
