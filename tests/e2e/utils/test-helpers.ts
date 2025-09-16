import { Page, expect, Locator } from '@playwright/test';

// Authentication helpers
export class AuthHelpers {
  constructor(private page: Page) {}

  async loginAsDevelopmentUser() {
    // Use the development login endpoint for E2E testing
    const response = await this.page.request.post('/api/auth/dev-login');
    await expect(response).toBeOK();

    // Navigate to the dashboard to ensure authentication worked
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // Verify we're logged in by checking for dashboard elements
    await expect(this.page.locator('[data-testid="layout"]')).toBeVisible({ timeout: 10000 });
  }

  async logout() {
    await this.page.goto('/api/logout');
    await this.page.waitForLoadState('networkidle');
  }
}

// Form helpers
export class FormHelpers {
  constructor(private page: Page) {}

  async fillInput(locator: string | Locator, value: string) {
    const input = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await input.fill(value);
  }

  async selectOption(locator: string | Locator, value: string) {
    const select = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await select.selectOption(value);
  }

  async clickSubmit(formSelector?: string) {
    const submitButton = formSelector
      ? this.page.locator(`${formSelector} button[type="submit"]`)
      : this.page.locator('button[type="submit"]');
    await submitButton.click();
  }

  async fillClientForm(clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    notes?: string;
  }) {
    await this.fillInput('[data-testid="client-name-input"]', clientData.name);

    if (clientData.email) {
      await this.fillInput('[data-testid="client-email-input"]', clientData.email);
    }

    if (clientData.phone) {
      await this.fillInput('[data-testid="client-phone-input"]', clientData.phone);
    }

    if (clientData.address) {
      await this.fillInput('[data-testid="client-address-input"]', clientData.address);
    }

    if (clientData.status) {
      await this.selectOption('[data-testid="client-status-select"]', clientData.status);
    }

    if (clientData.notes) {
      await this.fillInput('[data-testid="client-notes-input"]', clientData.notes);
    }
  }

  async fillProjectForm(projectData: {
    name: string;
    description?: string;
    clientId?: string;
    status?: string;
    budget?: string;
    startDate?: string;
    endDate?: string;
  }) {
    await this.fillInput('[data-testid="project-name-input"]', projectData.name);

    if (projectData.description) {
      await this.fillInput('[data-testid="project-description-input"]', projectData.description);
    }

    if (projectData.clientId) {
      await this.selectOption('[data-testid="project-client-select"]', projectData.clientId);
    }

    if (projectData.status) {
      await this.selectOption('[data-testid="project-status-select"]', projectData.status);
    }

    if (projectData.budget) {
      await this.fillInput('[data-testid="project-budget-input"]', projectData.budget);
    }
  }

  async fillInvoiceForm(invoiceData: {
    clientId?: string;
    projectId?: string;
    amount: string;
    description?: string;
    dueDate?: string;
  }) {
    if (invoiceData.clientId) {
      await this.selectOption('[data-testid="invoice-client-select"]', invoiceData.clientId);
    }

    if (invoiceData.projectId) {
      await this.selectOption('[data-testid="invoice-project-select"]', invoiceData.projectId);
    }

    await this.fillInput('[data-testid="invoice-amount-input"]', invoiceData.amount);

    if (invoiceData.description) {
      await this.fillInput('[data-testid="invoice-description-input"]', invoiceData.description);
    }
  }
}

// Navigation helpers
export class NavigationHelpers {
  constructor(private page: Page) {}

  async goToDashboard() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="layout"]')).toBeVisible();
  }

  async goToClients() {
    await this.page.goto('/clients');
    await this.page.waitForLoadState('networkidle');
  }

  async goToProjects() {
    await this.page.goto('/projects');
    await this.page.waitForLoadState('networkidle');
  }

  async goToTasks() {
    await this.page.goto('/tasks');
    await this.page.waitForLoadState('networkidle');
  }

  async goToFinance() {
    await this.page.goto('/finance');
    await this.page.waitForLoadState('networkidle');
  }

  async goToSupport() {
    await this.page.goto('/support');
    await this.page.waitForLoadState('networkidle');
  }

  async goToTeam() {
    await this.page.goto('/team');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateUsingSidebar(linkText: string) {
    await this.page.locator(`nav >> text="${linkText}"`).click();
    await this.page.waitForLoadState('networkidle');
  }
}

// Wait helpers
export class WaitHelpers {
  constructor(private page: Page) {}

  async waitForToast(message?: string) {
    if (message) {
      await expect(this.page.locator(`text="${message}"`)).toBeVisible();
    } else {
      await expect(this.page.locator('[role="status"]')).toBeVisible();
    }

    // Wait for toast to disappear
    await expect(this.page.locator('[role="status"]')).not.toBeVisible({ timeout: 10000 });
  }

