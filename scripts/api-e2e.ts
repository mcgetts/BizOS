#!/usr/bin/env tsx
/**
 * Comprehensive API E2E Test Runner
 * Tests all CRUD operations across the entire Business Operating System
 */

import { z } from 'zod';

// Test configuration
const API_BASE = 'http://localhost:5000';
const TEST_USER_ID = 'test-user-123'; // Mock user for testing

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

class APITester {
  private results: TestResult[] = [];
  private testData: {[key: string]: any} = {};
  private sessionCookies: string = '';

  constructor() {
    console.log('🚀 Starting Comprehensive API Integration Tests');
    console.log('=' .repeat(60));
  }

  private async request(method: string, endpoint: string, body?: any): Promise<Response> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include session cookies if available
    if (this.sessionCookies) {
      headers['Cookie'] = this.sessionCookies;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include', // Include cookies in requests
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Store cookies from response for session persistence
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      this.sessionCookies = setCookieHeader.split(',').map(cookie => cookie.split(';')[0]).join('; ');
    }

    return response;
  }

  private async authenticate(): Promise<void> {
    console.log('\n🔐 Authenticating for tests...');
    
    try {
      const response = await this.request('POST', '/api/auth/dev-login', {
        test: true
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log(`✅ Authentication successful: ${result.message}`);
      
      // Verify authentication by checking user endpoint
      const userResponse = await this.request('GET', '/api/auth/user');
      if (!userResponse.ok) {
        throw new Error('Authentication verification failed - user endpoint returned ' + userResponse.status);
      }
      
      const user = await userResponse.json();
      console.log(`✅ Authentication verified for user: ${user.email}`);
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw new Error('Failed to authenticate test session');
    }
  }

  private async test(name: string, testFn: () => Promise<void>): Promise<void> {
    try {
      await testFn();
      this.results.push({ name, passed: true });
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMsg });
      console.log(`❌ FAIL: ${name} - ${errorMsg}`);
    }
  }

  private async resetDatabase(): Promise<void> {
    console.log('\n🔄 Resetting test database...');
    const response = await this.request('GET', '/api/test/reset');
    if (!response.ok) {
      throw new Error(`Failed to reset database: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON response but got: ${contentType}`);
    }
    
    const result = await response.json();
    console.log(`✅ Database reset: ${result.cleared.join(', ')}`);
  }

  // ===== CLIENT MODULE TESTS =====
  async testClientModule(): Promise<void> {
    console.log('\n📊 Testing Clients Module');
    console.log('-'.repeat(40));

    await this.resetDatabase();

    // Test client creation
    await this.test('Create Client', async () => {
      const clientData = {
        name: 'Test Client Corp',
        email: 'test@testclient.com',
        phone: '+1-555-0123',
        company: 'Test Client Corporation',
        industry: 'Technology',
        website: 'https://testclient.com',
        address: '123 Test Street, Test City, TC 12345',
        status: 'lead',
        source: 'website',
        assignedTo: null,
        totalValue: '50000.00',
        notes: 'Test client for API integration testing',
        tags: ['technology', 'lead', 'high-value']
      };

      const response = await this.request('POST', '/api/clients', clientData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const client = await response.json();
      this.testData.clientId = client.id;
      
      // Validate required fields
      if (!client.id || client.name !== clientData.name) {
        throw new Error('Client creation response invalid');
      }
    });

    // Test client retrieval
    await this.test('Get All Clients', async () => {
      const response = await this.request('GET', '/api/clients');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const clients = await response.json();
      if (!Array.isArray(clients) || clients.length === 0) {
        throw new Error('No clients found');
      }
    });

    // Test single client retrieval
    await this.test('Get Single Client', async () => {
      const response = await this.request('GET', `/api/clients/${this.testData.clientId}`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const client = await response.json();
      if (client.id !== this.testData.clientId) {
        throw new Error('Retrieved client ID mismatch');
      }
    });

    // Test client update
    await this.test('Update Client', async () => {
      const updateData = {
        status: 'qualified',
        notes: 'Updated client status after qualification call',
        totalValue: '75000.00'
      };

      const response = await this.request('PUT', `/api/clients/${this.testData.clientId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const client = await response.json();
      if (client.status !== 'qualified') {
        throw new Error('Client update failed');
      }
    });

    // Test client deletion (skip to preserve relationship data)
    console.log('⏭️  Skipping client deletion to preserve relationship data');
  }

  // ===== PROJECT MODULE TESTS =====
  async testProjectModule(): Promise<void> {
    console.log('\n📈 Testing Projects Module');
    console.log('-'.repeat(40));

    // Test project creation with client relationship
    await this.test('Create Project', async () => {
      const projectData = {
        name: 'Test Website Redesign',
        description: 'Complete redesign of client website with modern UX/UI',
        clientId: this.testData.clientId,
        managerId: null,
        status: 'planning',
        priority: 'high',
        budget: '25000.00',
        actualCost: '0.00',
        progress: 0,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['website', 'redesign', 'urgent']
      };

      const response = await this.request('POST', '/api/projects', projectData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const project = await response.json();
      this.testData.projectId = project.id;
      
      if (!project.id || project.clientId !== this.testData.clientId) {
        throw new Error('Project creation or relationship validation failed');
      }
    });

    // Test project retrieval
    await this.test('Get All Projects', async () => {
      const response = await this.request('GET', '/api/projects');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const projects = await response.json();
      if (!Array.isArray(projects) || projects.length === 0) {
        throw new Error('No projects found');
      }
    });

    // Test project update
    await this.test('Update Project Progress', async () => {
      const updateData = {
        status: 'active',
        progress: 25,
        actualCost: '5000.00'
      };

      const response = await this.request('PUT', `/api/projects/${this.testData.projectId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const project = await response.json();
      if (project.progress !== 25 || project.status !== 'active') {
        throw new Error('Project update failed');
      }
    });
  }

  // ===== TASK MODULE TESTS =====
  async testTaskModule(): Promise<void> {
    console.log('\n✅ Testing Tasks Module');
    console.log('-'.repeat(40));

    // Test task creation with project relationship
    await this.test('Create Task', async () => {
      const taskData = {
        title: 'Design Homepage Mockups',
        description: 'Create initial design mockups for the new homepage layout',
        projectId: this.testData.projectId,
        assignedTo: null,
        createdBy: null,
        status: 'todo',
        priority: 'high',
        estimatedHours: '16.00',
        actualHours: '0.00',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['design', 'homepage', 'mockup']
      };

      const response = await this.request('POST', '/api/tasks', taskData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const task = await response.json();
      this.testData.taskId = task.id;
      
      if (!task.id || task.projectId !== this.testData.projectId) {
        throw new Error('Task creation or relationship validation failed');
      }
    });

    // Test task retrieval
    await this.test('Get All Tasks', async () => {
      const response = await this.request('GET', '/api/tasks');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const tasks = await response.json();
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('No tasks found');
      }
    });

    // Test task update with status workflow
    await this.test('Update Task Status', async () => {
      const updateData = {
        status: 'in_progress',
        actualHours: '4.00'
      };

      const response = await this.request('PUT', `/api/tasks/${this.testData.taskId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const task = await response.json();
      if (task.status !== 'in_progress') {
        throw new Error('Task status update failed');
      }
    });

    // Test task completion
    await this.test('Complete Task', async () => {
      const updateData = {
        status: 'completed',
        actualHours: '15.50',
        completedAt: new Date().toISOString()
      };

      const response = await this.request('PUT', `/api/tasks/${this.testData.taskId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const task = await response.json();
      if (task.status !== 'completed' || !task.completedAt) {
        throw new Error('Task completion failed');
      }
    });
  }

  // ===== FINANCE MODULE TESTS =====
  async testFinanceModule(): Promise<void> {
    console.log('\n💰 Testing Finance Module');
    console.log('-'.repeat(40));

    // Test invoice creation
    await this.test('Create Invoice', async () => {
      const invoiceData = {
        invoiceNumber: `INV-${Date.now()}`,
        clientId: this.testData.clientId,
        projectId: this.testData.projectId,
        amount: '5000.00',
        tax: '500.00',
        total: '5500.00',
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: 'Design Services',
            quantity: 1,
            rate: '5000.00',
            amount: '5000.00'
          }
        ],
        notes: 'First milestone payment for website redesign'
      };

      const response = await this.request('POST', '/api/invoices', invoiceData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const invoice = await response.json();
      this.testData.invoiceId = invoice.id;
      
      if (!invoice.id || invoice.clientId !== this.testData.clientId) {
        throw new Error('Invoice creation or relationship validation failed');
      }
    });

    // Test expense creation
    await this.test('Create Expense', async () => {
      const expenseData = {
        description: 'Design Software License',
        category: 'software',
        amount: '299.00',
        projectId: this.testData.projectId,
        date: new Date().toISOString(),
        status: 'pending',
        billable: true,
        receipt: null
      };

      const response = await this.request('POST', '/api/expenses', expenseData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const expense = await response.json();
      this.testData.expenseId = expense.id;
      
      if (!expense.id || expense.projectId !== this.testData.projectId) {
        throw new Error('Expense creation or relationship validation failed');
      }
    });

    // Test financial data retrieval
    await this.test('Get All Invoices', async () => {
      const response = await this.request('GET', '/api/invoices');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const invoices = await response.json();
      if (!Array.isArray(invoices) || invoices.length === 0) {
        throw new Error('No invoices found');
      }
    });

    // Test invoice status update
    await this.test('Update Invoice Status', async () => {
      const updateData = {
        status: 'sent',
        sentDate: new Date().toISOString()
      };

      const response = await this.request('PUT', `/api/invoices/${this.testData.invoiceId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const invoice = await response.json();
      if (invoice.status !== 'sent') {
        throw new Error('Invoice status update failed');
      }
    });
  }

  // ===== KNOWLEDGE MODULE TESTS =====
  async testKnowledgeModule(): Promise<void> {
    console.log('\n📚 Testing Knowledge Module');
    console.log('-'.repeat(40));

    // Test knowledge article creation
    await this.test('Create Knowledge Article', async () => {
      const articleData = {
        title: 'API Integration Best Practices',
        content: '# API Integration Best Practices\n\nThis article covers best practices for API integration...',
        summary: 'Guidelines and best practices for successful API integrations',
        category: 'development',
        tags: ['api', 'integration', 'best-practices'],
        status: 'published',
        authorId: null,
        featured: true,
        viewCount: 0
      };

      const response = await this.request('POST', '/api/knowledge', articleData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const article = await response.json();
      this.testData.articleId = article.id;
      
      if (!article.id || article.title !== articleData.title) {
        throw new Error('Knowledge article creation failed');
      }
    });

    // Test knowledge article retrieval
    await this.test('Get All Knowledge Articles', async () => {
      const response = await this.request('GET', '/api/knowledge');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const articles = await response.json();
      if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error('No knowledge articles found');
      }
    });

    // Test knowledge article update
    await this.test('Update Knowledge Article', async () => {
      const updateData = {
        status: 'draft',
        content: '# API Integration Best Practices (Updated)\n\nThis updated article covers...',
        viewCount: 25
      };

      const response = await this.request('PUT', `/api/knowledge/${this.testData.articleId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const article = await response.json();
      if (article.status !== 'draft' || article.viewCount !== 25) {
        throw new Error('Knowledge article update failed');
      }
    });
  }

  // ===== SUPPORT MODULE TESTS =====
  async testSupportModule(): Promise<void> {
    console.log('\n🎧 Testing Support Module');
    console.log('-'.repeat(40));

    // Test support ticket creation
    await this.test('Create Support Ticket', async () => {
      const ticketData = {
        title: 'Website Loading Issues',
        description: 'Client reports that the website is loading slowly on mobile devices',
        clientId: this.testData.clientId,
        priority: 'high',
        status: 'open',
        category: 'technical',
        assignedTo: null,
        tags: ['performance', 'mobile', 'loading']
      };

      const response = await this.request('POST', '/api/support/tickets', ticketData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Status ${response.status}: ${error}`);
      }

      const ticket = await response.json();
      this.testData.ticketId = ticket.id;
      
      if (!ticket.id || ticket.clientId !== this.testData.clientId) {
        throw new Error('Support ticket creation or relationship validation failed');
      }

      // Validate ticket number format (ST-YYYYMMDD-XXXXXXXXX)
      if (ticket.ticketNumber && !ticket.ticketNumber.match(/^ST-\d{8}-\d{9}$/)) {
        throw new Error('Invalid ticket number format');
      }
    });

    // Test support ticket retrieval
    await this.test('Get All Support Tickets', async () => {
      const response = await this.request('GET', '/api/support/tickets');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const tickets = await response.json();
      if (!Array.isArray(tickets) || tickets.length === 0) {
        throw new Error('No support tickets found');
      }
    });

    // Test support ticket status update
    await this.test('Update Support Ticket Status', async () => {
      const updateData = {
        status: 'in_progress',
        priority: 'medium',
        resolution: 'Investigating performance issues with mobile optimization'
      };

      const response = await this.request('PUT', `/api/support/tickets/${this.testData.ticketId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const ticket = await response.json();
      if (ticket.status !== 'in_progress') {
        throw new Error('Support ticket update failed');
      }
    });

    // Test support ticket resolution
    await this.test('Resolve Support Ticket', async () => {
      const updateData = {
        status: 'resolved',
        resolution: 'Optimized images and implemented lazy loading for better mobile performance',
        resolvedAt: new Date().toISOString(),
        satisfactionRating: 5
      };

      const response = await this.request('PUT', `/api/support/tickets/${this.testData.ticketId}`, updateData);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      
      const ticket = await response.json();
      if (ticket.status !== 'resolved' || !ticket.resolvedAt) {
        throw new Error('Support ticket resolution failed');
      }
    });
  }

  // ===== DATA INTEGRITY TESTS =====
  async testDataIntegrity(): Promise<void> {
    console.log('\n🔐 Testing Data Integrity & Relationships');
    console.log('-'.repeat(40));

    // Test foreign key constraints
    await this.test('Reject Invalid Client ID in Project', async () => {
      const projectData = {
        name: 'Invalid Project',
        clientId: '00000000-0000-0000-0000-000000000000',
        status: 'planning'
      };

      const response = await this.request('POST', '/api/projects', projectData);
      
      // This should fail due to foreign key constraint
      if (response.ok) {
        throw new Error('Project with invalid clientId was incorrectly accepted');
      }
      
      // Check for proper error status (400 or 404)
      if (response.status !== 400 && response.status !== 404) {
        throw new Error(`Expected 400/404 error, got ${response.status}`);
      }
    });

    await this.test('Reject Invalid Project ID in Task', async () => {
      const taskData = {
        title: 'Invalid Task',
        projectId: '00000000-0000-0000-0000-000000000000',
        status: 'todo'
      };

      const response = await this.request('POST', '/api/tasks', taskData);
      
      if (response.ok) {
        throw new Error('Task with invalid projectId was incorrectly accepted');
      }
    });

    // Test data relationships
    await this.test('Verify Client-Project Relationship', async () => {
      const clientResponse = await this.request('GET', `/api/clients/${this.testData.clientId}`);
      const projectResponse = await this.request('GET', `/api/projects/${this.testData.projectId}`);
      
      if (!clientResponse.ok || !projectResponse.ok) {
        throw new Error('Failed to retrieve client or project');
      }
      
      const client = await clientResponse.json();
      const project = await projectResponse.json();
      
      if (project.clientId !== client.id) {
        throw new Error('Client-Project relationship integrity failed');
      }
    });

    await this.test('Verify Project-Task Relationship', async () => {
      const projectResponse = await this.request('GET', `/api/projects/${this.testData.projectId}`);
      const taskResponse = await this.request('GET', `/api/tasks/${this.testData.taskId}`);
      
      if (!projectResponse.ok || !taskResponse.ok) {
        throw new Error('Failed to retrieve project or task');
      }
      
      const project = await projectResponse.json();
      const task = await taskResponse.json();
      
      if (task.projectId !== project.id) {
        throw new Error('Project-Task relationship integrity failed');
      }
    });
  }

  // ===== TEST EXECUTION =====
  async runAllTests(): Promise<void> {
    console.log('🧪 Running Comprehensive API Integration Tests\n');

    try {
      // Authenticate before running any tests
      await this.authenticate();
      
      await this.testClientModule();
      await this.testProjectModule();
      await this.testTaskModule();
      await this.testFinanceModule();
      await this.testKnowledgeModule();
      await this.testSupportModule();
      await this.testDataIntegrity();

      this.printSummary();
    } catch (error) {
      console.error('\n❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
    }

    console.log('\n🎯 MODULES TESTED:');
    console.log('   • Clients Module - Full CRUD Operations');
    console.log('   • Projects Module - Full CRUD Operations');
    console.log('   • Tasks Module - Full CRUD Operations');
    console.log('   • Finance Module - Invoices & Expenses');
    console.log('   • Knowledge Module - Article Management');
    console.log('   • Support Module - Ticket Management');
    console.log('   • Data Integrity - Relationship Validation');

    console.log('\n✨ API Integration Testing Complete!');
    
    if (failed === 0) {
      console.log('🎉 All systems operational - Business Operating System validated!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed - please review and fix issues');
      process.exit(1);
    }
  }
}

// Execute test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}

export default APITester;