import { Page, Locator } from '@playwright/test';

export class FinancePage {
  readonly page: Page;

  // Main elements
  readonly createInvoiceButton: Locator;
  readonly addExpenseButton: Locator;
  readonly invoicesTab: Locator;
  readonly expensesTab: Locator;

  // Invoice elements
  readonly invoicesTable: Locator;
  readonly invoiceModal: Locator;
  readonly invoiceForm: Locator;
  readonly invoiceClientSelect: Locator;
  readonly invoiceProjectSelect: Locator;
  readonly invoiceAmountInput: Locator;
  readonly invoiceTaxInput: Locator;
  readonly invoiceDescriptionInput: Locator;
  readonly invoiceDueDateInput: Locator;
  readonly invoiceSubmitButton: Locator;

  // Expense elements
  readonly expensesTable: Locator;
  readonly expenseModal: Locator;
  readonly expenseForm: Locator;
  readonly expenseDescriptionInput: Locator;
  readonly expenseAmountInput: Locator;
  readonly expenseCategorySelect: Locator;
  readonly expenseProjectSelect: Locator;
  readonly expenseDateInput: Locator;
  readonly expenseSubmitButton: Locator;

  // Summary elements
  readonly totalRevenue: Locator;
  readonly totalExpenses: Locator;
  readonly netProfit: Locator;
  readonly pendingInvoices: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.createInvoiceButton = page.locator('[data-testid="create-invoice-button"]');
    this.addExpenseButton = page.locator('[data-testid="add-expense-button"]');
    this.invoicesTab = page.locator('[data-testid="invoices-tab"]');
    this.expensesTab = page.locator('[data-testid="expenses-tab"]');

    // Invoice elements
    this.invoicesTable = page.locator('[data-testid="invoices-table"]');
    this.invoiceModal = page.locator('[data-testid="invoice-modal"]');
    this.invoiceForm = page.locator('[data-testid="invoice-form"]');
    this.invoiceClientSelect = page.locator('[data-testid="invoice-client-select"]');
    this.invoiceProjectSelect = page.locator('[data-testid="invoice-project-select"]');
    this.invoiceAmountInput = page.locator('[data-testid="invoice-amount-input"]');
    this.invoiceTaxInput = page.locator('[data-testid="invoice-tax-input"]');
    this.invoiceDescriptionInput = page.locator('[data-testid="invoice-description-input"]');
    this.invoiceDueDateInput = page.locator('[data-testid="invoice-due-date-input"]');
    this.invoiceSubmitButton = page.locator('[data-testid="invoice-submit-button"]');

    // Expense elements
    this.expensesTable = page.locator('[data-testid="expenses-table"]');
    this.expenseModal = page.locator('[data-testid="expense-modal"]');
    this.expenseForm = page.locator('[data-testid="expense-form"]');
    this.expenseDescriptionInput = page.locator('[data-testid="expense-description-input"]');
    this.expenseAmountInput = page.locator('[data-testid="expense-amount-input"]');
    this.expenseCategorySelect = page.locator('[data-testid="expense-category-select"]');
    this.expenseProjectSelect = page.locator('[data-testid="expense-project-select"]');
    this.expenseDateInput = page.locator('[data-testid="expense-date-input"]');
    this.expenseSubmitButton = page.locator('[data-testid="expense-submit-button"]');

