#!/usr/bin/env tsx

/**
 * EMERGENCY BYPASS CODE GENERATOR
 *
 * This script generates code snippets for emergency admin access bypass.
 * Use ONLY when all other methods fail and immediate production access is required.
 *
 * IMPORTANT: Remove this bypass code immediately after resolving the root cause.
 */

console.log(`
═══════════════════════════════════════════════════════════════
   🚨 EMERGENCY ADMIN BYPASS CODE GENERATOR 🚨
═══════════════════════════════════════════════════════════════

⚠️  WARNING: This is a TEMPORARY emergency measure only!
⚠️  Remove this code immediately after resolving the root issue.

`);

const bypassCode = `
// ═══════════════════════════════════════════════════
// 🚨 EMERGENCY ADMIN BYPASS - TEMPORARY ONLY
// ═══════════════════════════════════════════════════

export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Support both OAuth and local authentication
      const userId = req.user.claims?.sub || req.user.id;
      const userEmail = req.user.email;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: Invalid user session" });
      }

      // 🚨 EMERGENCY BYPASS - REMOVE AFTER FIX
      if (userEmail === 'steven@mcgettigan.co.uk' ||
          userEmail === 'steven@mcgettigan.com') {
        console.log(\`🚨 EMERGENCY BYPASS ACTIVATED for \${userEmail}\`);
        const user = await storage.getUser(userId);
        req.currentUser = user;
        return next(); // Grant full access
      }
      // 🚨 END EMERGENCY BYPASS

      const user = await storage.getUser(userId);

      // Check enhancedRole first, fallback to role
      const userRole = user?.enhancedRole || user?.role;

      if (!user || !userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: "Forbidden: Insufficient privileges",
          required_roles: allowedRoles,
          user_role: userRole || 'unknown'
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
`;

console.log('CODE TO ADD TO: /home/runner/workspace/server/replitAuth.ts');
console.log('REPLACE the existing requireRole function (lines 391-425) with:\n');
console.log(bypassCode);

console.log(`
═══════════════════════════════════════════════════════════════
   📋 IMPLEMENTATION STEPS
═══════════════════════════════════════════════════════════════

1. Open: /home/runner/workspace/server/replitAuth.ts

2. Find the 'requireRole' function (around line 391)

3. Replace it with the code above (includes emergency bypass)

4. Save the file

5. If using production deployment:
   - Commit the changes
   - Redeploy or restart the server

6. Test: Steven should now have full admin access

7. ⚠️  CRITICAL: Remove the bypass code (lines marked with 🚨)
   immediately after confirming the root cause fix works

═══════════════════════════════════════════════════════════════
   ⚙️  ROOT CAUSE RESOLUTION
═══════════════════════════════════════════════════════════════

After applying emergency bypass, resolve the root cause by:

Option A: Rebuild & Redeploy (Recommended)
   - Stop production deployment
   - Run: npm run build
   - Redeploy to production
   - This ensures latest code with enhanced session object

Option B: Verify Database Connection
   - Check if production uses same database as dev
   - Run: psql $DATABASE_URL -c "SELECT email, role, enhanced_role FROM users WHERE email LIKE '%steven%mcgettigan%'"

Option C: Restart Production Server
   - Sometimes the server needs a hard restart to load new code
   - This is especially true if using process managers like PM2

═══════════════════════════════════════════════════════════════
`);

process.exit(0);
