import { sentryService } from '../monitoring/sentryService.js';

export interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
  defaultProject: string;
  issueTypes: string[];
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee?: string;
  reporter: string;
  priority: string;
  issueType: string;
  created: Date;
  updated: Date;
  labels: string[];
  components: string[];
}

export class JiraIntegration {
  private config: JiraConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    this.config = {
      host: process.env.JIRA_HOST || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      defaultProject: process.env.JIRA_DEFAULT_PROJECT || '',
      issueTypes: (process.env.JIRA_ISSUE_TYPES || 'Task,Bug,Story').split(',')
    };

    this.baseUrl = `https://${this.config.host}/rest/api/3`;
    this.authHeader = `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`;
  }

  /**
   * Test Jira connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/myself`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Jira connection test successful');
      return true;

    } catch (error) {
      console.error('❌ Jira connection test failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'jira_integration',
        action: 'test_connection'
      });
      return false;
    }
  }

  /**
   * Create Jira issue
   */
  async createIssue(issue: {
    summary: string;
    description: string;
    issueType: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    project?: string;
  }): Promise<JiraIssue | null> {
    try {
      const payload = {
        fields: {
          project: {
            key: issue.project || this.config.defaultProject
          },
          summary: issue.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: issue.description
              }]
            }]
          },
          issuetype: {
            name: issue.issueType
          },
          priority: issue.priority ? { name: issue.priority } : undefined,
          assignee: issue.assignee ? { emailAddress: issue.assignee } : undefined,
          labels: issue.labels || []
        }
      };

      const response = await fetch(`${this.baseUrl}/issue`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create Jira issue: ${response.status} ${errorData}`);
      }

      const result = await response.json();

      // Fetch full issue details
      const fullIssue = await this.getIssue(result.key);

      console.log(`✅ Created Jira issue: ${result.key}`);
      return fullIssue;

    } catch (error) {
      console.error('❌ Failed to create Jira issue:', error);
      sentryService.captureException(error as Error, {
        feature: 'jira_integration',
        action: 'create_issue',
        additionalData: { summary: issue.summary }
      });
      return null;
    }
  }

  /**
   * Get Jira issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue | null> {
    try {
      const response = await fetch(`${this.baseUrl}/issue/${issueKey}`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get Jira issue: ${response.status}`);
      }

      const issue = await response.json();

      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: this.extractTextFromDescription(issue.fields.description),
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.emailAddress,
        reporter: issue.fields.reporter.emailAddress,
        priority: issue.fields.priority?.name || 'Medium',
        issueType: issue.fields.issuetype.name,
        created: new Date(issue.fields.created),
        updated: new Date(issue.fields.updated),
        labels: issue.fields.labels || [],
        components: issue.fields.components?.map((c: any) => c.name) || []
      };

    } catch (error) {
      console.error('❌ Failed to get Jira issue:', error);
      return null;
    }
  }

  /**
   * Update Jira issue
   */
  async updateIssue(issueKey: string, updates: {
    summary?: string;
    description?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    labels?: string[];
  }): Promise<boolean> {
    try {
      const fields: any = {};

      if (updates.summary) fields.summary = updates.summary;
      if (updates.description) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: updates.description
            }]
          }]
        };
      }
      if (updates.assignee) fields.assignee = { emailAddress: updates.assignee };
      if (updates.priority) fields.priority = { name: updates.priority };
      if (updates.labels) fields.labels = updates.labels;

      // Handle status transition separately
      if (updates.status) {
        await this.transitionIssue(issueKey, updates.status);
      }

      if (Object.keys(fields).length > 0) {
        const response = await fetch(`${this.baseUrl}/issue/${issueKey}`, {
          method: 'PUT',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields })
        });

        if (!response.ok) {
          throw new Error(`Failed to update Jira issue: ${response.status}`);
        }
      }

      console.log(`✅ Updated Jira issue: ${issueKey}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to update Jira issue:', error);
      return false;
    }
  }

  /**
   * Transition issue status
   */
  async transitionIssue(issueKey: string, status: string): Promise<boolean> {
    try {
      // Get available transitions
      const transitionsResponse = await fetch(`${this.baseUrl}/issue/${issueKey}/transitions`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!transitionsResponse.ok) {
        throw new Error('Failed to get issue transitions');
      }

      const transitions = await transitionsResponse.json();
      const targetTransition = transitions.transitions.find((t: any) =>
        t.to.name.toLowerCase() === status.toLowerCase()
      );

      if (!targetTransition) {
        throw new Error(`No transition available to status: ${status}`);
      }

      // Perform transition
      const response = await fetch(`${this.baseUrl}/issue/${issueKey}/transitions`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transition: {
            id: targetTransition.id
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to transition issue: ${response.status}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to transition Jira issue:', error);
      return false;
    }
  }

  /**
   * Search for issues
   */
  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jql,
          maxResults,
          fields: ['summary', 'description', 'status', 'assignee', 'reporter', 'priority', 'issuetype', 'created', 'updated', 'labels', 'components']
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to search Jira issues: ${response.status}`);
      }

      const result = await response.json();

      return result.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: this.extractTextFromDescription(issue.fields.description),
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.emailAddress,
        reporter: issue.fields.reporter.emailAddress,
        priority: issue.fields.priority?.name || 'Medium',
        issueType: issue.fields.issuetype.name,
        created: new Date(issue.fields.created),
        updated: new Date(issue.fields.updated),
        labels: issue.fields.labels || [],
        components: issue.fields.components?.map((c: any) => c.name) || []
      }));

    } catch (error) {
      console.error('❌ Failed to search Jira issues:', error);
      return [];
    }
  }

  /**
   * Get project information
   */
  async getProject(projectKey: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectKey}`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get Jira project: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to get Jira project:', error);
      return null;
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey: string, comment: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: comment
              }]
            }]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status}`);
      }

      console.log(`✅ Added comment to Jira issue: ${issueKey}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to add comment to Jira issue:', error);
      return false;
    }
  }

  /**
   * Get issue comments
   */
  async getComments(issueKey: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/issue/${issueKey}/comment`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get comments: ${response.status}`);
      }

      const result = await response.json();
      return result.comments || [];

    } catch (error) {
      console.error('❌ Failed to get Jira issue comments:', error);
      return [];
    }
  }

  /**
   * Extract text from Jira description format
   */
  private extractTextFromDescription(description: any): string {
    if (!description) return '';

    if (typeof description === 'string') {
      return description;
    }

    if (description.content) {
      return description.content
        .map((node: any) => {
          if (node.content) {
            return node.content
              .map((textNode: any) => textNode.text || '')
              .join('');
          }
          return '';
        })
        .join('\n');
    }

    return '';
  }

  /**
   * Handle webhook from Jira
   */
  async handleWebhook(payload: any): Promise<boolean> {
    try {
      const { webhookEvent, issue, user, changelog } = payload;

      console.log(`📥 Jira webhook received: ${webhookEvent}`);

      switch (webhookEvent) {
        case 'jira:issue_created':
          await this.handleIssueCreated(issue, user);
          break;
        case 'jira:issue_updated':
          await this.handleIssueUpdated(issue, user, changelog);
          break;
        case 'jira:issue_deleted':
          await this.handleIssueDeleted(issue, user);
          break;
        default:
          console.log(`Unhandled Jira webhook event: ${webhookEvent}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to handle Jira webhook:', error);
      return false;
    }
  }

  private async handleIssueCreated(issue: any, user: any): Promise<void> {
    console.log(`📝 New Jira issue created: ${issue.key} - ${issue.fields.summary}`);
    // Handle issue creation logic here
  }

  private async handleIssueUpdated(issue: any, user: any, changelog: any): Promise<void> {
    console.log(`📝 Jira issue updated: ${issue.key} - ${issue.fields.summary}`);
    // Handle issue update logic here
  }

  private async handleIssueDeleted(issue: any, user: any): Promise<void> {
    console.log(`🗑️ Jira issue deleted: ${issue.key}`);
    // Handle issue deletion logic here
  }

  /**
   * Get integration configuration
   */
  getConfig(): JiraConfig {
    return { ...this.config };
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!(this.config.host && this.config.email && this.config.apiToken);
  }
}