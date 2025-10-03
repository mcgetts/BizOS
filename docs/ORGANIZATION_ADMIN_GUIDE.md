# Organization Admin Panel - User Guide

## Overview

The Organization Admin Panel is a powerful tool for super administrators to manage multiple tenant organizations within the system. Each organization operates as an isolated workspace with its own data, users, and settings.

---

## Table of Contents

1. [Accessing the Admin Panel](#accessing-the-admin-panel)
2. [Understanding Organizations](#understanding-organizations)
3. [Creating Organizations](#creating-organizations)
4. [Managing Organizations](#managing-organizations)
5. [Member Management](#member-management)
6. [Plan Tiers & Limits](#plan-tiers--limits)
7. [Organization Settings](#organization-settings)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Accessing the Admin Panel

### Prerequisites
- You must have **super_admin** role to access the organization management panel
- Navigate to `/admin/organizations` in your browser
- Or click "Organizations" in the sidebar under the CONTROL section

### Access Control
- Only users with `role: "super_admin"` can view and manage organizations
- Regular admins (`role: "admin"`) cannot access this panel
- If you see an "Access Denied" message, contact your system administrator

---

## Understanding Organizations

### What is an Organization?
An organization represents a complete tenant workspace with:
- **Isolated data**: Each org has its own projects, tasks, clients, etc.
- **Separate users**: Users must be members of an org to access its data
- **Custom subdomain**: Each org is accessed via `{subdomain}.yourdomain.com`
- **Plan-based limits**: Different plans allow different numbers of users
- **Independent settings**: Branding, features, and notifications per org

### Organization Properties

| Property | Description | Example |
|----------|-------------|---------|
| **Name** | Display name of the organization | "Acme Corporation" |
| **Subdomain** | Unique identifier for URL routing | "acme" → acme.yourdomain.com |
| **Slug** | URL-safe identifier (usually same as subdomain) | "acme" |
| **Plan Tier** | Subscription level (free, starter, professional, enterprise) | "professional" |
| **Status** | Current state of organization | "active", "trial", "suspended", "cancelled" |
| **User Limit** | Maximum number of members allowed | 50 |
| **Billing Email** | Contact for billing notifications | billing@acme.com |

---

## Creating Organizations

### Step-by-Step Guide

#### 1. Click "Create Organization"
- Click the blue "Create Organization" button in the top right
- A dialog will open with a form

#### 2. Fill in Basic Information

**Organization Name** (Required)
- The display name for the organization
- Example: "Acme Corporation", "Tech Startup Inc"
- Can contain spaces and special characters

**Subdomain** (Required)
- Unique identifier for URL access
- Must be 3-63 characters long
- Only lowercase letters, numbers, and hyphens
- Must start and end with letter/number
- Example: "acme" → Users access at `acme.yourdomain.com`
- ⚠️ Cannot be changed easily after creation

**Slug** (Required)
- URL-safe identifier
- Auto-fills based on subdomain
- Usually the same as subdomain

#### 3. Select Plan & Status

**Plan Tier**
- **Free**: 5 users, basic features
- **Starter**: 20 users, standard features
- **Professional**: 50 users, advanced features
- **Enterprise**: Unlimited users, all features

**Status**
- **Trial**: 30-day trial (automatically set when creating new org)
- **Active**: Fully active subscription
- **Suspended**: Temporarily disabled
- **Cancelled**: Marked for deletion

#### 4. Billing Information (Optional)

**Billing Email**
- Email address for billing notifications
- Can be different from member emails
- Example: billing@acme.com

#### 5. Create the Organization
- Click "Create Organization"
- The system will:
  - Validate subdomain uniqueness
  - Set default user limits based on plan
  - Set trial end date (30 days from creation if status is "trial")
  - Create the organization record

### Automatic Settings

When you create an organization:
- **Trial Period**: If status is "trial", trial ends 30 days from creation
- **User Limits**:
  - Free: 5 users
  - Starter: 20 users
  - Professional: 50 users
  - Enterprise: 999,999 users (effectively unlimited)
- **Slug**: Auto-generated from subdomain if not provided

---

## Managing Organizations

### Viewing All Organizations

The main page shows:
- **Statistics Cards**:
  - Total Organizations
  - Active Organizations (status = "active")
  - Trial Organizations (status = "trial")
  - Total Members (across all orgs)

- **Organization List**: Shows each organization with:
  - Name and subdomain
  - Member count (current / maximum)
  - Plan tier badge
  - Status indicator with color coding
  - Action buttons (View, Edit, Delete)

### Search Organizations
- Use the search bar to filter by name or subdomain
- Search is case-insensitive
- Results update in real-time

### Status Indicators

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| **Active** | ✓ | Green | Fully operational, paid subscription |
| **Trial** | 🕐 | Blue | In trial period, limited time |
| **Suspended** | ⚠ | Yellow | Temporarily disabled, payment issue |
| **Cancelled** | ✗ | Red | Marked for deletion |

### Viewing Organization Details

1. Click the **eye icon** (👁️) next to an organization
2. See detailed information:
   - All organization settings
   - Complete member list with roles
   - Creation date
   - Current usage vs. limits

---

## Member Management

### Understanding Member Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | Full control, billing access, can delete org | Organization founder, CEO |
| **Admin** | Manage settings, add/remove members, manage data | CTO, Operations Manager |
| **Member** | Access organization data, work on projects | Regular employees |

### Viewing Members

1. View an organization's details
2. Scroll to the "Members" section
3. See:
   - Member name and email
   - Role badge with icon
   - Join date
   - Remove button (if applicable)

### Adding Members

**Option 1: From Organization Details**
1. Click "Add Member" in the organization details view
2. Currently requires manual user ID lookup
3. Select role (Owner, Admin, or Member)
4. Click "Add Member"

**Option 2: Direct API** (for technical users)
```bash
POST /api/admin/organizations/{orgId}/members
{
  "userId": "user-id-here",
  "role": "member"
}
```

### Removing Members

1. Click the trash icon next to a member
2. Confirm deletion
3. **Note**: You cannot remove the last owner of an organization

### Member Limits

- Each organization has a maximum user limit based on plan
- The system prevents adding members beyond the limit
- To add more members:
  1. Upgrade the organization's plan tier
  2. Or remove inactive members first

---

## Plan Tiers & Limits

### Plan Comparison

| Plan | Users | Monthly Price | Features |
|------|-------|---------------|----------|
| **Free** | 5 | $0 | Basic features, limited integrations |
| **Starter** | 20 | TBD | Standard features, email support |
| **Professional** | 50 | TBD | Advanced features, priority support, integrations |
| **Enterprise** | Unlimited | TBD | All features, dedicated support, custom integrations |

### Changing Plans

1. Edit the organization
2. Select new "Plan Tier" from dropdown
3. System automatically updates user limits
4. Save changes

### What Happens When Changing Plans?

**Upgrading**:
- User limit increases immediately
- New features become available
- Existing data is preserved

**Downgrading**:
- ⚠️ If current member count exceeds new limit, you must remove members first
- Some features may become unavailable
- Data is preserved but may have limited access

---

## Organization Settings

### Editing Organizations

1. Click the **edit icon** (✏️) next to an organization
2. Modify allowed fields:
   - Organization name
   - Plan tier
   - Status
   - Billing email
3. Click "Save Changes"

### Protected Fields

**Cannot be edited** (or should be done carefully):
- **Subdomain**: Changing this breaks user access URLs
- **Slug**: Usually tied to subdomain

### Organization Status Management

**Changing to Trial**:
- Good for testing or giving trial access
- Auto-sets 30-day expiration (if not already set)

**Changing to Active**:
- Marks as paid subscription
- Removes trial limitations

**Changing to Suspended**:
- Temporarily disables access
- Data is preserved
- Members cannot log in to this organization

**Changing to Cancelled**:
- Marks for deletion
- Should be followed by actual deletion if intended

---

## Best Practices

### Naming Conventions

**Subdomains**:
- Use company/client name: `acme`, `techcorp`
- Keep it short: 3-15 characters
- Avoid numbers unless meaningful: `client123` ❌ `acmecorp` ✓
- Use hyphens for multi-word: `big-company` ✓

**Organization Names**:
- Use proper business name: "Acme Corporation"
- Include entity type if needed: "Tech Startup LLC"
- Be consistent with branding

### Security

1. **Limit Owners**: Each org should have 1-2 owners maximum
2. **Regular Audits**: Review member lists quarterly
3. **Remove Inactive Users**: Free up seats, improve security
4. **Trial Management**: Set clear expiration policies

### Data Management

1. **Backups**: Ensure organizations are included in backup strategy
2. **Before Deletion**: Export critical data first
3. **Subdomain Changes**: Avoid if possible; communicate widely if necessary

### Billing

1. **Separate Billing Emails**: Use `billing@` addresses
2. **Plan Reviews**: Audit plans quarterly to optimize costs
3. **Trial Extensions**: Handle manually or via status changes

---

## Troubleshooting

### Common Issues

#### "Subdomain already exists"
**Problem**: Trying to create org with duplicate subdomain
**Solution**: Choose a different subdomain, check existing orgs

#### "Organization has reached maximum user limit"
**Problem**: Trying to add member when at capacity
**Solutions**:
1. Upgrade the plan tier
2. Remove inactive members
3. Wait for members to leave

#### "Cannot delete default organization"
**Problem**: System prevents deletion of "default" org
**Solution**: This is intentional - default org is required for system operation

#### "Cannot remove the last owner"
**Problem**: Trying to remove the only owner
**Solution**:
1. Promote another member to owner first
2. Then remove the original owner

#### User Can't Access Organization
**Possible Causes**:
1. User not a member of the organization
2. Organization is suspended/cancelled
3. User accessing wrong subdomain
4. User account is inactive

**Solutions**:
1. Add user to organization members
2. Change org status to "active"
3. Verify correct subdomain URL
4. Check user account status

### Getting Help

If you encounter issues:
1. Check system logs for error details
2. Verify user permissions and roles
3. Test with a trial organization first
4. Review recent changes to organization settings

---

## API Reference (for Developers)

### Endpoints

```
GET    /api/admin/organizations              # List all organizations
GET    /api/admin/organizations/:id          # Get organization details
POST   /api/admin/organizations              # Create organization
PATCH  /api/admin/organizations/:id          # Update organization
DELETE /api/admin/organizations/:id          # Delete organization

GET    /api/admin/organizations/:id/members  # List org members
POST   /api/admin/organizations/:id/members  # Add member
PATCH  /api/admin/organizations/:orgId/members/:memberId  # Update member role
DELETE /api/admin/organizations/:orgId/members/:memberId  # Remove member
```

### Example: Create Organization (cURL)

```bash
curl -X POST http://localhost:5000/api/admin/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "subdomain": "acme",
    "slug": "acme",
    "planTier": "professional",
    "status": "trial",
    "billingEmail": "billing@acme.com"
  }'
```

### Example: Add Member (cURL)

```bash
curl -X POST http://localhost:5000/api/admin/organizations/{orgId}/members \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "role": "admin"
  }'
```

---

## Quick Reference

### Keyboard Shortcuts
- Press `/` to focus search box
- `Esc` to close dialogs

### Color Codes
- 🟢 Green: Active, Good status
- 🔵 Blue: Trial, In progress
- 🟡 Yellow: Warning, Suspended
- 🔴 Red: Error, Cancelled

### Action Icons
- 👁️ View details
- ✏️ Edit organization
- 🗑️ Delete organization
- ➕ Add member
- 🔒 Protected action

---

## Changelog

### Version 1.0 (October 2025)
- Initial release of Organization Admin Panel
- Create, Read, Update, Delete organizations
- Member management with role-based access
- Plan tier management
- Multi-status support (trial, active, suspended, cancelled)
- Super admin access control

---

## Support

For technical support or feature requests:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- System Administrators: Contact your IT department
- Emergency: Check system logs and backup data immediately

---

**Last Updated**: October 3, 2025
**Version**: 1.0
**Maintained by**: BizOS Development Team
