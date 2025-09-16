import { describe, it, expect } from 'vitest';
import { storage } from '@server/storage';
import { TestDataFactory } from '../../setup';

describe('Basic Test Suite Validation', () => {
  it('should connect to database successfully', async () => {
    const users = await storage.getUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  it('should create and retrieve user correctly', async () => {
    const userData = TestDataFactory.user({
      id: 'basic-test-user',
      email: 'basic@test.com'
    });

    const user = await storage.upsertUser(userData);
    expect(user.id).toBe('basic-test-user');
    expect(user.email).toBe('basic@test.com');

    const retrieved = await storage.getUser('basic-test-user');
    expect(retrieved?.email).toBe('basic@test.com');
  });

  it('should validate test data factories', () => {
    const client = TestDataFactory.client();
    expect(client.name).toBeDefined();
    expect(client.email).toBeDefined();
    expect(client.status).toBe('lead');

    const user = TestDataFactory.user();
    expect(user.email).toBeDefined();
    expect(user.firstName).toBe('Test');
    expect(user.role).toBe('employee');
  });

  it('should handle decimal values correctly', () => {
    const task = TestDataFactory.task('test-project-id');
    expect(task.estimatedHours).toBe('8.00');
    expect(task.actualHours).toBe('0.00');

    const invoice = TestDataFactory.invoice('test-client-id');
    expect(typeof invoice.amount).toBe('string');
    expect(invoice.amount).toMatch(/^\d+\.\d{2}$/);
  });
});