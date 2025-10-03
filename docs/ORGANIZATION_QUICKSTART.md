# Organization Management - Quick Start Guide

## For Non-Technical Users

This guide will help you set up and manage multiple organizations in your system in just a few minutes.

---

## What You'll Learn
1. How to create a new organization
2. How to add users to an organization
3. How users access their organization
4. Basic organization management

---

## Prerequisites

✅ You must be logged in as a **super admin**
✅ You can see "Organizations" in the left sidebar under CONTROL

---

## Step 1: Create Your First Organization

### 1.1 Navigate to Organization Admin
- Click **"Organizations"** in the left sidebar
- You'll see the Organization Management page

### 1.2 Click "Create Organization"
- Look for the blue button in the top right
- A form will appear

### 1.3 Fill in the Form

**Basic Information:**

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Organization Name** | The company/client name | "Acme Corporation" |
| **Subdomain** | Short identifier (no spaces) | "acme" |
| **Slug** | Leave as auto-filled | "acme" |

**Plan & Status:**

| Field | What to Select | Notes |
|-------|----------------|-------|
| **Plan Tier** | Choose based on size | Starter (20 users) is good for most |
| **Status** | Trial (for new orgs) | Automatically gives 30-day trial |

**Optional:**
- **Billing Email**: Where to send invoices (e.g., billing@acme.com)

### 1.4 Create It!
- Click **"Create Organization"**
- You'll see a success message
- The organization appears in your list

---

## Step 2: Understanding What You Created

Your organization now has:

📍 **Web Address**: `acme.yourdomain.com`
👥 **User Limit**: 20 users (for Starter plan)
⏰ **Trial Period**: 30 days
🔒 **Isolated Data**: Completely separate from other organizations

---

## Step 3: Add Your First User

### Option A: User Self-Registration (Easiest)

1. **Share the URL**: Give users `https://acme.yourdomain.com/register`
2. **User Creates Account**:
   - They fill in name, email, password
   - They click "Create Account"
3. **First User Becomes Owner**: The first person to register is automatically the owner

### Option B: Admin Adds User (Coming Soon)

Currently, you can add users via the API (ask your developer) or wait for the UI update.

---

## Step 4: How Users Access Their Organization

### For Organization Members:

1. **Go to their organization's URL**: `https://acme.yourdomain.com`
2. **Log in** with their credentials
3. **Start working**: They only see data for Acme Corporation

### Important Notes:
- ❌ Users at `acme.yourdomain.com` CANNOT see `techcorp.yourdomain.com` data
- ✅ One user can belong to multiple organizations with different logins
- ✅ Each organization is completely isolated

---

## Step 5: Managing Your Organizations

### View All Organizations
- Go to `/admin/organizations`
- See all organizations with stats

### View Organization Details
1. Click the **eye icon** (👁️) next to an organization
2. See:
   - All members
   - Current plan
   - Usage stats

### Edit an Organization
1. Click the **edit icon** (✏️)
2. Change:
   - Plan tier (to add more users)
   - Status (activate trial, suspend, etc.)
   - Organization name
3. Click "Save Changes"

### Delete an Organization
1. Click the **trash icon** (🗑️)
2. Confirm deletion
3. ⚠️ **Warning**: This deletes ALL data for that organization permanently

---

## Common Scenarios

### Scenario 1: Adding a New Client

**You're an agency with a new client "TechCorp"**

1. Create organization:
   - Name: "TechCorp Solutions"
   - Subdomain: "techcorp"
   - Plan: Professional (50 users)
   - Status: Active

2. Share with client: `https://techcorp.yourdomain.com/register`

3. Client team registers and starts using their workspace

### Scenario 2: Multiple Departments

**Large company with separate departments**

1. Create "Marketing Dept":
   - Subdomain: "marketing"
   - Plan: Starter (20 users)

2. Create "Engineering Dept":
   - Subdomain: "engineering"
   - Plan: Professional (50 users)

3. Each department works independently

### Scenario 3: Upgrading a Plan

**Organization hits user limit**

1. Edit the organization
2. Change Plan Tier from "Starter" to "Professional"
3. User limit increases from 20 → 50
4. Add more team members

---

## Quick Reference

### Plan Limits

| Plan | Users | Best For |
|------|-------|----------|
| **Free** | 5 | Small teams, testing |
| **Starter** | 20 | Small businesses |
| **Professional** | 50 | Medium businesses |
| **Enterprise** | Unlimited | Large enterprises |

### Organization Status

| Status | Meaning | What Happens |
|--------|---------|--------------|
| **Trial** | Testing period | 30-day trial, full features |
| **Active** | Paid subscription | Full access, no time limit |
| **Suspended** | Payment issue | Access blocked temporarily |
| **Cancelled** | Marked for deletion | Will be deleted soon |

### Member Roles

| Role | Can Do |
|------|--------|
| **Owner** | Everything - manage billing, delete org |
| **Admin** | Add/remove members, manage projects |
| **Member** | Work on projects and tasks |

---

## Troubleshooting

### "Subdomain already exists"
➡️ Choose a different subdomain name

### "Cannot add more members"
➡️ Upgrade the plan or remove inactive users

### "User can't log in"
➡️ Make sure they're going to the correct subdomain URL

### "Organization suspended"
➡️ Change status to "Active" in edit dialog

---

## Next Steps

Once you're comfortable with the basics:

1. ✅ Set up billing emails for each organization
2. ✅ Review and adjust user limits based on actual needs
3. ✅ Document subdomain names for your clients
4. ✅ Set up regular audits of member lists
5. ✅ Plan trial-to-paid conversion process

---

## Need Help?

- 📖 **Full Guide**: See `ORGANIZATION_ADMIN_GUIDE.md` for detailed instructions
- 🐛 **Report Issues**: GitHub Issues
- 💡 **Feature Requests**: Talk to your development team

---

**Congratulations!** You can now manage multiple organizations in your system like a pro! 🎉

---

**Last Updated**: October 3, 2025
**Difficulty**: Beginner-Friendly
**Time to Complete**: 10 minutes
