import { sentryService } from '../monitoring/sentryService.js';

export interface SalesforceConfig {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  securityToken: string;
  apiVersion: string;
}

export interface SalesforceContact {
  Id?: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  AccountId?: string;
  Title?: string;
  Department?: string;
}

export interface SalesforceAccount {
  Id?: string;
  Name: string;
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
}

export interface SalesforceOpportunity {
  Id?: string;
  Name: string;
  AccountId: string;
  StageName: string;
  Amount?: number;
  CloseDate: string;
  Probability?: number;
  Type?: string;
  Description?: string;
  LeadSource?: string;
}

export interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export class SalesforceIntegration {
  private config: SalesforceConfig;
  private accessToken?: string;
  private instanceUrl?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.config = {
      instanceUrl: process.env.SALESFORCE_INSTANCE_URL || '',
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      username: process.env.SALESFORCE_USERNAME || '',
      password: process.env.SALESFORCE_PASSWORD || '',
      securityToken: process.env.SALESFORCE_SECURITY_TOKEN || '',
      apiVersion: process.env.SALESFORCE_API_VERSION || 'v58.0'
    };
  }

  /**
   * Authenticate with Salesforce
   */
  async authenticate(): Promise<boolean> {
    try {
      const authUrl = `${this.config.instanceUrl}/services/oauth2/token`;
      const password = this.config.password + this.config.securityToken;

      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username: this.config.username,
        password: password
      });

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Salesforce authentication failed: ${response.status} ${errorData}`);
      }

      const authData: SalesforceAuthResponse = await response.json();

      this.accessToken = authData.access_token;
      this.instanceUrl = authData.instance_url;
      this.tokenExpiry = new Date(Date.now() + (2 * 60 * 60 * 1000)); // 2 hours

      console.log('✅ Salesforce authentication successful');
      return true;

    } catch (error) {
      console.error('❌ Salesforce authentication failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'salesforce_integration',
        action: 'authenticate'
      });
      return false;
    }
  }

  /**
   * Test Salesforce connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const response = await this.makeRequest('GET', '/services/data');

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }

      console.log('✅ Salesforce connection test successful');
      return true;

    } catch (error) {
      console.error('❌ Salesforce connection test failed:', error);
      return false;
    }
  }

  /**
   * Create Salesforce account
   */
  async createAccount(account: SalesforceAccount): Promise<string | null> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const response = await this.makeRequest('POST', `/services/data/v${this.config.apiVersion}/sobjects/Account/`, {
        body: JSON.stringify(account)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create account: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ Created Salesforce account: ${result.id}`);
      return result.id;

    } catch (error) {
      console.error('❌ Failed to create Salesforce account:', error);
      sentryService.captureException(error as Error, {
        feature: 'salesforce_integration',
        action: 'create_account',
        additionalData: { accountName: account.Name }
      });
      return null;
    }
  }

  /**
   * Create Salesforce contact
   */
  async createContact(contact: SalesforceContact): Promise<string | null> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const response = await this.makeRequest('POST', `/services/data/v${this.config.apiVersion}/sobjects/Contact/`, {
        body: JSON.stringify(contact)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create contact: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ Created Salesforce contact: ${result.id}`);
      return result.id;

    } catch (error) {
      console.error('❌ Failed to create Salesforce contact:', error);
      sentryService.captureException(error as Error, {
        feature: 'salesforce_integration',
        action: 'create_contact',
        additionalData: { contactEmail: contact.Email }
      });
      return null;
    }
  }

  /**
   * Create Salesforce opportunity
   */
  async createOpportunity(opportunity: SalesforceOpportunity): Promise<string | null> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const response = await this.makeRequest('POST', `/services/data/v${this.config.apiVersion}/sobjects/Opportunity/`, {
        body: JSON.stringify(opportunity)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create opportunity: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ Created Salesforce opportunity: ${result.id}`);
      return result.id;

    } catch (error) {
      console.error('❌ Failed to create Salesforce opportunity:', error);
      sentryService.captureException(error as Error, {
        feature: 'salesforce_integration',
        action: 'create_opportunity',
        additionalData: { opportunityName: opportunity.Name }
      });
      return null;
    }
  }

  /**
   * Get Salesforce account by ID
   */
  async getAccount(accountId: string): Promise<SalesforceAccount | null> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const response = await this.makeRequest('GET', `/services/data/v${this.config.apiVersion}/sobjects/Account/${accountId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get account: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to get Salesforce account:', error);
      return null;
    }
  }

  /**
   * Update Salesforce account
   */
  async updateAccount(accountId: string, updates: Partial<SalesforceAccount>): Promise<boolean> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const response = await this.makeRequest('PATCH', `/services/data/v${this.config.apiVersion}/sobjects/Account/${accountId}`, {
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update account: ${response.status} ${errorData}`);
      }

      console.log(`✅ Updated Salesforce account: ${accountId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to update Salesforce account:', error);
      return false;
    }
  }

  /**
   * Search Salesforce records using SOQL
   */
  async search(soqlQuery: string): Promise<any[]> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      const encodedQuery = encodeURIComponent(soqlQuery);
      const response = await this.makeRequest('GET', `/services/data/v${this.config.apiVersion}/query/?q=${encodedQuery}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const result = await response.json();
      return result.records || [];

    } catch (error) {
      console.error('❌ Salesforce search failed:', error);
      return [];
    }
  }

  /**
   * Get recent opportunities
   */
  async getRecentOpportunities(limit: number = 10): Promise<SalesforceOpportunity[]> {
    const query = `SELECT Id, Name, AccountId, StageName, Amount, CloseDate, Probability, Type, Description, LeadSource FROM Opportunity ORDER BY CreatedDate DESC LIMIT ${limit}`;
    return await this.search(query);
  }

  /**
   * Get accounts by industry
   */
  async getAccountsByIndustry(industry: string, limit: number = 10): Promise<SalesforceAccount[]> {
    const query = `SELECT Id, Name, Type, Industry, Phone, Website FROM Account WHERE Industry = '${industry}' LIMIT ${limit}`;
    return await this.search(query);
  }

  /**
   * Get contacts by account
   */
  async getContactsByAccount(accountId: string): Promise<SalesforceContact[]> {
    const query = `SELECT Id, FirstName, LastName, Email, Phone, Title, Department FROM Contact WHERE AccountId = '${accountId}'`;
    return await this.search(query);
  }

  /**
   * Sync data with Salesforce
   */
  async syncData(): Promise<boolean> {
    try {
      console.log('🔄 Starting Salesforce data sync...');

      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      // Example sync operations
      const recentOpportunities = await this.getRecentOpportunities(50);
      const recentAccounts = await this.search('SELECT Id, Name, Type, Industry FROM Account WHERE LastModifiedDate = TODAY LIMIT 50');

      console.log(`📊 Synced ${recentOpportunities.length} opportunities and ${recentAccounts.length} accounts`);

      // Here you would typically update your local database with the synced data

      console.log('✅ Salesforce data sync completed');
      return true;

    } catch (error) {
      console.error('❌ Salesforce data sync failed:', error);
      return false;
    }
  }

  /**
   * Handle Salesforce webhook
   */
  async handleWebhook(payload: any): Promise<boolean> {
    try {
      const { type, data } = payload;

      console.log(`📥 Salesforce webhook received: ${type}`);

      switch (type) {
        case 'opportunity_created':
          await this.handleOpportunityCreated(data);
          break;
        case 'opportunity_updated':
          await this.handleOpportunityUpdated(data);
          break;
        case 'account_updated':
          await this.handleAccountUpdated(data);
          break;
        default:
          console.log(`Unhandled Salesforce webhook type: ${type}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to handle Salesforce webhook:', error);
      return false;
    }
  }

  private async handleOpportunityCreated(data: any): Promise<void> {
    console.log(`💰 New Salesforce opportunity: ${data.Name} - $${data.Amount}`);
    // Handle opportunity creation logic here
  }

  private async handleOpportunityUpdated(data: any): Promise<void> {
    console.log(`💰 Salesforce opportunity updated: ${data.Name} - ${data.StageName}`);
    // Handle opportunity update logic here
  }

  private async handleAccountUpdated(data: any): Promise<void> {
    console.log(`🏢 Salesforce account updated: ${data.Name}`);
    // Handle account update logic here
  }

  /**
   * Ensure authentication is valid
   */
  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      return await this.authenticate();
    }
    return true;
  }

  /**
   * Make authenticated request to Salesforce API
   */
  private async makeRequest(method: string, path: string, options: any = {}): Promise<Response> {
    if (!this.accessToken || !this.instanceUrl) {
      throw new Error('Not authenticated');
    }

    const url = `${this.instanceUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    return fetch(url, {
      method,
      headers,
      ...options
    });
  }

  /**
   * Get integration configuration
   */
  getConfig(): Partial<SalesforceConfig> {
    return {
      instanceUrl: this.config.instanceUrl,
      username: this.config.username,
      apiVersion: this.config.apiVersion
    };
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.instanceUrl &&
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.username &&
      this.config.password
    );
  }

  /**
   * Get authentication status
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry);
  }
}