    // Summary elements
    this.totalRevenue = page.locator('[data-testid="total-revenue"]');
    this.totalExpenses = page.locator('[data-testid="total-expenses"]');
    this.netProfit = page.locator('[data-testid="net-profit"]');
    this.pendingInvoices = page.locator('[data-testid="pending-invoices"]');
  }

  async goto() {
    await this.page.goto('/finance');
    await this.page.waitForLoadState('networkidle');
  }

  async switchToInvoicesTab() {
    await this.invoicesTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async switchToExpensesTab() {
    await this.expensesTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Invoice operations
  async openCreateInvoiceModal() {
    await this.createInvoiceButton.click();
    await this.invoiceModal.waitFor({ state: 'visible' });
  }

  async fillInvoiceForm(invoiceData: {
    clientId?: string;
    projectId?: string;
    amount: string;
    tax?: string;
    description?: string;
    dueDate?: string;
  }) {
    if (invoiceData.clientId) {
      await this.invoiceClientSelect.selectOption(invoiceData.clientId);
    }

    if (invoiceData.projectId) {
      await this.invoiceProjectSelect.selectOption(invoiceData.projectId);
    }

    await this.invoiceAmountInput.fill(invoiceData.amount);

    if (invoiceData.tax) {
      await this.invoiceTaxInput.fill(invoiceData.tax);
    }

    if (invoiceData.description) {
      await this.invoiceDescriptionInput.fill(invoiceData.description);
    }

    if (invoiceData.dueDate) {
      await this.invoiceDueDateInput.fill(invoiceData.dueDate);
    }
  }

  async submitInvoiceForm() {
    await this.invoiceSubmitButton.click();
    await this.invoiceModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async createInvoice(invoiceData: {
    clientId?: string;
    projectId?: string;
    amount: string;
    tax?: string;
    description?: string;
    dueDate?: string;
  }) {
    await this.openCreateInvoiceModal();
    await this.fillInvoiceForm(invoiceData);
    await this.submitInvoiceForm();
  }

  async getInvoiceRow(invoiceNumber: string) {
    return this.page.locator(`tr:has-text("${invoiceNumber}")`);
  }

  async updateInvoiceStatus(invoiceNumber: string, status: string) {
    const invoiceRow = await this.getInvoiceRow(invoiceNumber);
    const statusButton = invoiceRow.locator('[data-testid="invoice-status-button"]');
    await statusButton.click();

    const statusOption = this.page.locator(`button:has-text("${status}")`);
    await statusOption.click();
  }

  async deleteInvoice(invoiceNumber: string) {
    const invoiceRow = await this.getInvoiceRow(invoiceNumber);
    const deleteButton = invoiceRow.locator('[data-testid="delete-invoice-button"]');
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = this.page.locator('button:has-text("Delete")');
    await confirmButton.click();
  }

  // Expense operations
  async openAddExpenseModal() {
    await this.addExpenseButton.click();
    await this.expenseModal.waitFor({ state: 'visible' });
  }

  async fillExpenseForm(expenseData: {
    description: string;
    amount: string;
    category?: string;
    projectId?: string;
    date?: string;
  }) {
    await this.expenseDescriptionInput.fill(expenseData.description);
    await this.expenseAmountInput.fill(expenseData.amount);

    if (expenseData.category) {
      await this.expenseCategorySelect.selectOption(expenseData.category);
    }

    if (expenseData.projectId) {
      await this.expenseProjectSelect.selectOption(expenseData.projectId);
    }

    if (expenseData.date) {
      await this.expenseDateInput.fill(expenseData.date);
    }
  }

  async submitExpenseForm() {
    await this.expenseSubmitButton.click();
    await this.expenseModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async createExpense(expenseData: {
    description: string;
    amount: string;
    category?: string;
    projectId?: string;
    date?: string;
  }) {
    await this.openAddExpenseModal();
    await this.fillExpenseForm(expenseData);
    await this.submitExpenseForm();
  }

  async getExpenseRow(description: string) {
    return this.page.locator(`tr:has-text("${description}")`);
  }

  async approveExpense(description: string) {
    const expenseRow = await this.getExpenseRow(description);
    const approveButton = expenseRow.locator('[data-testid="approve-expense-button"]');
    await approveButton.click();
  }

  async rejectExpense(description: string) {
    const expenseRow = await this.getExpenseRow(description);
    const rejectButton = expenseRow.locator('[data-testid="reject-expense-button"]');
    await rejectButton.click();
  }

  // Summary operations
  async getFinancialSummary() {
    return {
      totalRevenue: await this.totalRevenue.textContent(),
      totalExpenses: await this.totalExpenses.textContent(),
      netProfit: await this.netProfit.textContent(),
      pendingInvoices: await this.pendingInvoices.textContent()
    };
  }

  async waitForFinancePageToLoad() {
    await this.page.waitForLoadState('networkidle');

    // Wait for summary cards to load
    await this.totalRevenue.waitFor({ state: 'visible' });

    // Wait for loading indicators to disappear
    await this.page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 10000 });
  }

  async getInvoicesCount(): Promise<number> {
    await this.switchToInvoicesTab();
    await this.page.waitForLoadState('networkidle');
    return await this.invoicesTable.locator('tbody tr').count();
  }

  async getExpensesCount(): Promise<number> {
    await this.switchToExpensesTab();
    await this.page.waitForLoadState('networkidle');
    return await this.expensesTable.locator('tbody tr').count();
  }

  async verifyInvoiceExists(invoiceNumber: string): Promise<boolean> {
    await this.switchToInvoicesTab();
    const invoiceRow = this.getInvoiceRow(invoiceNumber);
    return await invoiceRow.isVisible();
  }

  async verifyExpenseExists(description: string): Promise<boolean> {
    await this.switchToExpensesTab();
    const expenseRow = this.getExpenseRow(description);
    return await expenseRow.isVisible();
  }
}