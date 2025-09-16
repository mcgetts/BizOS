import { Page, Locator } from '@playwright/test';

export class ClientsPage {
  readonly page: Page;

  // Main elements
  readonly addClientButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly clientsTable: Locator;

  // Modal elements
  readonly clientModal: Locator;
  readonly clientForm: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly addressInput: Locator;
  readonly statusSelect: Locator;
  readonly notesInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.addClientButton = page.locator('[data-testid="add-client-button"]');
    this.searchInput = page.locator('[data-testid="client-search-input"]');
    this.statusFilter = page.locator('[data-testid="client-status-filter"]');
    this.clientsTable = page.locator('[data-testid="clients-table"]');

    // Modal elements
    this.clientModal = page.locator('[role="dialog"]');
    this.clientForm = page.locator('[data-testid="client-form"]');
    this.nameInput = page.locator('[data-testid="client-name-input"]');
    this.emailInput = page.locator('[data-testid="client-email-input"]');
    this.phoneInput = page.locator('[data-testid="client-phone-input"]');
    this.addressInput = page.locator('[data-testid="client-address-input"]');
    this.statusSelect = page.locator('[data-testid="client-status-select"]');
    this.notesInput = page.locator('[data-testid="client-notes-input"]');
    this.submitButton = page.locator('[data-testid="client-form-submit"]');
    this.cancelButton = page.locator('[data-testid="client-form-cancel"]');
  }

  async goto() {
    await this.page.goto('/clients');
    await this.page.waitForLoadState('networkidle');
  }

  async searchForClient(clientName: string) {
    await this.searchInput.fill(clientName);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }

  async openAddClientModal() {
    await this.addClientButton.click();
    await this.clientModal.waitFor({ state: 'visible' });
  }

  async fillClientForm(clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    notes?: string;
  }) {
    await this.nameInput.fill(clientData.name);

    if (clientData.email) {
      await this.emailInput.fill(clientData.email);
    }

    if (clientData.phone) {
      await this.phoneInput.fill(clientData.phone);
    }

    if (clientData.address) {
      await this.addressInput.fill(clientData.address);
    }

    if (clientData.status) {
      await this.statusSelect.selectOption(clientData.status);
    }

    if (clientData.notes) {
      await this.notesInput.fill(clientData.notes);
    }
  }

  async submitClientForm() {
    await this.submitButton.click();
    await this.clientModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async cancelClientForm() {
    await this.cancelButton.click();
    await this.clientModal.waitFor({ state: 'hidden' });
  }

  async createClient(clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    notes?: string;
  }) {
    await this.openAddClientModal();
    await this.fillClientForm(clientData);
    await this.submitClientForm();
  }

  async getClientRow(clientName: string) {
    return this.page.locator(`tr:has-text("${clientName}")`);
  }

  async editClient(clientName: string) {
    const clientRow = await this.getClientRow(clientName);
    const editButton = clientRow.locator('[data-testid="edit-client-button"]');
    await editButton.click();
    await this.clientModal.waitFor({ state: 'visible' });
  }

  async deleteClient(clientName: string) {
    const clientRow = await this.getClientRow(clientName);
    const deleteButton = clientRow.locator('[data-testid="delete-client-button"]');
    await deleteButton.click();

    // Confirm deletion in alert dialog
    const confirmButton = this.page.locator('button:has-text("Delete")');
    await confirmButton.click();
  }

  async getClientsCount(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    const rows = await this.clientsTable.locator('tbody tr').count();
    return rows;
  }

  async getAllClientNames(): Promise<string[]> {
    await this.page.waitForLoadState('networkidle');
    const namesCells = await this.clientsTable.locator('tbody tr td:first-child').all();
    const names = [];

    for (const cell of namesCells) {
      const name = await cell.textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }

  async getClientDetails(clientName: string) {
    const clientRow = await this.getClientRow(clientName);
    const cells = await clientRow.locator('td').all();

    if (cells.length >= 5) {
      return {
        name: await cells[0].textContent(),
        email: await cells[1].textContent(),
        phone: await cells[2].textContent(),
        status: await cells[3].textContent(),
        lastContact: await cells[4].textContent()
      };
    }

    return null;
  }

  async waitForClientsToLoad() {
    await this.page.waitForLoadState('networkidle');

    // Wait for table to be visible
    await this.clientsTable.waitFor({ state: 'visible' });

    // Wait for loading indicators to disappear
    await this.page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 10000 });
  }

  async verifyClientExists(clientName: string): Promise<boolean> {
    await this.waitForClientsToLoad();
    const clientRow = this.getClientRow(clientName);
    return await clientRow.isVisible();
  }

  async verifyClientNotExists(clientName: string): Promise<boolean> {
    await this.waitForClientsToLoad();
    const clientRow = this.getClientRow(clientName);
    return !(await clientRow.isVisible());
  }
}