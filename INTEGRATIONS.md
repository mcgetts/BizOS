# Third-Party Integrations Guide

## Overview

The Business Platform includes comprehensive third-party integrations with Slack, Microsoft Teams, and GitHub to streamline team communication, project management, and development workflows. These integrations provide real-time notifications, automated task sync, and cross-platform collaboration features.

## Available Integrations

### 🔗 Slack Integration
- **Real-time project and task notifications**
- **Daily digest reports**
- **Alert system for critical events**
- **Webhook support for external triggers**
- **Channel-based routing for different message types**

### 🔗 Microsoft Teams Integration
- **Adaptive Card notifications with rich formatting**
- **Project status updates**
- **Team collaboration alerts**
- **Daily business digest with metrics**
- **Cross-platform message broadcasting**

### 🔗 GitHub Integration
- **Automatic issue creation from tasks**
- **Repository sync and project creation**
- **Commit activity tracking**
- **Pull request and issue monitoring**
- **Webhook handlers for real-time updates**

## Configuration

### Environment Variables

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# GitHub Configuration
GITHUB_TOKEN=ghp_your-github-token
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Microsoft Teams Configuration
TEAMS_WEBHOOK_URL=https://your-tenant.webhook.office.com/...
```

### Integration Configuration Object

```typescript
interface IntegrationConfig {
  slack: {
    enabled: boolean;
    botToken?: string;
    signingSecret?: string;
    appToken?: string;
    channels: {
      general?: string;
      projects?: string;
      alerts?: string;
      notifications?: string;
    };
    webhooks: {
      taskUpdates?: string;
      projectUpdates?: string;
      alerts?: string;
    };
  };

  github: {
    enabled: boolean;
    token?: string;
    repositories: Array<{
      owner: string;
      repo: string;
      branch?: string;
    }>;
    sync: {
      createIssuesFromTasks: boolean;
      createProjectsFromRepos: boolean;
      syncCommitsToTasks: boolean;
      syncPRsToTasks: boolean;
    };
    webhookSecret?: string;
  };

  teams: {
    enabled: boolean;
    webhookUrl?: string;
    botFrameworkAppId?: string;
    botFrameworkAppPassword?: string;
    tenantId?: string;
    channels: {
      general?: string;
      projects?: string;
      alerts?: string;
      notifications?: string;
    };
    features: {
      sendProjectUpdates: boolean;
      sendTaskNotifications: boolean;
      sendDailyDigests: boolean;
      sendAlerts: boolean;
    };
  };

  features: {
    crossPlatformNotifications: boolean;
    autoSyncEnabled: boolean;
    webhookRetries: number;
    webhookTimeout: number;
  };
}
```

## API Endpoints

### Status and Health Check

#### Get Integration Status
```http
GET /api/integrations/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "overall": "healthy",
  "services": {
    "slack": {
      "status": "connected",
      "message": "Connected - 15 messages sent"
    },
    "github": {
      "status": "connected",
      "message": "Connected - 3 issues created"
    },
    "teams": {
      "status": "connected",
      "message": "Connected - 12 messages sent"
    }
  }
}
```

#### Get Integration Statistics
```http
GET /api/integrations/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "slack": {
    "enabled": true,
    "messagessSent": 45,
    "lastMessage": "2024-01-15T10:30:00Z",
    "status": "connected"
  },
  "github": {
    "enabled": true,
    "issuesCreated": 12,
    "lastSync": "2024-01-15T09:15:00Z",
    "repositories": 3,
    "status": "connected"
  },
  "teams": {
    "enabled": true,
    "messagessSent": 38,
    "lastMessage": "2024-01-15T11:00:00Z",
    "status": "connected"
  }
}
```

### Testing Integrations

#### Test Slack Integration
```http
POST /api/integrations/test/slack
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Test notification from Business Platform"
}
```

#### Test Teams Integration
```http
POST /api/integrations/test/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Test notification from Business Platform"
}
```

#### Test GitHub Integration
```http
POST /api/integrations/test/github
Authorization: Bearer <token>
Content-Type: application/json

{
  "owner": "your-username",
  "repo": "your-repository"
}
```

### Manual Notifications

#### Send Project Notification
```http
POST /api/integrations/notify/project
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-uuid",
  "message": "Project milestone completed",
  "type": "completed"
}
```

#### Send Task Notification
```http
POST /api/integrations/notify/task
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": "task-uuid",
  "type": "completed"
}
```

### GitHub-Specific Endpoints

#### Get Repository Commits
```http
GET /api/integrations/github/repositories/{owner}/{repo}/commits?since=2024-01-01
Authorization: Bearer <token>
```

#### Create Project from Repository
```http
POST /api/integrations/github/repositories/{owner}/{repo}/create-project
Authorization: Bearer <token>
```

#### GitHub Webhook Handler
```http
POST /api/integrations/github/webhook
Content-Type: application/json
X-GitHub-Event: push
X-Hub-Signature-256: sha256=...

