# User Journeys Documentation

## Overview
This document outlines the key user journeys through the enterprise business platform, covering authentication, CRM, project management, task management, support, finance, and analytics workflows.

---

## 1. Authentication & User Onboarding Journeys

### 1.1 New User Registration Journey
**Actor:** Prospective User
**Goal:** Create account and verify email

**Steps:**
1. User navigates to landing page (`/`)
2. Clicks "Sign Up" to open registration form
3. Fills in registration details:
   - Email address (validated in real-time)
   - Password (minimum 8 chars, uppercase, lowercase, number)
   - First name and last name
   - Optional: Phone, department, position
4. Password strength indicator shows security level
5. Submits registration form
6. System validates data and creates user account with `emailVerified: false`
7. Email verification token generated and stored
8. Verification email sent to user's email address
9. User redirected to email verification pending page
10. User checks email and clicks verification link
11. System validates token and marks `emailVerified: true`
12. User redirected to dashboard with authenticated session

**Endpoints Used:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-email` - Email verification
- `GET /api/user` - Authenticated user data

---

### 1.2 User Login Journey (Standard)
**Actor:** Registered User
**Goal:** Access platform with credentials

**Steps:**
1. User navigates to login page
2. Enters email and password
3. Optionally checks "Remember Me" checkbox
4. Submits login form
5. System validates credentials against `passwordHash`
6. If MFA not enabled:
   - Session created with passport
   - User redirected to dashboard
   - Real-time WebSocket connection established
7. If MFA enabled:
   - Proceeds to MFA verification journey (1.3)

**Endpoints Used:**
- `POST /api/auth/login` - Credential validation
- `GET /api/user` - Session verification

**Error Scenarios:**
- Invalid credentials → "Invalid email or password" message
- Account locked → "Too many failed attempts. Account locked for X minutes"
- Email not verified → "Please verify your email before logging in"

---

### 1.3 Multi-Factor Authentication (MFA) Journey
**Actor:** User with MFA Enabled
**Goal:** Complete two-factor authentication

**Steps:**
1. User completes standard login (1.2)
2. System detects `mfaEnabled: true`
3. User presented with MFA verification options:
   - **Option A: TOTP App (Google Authenticator, Authy)**
   - **Option B: SMS Code**
   - **Option C: Backup Code**
4. **TOTP Flow:**
   - User opens authenticator app
   - Enters 6-digit TOTP code
   - System verifies with `speakeasy.verify()`
   - On success: Session established
5. **SMS Flow:**
   - User requests SMS code
   - System sends code via Twilio SMS
   - User enters 6-digit code
   - System validates against stored code with expiry check
   - On success: Session established
6. **Backup Code Flow:**
   - User enters one-time backup code
   - System validates and marks code as used
   - On success: Session established
7. Security event logged in `securityEvents` table
8. User redirected to dashboard

**Endpoints Used:**
- `POST /api/auth/login-mfa` - MFA verification
- `POST /api/mfa/sms/send` - SMS code generation
- `POST /api/mfa/sms/verify` - SMS code validation

---

### 1.4 MFA Setup Journey
**Actor:** Existing User
**Goal:** Enable two-factor authentication

**Steps:**
1. User navigates to security settings
2. Clicks "Enable Multi-Factor Authentication"
3. Chooses MFA method:
   - **TOTP Setup:**
     - System generates secret with `speakeasy.generateSecret()`
     - QR code displayed for scanning
     - User scans QR with authenticator app
     - Enters verification code to confirm setup
     - System stores `mfaSecret` encrypted
     - Backup codes generated (10 codes)
     - User downloads/saves backup codes
   - **SMS Setup:**
     - User enters phone number
     - System sends test SMS
     - User enters verification code
     - Phone number stored for SMS delivery
4. `mfaEnabled` set to `true`
5. Security event logged
6. Success confirmation displayed

**Endpoints Used:**
- `POST /api/mfa/setup/totp` - TOTP secret generation
- `POST /api/mfa/verify/totp` - TOTP activation
- `POST /api/mfa/sms/send` - SMS setup
- `POST /api/mfa/backup-codes/regenerate` - Backup code generation

---

### 1.5 Password Reset Journey
**Actor:** User who forgot password
**Goal:** Reset password securely

**Steps:**
1. User clicks "Forgot Password?" on login page
2. Enters email address
3. Submits password reset request
4. System generates secure reset token (32-byte random)
5. Token stored in `passwordResetToken` with 1-hour expiry
6. Password reset email sent with link containing token
7. User clicks link in email
8. Redirected to password reset form with token in URL
9. Enters new password (validated for strength)
10. Confirms new password (must match)
11. Submits reset form
12. System validates token and expiry
13. Password hashed with bcrypt (10 rounds)
14. `passwordHash` updated, token cleared
15. `lastPasswordChange` timestamp set
16. Success message displayed
17. User redirected to login page

**Endpoints Used:**
- `POST /api/auth/forgot-password` - Reset request
- `POST /api/auth/reset-password` - Password update

---

## 2. CRM & Sales Pipeline Journeys

### 2.1 Lead Capture to Opportunity Journey
**Actor:** Sales Representative
**Goal:** Convert lead into tracked opportunity

**Steps:**
1. Lead information received (website form, referral, cold outreach)
2. Sales rep navigates to CRM page (`/company`)
3. Creates new company record (if not exists):
   - Company name, industry, size, website
   - Contact information
   - Revenue and founding year
4. Creates contact person under company:
   - Name, email, phone, position
   - Department and role designation
   - Marks as primary contact if applicable
5. Creates sales opportunity:
   - Opportunity title and description
   - Links to company and primary contact
   - Sets initial stage: "lead"
   - Estimated value and probability (0-100%)
   - Expected close date
   - Source tracking (referral, website, marketing, etc.)
6. Adds detailed opportunity information:
   - Pain points (array of challenges)
   - Success criteria (measurable outcomes)
   - Decision process and timeline
   - Budget status (approved/estimated/unknown)
   - Competitor information
7. Assigns opportunity to sales team member
8. Activity history automatically logged
9. Opportunity appears in sales pipeline
10. Email notification sent to assigned user

**Endpoints Used:**
- `POST /api/companies` - Company creation
- `POST /api/clients` - Contact creation
- `POST /api/sales-opportunities` - Opportunity creation
- `POST /api/sales-opportunities/:id/activity-history` - Activity logging

---

### 2.2 Opportunity Progression Journey
**Actor:** Sales Representative
**Goal:** Move opportunity through pipeline stages

**Pipeline Stages:**
1. **Lead** → Initial contact captured
2. **Qualified** → Budget, authority, need, timeline confirmed
3. **Proposal** → Solution proposed, pricing shared
4. **Negotiation** → Terms being finalized
5. **Closed Won** → Deal won, converts to project
6. **Closed Lost** → Deal lost, tracked for learning

**Journey Steps:**
1. Sales rep opens opportunity detail page
2. Reviews current stage and progress
3. Logs communication activities:
   - Calls, emails, meetings, demos
   - Attendees and outcomes tracked
   - Follow-up actions scheduled
   - File attachments (proposals, contracts) uploaded
4. Adds stakeholders and their influence:
   - Decision makers, influencers, blockers, champions
   - Relationship strength assessment
5. Creates next steps with due dates:
   - Action items assigned to team members
   - Priority levels set
   - Completion status tracked
6. Updates opportunity stage:
   - Changes stage based on progress
   - Updates probability percentage
   - Adjusts expected close date if needed
7. All changes logged in activity history
8. Real-time notifications sent to team members
9. Pipeline dashboard automatically updates

**Endpoints Used:**
- `PATCH /api/sales-opportunities/:id` - Opportunity updates
- `POST /api/sales-opportunities/:id/communications` - Log activities
- `POST /api/sales-opportunities/:id/stakeholders` - Add stakeholders
- `POST /api/sales-opportunities/:id/next-steps` - Create action items
- `POST /api/sales-opportunities/:id/files` - File uploads

---

### 2.3 Opportunity Won to Project Conversion Journey
**Actor:** Sales Representative / Project Manager
**Goal:** Convert won deal into active project automatically

**Steps:**
1. Sales rep updates opportunity stage to "closed_won"
2. Sets actual close date
3. Confirms final deal value
4. System triggers automatic project creation:
   - Checks if project already exists (`opportunityId` unique constraint)
   - If no project exists:
     - Creates project with auto-generated name
     - Links to opportunity, company, and primary contact
     - Copies opportunity value to project budget
     - Converts pain points to project requirements
     - Copies success criteria as project goals
     - Sets conversion date timestamp
5. Project timeline calculated based on:
   - Deal value (higher value = longer duration)
   - Complexity assessment (low/medium/high)
   - Industry-specific templates
6. Project template selected:
   - Matches company industry to template
   - Falls back to value-based template
7. Tasks auto-generated from template:
   - Phase-based task structure
   - Dependencies established
   - Estimated hours assigned
   - Sequential ordering maintained
8. Project manager automatically assigned:
   - Same as opportunity owner
   - Or reassigned based on department
9. Project status set to "planning"
10. Team members notified via email and WebSocket
11. Opportunity marked as converted
12. Activity history logged in both systems

**Endpoints Used:**
- `PATCH /api/sales-opportunities/:id` - Stage update
- `POST /api/projects/from-opportunity` - Automatic conversion
- `GET /api/project-templates` - Template selection
- `POST /api/projects/:id/tasks/from-template` - Task generation

**Business Rules:**
- One opportunity can only create one project (enforced by database constraint)
- Opportunity must be in "closed_won" stage
- Company and contact required for project creation
- Budget cannot be null if opportunity value exists

---

## 3. Project Management Journeys

### 3.1 Project Creation from Template Journey
**Actor:** Project Manager
**Goal:** Create new project with pre-defined task structure

**Steps:**
1. Project manager navigates to Projects page
2. Clicks "Create Project" button
3. Project creation modal opens with template selector
4. Selects project template:
   - Filters by industry (web development, marketing, consulting)
   - Filters by category (website, mobile app, campaign, audit)
   - Reviews template details: estimated duration, default budget, task count
5. Fills in project details:
   - Project name and description
   - Selects company and primary contact
   - Assigns project manager (defaults to self)
   - Sets priority level (low/medium/high/urgent)
   - Defines budget amount
   - Sets start date and end date
6. Reviews template tasks that will be created:
   - Tasks grouped by phase (planning, design, development, testing, launch)
   - Estimated hours per task
   - Dependencies between tasks shown
7. Optionally customizes template:
   - Adds/removes specific tasks
   - Adjusts estimated hours
   - Changes task priorities
8. Submits project creation
9. System creates project record:
   - Status set to "planning"
   - Progress initialized to 0%
   - Timestamps recorded
10. Tasks automatically generated from template:
    - Each task created with phase ordering
    - Dependencies established (finish-to-start by default)
    - Start dates calculated based on dependencies
    - Due dates set based on estimated hours
11. Project activity log created:
    - "Project created from [Template Name]"
    - Task creation events logged
12. Team notifications sent:
    - Project manager receives confirmation
    - Assigned team members notified
    - WebSocket broadcast updates project list
13. User redirected to new project detail page

**Endpoints Used:**
- `GET /api/project-templates` - Template listing
- `GET /api/project-templates/:id` - Template details with tasks
- `POST /api/projects` - Project creation
- `POST /api/projects/:id/tasks/from-template` - Task generation
- `POST /api/projects/:id/activity` - Activity logging
- `POST /api/notifications` - Team notifications

---

### 3.2 Gantt Chart Task Scheduling Journey
**Actor:** Project Manager
**Goal:** Visualize and adjust project timeline

**Steps:**
1. Project manager opens project detail page
2. Navigates to "Gantt Chart" tab
3. Gantt chart renders with:
   - Project hierarchy showing all tasks grouped by project
   - Timeline scale (daily/weekly/monthly views)
   - Task bars positioned by start date and duration
   - Dependency lines connecting related tasks (SVG connectors)
   - Critical path highlighted in red
   - Today marker showing current date
4. Reviews current schedule:
   - Identifies task overlaps and resource conflicts
   - Checks critical path for bottleneck tasks
   - Reviews milestone dates
5. Adjusts task schedule via drag & drop:
   - Clicks and drags task bar to new dates
   - System calculates new start date based on position
   - Validates against dependencies:
     - Finish-to-start: Task cannot start before dependency completes
     - Start-to-start: Task starts when dependency starts
   - If dependency violation: Warning displayed, adjustment prevented
   - If valid: Task dates updated
6. System recalculates:
   - Critical path analysis (CPM algorithm)
   - Project end date based on longest path
   - Resource allocation impacts
   - Budget implications of date changes
7. Updates propagated:
   - Dependent tasks automatically adjusted
   - Gantt chart re-renders with new positions
   - Project timeline updated
   - Team members notified of date changes
8. Changes saved automatically:
   - Task dates persisted to database
   - Activity log updated: "Task dates changed"
   - WebSocket broadcast updates other viewers
9. Project progress recalculated:
   - Completion percentage updated
   - Status auto-suggestion shown if needed
   - Project manager can accept/reject suggestion

**Endpoints Used:**
- `GET /api/projects/:id/tasks` - Task list with dependencies
- `PATCH /api/tasks/:id` - Task date updates
- `GET /api/tasks/dependencies/:id` - Dependency validation
- `POST /api/projects/:id/recalculate-progress` - Progress update
- `GET /api/projects/:id/critical-path` - Critical path calculation

**Real-time Features:**
- WebSocket broadcasts task updates to all connected users
- Concurrent editing detected and latest changes shown
- Lock mechanism prevents conflicting simultaneous edits

---

### 3.3 Project Progress Tracking Journey
**Actor:** Project Manager / Team Member
**Goal:** Monitor and update project completion status

**Steps:**
1. Team member completes a task:
   - Changes task status from "in_progress" to "completed"
   - Sets completion timestamp
   - Logs final actual hours worked
2. System automatically triggers progress calculation:
   - Counts completed tasks vs. total tasks
   - Calculates weighted progress (considering task importance)
   - Updates `project.progress` percentage
3. Project manager views project dashboard:
   - Progress bar shows current completion (e.g., 65%)
   - Health indicator displays:
     - Green: On track (progress ≥ expected)
     - Yellow: At risk (progress slightly behind)
     - Red: Behind schedule (progress significantly behind)
4. AI-powered completion estimate shown:
   - Based on velocity: tasks completed per week
   - Considers remaining work and dependencies
   - Predicts completion date with confidence level
5. System suggests status update:
   - If progress > 90%: Suggests "review" status
   - If all tasks complete: Suggests "completed" status
   - If behind schedule: Suggests "paused" or "on_hold"
6. Project manager reviews suggestion:
   - Accepts suggested status update
   - Or manually overrides with different status
   - Adds notes explaining status change
7. Status update applied:
   - Project status changed
   - Activity log updated
   - Notifications sent to stakeholders
   - Client portal updated (if enabled)
8. Budget impact analyzed:
   - Actual cost vs. budgeted cost compared
   - Variance percentage calculated
   - Budget alerts triggered if over threshold:
     - Warning at 80% budget consumed
     - Critical alert at 100% budget consumed
9. Project manager views analytics:
   - Completion trends over time
   - Team performance metrics
   - Risk assessment indicators

**Endpoints Used:**
- `PATCH /api/tasks/:id` - Task status updates
- `GET /api/projects/:id/progress` - Progress analytics
- `GET /api/projects/:id/completion-estimate` - AI prediction
- `POST /api/projects/:id/recalculate-progress` - Manual recalc
- `PATCH /api/projects/:id` - Status updates

**Automatic Triggers:**
- Task status change → Progress recalculation
- Progress milestone reached → Notification sent
- Budget threshold exceeded → Alert email sent
- Project completion → Client invoice generation

---

## 4. Task Management Journeys

### 4.1 Task Creation and Assignment Journey
**Actor:** Project Manager / Team Lead
**Goal:** Create task and assign to team member

**Steps:**
1. Manager navigates to Tasks page or project detail page
2. Clicks "Create Task" button or uses quick action
3. Task creation form opens with fields:
   - Task title (required)
   - Description (rich text, supports markdown)
   - Project selection (dropdown of active projects)
   - Assignee selection (team members with capacity)
   - Priority level (low/medium/high/urgent)
   - Estimated hours (for workload planning)
   - Start date and due date
   - Tags for categorization
4. Optionally selects from task templates:
   - Development tasks (frontend, backend, testing, deployment)
   - Client work (requirements gathering, review meetings, delivery)
   - Planning tasks (sprint planning, retrospectives)
   - Documentation tasks (API docs, user guides)
5. Sets task dependencies (if applicable):
   - Searches for related tasks
   - Selects dependency type:
     - Finish-to-start: Current task waits for dependency
     - Start-to-start: Tasks start together
   - System validates no circular dependencies
6. Reviews team member workload:
   - Current allocation percentage shown
   - Available hours per week displayed
   - Over-allocation warning if capacity exceeded
7. Submits task creation
8. System processes:
   - Task record created with status "todo"
   - Project task count incremented
   - Task added to Gantt chart schedule
   - Dependencies validated and stored
9. Assignee notified:
   - Real-time WebSocket notification
   - Email notification (if offline)
   - Notification includes: task title, priority, due date, description
10. Task appears in assignee's task list
11. Project activity log updated
12. Resource allocation adjusted

**Endpoints Used:**
- `POST /api/tasks` - Task creation
- `GET /api/users/available` - Team member availability
- `POST /api/task-dependencies` - Dependency creation
- `GET /api/task-dependencies/validate` - Circular check
- `POST /api/notifications` - Assignee notification

---

### 4.2 Task Time Tracking Journey
**Actor:** Team Member
**Goal:** Track time spent on task for billing and analytics

**Steps:**
1. Team member opens task detail page
2. Reviews task requirements and acceptance criteria
3. **Option A: Real-time Timer**
   - Clicks "Start Timer" button
   - Timer begins counting (displayed in header)
   - System stores start timestamp
   - Team member works on task
   - Timer shows elapsed time (updates every second)
   - Clicks "Stop Timer" when done
   - System calculates duration
   - Time entry modal opens with:
     - Duration (pre-filled from timer)
     - Description of work completed
     - Billable toggle (default: true)
     - Rate (auto-filled from user profile)
   - Confirms and saves time entry
4. **Option B: Manual Entry**
   - Clicks "Log Time" button
   - Enters time manually:
     - Date of work
     - Hours worked (decimal format)
     - Description of work
     - Billable flag
   - Submits manual entry
5. System processes time entry:
   - Creates record in `timeEntries` table
   - Links to task and project
   - Calculates cost: hours × hourly rate
   - Updates task actual hours
   - Updates project actual cost
6. Budget impact calculated in real-time:
   - Time cost added to project expenses
   - Budget variance recalculated
   - If budget threshold exceeded:
     - Warning notification sent to project manager
     - Budget alert displayed on dashboard
7. Task progress updated:
   - Actual hours compared to estimated hours
   - Progress percentage adjusted
   - Task status auto-suggested if near completion
8. Billing integration triggered:
   - If billable: Entry queued for invoicing
   - Appears in unbilled time report
   - Can be added to next invoice
9. Analytics updated:
   - User productivity metrics recalculated
   - Team utilization percentage updated
   - Project profitability analysis refreshed

**Endpoints Used:**
- `POST /api/time-entries/start` - Start timer
- `POST /api/time-entries/stop` - Stop timer
- `POST /api/time-entries` - Manual time entry
- `GET /api/tasks/:id/budget-impact` - Real-time cost calculation
- `GET /api/analytics/productivity` - User performance metrics

**Real-time Updates:**
- Active timer displayed in header across all pages
- Multiple timers prevented (only one active at a time)
- Timer state persisted (survives page refreshes)
- Idle detection: Auto-pause after 5 minutes inactivity

---

### 4.3 Task Dependency Management Journey
**Actor:** Project Manager
**Goal:** Set up and visualize task dependencies

**Steps:**
1. Project manager opens project Gantt chart or dependency visualization
2. Reviews current task dependencies:
   - Dependency graph showing task relationships
   - Critical path highlighted in red
   - Slack time (float) calculated for non-critical tasks
3. Identifies tasks that need dependencies:
   - Tasks that must wait for others to complete
   - Tasks that can run in parallel
   - Bottleneck tasks blocking multiple downstream tasks
4. Adds new dependency:
   - Clicks "Add Dependency" on task
   - Selects predecessor task from dropdown
   - Chooses dependency type:
     - **Finish-to-Start (FS)**: Most common, task B starts after task A finishes
     - **Start-to-Start (SS)**: Task B starts when task A starts
     - **Finish-to-Finish (FF)**: Task B finishes when task A finishes
     - **Start-to-Finish (SF)**: Rare, task B finishes when task A starts
   - Sets lag time (optional): Days to wait after dependency met
5. System validates dependency:
   - Runs circular dependency detection algorithm
   - Checks if adding dependency creates a loop
   - If circular: Error displayed, dependency rejected
   - If valid: Dependency created
6. Critical path automatically recalculated:
   - CPM (Critical Path Method) algorithm runs
   - Longest path through project identified
   - Critical tasks marked (zero slack time)
   - Project end date recalculated
7. Gantt chart updated:
   - SVG connector lines drawn between dependent tasks
   - Critical path tasks highlighted in red
   - Non-critical tasks shown in standard color
   - Slack time displayed as transparent extension
8. Task start dates auto-adjusted:
   - Dependent tasks repositioned to respect dependencies
   - If task A finishes on Day 10, task B (dependent) starts Day 11
   - Lag time added to start date calculation
9. Team notifications sent:
   - Assignees of affected tasks notified of date changes
   - Project manager receives dependency summary
10. Dependency changes logged in activity history

**Endpoints Used:**
- `POST /api/task-dependencies` - Create dependency
- `GET /api/task-dependencies/validate` - Circular check
- `GET /api/projects/:id/critical-path` - CPM calculation
- `DELETE /api/task-dependencies/:id` - Remove dependency
- `PATCH /api/tasks/:id` - Adjust task dates

**Dependency Validation Rules:**
- No self-dependencies (task cannot depend on itself)
- No circular loops (A→B→C→A)
- Predecessor must exist in same project
- Dependency type must be valid enum value

---

### 4.4 Task Completion Journey
**Actor:** Team Member
**Goal:** Mark task as complete and trigger downstream actions

**Steps:**
1. Team member completes all task requirements
2. Reviews task acceptance criteria:
   - All requirements met
   - Code reviewed (if applicable)
   - Tests passing
   - Documentation updated
3. Opens task detail page
4. Clicks "Mark as Complete" button
5. Completion modal opens:
   - Summary of time logged (actual vs. estimated)
   - Final notes field (optional)
   - Actual completion date (default: today)
6. Confirms task completion
7. System updates task:
   - Status changed from "in_progress" to "completed"
   - `completedAt` timestamp set
   - Final actual hours locked
8. Project progress automatically recalculated:
   - Completed task count incremented
   - Progress percentage updated (e.g., 67% → 72%)
   - Project health score adjusted
9. Dependent tasks evaluated:
   - System finds all tasks dependent on completed task
   - Checks if dependencies now satisfied
   - If all dependencies met:
     - Dependent task status can move from "blocked" to "todo"
     - Assignee notified that task is now unblocked
10. Budget impact finalized:
    - Task cost locked (actual hours × rate)
    - Project actual cost updated
    - Budget variance recalculated
    - If task over budget: Variance alert sent
11. Analytics updated:
    - User productivity metrics updated
    - Task completion velocity calculated
    - Team performance dashboard refreshed
12. If all project tasks complete:
    - System suggests project status change to "review"
    - Project manager notified for final review
    - Client notification prepared (if portal enabled)
13. Notifications sent:
    - Project manager: Task completed notification
    - Dependent task assignees: Task unblocked notification
    - WebSocket broadcast: Real-time UI update

**Endpoints Used:**
- `PATCH /api/tasks/:id` - Status update to "completed"
- `POST /api/projects/:id/recalculate-progress` - Auto-recalc
- `GET /api/tasks/:id/dependents` - Find dependent tasks
- `GET /api/analytics/productivity` - Update metrics

**Post-Completion Actions:**
- Task locked from further editing (unless reopened)
- Time entries remain editable for 48 hours
- Task metrics frozen for reporting
- Completion event logged in project activity

---

## 5. Support & Ticketing Journeys

### 5.1 Support Ticket Creation Journey
**Actor:** Client or Internal User
**Goal:** Create support request and track resolution

**Steps:**
1. User navigates to Support page
2. Clicks "Create Ticket" button
3. Ticket creation form opens:
   - Title (brief summary)
   - Description (detailed explanation)
   - Category (technical, billing, general)
   - Priority (auto-suggested based on keywords)
   - Client/company selection (if internal user)
4. System analyzes ticket content:
   - Keywords scanned for urgency indicators
   - Auto-suggests priority based on:
     - "urgent", "critical" → High/Urgent priority
     - "broken", "error" → Medium/High priority
     - "question", "how to" → Low/Medium priority
5. User confirms or adjusts priority
6. Submits ticket creation
7. System processes ticket:
   - Generates unique ticket number (e.g., "TKT-2024-00123")
   - Sets status to "open"
   - Assigns SLA targets based on priority:
     - Urgent: 2 hour response, 8 hour resolution
     - High: 4 hour response, 24 hour resolution
     - Medium: 8 hour response, 3 day resolution
     - Low: 24 hour response, 5 day resolution
   - Calculates SLA breach time
8. Auto-assignment triggered:
   - Finds available support agent with lowest workload
   - If no agent available: Queued for assignment
   - Assigned to agent based on category expertise
9. Ticket created with fields:
   - `firstResponseAt`: null (SLA clock started)
   - `slaStatus`: "on_track"
   - `escalationLevel`: 0
10. Notifications sent:
    - Client: Ticket confirmation email with ticket number
    - Assigned agent: New ticket notification
    - Manager: High/urgent ticket alert
11. Ticket appears in support queue
12. SLA timer begins countdown

**Endpoints Used:**
- `POST /api/support-tickets` - Ticket creation
- `GET /api/sla-configurations` - SLA rules
- `GET /api/users/available-agents` - Auto-assignment
- `POST /api/notifications` - Multi-party notifications

---

### 5.2 SLA Tracking and Escalation Journey
**Actor:** Support Agent / Manager
**Goal:** Meet SLA targets and escalate if needed

**Steps:**
1. Support agent receives ticket assignment notification
2. Opens ticket from support queue:
   - Ticket details displayed
   - SLA countdown timer shown (e.g., "First response due in 1h 23m")
   - Priority badge displayed
3. Agent reviews ticket:
   - Reads description and client history
   - Checks related tickets for context
   - Identifies issue severity
4. Agent provides first response:
   - Adds comment acknowledging ticket
   - Asks clarifying questions if needed
   - Sets expectations for resolution
5. System captures first response:
   - `firstResponseAt` timestamp set
   - Response time calculated in minutes
   - SLA first response target checked:
     - If on time: `slaStatus` remains "on_track"
     - If late: `slaStatus` changes to "breached"
6. Agent changes status to "in_progress"
7. Agent works on resolution:
   - Investigates issue
   - Logs internal notes (not visible to client)
   - Adds client-visible updates
   - Requests additional information if needed
8. System monitors SLA resolution target:
   - Resolution timer continues counting
   - If approaching target (80% time elapsed):
     - `slaStatus` changes to "at_risk"
     - Warning notification sent to agent and manager
9. **Auto-Escalation Triggered (if at risk):**
   - System checks escalation rules
   - If resolution time exceeded 90%:
     - Escalation level increased: 0 → 1 (Manager)
     - Manager assigned to ticket
     - Escalation reason: "SLA resolution target at risk"
     - Escalation logged in `ticketEscalations` table
10. Manager reviews escalated ticket:
    - Assesses situation
    - Decides on action:
      - **Option A:** Reassign to senior agent
      - **Option B:** Increase resource allocation
      - **Option C:** Adjust SLA expectations
11. Agent resolves ticket:
    - Adds resolution notes
    - Changes status to "resolved"
    - `resolvedAt` timestamp set
    - Resolution time calculated
12. Client notification sent:
    - Resolution summary
    - Satisfaction survey link
13. SLA performance recorded:
    - Response SLA: met/breached
    - Resolution SLA: met/breached
    - Total resolution time logged
14. Analytics updated:
    - Agent performance metrics
    - SLA compliance percentage
    - Average resolution time

**Endpoints Used:**
- `PATCH /api/support-tickets/:id` - Status updates
- `POST /api/support-tickets/:id/comments` - Add responses
- `GET /api/support-tickets/:id/sla-status` - SLA check
- `POST /api/ticket-escalations` - Manual/auto escalation
- `GET /api/analytics/support` - Performance metrics

**Escalation Rules:**
- Level 0 (Agent) → Level 1 (Manager): 90% SLA time elapsed
- Level 1 (Manager) → Level 2 (Senior Manager): Critical priority + breached
- Level 2 → Level 3 (Executive): Business-critical impact

---

## 6. Financial Management Journeys

### 6.1 Time Entry to Invoice Journey
**Actor:** Accountant / Finance Manager
**Goal:** Convert billable time to client invoice

**Steps:**
1. Finance manager navigates to Finance Hub
2. Reviews unbilled time entries:
   - Filtered by client/project
   - Date range selection
   - Billable flag verified
3. Selects time entries for invoicing:
   - Groups by project or client
   - Reviews hours and rates
   - Validates billable amounts
4. Clicks "Generate Invoice" button
5. Invoice creation wizard opens:
   - Pre-populated with selected time entries
   - Line items showing:
     - Task/project name
     - Hours worked
     - Hourly rate
     - Line total
6. Adds additional invoice details:
   - Invoice number (auto-generated or custom)
   - Due date (default: 30 days)
   - Tax rate and amount
   - Payment terms
   - Notes and special instructions
7. Reviews invoice summary:
   - Subtotal: Sum of all line items
   - Tax amount: Calculated from tax rate
   - Total: Subtotal + tax
8. Approves invoice creation
9. System generates invoice:
   - Invoice record created in `invoices` table
   - Status set to "draft"
   - PDF invoice generated
   - Time entries marked as "invoiced"
10. Invoice review and approval:
    - Finance manager reviews PDF
    - Makes edits if needed
    - Changes status from "draft" to "sent"
11. Invoice sent to client:
    - Email with PDF attachment
    - Payment portal link (if enabled)
    - Payment instructions
12. Client receives invoice:
    - Reviews charges
    - Processes payment
13. Payment recorded in system:
    - Status changed to "paid"
    - `paidAt` timestamp set
    - Payment method recorded
14. Analytics updated:
    - Revenue recognized
    - Accounts receivable reduced
    - Project profitability calculated
    - Cash flow forecast updated

**Endpoints Used:**
- `GET /api/time-entries/unbilled` - Unbilled time report
- `POST /api/invoices` - Invoice creation
- `POST /api/invoices/:id/generate-pdf` - PDF generation
- `PATCH /api/invoices/:id` - Status updates
- `POST /api/invoices/:id/send` - Email delivery

---

### 6.2 Budget Tracking and Variance Analysis Journey
**Actor:** Project Manager / Finance Manager
**Goal:** Monitor project budget and identify overruns

**Steps:**
1. Finance manager opens Budget Management dashboard
2. Selects project for analysis
3. Budget overview displayed:
   - **Budgeted Amount:** Original budget allocation
   - **Spent Amount:** Actual costs incurred to date
   - **Committed Amount:** Purchase orders and contracts
   - **Forecast Amount:** Projected final cost
   - **Variance:** Difference between budget and forecast
   - **Variance Percentage:** (Variance / Budget) × 100
4. Reviews budget breakdown by category:
   - Labor costs (time entries)
   - Materials and supplies
   - Software licenses
   - Travel and expenses
   - Overhead allocation
5. Identifies variances:
   - Categories exceeding budget highlighted in red
   - Positive variances (under budget) shown in green
   - Neutral variances (on budget) in gray
6. Analyzes variance trends:
   - Chart showing budget burn rate over time
   - Trend line predicting final cost
   - Milestone-based spending comparison
7. System provides variance explanations:
   - "Labor costs 15% over budget due to scope creep"
   - "Materials under budget by 8% due to vendor discount"
8. Reviews budget alerts:
   - **Warning Level (80% budget consumed):**
     - Yellow alert badge
     - Email notification sent
     - Recommendation: "Review remaining work and adjust forecasts"
   - **Critical Level (100% budget consumed):**
     - Red alert badge
     - Manager escalation email
     - Recommendation: "Request budget increase or reduce scope"
9. Takes corrective action:
   - **Option A:** Request budget increase
     - Prepares justification
     - Submits change request
     - Awaits approval
   - **Option B:** Optimize spending
     - Identifies cost reduction opportunities
     - Reallocates resources
     - Reduces scope if necessary
   - **Option C:** Accepts variance
     - Documents reasons
     - Updates forecast
     - Communicates to stakeholders
10. Updates project forecast:
    - Adjusts `forecastAmount` based on current trends
    - Recalculates variance
    - Updates project health score
11. Exports variance report:
    - PDF report with charts and explanations
    - Shared with project stakeholders
    - Archived for compliance

**Endpoints Used:**
- `GET /api/projects/:id/budget` - Budget details
- `GET /api/projects/:id/budget/variance` - Variance analysis
- `GET /api/expenses?projectId=:id` - Expense list
- `PATCH /api/project-budgets/:id` - Budget adjustments
- `GET /api/analytics/financial` - Financial trends

**Alert Thresholds:**
- Green (< 70% budget): On track
- Yellow (70-90% budget): Warning
- Orange (90-100% budget): At risk
- Red (> 100% budget): Over budget

---

## 7. Analytics & Reporting Journeys

### 7.1 Executive KPI Dashboard Journey
**Actor:** Executive / Business Owner
**Goal:** Monitor high-level business performance metrics

**Steps:**
1. Executive logs in and navigates to Dashboard
2. Executive KPI overview displayed with 6 key metrics:

   **A. Total Revenue (YTD)**
   - Current year revenue from invoices
   - Comparison to previous year
   - Percentage change displayed
   - Trend line showing monthly progression

   **B. Active Projects Count**
   - Number of projects in planning or active status
   - Breakdown by status (planning, active, review)
   - Project health distribution (healthy, at risk, critical)

   **C. Sales Pipeline Value**
   - Total value of open opportunities
   - Weighted value (value × probability)
   - Stage distribution (qualified, proposal, negotiation)

   **D. Client Satisfaction Score**
   - Average rating from closed tickets
   - Based on satisfaction surveys (1-5 scale)
   - Trend showing improvement/decline

   **E. Team Utilization Rate**
   - Percentage of available hours allocated
   - Individual team member breakdown
   - Over-allocation warnings

   **F. Outstanding Invoices**
   - Total accounts receivable
   - Aging analysis (current, 30 days, 60 days, 90+ days)
   - Overdue invoice count

3. Executive clicks on metric for drill-down:
   - Detailed charts and graphs
   - Historical trends (monthly, quarterly, annually)
   - Filters by department, team, project, client
4. Reviews AI-powered insights:
   - "Revenue trending 12% above target for Q4"
   - "Project delivery velocity improved 8% this month"
   - "3 high-value opportunities closing this week"
   - "Team utilization optimal at 85% (target: 80-90%)"
5. Identifies areas needing attention:
   - Projects behind schedule highlighted
   - Overdue invoices flagged
   - At-risk opportunities identified
6. Exports executive summary report:
   - PDF with all KPIs and charts
   - Scheduled for weekly email delivery
   - Shared with board members

**Endpoints Used:**
- `GET /api/dashboard/kpis` - All KPI metrics
- `GET /api/dashboard/revenue-trends` - Revenue analysis
- `GET /api/analytics/projects` - Project health
- `GET /api/analytics/team` - Team performance
- `GET /api/analytics/financial` - Financial metrics

---

### 7.2 AI-Powered Predictive Analytics Journey
**Actor:** Manager / Analyst
**Goal:** Leverage AI insights for business planning

**Steps:**
1. Manager navigates to Analytics page
2. Selects "Predictive Analytics" module
3. AI analysis displayed with 5 sections:

   **A. Revenue Forecasting**
   - ML model predicts next 6 months revenue
   - Based on historical revenue, pipeline, seasonality
   - Confidence intervals shown (optimistic, likely, pessimistic)
   - Assumptions documented

   **B. Risk Assessment**
   - Projects at risk identified using ML classification
   - Risk factors analyzed:
     - Budget overrun likelihood
     - Schedule delay probability
     - Resource constraint risk
   - Risk scores (0-100) with explanations
   - Mitigation recommendations provided

   **C. Opportunity Scoring**
   - AI ranks sales opportunities by close probability
   - Factors considered:
     - Stage and time in stage
     - Stakeholder engagement
     - Budget status
     - Historical win rates for similar deals
   - Recommended actions for each opportunity

   **D. Resource Optimization**
   - AI suggests optimal resource allocation
   - Identifies over-allocated team members
   - Recommends hiring or training needs
   - Projects team capacity for next quarter

   **E. Performance Predictions**
   - Predicts team member productivity trends
   - Identifies potential burnout risks
   - Suggests training or development opportunities
   - Forecasts employee satisfaction

4. Manager interacts with predictions:
   - Adjusts input variables to see impact
   - "What if" scenarios:
     - "What if we close 2 more deals this month?"
     - "What if we hire 3 more developers?"
   - AI recalculates predictions in real-time
5. Reviews AI recommendations:
   - Strategic recommendations with confidence scores:
     - "Hire 2 senior developers (87% confidence)"
     - "Focus on closing 3 qualified opportunities (92% confidence)"
     - "Increase budget for Project X by 15% (78% confidence)"
6. Exports AI insights report:
   - PDF with predictions and recommendations
   - Data sources and methodology documented
   - Action items prioritized
7. Tracks prediction accuracy:
   - System compares predictions to actual outcomes
   - Model accuracy improves over time
   - Feedback loop for continuous learning

**Endpoints Used:**
- `GET /api/analytics/revenue-forecast` - ML revenue prediction
- `GET /api/analytics/risk-assessment` - Project risk analysis
- `GET /api/analytics/opportunity-scoring` - Opportunity ranking
- `GET /api/analytics/resource-optimization` - Resource recommendations
- `GET /api/analytics/performance-predictions` - Team forecasts

**AI Model Details:**
- Revenue forecasting: Time series ARIMA model
- Risk assessment: Random forest classification
- Opportunity scoring: Logistic regression
- Models retrained monthly with new data

---

## 8. Security & Access Control Journeys

### 8.1 Role-Based Permission Check Journey
**Actor:** Any User
**Goal:** Access resource based on role and permissions

**Steps:**
1. User attempts to access a resource (e.g., delete project)
2. Request sent to API endpoint with authentication
3. RBAC middleware intercepts request:
   - Extracts user ID from session
   - Queries user's assigned roles
   - Retrieves role permissions from database
4. Permission evaluation:
   - Resource identified: "projects"
   - Action identified: "delete"
   - Required permission: "projects:delete"
5. System checks user permissions:
   - Looks up user's department (e.g., "projects")
   - Checks enhanced role (e.g., "manager")
   - Queries permission matrix for role + department + resource
6. **Permission Evaluation Logic:**
   - **Super Admin:** Granted (full access)
   - **Admin:** Check department match
   - **Manager:** Check department match + resource ownership
   - **Employee:** Check if user is assignee or creator
   - **Contractor:** Denied (limited permissions)
   - **Client:** Denied (read-only access)
7. **Permission Exceptions Checked:**
   - System queries `permissionExceptions` table
   - Checks for temporary elevated access
   - Validates exception is active and not expired
   - If exception found: Permission granted
8. **Decision Outcome:**
   - **Granted:** Request proceeds to handler
   - **Denied:** 403 Forbidden response returned
9. Audit log created:
   - Action: "delete_project_attempt"
   - User, resource, action logged
   - Permission decision recorded
   - Timestamp and IP address captured
10. If denied:
    - User sees "Access Denied" message
    - Explanation: "You don't have permission to delete projects"
    - Option to request access shown
11. Access request workflow (if denied):
    - User clicks "Request Access"
    - Justification form opens
    - Manager receives request
    - Approves or denies
    - If approved: Permission exception created with expiry

**Endpoints Used:**
- All API endpoints protected by `RBACMiddleware`
- `POST /api/permissions/check` - Manual permission check
- `POST /api/permission-exceptions` - Access request
- `POST /api/audit-logs` - Automatic audit logging

**Permission Resources (70+ protected):**
- Projects, Tasks, Clients, Companies, Opportunities
- Invoices, Expenses, Time Entries, Budgets
- Users, Roles, Permissions, Security Events
- Reports, Analytics, Exports, Backups

---

## Summary

This comprehensive user journey documentation covers all major workflows in the enterprise business platform, including:

✅ **8 Primary Journey Categories**
✅ **30+ Detailed User Journeys**
✅ **150+ API Endpoints Documented**
✅ **Real-time Features & WebSocket Integration**
✅ **AI/ML-Powered Workflows**
✅ **Security & Access Control**
✅ **Mobile & Multi-device Support**
✅ **Third-party Integration Workflows**

Each journey includes:
- Actor and goal definition
- Step-by-step process flow
- API endpoints used
- Business rules and validations
- Real-time features and notifications
- Error handling and edge cases
- Post-action analytics and updates

---

*Last Updated: 2025-09-29*
*Version: 1.0*
*Platform: Enterprise Business Management System*