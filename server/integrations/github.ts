import { Octokit } from '@octokit/rest';
import type { Project, Task } from '@shared/schema';

export interface GitHubConfig {
  token?: string;
  enabled: boolean;
  repositories: {
    owner: string;
    repo: string;
    branch?: string;
  }[];
  sync: {
    createIssuesFromTasks: boolean;
    createProjectsFromRepos: boolean;
    syncCommitsToTasks: boolean;
    syncPRsToTasks: boolean;
  };
  webhookSecret?: string;
}

export class GitHubIntegration {
  private octokit: Octokit | null = null;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    if (config.enabled && config.token) {
      this.octokit = new Octokit({ auth: config.token });
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.octokit) {
      console.log('GitHub integration disabled - no token provided');
      return false;
    }

    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      console.log('GitHub integration initialized for user:', data.login);
      return true;
    } catch (error) {
      console.error('Failed to initialize GitHub integration:', error);
      return false;
    }
  }

  async createIssueFromTask(task: Task, project: Project): Promise<string | null> {
    if (!this.octokit || !this.config.sync.createIssuesFromTasks) return null;

    const repo = this.config.repositories.find(r =>
      project.name.toLowerCase().includes(r.repo.toLowerCase()) ||
      project.description?.toLowerCase().includes(r.repo.toLowerCase())
    );

    if (!repo) {
      console.warn('No matching repository found for project:', project.name);
      return null;
    }

    try {
      const { data: issue } = await this.octokit.rest.issues.create({
        owner: repo.owner,
        repo: repo.repo,
        title: task.title,
        body: this.formatTaskDescription(task, project),
        labels: this.getLabelsFromTask(task),
        assignees: [], // Could map to GitHub users
      });

      console.log('Created GitHub issue:', issue.html_url);
      return issue.html_url;
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
      return null;
    }
  }

  async updateIssueFromTask(issueUrl: string, task: Task): Promise<boolean> {
    if (!this.octokit) return false;

    try {
      const { owner, repo, issueNumber } = this.parseIssueUrl(issueUrl);
      if (!owner || !repo || !issueNumber) return false;

      await this.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        title: task.title,
        body: this.formatTaskDescription(task),
        state: task.status === 'completed' ? 'closed' : 'open',
        labels: this.getLabelsFromTask(task),
      });

      console.log('Updated GitHub issue:', issueUrl);
      return true;
    } catch (error) {
      console.error('Failed to update GitHub issue:', error);
      return false;
    }
  }

  async syncRepositoryData(owner: string, repo: string): Promise<{
    commits: any[];
    pullRequests: any[];
    issues: any[];
  }> {
    if (!this.octokit) return { commits: [], pullRequests: [], issues: [] };

    try {
      const [commits, pullRequests, issues] = await Promise.all([
        this.octokit.rest.repos.listCommits({
          owner,
          repo,
          since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          per_page: 50
        }),
        this.octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: 20
        }),
        this.octokit.rest.issues.list({
          owner,
          repo,
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: 50,
          filter: 'all'
        })
      ]);

      return {
        commits: commits.data,
        pullRequests: pullRequests.data,
        issues: issues.data
      };
    } catch (error) {
      console.error('Failed to sync repository data:', error);
      return { commits: [], pullRequests: [], issues: [] };
    }
  }

  async createProjectFromRepository(owner: string, repo: string): Promise<Partial<Project> | null> {
    if (!this.octokit || !this.config.sync.createProjectsFromRepos) return null;

    try {
      const { data: repository } = await this.octokit.rest.repos.get({ owner, repo });
      const { data: languages } = await this.octokit.rest.repos.listLanguages({ owner, repo });
      const { data: contributors } = await this.octokit.rest.repos.listContributors({ owner, repo });

      return {
        name: repository.name,
        description: repository.description || '',
        status: repository.archived ? 'completed' : 'active',
        type: 'development',
        startDate: repository.created_at,
        clientId: null, // Would need to map to existing clients
        metadata: {
          githubUrl: repository.html_url,
          language: Object.keys(languages)[0] || 'Unknown',
          languages: Object.keys(languages),
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          contributors: contributors.length,
          lastCommit: repository.pushed_at,
          isPrivate: repository.private,
          defaultBranch: repository.default_branch
        }
      };
    } catch (error) {
      console.error('Failed to create project from repository:', error);
      return null;
    }
  }

  async getCommitActivity(owner: string, repo: string, since?: Date): Promise<any[]> {
    if (!this.octokit) return [];

    try {
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        since: since?.toISOString(),
        per_page: 100
      });

      return commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name,
          email: commit.commit.author?.email,
          username: commit.author?.login
        },
        date: commit.commit.author?.date,
        url: commit.html_url,
        stats: null // Would need separate API call for stats
      }));
    } catch (error) {
      console.error('Failed to get commit activity:', error);
      return [];
    }
  }

  async createWebhook(owner: string, repo: string, callbackUrl: string): Promise<boolean> {
    if (!this.octokit) return false;

    try {
      await this.octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: callbackUrl,
          content_type: 'json',
          secret: this.config.webhookSecret,
        },
        events: ['push', 'pull_request', 'issues', 'issue_comment', 'pull_request_review']
      });

      console.log(`Created webhook for ${owner}/${repo}`);
      return true;
    } catch (error) {
      console.error('Failed to create webhook:', error);
      return false;
    }
  }

  // Webhook handlers
  handleWebhookEvent(event: string, payload: any): {
    type: string;
    action: string;
    data: any;
  } | null {
    switch (event) {
      case 'push':
        return {
          type: 'commit',
          action: 'pushed',
          data: {
            repository: payload.repository.full_name,
            commits: payload.commits,
            pusher: payload.pusher,
            ref: payload.ref
          }
        };

      case 'pull_request':
        return {
          type: 'pull_request',
          action: payload.action,
          data: {
            repository: payload.repository.full_name,
            pullRequest: payload.pull_request,
            sender: payload.sender
          }
        };

      case 'issues':
        return {
          type: 'issue',
          action: payload.action,
          data: {
            repository: payload.repository.full_name,
            issue: payload.issue,
            sender: payload.sender
          }
        };

      case 'issue_comment':
        return {
          type: 'comment',
          action: payload.action,
          data: {
            repository: payload.repository.full_name,
            issue: payload.issue,
            comment: payload.comment,
            sender: payload.sender
          }
        };

      default:
        console.log('Unhandled webhook event:', event);
        return null;
    }
  }

  // Helper methods
  private formatTaskDescription(task: Task, project?: Project): string {
    let description = task.description || '';

    description += '\n\n---\n';
    description += `**Project:** ${project?.name || 'Unknown'}\n`;
    description += `**Priority:** ${task.priority}\n`;
    description += `**Status:** ${task.status}\n`;

    if (task.dueDate) {
      description += `**Due Date:** ${new Date(task.dueDate).toLocaleDateString()}\n`;
    }

    description += '\n*Created from Business Platform*';

    return description;
  }

  private getLabelsFromTask(task: Task): string[] {
    const labels: string[] = [];

    labels.push(task.priority);
    labels.push(task.status);
    labels.push('business-platform');

    return labels;
  }

  private parseIssueUrl(url: string): {
    owner?: string;
    repo?: string;
    issueNumber?: number;
  } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    if (!match) return {};

    return {
      owner: match[1],
      repo: match[2],
      issueNumber: parseInt(match[3], 10)
    };
  }
}