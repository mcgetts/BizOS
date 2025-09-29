# Email Verification Debugging Guide

## Changes Made

I've added comprehensive logging to track the email verification flow:

### 1. Server-side Logging Added

**File: `/server/routes.ts` (lines 543-594)**
- Logs when verification endpoint is called
- Shows token being used
- Displays user found status
- Shows before/after emailVerified state
- Confirms database update success

**File: `/server/replitAuth.ts` (lines 217-224)**
- Logs every login attempt
- Shows user's emailVerified status at login time
- Confirms why login is allowed or denied

### 2. New Debug Script

**File: `/scripts/check-user-verification.ts`**
- Check any user's verification status
- View verification token if present
- Get direct verification link

## Testing Steps

### Step 1: Register a New User

1. Go to registration page
2. Fill in details (use a test email you control)
3. Click "Register"
4. **Check server console** - you should see:
   ```
   === EMAIL VERIFICATION (Development Mode) ===
   To: your-email@example.com
   Click the following link to verify your email:
   http://localhost:5000/verify-email?token=...
   ```

### Step 2: Verify Email

1. Copy the verification link from console
2. Paste in browser
3. **Check server console** - you should see:
   ```
   📧 Email verification attempt with token: abc123...
   ✅ Found user: your-email@example.com emailVerified: false
   🔄 Updating user verification status for: your-email@example.com
   ✅ Verification update result: SUCCESS
   Updated user emailVerified: true
   ```

4. Browser should show success message with green styling
5. Click "Continue to Login" button

### Step 3: Login

1. Enter email and password
2. Click "Login"
3. **Check server console** - you should see:
   ```
   🔐 Login attempt for user: your-email@example.com emailVerified: true
   ✅ Email verified, allowing login for: your-email@example.com
   ```

4. Should successfully log in

## Troubleshooting

### Check User Status Manually

Run this command with your test email:

```bash
tsx scripts/check-user-verification.ts your-email@example.com
```

This will show:
- User ID
- Email verified status (true/false)
- Verification token (if present)
- Direct verification link (if token exists)

### Common Issues

#### Issue 1: "User not found with token"
**Cause:** Token doesn't match database
**Fix:**
1. Run check script to get current token
2. Use that exact token in verification URL

#### Issue 2: "Email already verified" but login fails
**Cause:** Database might not be updating or caching issue
**Fix:**
1. Run check script to confirm database state
2. If emailVerified is false, manually verify:
   ```bash
   # Direct database update
   psql $DATABASE_URL -c "UPDATE users SET email_verified = true WHERE email = 'your-email@example.com';"
   ```

#### Issue 3: Verification succeeds but login still fails
**Cause:** Browser might be caching old user state
**Fix:**
1. Clear browser cache/cookies
2. Try in incognito window
3. Check console logs to see actual database value

## What to Check

When you test, please share:

1. **Console output from registration** (the verification link)
2. **Console output from verification** (the 📧 logs)
3. **Console output from login attempt** (the 🔐 logs)
4. **Output from check script**:
   ```bash
   tsx scripts/check-user-verification.ts your-test-email@example.com
   ```

This will help identify exactly where the flow is breaking!

## Expected Flow

```
Registration
    ↓
    [emailVerified: false, token: abc123]
    ↓
Email Sent (console log)
    ↓
User Clicks Link
    ↓
Verification API Called
    ↓
    [emailVerified: true, token: null]
    ↓
Success Page Shown
    ↓
User Clicks "Continue to Login"
    ↓
Login Form
    ↓
Login Check (emailVerified === true)
    ↓
✅ Login Success
```

## Next Steps

Please run through the test flow and share the console logs. This will help me identify if:

1. ❌ Verification API is not being called
2. ❌ Database update is not executing
3. ❌ Login is reading stale data
4. ❌ Some other middleware is interfering

The logs will tell us exactly where the issue is!