{
  "repository": { ... },
  "commits": [ ... ],
  "pusher": { ... }
}
```

### Daily Digest

#### Trigger Daily Digest
```http
POST /api/integrations/digest/send
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Daily digest sent",
  "stats": {
    "completedTasks": 8,
    "newProjects": 2,
    "overdueItems": 3,
    "teamActivity": [
      "• Task completed in Project Alpha - completed",
      "• New feature added in Project Beta - in_progress"
    ]
  }
}
```

## Setup Instructions

### 1. Slack Setup

1. **Create Slack App:**
   - Go to [Slack API](https://api.slack.com/apps)
   - Create new app from scratch
   - Add bot user with required permissions

2. **Required Bot Token Scopes:**
   ```
   chat:write
   chat:write.public
   channels:read
   users:read
   ```

3. **Install App to Workspace:**
   - Install app to your Slack workspace
   - Copy Bot User OAuth Token
   - Add bot to desired channels

4. **Configure Webhooks (Optional):**
   - Create incoming webhooks for specific channels
   - Add webhook URLs to configuration

### 2. Microsoft Teams Setup

1. **Create Incoming Webhook:**
   - In Teams channel, click "..." → Connectors
   - Add "Incoming Webhook"
   - Configure name and upload icon
   - Copy webhook URL

2. **Bot Framework (Advanced):**
   - Register app in [Azure Bot Service](https://dev.botframework.com/)
   - Get App ID and Password
   - Configure Teams channel

### 3. GitHub Setup

1. **Create Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create token with required permissions:
     ```
     repo (full control)
     admin:repo_hook
     read:user
     user:email
     ```

2. **Configure Repositories:**
   - Add repository owner/repo pairs to configuration
   - Set up webhook endpoints (optional)

3. **Webhook Configuration:**
   - Repository Settings → Webhooks → Add webhook
   - Payload URL: `https://yourdomain.com/api/integrations/github/webhook`
   - Content type: `application/json`
   - Events: `push`, `pull_request`, `issues`, `issue_comment`

## Usage Examples

### Automatic Notifications

The system automatically sends notifications when:

- **Tasks are created, updated, or completed**
- **Projects reach milestones**
- **Critical system alerts occur**
- **Daily digest reports are generated**

### Cross-Platform Broadcasting

When `crossPlatformNotifications` is enabled:

```typescript
// This will send to both Slack and Teams
await integrationManager.sendCrossplatformMessage(
  'System Alert',
  'Database backup completed successfully',
  'info'
);
```

### GitHub Integration Examples

```typescript
// Create GitHub issue from task
const issueUrl = await github.createIssueFromTask(task, project);

// Sync repository data
const data = await github.syncRepositoryData('owner', 'repo');

// Create project from repository
const projectData = await github.createProjectFromRepository('owner', 'repo');
```

### Custom Slack Messages

```typescript
// Send project notification
await slack.sendProjectNotification(
  project,
  'Sprint completed successfully!',
  'completed'
);

// Send daily digest
await slack.sendDailyDigest({
  completedTasks: 12,
  newProjects: 3,
  overdueItems: 1,
  teamActivity: ['Task A completed', 'Project B started']
});
```

### Teams Adaptive Cards

```typescript
// Send rich notification
await teams.sendTaskNotification(task, project, user, 'assigned');

// Send custom adaptive card
await teams.sendRichMessage([
  {
    type: 'TextBlock',
    text: 'Project Status Update',
    weight: 'Bolder',
    size: 'Large'
  },
  {
    type: 'FactSet',
    items: [{
      type: 'FactSet',
      facts: [
        { title: 'Status', value: 'On Track' },
        { title: 'Progress', value: '75%' }
      ]
    }]
  }
]);
```

## Troubleshooting

### Common Issues

#### Slack Integration Not Working
1. Verify bot token is correct and has required scopes
2. Check if bot is added to target channels
3. Ensure webhook URLs are accessible

#### Teams Messages Not Appearing
1. Confirm webhook URL is valid and not expired
2. Check Teams connector configuration
3. Verify message format follows Adaptive Card schema

#### GitHub API Errors
1. Check token permissions and expiration
2. Verify repository access rights
3. Confirm webhook secret matches configuration

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=integrations:*
```

### Health Monitoring

Monitor integration health via:
```http
GET /api/integrations/status
```

### Rate Limiting

All integrations respect platform rate limits:
- **Slack**: 1 request per second per channel
- **GitHub**: 5000 requests per hour
- **Teams**: 4 requests per second per webhook

## Security Considerations

1. **Token Security:** Store all tokens as environment variables
2. **Webhook Verification:** Always verify webhook signatures
3. **Access Control:** Limit integration endpoints to admin users
4. **Audit Logging:** Monitor all integration activities
5. **Rate Limiting:** Implement backoff strategies for API calls

## Advanced Configuration

### Custom Message Templates

```typescript
// Override default message formats
const customTemplates = {
  taskCompleted: (task, project, user) =>
    `🎉 ${user.name} completed "${task.title}" in ${project.name}!`,
  projectCreated: (project) =>
    `🚀 New project launched: ${project.name}`
};
```

### Conditional Notifications

```typescript
// Only notify for high-priority items
if (task.priority === 'urgent' || task.priority === 'high') {
  await integrationManager.notifyTaskEvent(task, project, user, 'updated');
}
```

### Scheduled Digests

Set up automated daily digests using cron jobs or scheduled tasks:
```bash
# Daily at 9 AM
0 9 * * * curl -X POST http://localhost:3000/api/integrations/digest/send
```

---

## Support

For integration support:
1. Check the health status endpoint
2. Review application logs for errors
3. Verify configuration settings
4. Test individual integrations separately
5. Contact system administrator

**Last Updated:** January 2024
**Version:** 2.0.0