  async waitForModal(modalSelector: string = '[role="dialog"]') {
    await expect(this.page.locator(modalSelector)).toBeVisible();
  }

  async waitForModalToClose(modalSelector: string = '[role="dialog"]') {
    await expect(this.page.locator(modalSelector)).not.toBeVisible();
  }

  async waitForTableToLoad(tableSelector: string = 'table') {
    await expect(this.page.locator(tableSelector)).toBeVisible();
    await expect(this.page.locator(`${tableSelector} tbody tr`)).toHaveCount(1, { timeout: 10000 });
  }

  async waitForDataToLoad() {
    // Wait for any loading spinners to disappear
    await expect(this.page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
  }
}

// Data helpers
export class DataHelpers {
  constructor(private page: Page) {}

  async resetTestData() {
    const response = await this.page.request.get('/api/test/reset');
    await expect(response).toBeOK();
  }

  async createTestClient(clientData: any = {}) {
    const defaultClient = {
      name: `Test Client ${Date.now()}`,
      email: `test${Date.now()}@client.com`,
      phone: '+1234567890',
      status: 'lead',
      notes: 'Created by E2E test',
      ...clientData
    };

    const response = await this.page.request.post('/api/clients', {
      data: defaultClient
    });

    await expect(response).toBeOK();
    return await response.json();
  }

  async createTestProject(projectData: any = {}) {
    // Create a client first if no clientId provided
    let clientId = projectData.clientId;
    if (!clientId) {
      const client = await this.createTestClient();
      clientId = client.id;
    }

    const defaultProject = {
      name: `Test Project ${Date.now()}`,
      description: 'Created by E2E test',
      clientId,
      status: 'planning',
      budget: '10000.00',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...projectData
    };

    const response = await this.page.request.post('/api/projects', {
      data: defaultProject
    });

    await expect(response).toBeOK();
    return await response.json();
  }

  async createTestInvoice(invoiceData: any = {}) {
    // Create client and project if needed
    let clientId = invoiceData.clientId;
    let projectId = invoiceData.projectId;

    if (!clientId) {
      const client = await this.createTestClient();
      clientId = client.id;
    }

    if (!projectId) {
      const project = await this.createTestProject({ clientId });
      projectId = project.id;
    }

    const defaultInvoice = {
      clientId,
      projectId,
      amount: '1000.00',
      tax: '100.00',
      total: '1100.00',
      status: 'draft',
      description: 'Test invoice created by E2E test',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...invoiceData
    };

    const response = await this.page.request.post('/api/invoices', {
      data: defaultInvoice
    });

    await expect(response).toBeOK();
    return await response.json();
  }
}

// Assertion helpers
export class AssertionHelpers {
  constructor(private page: Page) {}

  async assertClientExists(clientName: string) {
    await expect(this.page.locator(`text="${clientName}"`)).toBeVisible();
  }

  async assertProjectExists(projectName: string) {
    await expect(this.page.locator(`text="${projectName}"`)).toBeVisible();
  }

  async assertInvoiceExists(invoiceNumber: string) {
    await expect(this.page.locator(`text="${invoiceNumber}"`)).toBeVisible();
  }

  async assertURL(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  async assertPageTitle(title: string) {
    await expect(this.page.locator('h1')).toHaveText(title);
  }

  async assertTableRowCount(count: number, tableSelector: string = 'table') {
    await expect(this.page.locator(`${tableSelector} tbody tr`)).toHaveCount(count);
  }

  async assertSuccessToast() {
    await expect(this.page.locator('[role="status"]:has-text("Success")')).toBeVisible();
  }

  async assertErrorToast() {
    await expect(this.page.locator('[role="status"]:has-text("Error")')).toBeVisible();
  }
}

// Main test helper class that combines all helpers
export class E2ETestHelpers {
  public auth: AuthHelpers;
  public form: FormHelpers;
  public navigation: NavigationHelpers;
  public wait: WaitHelpers;
  public data: DataHelpers;
  public assert: AssertionHelpers;

  constructor(private page: Page) {
    this.auth = new AuthHelpers(page);
    this.form = new FormHelpers(page);
    this.navigation = new NavigationHelpers(page);
    this.wait = new WaitHelpers(page);
    this.data = new DataHelpers(page);
    this.assert = new AssertionHelpers(page);
  }

  // Convenience method for common setup
  async setupAuthenticatedSession() {
    await this.auth.loginAsDevelopmentUser();
    await this.data.resetTestData();
  }

  // Take screenshot with timestamp for debugging
  async debugScreenshot(name: string = 'debug') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `./test-results/${name}-${timestamp}.png`,
      fullPage: true
    });
  }
}