import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // KPI Cards
  readonly kpiTotalRevenue: Locator;
  readonly kpiTotalClients: Locator;
  readonly kpiActiveProjects: Locator;
  readonly kpiTeamMembers: Locator;

  // Quick Actions
  readonly quickActionNewClient: Locator;
  readonly quickActionNewProject: Locator;
  readonly quickActionCreateInvoice: Locator;
  readonly quickActionAddTask: Locator;

  // Dashboard Sections
  readonly recentActivities: Locator;
  readonly projectOverview: Locator;
  readonly revenueChart: Locator;

  constructor(page: Page) {
    this.page = page;

    // KPI Cards
    this.kpiTotalRevenue = page.locator('[data-testid="kpi-total-revenue"]');
    this.kpiTotalClients = page.locator('[data-testid="kpi-total-clients"]');
    this.kpiActiveProjects = page.locator('[data-testid="kpi-active-projects"]');
    this.kpiTeamMembers = page.locator('[data-testid="kpi-team-members"]');

    // Quick Actions
    this.quickActionNewClient = page.locator('[data-testid="quick-action-new-client"]');
    this.quickActionNewProject = page.locator('[data-testid="quick-action-new-project"]');
    this.quickActionCreateInvoice = page.locator('[data-testid="quick-action-create-invoice"]');
    this.quickActionAddTask = page.locator('[data-testid="quick-action-add-task"]');

    // Dashboard Sections
    this.recentActivities = page.locator('[data-testid="recent-activities"]');
    this.projectOverview = page.locator('[data-testid="project-overview"]');
    this.revenueChart = page.locator('[data-testid="revenue-chart"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async getKPIValue(kpiName: string): Promise<string> {
    const kpiCard = this.page.locator(`[data-testid="kpi-${kpiName}"]`);
    return await kpiCard.textContent() || '';
  }

  async clickQuickAction(action: string) {
    const actionButton = this.page.locator(`[data-testid="quick-action-${action}"]`);
    await actionButton.click();
  }

  async waitForDashboardToLoad() {
    await this.page.waitForLoadState('networkidle');

    // Wait for dashboard components to be visible
    await this.kpiTotalRevenue.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for any loading indicators to disappear
    await this.page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 10000 });
  }

  async getProjectOverviewData() {
    const projectRows = await this.page.locator('[data-testid="project-overview"] tbody tr').all();
    const projects = [];

    for (const row of projectRows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 4) {
        projects.push({
          name: await cells[0].textContent(),
          client: await cells[1].textContent(),
          status: await cells[2].textContent(),
          progress: await cells[3].textContent()
        });
      }
    }

    return projects;
  }

  async getRecentActivities() {
    const activityItems = await this.page.locator('[data-testid="recent-activities"] li').all();
    const activities = [];

    for (const item of activityItems) {
      activities.push({
        text: await item.textContent(),
        timestamp: await item.locator('.timestamp').textContent()
      });
    }

    return activities;
  }
}