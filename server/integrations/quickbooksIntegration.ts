import IntuitOAuth from 'intuit-oauth';
const OAuthClient = (IntuitOAuth as any).OAuthClient || IntuitOAuth;
import { db } from '../db.js';
import { eq } from 'drizzle-orm';
import { clients, invoices, expenses } from '../../shared/schema.js';
import { sentryService } from '../monitoring/sentryService.js';

interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
  scope: string;
}

interface QuickBooksCustomer {
  Id: string;
  Name: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
}

interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name: string };
  Line: Array<{
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
      ItemRef: { value: string; name: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  PrintStatus?: string;
  EmailStatus?: string;
}

export class QuickBooksIntegration {
  private oauthClient: OAuthClient;
  private config: QuickBooksConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private companyId?: string;
  private baseUrl: string;

  constructor(config: QuickBooksConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    this.oauthClient = new OAuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      environment: config.environment,
      redirectUri: config.redirectUri,
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(): string {
    const authUri = this.oauthClient.authorizeUri({
      scope: [(OAuthClient as any).scopes?.Accounting || 'com.intuit.quickbooks.accounting'],
      state: 'quickbooks_auth'
    });
    return authUri;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(authCode: string, state: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authResponse = await this.oauthClient.createToken(authCode);

      this.accessToken = authResponse.getToken().access_token;
      this.refreshToken = authResponse.getToken().refresh_token;
      this.companyId = authResponse.getToken().realmId;

      // Store tokens securely (in production, encrypt these)
      console.log('QuickBooks authentication successful');
      console.log('Company ID:', this.companyId);

      return { success: true };
    } catch (error) {
      console.error('QuickBooks token exchange failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'quickbooks_integration',
        action: 'token_exchange'
      });
      return { success: false, error: error instanceof Error ? error.message : 'Token exchange failed' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const authResponse = await this.oauthClient.refreshUsingToken(this.refreshToken);
      this.accessToken = authResponse.getToken().access_token;
      this.refreshToken = authResponse.getToken().refresh_token;

      return true;
    } catch (error) {
      console.error('QuickBooks token refresh failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'quickbooks_integration',
        action: 'token_refresh'
      });
      return false;
    }
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    if (!this.accessToken || !this.companyId) {
      throw new Error('Not authenticated with QuickBooks');
    }

    const url = `${this.baseUrl}/v3/company/${this.companyId}/${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          return this.apiRequest(endpoint, method, data);
        }
      }
      throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  /**
   * Sync customers from QuickBooks to our database
   */
  async syncCustomers(): Promise<{ synced: number; errors: number }> {
    try {
      console.log('Starting QuickBooks customer sync...');

      const response = await this.apiRequest("customers?maxresults=1000");
      const customers: QuickBooksCustomer[] = response.QueryResponse?.Customer || [];

      let synced = 0;
      let errors = 0;

      for (const qbCustomer of customers) {
        try {
          // Check if client already exists
          const existingClient = await db.select()
            .from(clients)
            .where(eq(clients.quickbooksId, qbCustomer.Id))
            .limit(1);

          const clientData = {
            name: qbCustomer.Name,
            companyName: qbCustomer.CompanyName,
            email: qbCustomer.PrimaryEmailAddr?.Address,
            phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
            address: qbCustomer.BillAddr ? [
              qbCustomer.BillAddr.Line1,
              qbCustomer.BillAddr.City,
              qbCustomer.BillAddr.CountrySubDivisionCode,
              qbCustomer.BillAddr.PostalCode
            ].filter(Boolean).join(', ') : null,
            quickbooksId: qbCustomer.Id,
            updatedAt: new Date()
          };

          if (existingClient.length > 0) {
            // Update existing client
            await db.update(clients)
              .set(clientData)
              .where(eq(clients.id, existingClient[0].id));
          } else {
            // Create new client
            await db.insert(clients).values({
              ...clientData,
              status: 'active',
              createdAt: new Date()
            });
          }

          synced++;
        } catch (error) {
          console.error(`Failed to sync customer ${qbCustomer.Id}:`, error);
          errors++;
        }
      }

      console.log(`QuickBooks customer sync completed: ${synced} synced, ${errors} errors`);
      return { synced, errors };

    } catch (error) {
      console.error('QuickBooks customer sync failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'quickbooks_integration',
        action: 'sync_customers'
      });
      throw error;
    }
  }

  /**
   * Sync invoices from QuickBooks to our database
   */
  async syncInvoices(): Promise<{ synced: number; errors: number }> {
    try {
      console.log('Starting QuickBooks invoice sync...');

      const response = await this.apiRequest("invoices?maxresults=1000");
      const qbInvoices: QuickBooksInvoice[] = response.QueryResponse?.Invoice || [];

      let synced = 0;
      let errors = 0;

      for (const qbInvoice of qbInvoices) {
        try {
          // Find corresponding client
          const client = await db.select()
            .from(clients)
            .where(eq(clients.quickbooksId, qbInvoice.CustomerRef.value))
            .limit(1);

          if (client.length === 0) {
            console.warn(`Client not found for invoice ${qbInvoice.Id}, skipping`);
            continue;
          }

          // Check if invoice already exists
          const existingInvoice = await db.select()
            .from(invoices)
            .where(eq(invoices.quickbooksId, qbInvoice.Id))
            .limit(1);

          const invoiceData = {
            clientId: client[0].id,
            amount: qbInvoice.TotalAmt,
            status: qbInvoice.Balance > 0 ? 'pending' : 'paid',
            invoiceNumber: qbInvoice.DocNumber,
            issueDate: new Date(qbInvoice.TxnDate),
            dueDate: qbInvoice.DueDate ? new Date(qbInvoice.DueDate) : null,
            quickbooksId: qbInvoice.Id,
            updatedAt: new Date()
          };

          if (existingInvoice.length > 0) {
            // Update existing invoice
            await db.update(invoices)
              .set(invoiceData)
              .where(eq(invoices.id, existingInvoice[0].id));
          } else {
            // Create new invoice
            await db.insert(invoices).values({
              ...invoiceData,
              createdAt: new Date()
            });
          }

          synced++;
        } catch (error) {
          console.error(`Failed to sync invoice ${qbInvoice.Id}:`, error);
          errors++;
        }
      }

      console.log(`QuickBooks invoice sync completed: ${synced} synced, ${errors} errors`);
      return { synced, errors };

    } catch (error) {
      console.error('QuickBooks invoice sync failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'quickbooks_integration',
        action: 'sync_invoices'
      });
      throw error;
    }
  }

  /**
   * Create customer in QuickBooks
   */
  async createCustomer(clientData: {
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<{ success: boolean; quickbooksId?: string; error?: string }> {
    try {
      const customer = {
        Name: clientData.name,
        CompanyName: clientData.companyName,
        PrimaryEmailAddr: clientData.email ? { Address: clientData.email } : undefined,
        PrimaryPhone: clientData.phone ? { FreeFormNumber: clientData.phone } : undefined,
        BillAddr: clientData.address ? { Line1: clientData.address } : undefined
      };

      const response = await this.apiRequest('customers', 'POST', customer);
      const createdCustomer = response.QueryResponse?.Customer?.[0];

      if (createdCustomer) {
        return { success: true, quickbooksId: createdCustomer.Id };
      } else {
        return { success: false, error: 'Customer creation failed' };
      }
    } catch (error) {
      console.error('Failed to create QuickBooks customer:', error);
      sentryService.captureException(error as Error, {
        feature: 'quickbooks_integration',
        action: 'create_customer'
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    companyId?: string;
    lastSync?: Date;
  } {
    return {
      connected: !!(this.accessToken && this.companyId),
      companyId: this.companyId,
      lastSync: undefined // Would track this in database in production
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.accessToken || !this.companyId) {
        return { success: false, message: 'Not authenticated' };
      }

      const response = await this.apiRequest('companyinfo/' + this.companyId);
      const companyInfo = response.QueryResponse?.CompanyInfo?.[0];

      if (companyInfo) {
        return {
          success: true,
          message: `Connected to ${companyInfo.CompanyName || 'QuickBooks Company'}`
        };
      } else {
        return { success: false, message: 'Failed to retrieve company info' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Factory function to create QuickBooks integration
export function createQuickBooksIntegration(): QuickBooksIntegration {
  const config: QuickBooksConfig = {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/auth/quickbooks/callback',
    scope: 'com.intuit.quickbooks.accounting'
  };

  return new QuickBooksIntegration(config);
}