import { test, expect } from '@playwright/test';
import { E2ETestHelpers } from './utils/test-helpers';
import { DashboardPage } from './pages/dashboard.page';
import { ClientsPage } from './pages/clients.page';
import { FinancePage } from './pages/finance.page';

test.describe('Complete Business Workflows', () => {
  let helpers: E2ETestHelpers;
  let dashboardPage: DashboardPage;
  let clientsPage: ClientsPage;
  let financePage: FinancePage;

  test.beforeEach(async ({ page }) => {
    helpers = new E2ETestHelpers(page);
    dashboardPage = new DashboardPage(page);
    clientsPage = new ClientsPage(page);
    financePage = new FinancePage(page);

    // Setup authenticated session
    await helpers.setupAuthenticatedSession();
  });

  test('Complete Client Onboarding Workflow', async ({ page }) => {
    // Step 1: Navigate to clients page
    await clientsPage.goto();
    await clientsPage.waitForClientsToLoad();

    // Step 2: Create new client
    const clientData = {
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+1-555-123-4567',
      address: '123 Business Ave, City, State 12345',
      status: 'lead',
      notes: 'Potential high-value client from E2E test'
    };

    await clientsPage.createClient(clientData);

    // Step 3: Verify client was created
    await expect(helpers.wait.waitForToast()).resolves.not.toThrow();
    expect(await clientsPage.verifyClientExists(clientData.name)).toBe(true);

    // Step 4: Update client status to qualified
    await clientsPage.editClient(clientData.name);
    await clientsPage.fillClientForm({ ...clientData, status: 'qualified' });
    await clientsPage.submitClientForm();

    // Step 5: Verify status update
    await helpers.wait.waitForToast();
    const clientDetails = await clientsPage.getClientDetails(clientData.name);
    expect(clientDetails?.status).toBe('qualified');

    // Step 6: Convert client to active client
    await clientsPage.editClient(clientData.name);
    await clientsPage.fillClientForm({ ...clientData, status: 'client' });
    await clientsPage.submitClientForm();

    // Verify final status
    await helpers.wait.waitForToast();
    const finalClientDetails = await clientsPage.getClientDetails(clientData.name);
    expect(finalClientDetails?.status).toBe('client');
  });

  test('Project Creation and Management Workflow', async ({ page }) => {
    // Step 1: Create a client first
    await clientsPage.goto();
    const client = await helpers.data.createTestClient({
      name: 'Project Test Client',
      status: 'client'
    });

    // Step 2: Navigate to projects page
    await helpers.navigation.goToProjects();

    // Step 3: Create new project
    const projectData = {
      name: 'Website Redesign Project',
      description: 'Complete website redesign with modern UI/UX',
      clientId: client.id,
      status: 'planning',
      budget: '25000.00'
    };

    // Click create project button
    await page.locator('[data-testid="create-project-button"]').click();
    await helpers.wait.waitForModal();

    // Fill project form
    await helpers.form.fillProjectForm(projectData);
    await helpers.form.clickSubmit('[data-testid="project-form"]');

    // Step 4: Verify project creation
    await helpers.wait.waitForToast();
    await helpers.assert.assertProjectExists(projectData.name);

    // Step 5: Update project status to in progress
    const projectCard = page.locator(`[data-testid="project-card"]:has-text("${projectData.name}")`);
    await projectCard.locator('[data-testid="project-status-button"]').click();
    await page.locator('button:has-text("In Progress")').click();

    // Verify status update
    await helpers.wait.waitForToast();
    await expect(projectCard.locator('text="In Progress"')).toBeVisible();

    // Step 6: Complete project
    await projectCard.locator('[data-testid="project-status-button"]').click();
    await page.locator('button:has-text("Completed")').click();

    // Verify completion
    await helpers.wait.waitForToast();
    await expect(projectCard.locator('text="Completed"')).toBeVisible();
  });

  test('Invoice Creation and Payment Workflow', async ({ page }) => {
    // Step 1: Setup prerequisites (client and project)
    const client = await helpers.data.createTestClient();
    const project = await helpers.data.createTestProject({ clientId: client.id });

    // Step 2: Navigate to finance page
    await financePage.goto();
    await financePage.waitForFinancePageToLoad();

    // Step 3: Create new invoice
    const invoiceData = {
      clientId: client.id,
      projectId: project.id,
      amount: '5000.00',
      tax: '500.00',
      description: 'Website development services - Phase 1',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    await financePage.createInvoice(invoiceData);

    // Step 4: Verify invoice creation
    await helpers.wait.waitForToast();
    expect(await financePage.getInvoicesCount()).toBeGreaterThan(0);

    // Step 5: Send invoice
    const invoiceNumber = 'INV-' + Date.now(); // This would be generated by the system
    await financePage.switchToInvoicesTab();

    // Find the created invoice and update status
    const invoiceRows = await page.locator('[data-testid="invoices-table"] tbody tr').all();
    if (invoiceRows.length > 0) {
      const firstInvoice = invoiceRows[0];
      const statusButton = firstInvoice.locator('[data-testid="invoice-status-button"]');
      await statusButton.click();
      await page.locator('button:has-text("Sent")').click();

      // Verify status update
      await helpers.wait.waitForToast();
      await expect(firstInvoice.locator('text="Sent"')).toBeVisible();

      // Step 6: Mark as paid
      await statusButton.click();
      await page.locator('button:has-text("Paid")').click();

      // Verify payment
      await helpers.wait.waitForToast();
      await expect(firstInvoice.locator('text="Paid"')).toBeVisible();
    }

    // Step 7: Verify financial summary update
    const summary = await financePage.getFinancialSummary();
    expect(summary.totalRevenue).toBeDefined();
  });

  test('Expense Approval Workflow', async ({ page }) => {
    // Step 1: Setup project
    const project = await helpers.data.createTestProject();

    // Step 2: Navigate to finance page
    await financePage.goto();
    await financePage.switchToExpensesTab();

    // Step 3: Create new expense
    const expenseData = {
      description: 'Office supplies for project',
      amount: '150.00',
      category: 'office_supplies',
      projectId: project.id,
      date: new Date().toISOString().split('T')[0]
    };

    await financePage.createExpense(expenseData);

    // Step 4: Verify expense creation
    await helpers.wait.waitForToast();
    expect(await financePage.verifyExpenseExists(expenseData.description)).toBe(true);

    // Step 5: Approve expense
    await financePage.approveExpense(expenseData.description);

    // Step 6: Verify approval
    await helpers.wait.waitForToast();
    const expenseRow = await financePage.getExpenseRow(expenseData.description);
    await expect(expenseRow.locator('text="Approved"')).toBeVisible();

    // Step 7: Process reimbursement
    const reimburseButton = expenseRow.locator('[data-testid="reimburse-expense-button"]');
    if (await reimburseButton.isVisible()) {
      await reimburseButton.click();
      await helpers.wait.waitForToast();
      await expect(expenseRow.locator('text="Reimbursed"')).toBeVisible();
    }
  });

  test('Client Support Ticket Workflow', async ({ page }) => {
    // Step 1: Setup client
    const client = await helpers.data.createTestClient();

    // Step 2: Navigate to support page
    await helpers.navigation.goToSupport();

    // Step 3: Create support ticket
    await page.locator('[data-testid="create-ticket-button"]').click();
    await helpers.wait.waitForModal();

    const ticketData = {
      title: 'Login Issues',
      description: 'Client cannot access their account dashboard',
      clientId: client.id,
      category: 'technical',
      priority: 'high'
    };

    // Fill ticket form
    await page.locator('[data-testid="ticket-title-input"]').fill(ticketData.title);
    await page.locator('[data-testid="ticket-description-input"]').fill(ticketData.description);
    await page.locator('[data-testid="ticket-client-select"]').selectOption(ticketData.clientId);
    await page.locator('[data-testid="ticket-category-select"]').selectOption(ticketData.category);
    await page.locator('[data-testid="ticket-priority-select"]').selectOption(ticketData.priority);

    await helpers.form.clickSubmit('[data-testid="ticket-form"]');

    // Step 4: Verify ticket creation
    await helpers.wait.waitForToast();
    await expect(page.locator(`text="${ticketData.title}"`)).toBeVisible();

    // Step 5: Assign ticket
    const ticketRow = page.locator(`tr:has-text("${ticketData.title}")`);
    await ticketRow.locator('[data-testid="assign-ticket-button"]').click();

    await page.locator('[data-testid="assignee-select"]').selectOption('test-user-123');
    await page.locator('[data-testid="assign-confirm-button"]').click();

    // Step 6: Update ticket status
    await ticketRow.locator('[data-testid="ticket-status-button"]').click();
    await page.locator('button:has-text("In Progress")').click();
    await helpers.wait.waitForToast();

    // Step 7: Add resolution note
    await ticketRow.locator('[data-testid="add-note-button"]').click();
    await page.locator('[data-testid="note-input"]').fill('Reset password and verified access');
    await page.locator('[data-testid="add-note-submit"]').click();

    // Step 8: Resolve ticket
    await ticketRow.locator('[data-testid="ticket-status-button"]').click();
    await page.locator('button:has-text("Resolved")').click();
    await helpers.wait.waitForToast();

    // Step 9: Add customer satisfaction rating
    await ticketRow.locator('[data-testid="add-rating-button"]').click();
    await page.locator('[data-testid="rating-5-stars"]').click();
    await page.locator('[data-testid="feedback-input"]').fill('Quick and helpful support!');
    await page.locator('[data-testid="rating-submit"]').click();

    // Step 10: Close ticket
    await ticketRow.locator('[data-testid="ticket-status-button"]').click();
    await page.locator('button:has-text("Closed")').click();
    await helpers.wait.waitForToast();

    // Verify final status
    await expect(ticketRow.locator('text="Closed"')).toBeVisible();
    await expect(ticketRow.locator('text="5"')).toBeVisible(); // Rating
  });

  test('Team Member Assignment and Task Management', async ({ page }) => {
    // Step 1: Setup prerequisites
    const project = await helpers.data.createTestProject();

    // Step 2: Navigate to tasks page
    await helpers.navigation.goToTasks();

    // Step 3: Create new task
    await page.locator('[data-testid="create-task-button"]').click();
    await helpers.wait.waitForModal();

    const taskData = {
      title: 'Implement user authentication',
      description: 'Set up JWT authentication with role-based access',
      projectId: project.id,
      assigneeId: 'test-user-123',
      priority: 'high',
      estimatedHours: '16',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    // Fill task form
    await page.locator('[data-testid="task-title-input"]').fill(taskData.title);
    await page.locator('[data-testid="task-description-input"]').fill(taskData.description);
    await page.locator('[data-testid="task-project-select"]').selectOption(taskData.projectId);
    await page.locator('[data-testid="task-assignee-select"]').selectOption(taskData.assigneeId);
    await page.locator('[data-testid="task-priority-select"]').selectOption(taskData.priority);
    await page.locator('[data-testid="task-estimated-hours-input"]').fill(taskData.estimatedHours);
    await page.locator('[data-testid="task-due-date-input"]').fill(taskData.dueDate);

    await helpers.form.clickSubmit('[data-testid="task-form"]');

    // Step 4: Verify task creation
    await helpers.wait.waitForToast();
    await expect(page.locator(`text="${taskData.title}"`)).toBeVisible();

    // Step 5: Start working on task
    const taskRow = page.locator(`tr:has-text("${taskData.title}")`);
    await taskRow.locator('[data-testid="task-status-button"]').click();
    await page.locator('button:has-text("In Progress")').click();
    await helpers.wait.waitForToast();

    // Step 6: Log time
    await taskRow.locator('[data-testid="log-time-button"]').click();
    await page.locator('[data-testid="time-hours-input"]').fill('4');
    await page.locator('[data-testid="time-description-input"]').fill('Initial setup and planning');
    await page.locator('[data-testid="log-time-submit"]').click();

    // Step 7: Update progress
    await taskRow.locator('[data-testid="update-progress-button"]').click();
    await page.locator('[data-testid="progress-slider"]').fill('50');
    await page.locator('[data-testid="progress-notes"]').fill('Authentication endpoints implemented');
    await page.locator('[data-testid="progress-submit"]').click();

    // Step 8: Complete task
    await taskRow.locator('[data-testid="task-status-button"]').click();
    await page.locator('button:has-text("Review")').click();
    await helpers.wait.waitForToast();

    // Step 9: Review and approve
    await taskRow.locator('[data-testid="review-task-button"]').click();
    await page.locator('[data-testid="review-approve-button"]').click();
    await page.locator('[data-testid="review-comments"]').fill('Well implemented, good test coverage');
    await page.locator('[data-testid="review-submit"]').click();

    // Step 10: Mark as completed
    await taskRow.locator('[data-testid="task-status-button"]').click();
    await page.locator('button:has-text("Completed")').click();
    await helpers.wait.waitForToast();

    // Verify completion
    await expect(taskRow.locator('text="Completed"')).toBeVisible();
    await expect(taskRow.locator('text="100%"')).toBeVisible(); // Progress
  });

  test('End-to-End Business Process: Lead to Payment', async ({ page }) => {
    // Complete business workflow from lead generation to payment

    // Step 1: Create lead
    await clientsPage.goto();
    const leadData = {
      name: 'Future Tech Solutions',
      email: 'contact@futuretech.com',
      phone: '+1-555-987-6543',
      status: 'lead',
      notes: 'Interested in complete digital transformation'
    };

    await clientsPage.createClient(leadData);
    await helpers.wait.waitForToast();

    // Step 2: Qualify lead
    await clientsPage.editClient(leadData.name);
    await clientsPage.fillClientForm({ ...leadData, status: 'qualified' });
    await clientsPage.submitClientForm();
    await helpers.wait.waitForToast();

    // Step 3: Convert to client and create project
    await clientsPage.editClient(leadData.name);
    await clientsPage.fillClientForm({ ...leadData, status: 'client' });
    await clientsPage.submitClientForm();
    await helpers.wait.waitForToast();

    // Get client ID for project creation
    const clientDetails = await clientsPage.getClientDetails(leadData.name);
    const clientId = 'test-client-id'; // In real scenario, extract from UI

    // Step 4: Create project
    await helpers.navigation.goToProjects();
    await page.locator('[data-testid="create-project-button"]').click();

    const projectData = {
      name: 'Digital Transformation Initiative',
      description: 'Complete overhaul of digital infrastructure',
      budget: '50000.00'
    };

    await helpers.form.fillProjectForm({
      ...projectData,
      clientId: clientId
    });
    await helpers.form.clickSubmit('[data-testid="project-form"]');
    await helpers.wait.waitForToast();

    // Step 5: Create tasks for the project
    await helpers.navigation.goToTasks();
    const tasks = [
      { title: 'Requirements Analysis', hours: '20' },
      { title: 'System Design', hours: '30' },
      { title: 'Development Phase 1', hours: '40' }
    ];

    for (const task of tasks) {
      await page.locator('[data-testid="create-task-button"]').click();
      await page.locator('[data-testid="task-title-input"]').fill(task.title);
      await page.locator('[data-testid="task-estimated-hours-input"]').fill(task.hours);
      await helpers.form.clickSubmit('[data-testid="task-form"]');
      await helpers.wait.waitForToast();
    }

    // Step 6: Generate invoice
    await financePage.goto();
    await financePage.createInvoice({
      amount: '15000.00',
      tax: '1500.00',
      description: 'Digital Transformation - Phase 1'
    });
    await helpers.wait.waitForToast();

    // Step 7: Process payment
    await financePage.switchToInvoicesTab();
    const invoiceRows = await page.locator('[data-testid="invoices-table"] tbody tr').all();
    if (invoiceRows.length > 0) {
      const invoice = invoiceRows[0];

      // Send invoice
      await invoice.locator('[data-testid="invoice-status-button"]').click();
      await page.locator('button:has-text("Sent")').click();
      await helpers.wait.waitForToast();

      // Mark as paid
      await invoice.locator('[data-testid="invoice-status-button"]').click();
      await page.locator('button:has-text("Paid")').click();
      await helpers.wait.waitForToast();
    }

    // Step 8: Verify business metrics updated
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardToLoad();

    // Check that KPIs reflect the new business
    const revenueKPI = await dashboardPage.getKPIValue('total-revenue');
    const clientsKPI = await dashboardPage.getKPIValue('total-clients');
    const projectsKPI = await dashboardPage.getKPIValue('active-projects');

    expect(revenueKPI).toBeDefined();
    expect(clientsKPI).toBeDefined();
    expect(projectsKPI).toBeDefined();

    // Verify project appears in overview
    const projectOverview = await dashboardPage.getProjectOverviewData();
    expect(projectOverview.some(p => p.name?.includes('Digital Transformation'))).toBe(true);
  });
});