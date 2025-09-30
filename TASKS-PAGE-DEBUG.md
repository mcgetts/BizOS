# Tasks Page Display Issue - Debugging Guide

## Issue Description
Tasks page not displaying properly when opened in a new tab.

## Diagnostic Steps

### 1. Check Browser Console
When the Tasks page fails to load, open DevTools (F12) and check for:

**Common Errors:**
```
- Failed to load resource: 401 (Unauthorized)
  → Authentication issue, session not persisting

- TypeError: Cannot read property 'map' of undefined
  → Data not loading properly

- Uncaught Error: useQuery hook used outside QueryClientProvider
  → React Query context issue

- WebSocket connection failed
  → Notification system issue (not critical)
```

### 2. Check Network Tab
In DevTools → Network tab, look for failed requests:
- `/api/tasks` - Should return 200 or 401
- `/api/auth/user` - Should return user data or 401
- `/api/projects` - Supporting data
- `/api/users` - Supporting data

### 3. Check URL
Verify the URL is exactly: `http://your-domain/tasks`

### 4. Test Authentication State

**In Console, run:**
```javascript
// Check if user is authenticated
fetch('/api/auth/user', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If this returns 401, the session is not persisting in the new tab.

## Common Fixes

### Fix 1: Session Not Persisting Across Tabs

**Issue:** Opening in new tab loses authentication

**Cause:** Session cookies not being shared or `sameSite` policy

**Fix:** Check `/server/index.ts` session configuration:
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // Should be 'lax' not 'strict'
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))
```

### Fix 2: React Query Not Loading Data

**Issue:** Queries enabled but not fetching

**Cause:** `enabled: !!user` but user loads slowly

**Current Code (Tasks.tsx line 372-375):**
```typescript
const { data: tasks, isLoading, error } = useQuery<Task[]>({
  queryKey: ["/api/tasks"],
  enabled: !!user, // Waits for user before fetching
});
```

This should work, but if user is slow to load, page shows blank.

### Fix 3: Loading State Not Showing

**Issue:** Page appears blank during loading

**Check:** Lines 524-540 in Tasks.tsx should show loading skeleton

**Current Code:**
```typescript
if (authLoading || isLoading) {
  return (
    <Layout title="Task Management">
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {/* Loading skeleton */}
        </div>
      </div>
    </Layout>
  );
}
```

### Fix 4: Layout Component Issue

**Issue:** Layout wrapper not rendering

**Check:** `/components/Layout.tsx` might have an issue

## Quick Test Script

Run this in the new tab's console to diagnose:

```javascript
// 1. Check authentication
console.log('Checking auth...');
fetch('/api/auth/user', { credentials: 'include' })
  .then(r => {
    console.log('Auth status:', r.status);
    return r.json();
  })
  .then(user => console.log('User:', user))
  .catch(e => console.error('Auth error:', e));

// 2. Check tasks API
console.log('Checking tasks API...');
fetch('/api/tasks', { credentials: 'include' })
  .then(r => {
    console.log('Tasks status:', r.status);
    return r.json();
  })
  .then(tasks => console.log('Tasks count:', tasks.length))
  .catch(e => console.error('Tasks error:', e));

// 3. Check React component mount
setTimeout(() => {
  const hasLayout = !!document.querySelector('[class*="Layout"]');
  const hasCards = !!document.querySelector('[class*="Card"]');
  console.log('Page rendered:', { hasLayout, hasCards });
}, 2000);
```

## What to Share

Please provide:
1. **Console errors** (red text in DevTools console)
2. **Network tab failures** (red highlighted requests)
3. **Output from the test script above**
4. **Screenshot of what you see** (blank page, error, loading spinner, etc.)
5. **URL in address bar**

This will help identify the exact issue!