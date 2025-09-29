import { db } from '../db.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  projects,
  tasks,
  salesOpportunities,
  clients,
  users,
  supportTickets,
  timeEntries,
  expenses,
  notifications,
  auditLogs
} from '../../shared/schema.js';
import { wsManager } from '../websocketManager.js';
import { emailService } from '../emailService.js';
import { sentryService } from '../monitoring/sentryService.js';

export type TriggerEvent =
  | 'project_created'
  | 'project_status_changed'
  | 'task_created'
  | 'task_completed'
  | 'task_overdue'
  | 'opportunity_won'
  | 'opportunity_lost'
  | 'client_created'
  | 'support_ticket_created'
  | 'support_ticket_escalated'
  | 'time_entry_approved'
  | 'expense_submitted'
  | 'user_inactive'
  | 'budget_threshold_exceeded'
  | 'project_deadline_approaching';

export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';

export type ActionType =
  | 'send_notification'
  | 'send_email'
  | 'create_task'
  | 'update_project_status'
  | 'assign_user'
  | 'escalate_ticket'
  | 'create_project'
  | 'send_slack_message'
  | 'log_audit_event'
  | 'update_client_status'
  | 'schedule_meeting'
  | 'generate_report';

export interface BusinessRuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface BusinessRuleAction {
  type: ActionType;
  parameters: Record<string, any>;
  delay?: number; // Delay in milliseconds before executing
  retryCount?: number;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  trigger: TriggerEvent;
  conditions: BusinessRuleCondition[];
  actions: BusinessRuleAction[];
  isActive: boolean;
  priority: number; // Higher number = higher priority
  createdBy: string;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  errorCount: number;
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  triggeredBy: string;
  triggerData: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  startTime: Date;
  endTime?: Date;
  error?: string;
  actionsExecuted: number;
  totalActions: number;
}

export class BusinessRulesEngine {
  private rules: Map<string, BusinessRule> = new Map();
  private executionQueue: WorkflowExecution[] = [];
  private isProcessing = false;

  constructor() {
    this.loadRules();
    this.startExecutionProcessor();
  }

  /**
   * Load business rules from storage/configuration
   */
  private async loadRules(): Promise<void> {
    try {
      // Default business rules for common scenarios
      const defaultRules: BusinessRule[] = [
        {
          id: 'auto-project-from-opportunity',
          name: 'Auto-create Project from Won Opportunity',
          description: 'Automatically create a project when an opportunity is marked as won',
          trigger: 'opportunity_won',
          conditions: [
            {
              field: 'value',
              operator: 'greater_than',
              value: 5000,
              dataType: 'number'
            }
          ],
          actions: [
            {
              type: 'create_project',
              parameters: {
                name: '{{opportunity.title}} - Project',
                description: 'Auto-generated project from won opportunity: {{opportunity.title}}',
                clientId: '{{opportunity.clientId}}',
                status: 'planning',
                priority: 'medium'
              }
            },
            {
              type: 'send_notification',
              parameters: {
                userId: '{{opportunity.assignedTo}}',
                title: 'New Project Created',
                message: 'A project has been automatically created from won opportunity: {{opportunity.title}}',
                type: 'success'
              }
            }
          ],
          isActive: true,
          priority: 10,
          createdBy: 'system',
          createdAt: new Date(),
          executionCount: 0,
          errorCount: 0
        },
        {
          id: 'task-overdue-notification',
          name: 'Overdue Task Notifications',
          description: 'Send notifications when tasks become overdue',
          trigger: 'task_overdue',
          conditions: [],
          actions: [
            {
              type: 'send_notification',
              parameters: {
                userId: '{{task.assignedTo}}',
                title: 'Task Overdue',
                message: 'Task "{{task.title}}" is now overdue. Due date was {{task.dueDate}}',
                type: 'warning'
              }
            },
            {
              type: 'send_email',
              parameters: {
                to: '{{user.email}}',
                subject: 'Overdue Task: {{task.title}}',
                template: 'task_overdue',
                data: {
                  taskTitle: '{{task.title}}',
                  dueDate: '{{task.dueDate}}',
                  projectName: '{{project.name}}'
                }
              }
            }
          ],
          isActive: true,
          priority: 8,
          createdBy: 'system',
          createdAt: new Date(),
          executionCount: 0,
          errorCount: 0
        },
        {
          id: 'high-value-client-welcome',
          name: 'High-Value Client Welcome Workflow',
          description: 'Special onboarding workflow for high-value clients',
          trigger: 'client_created',
          conditions: [
            {
              field: 'tier',
              operator: 'in',
              value: ['premium', 'enterprise'],
              dataType: 'array'
            }
          ],
          actions: [
            {
              type: 'create_task',
              parameters: {
                title: 'Client Onboarding - {{client.name}}',
                description: 'Complete onboarding process for premium client {{client.name}}',
                assignedTo: '{{client.accountManager}}',
                priority: 'high',
                dueDate: '{{addDays(now, 3)}}',
                projectId: null
              }
            },
            {
              type: 'send_notification',
              parameters: {
                userId: '{{client.accountManager}}',
                title: 'New Premium Client Onboarding',
                message: 'Please complete onboarding for new premium client: {{client.name}}',
                type: 'info'
              }
            },
            {
              type: 'send_slack_message',
              parameters: {
                channel: '#sales',
                message: '🎉 New premium client onboarded: {{client.name}}. Account manager: @{{user.firstName}}'
              }
            }
          ],
          isActive: true,
          priority: 9,
          createdBy: 'system',
          createdAt: new Date(),
          executionCount: 0,
          errorCount: 0
        },
        {
          id: 'project-deadline-warning',
          name: 'Project Deadline Approaching',
          description: 'Warn team when project deadline is approaching',
          trigger: 'project_deadline_approaching',
          conditions: [
            {
              field: 'daysUntilDeadline',
              operator: 'less_than',
              value: 7,
              dataType: 'number'
            }
          ],
          actions: [
            {
              type: 'send_notification',
              parameters: {
                userId: '{{project.createdBy}}',
                title: 'Project Deadline Approaching',
                message: 'Project "{{project.name}}" deadline is in {{daysUntilDeadline}} days',
                type: 'warning'
              }
            },
            {
              type: 'create_task',
              parameters: {
                title: 'Review Project Progress - {{project.name}}',
                description: 'Review progress and ensure project "{{project.name}}" will meet deadline',
                assignedTo: '{{project.createdBy}}',
                priority: 'high',
                dueDate: '{{addDays(now, 1)}}',
                projectId: '{{project.id}}'
              }
            }
          ],
          isActive: true,
          priority: 7,
          createdBy: 'system',
          createdAt: new Date(),
          executionCount: 0,
          errorCount: 0
        },
        {
          id: 'support-ticket-escalation',
          name: 'Automatic Support Ticket Escalation',
          description: 'Escalate support tickets that remain unresolved for too long',
          trigger: 'support_ticket_escalated',
          conditions: [
            {
              field: 'priority',
              operator: 'in',
              value: ['high', 'urgent'],
              dataType: 'array'
            },
            {
              field: 'hoursOpen',
              operator: 'greater_than',
              value: 24,
              dataType: 'number'
            }
          ],
          actions: [
            {
              type: 'escalate_ticket',
              parameters: {
                ticketId: '{{ticket.id}}',
                escalationLevel: 'manager',
                reason: 'Ticket open for more than 24 hours with high priority'
              }
            },
            {
              type: 'send_notification',
              parameters: {
                userId: '{{ticket.assignedTo}}',
                title: 'Ticket Escalated',
                message: 'Support ticket #{{ticket.id}} has been escalated due to extended resolution time',
                type: 'warning'
              }
            }
          ],
          isActive: true,
          priority: 6,
          createdBy: 'system',
          createdAt: new Date(),
          executionCount: 0,
          errorCount: 0
        }
      ];

      // Load rules into memory
      defaultRules.forEach(rule => {
        this.rules.set(rule.id, rule);
      });

      console.log(`✅ Loaded ${defaultRules.length} business rules`);

    } catch (error) {
      console.error('Failed to load business rules:', error);
      sentryService.captureException(error as Error, {
        feature: 'business_rules_engine',
        action: 'load_rules'
      });
    }
  }

  /**
   * Trigger a business rule event
   */
  async trigger(event: TriggerEvent, data: Record<string, any>, triggeredBy: string): Promise<void> {
    try {
      console.log(`🔄 Business rule trigger: ${event}`, { data, triggeredBy });

      // Find applicable rules for this trigger
      const applicableRules = Array.from(this.rules.values())
        .filter(rule => rule.isActive && rule.trigger === event)
        .sort((a, b) => b.priority - a.priority); // Higher priority first

      if (applicableRules.length === 0) {
        console.log(`No active rules found for trigger: ${event}`);
        return;
      }

      // Evaluate conditions and queue executions
      for (const rule of applicableRules) {
        if (await this.evaluateConditions(rule.conditions, data)) {
          const execution: WorkflowExecution = {
            id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            triggeredBy,
            triggerData: data,
            status: 'pending',
            startTime: new Date(),
            actionsExecuted: 0,
            totalActions: rule.actions.length
          };

          this.executionQueue.push(execution);
          console.log(`📋 Queued execution for rule: ${rule.name}`);
        }
      }

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processExecutionQueue();
      }

    } catch (error) {
      console.error('Business rule trigger failed:', error);
      sentryService.captureException(error as Error, {
        feature: 'business_rules_engine',
        action: 'trigger',
        additionalData: { event, triggeredBy }
      });
    }
  }

  /**
   * Evaluate rule conditions against trigger data
   */
  private async evaluateConditions(conditions: BusinessRuleCondition[], data: Record<string, any>): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);

      if (!this.evaluateCondition(condition, fieldValue)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: BusinessRuleCondition, fieldValue: any): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Process the execution queue
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessing || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.executionQueue.length > 0) {
        const execution = this.executionQueue.shift();
        if (execution) {
          await this.executeWorkflow(execution);
        }
      }
    } catch (error) {
      console.error('Execution queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a workflow
   */
  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    try {
      execution.status = 'running';
      console.log(`🚀 Executing workflow: ${execution.id}`);

      const rule = this.rules.get(execution.ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${execution.ruleId}`);
      }

      // Execute actions sequentially
      for (let i = 0; i < rule.actions.length; i++) {
        const action = rule.actions[i];

        try {
          // Apply delay if specified
          if (action.delay && action.delay > 0) {
            await this.delay(action.delay);
          }

          await this.executeAction(action, execution.triggerData);
          execution.actionsExecuted++;

        } catch (actionError) {
          console.error(`Action execution failed:`, actionError);

          // Retry logic
          if (action.retryCount && action.retryCount > 0) {
            console.log(`Retrying action ${i + 1}/${rule.actions.length}`);
            execution.status = 'retrying';

            for (let retry = 0; retry < action.retryCount; retry++) {
              try {
                await this.delay(1000 * (retry + 1)); // Exponential backoff
                await this.executeAction(action, execution.triggerData);
                execution.actionsExecuted++;
                break;
              } catch (retryError) {
                if (retry === action.retryCount - 1) {
                  throw retryError;
                }
              }
            }
          } else {
            throw actionError;
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();

      // Update rule statistics
      rule.lastExecuted = new Date();
      rule.executionCount++;

      console.log(`✅ Workflow completed: ${execution.id}`);

    } catch (error) {
      execution.status = 'failed';
      execution.error = (error as Error).message;
      execution.endTime = new Date();

      const rule = this.rules.get(execution.ruleId);
      if (rule) {
        rule.errorCount++;
      }

      console.error(`❌ Workflow failed: ${execution.id}`, error);

      sentryService.captureException(error as Error, {
        feature: 'business_rules_engine',
        action: 'execute_workflow',
        additionalData: {
          executionId: execution.id,
          ruleId: execution.ruleId
        }
      });
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: BusinessRuleAction, triggerData: Record<string, any>): Promise<void> {
    const parameters = this.interpolateParameters(action.parameters, triggerData);

    switch (action.type) {
      case 'send_notification':
        await this.sendNotification(parameters);
        break;
      case 'send_email':
        await this.sendEmail(parameters);
        break;
      case 'create_task':
        await this.createTask(parameters);
        break;
      case 'create_project':
        await this.createProject(parameters);
        break;
      case 'update_project_status':
        await this.updateProjectStatus(parameters);
        break;
      case 'assign_user':
        await this.assignUser(parameters);
        break;
      case 'escalate_ticket':
        await this.escalateTicket(parameters);
        break;
      case 'send_slack_message':
        await this.sendSlackMessage(parameters);
        break;
      case 'log_audit_event':
        await this.logAuditEvent(parameters);
        break;
      case 'update_client_status':
        await this.updateClientStatus(parameters);
        break;
      default:
        console.log(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send notification action
   */
  private async sendNotification(params: any): Promise<void> {
    await db.insert(notifications).values({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      read: false,
      createdAt: new Date()
    });

    // Send real-time notification via WebSocket
    wsManager.notifyUser(params.userId, {
      type: 'notification',
      data: {
        title: params.title,
        message: params.message,
        type: params.type || 'info'
      }
    });
  }

  /**
   * Send email action
   */
  private async sendEmail(params: any): Promise<void> {
    await emailService.sendEmail({
      to: params.to,
      subject: params.subject,
      template: params.template || 'generic',
      data: params.data || {}
    });
  }

  /**
   * Create task action
   */
  private async createTask(params: any): Promise<void> {
    await db.insert(tasks).values({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: params.title,
      description: params.description,
      assignedTo: params.assignedTo,
      projectId: params.projectId,
      status: 'todo',
      priority: params.priority || 'medium',
      dueDate: params.dueDate ? new Date(params.dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Create project action
   */
  private async createProject(params: any): Promise<void> {
    await db.insert(projects).values({
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      description: params.description,
      clientId: params.clientId,
      status: params.status || 'planning',
      priority: params.priority || 'medium',
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Update project status action
   */
  private async updateProjectStatus(params: any): Promise<void> {
    await db.update(projects)
      .set({
        status: params.status,
        updatedAt: new Date()
      })
      .where(eq(projects.id, params.projectId));
  }

  /**
   * Escalate ticket action
   */
  private async escalateTicket(params: any): Promise<void> {
    await db.update(supportTickets)
      .set({
        priority: 'urgent',
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, params.ticketId));
  }

  /**
   * Send Slack message action
   */
  private async sendSlackMessage(params: any): Promise<void> {
    // This would integrate with Slack API
    console.log(`📱 Slack message to ${params.channel}: ${params.message}`);
  }

  /**
   * Log audit event action
   */
  private async logAuditEvent(params: any): Promise<void> {
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: params.userId || 'system',
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: JSON.stringify(params.details || {}),
      ipAddress: '127.0.0.1',
      userAgent: 'BusinessRulesEngine',
      timestamp: new Date(),
      riskScore: params.riskScore || 1
    });
  }

  /**
   * Update client status action
   */
  private async updateClientStatus(params: any): Promise<void> {
    await db.update(clients)
      .set({
        status: params.status,
        updatedAt: new Date()
      })
      .where(eq(clients.id, params.clientId));
  }

  /**
   * Start the execution processor
   */
  private startExecutionProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.executionQueue.length > 0) {
        this.processExecutionQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Utility functions
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private interpolateParameters(params: Record<string, any>, data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        result[key] = value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const val = this.getNestedValue(data, path.trim());
          return val !== undefined ? String(val) : match;
        });
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all rules
   */
  getRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get only active rules
   */
  getActiveRules(): BusinessRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.isActive);
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): BusinessRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Add or update a rule
   */
  setRule(rule: BusinessRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule
   */
  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Get execution statistics
   */
  getStatistics(): Record<string, any> {
    const rules = Array.from(this.rules.values());

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      totalExecutions: rules.reduce((sum, r) => sum + r.executionCount, 0),
      totalErrors: rules.reduce((sum, r) => sum + r.errorCount, 0),
      queueLength: this.executionQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Global instance
export const businessRulesEngine = new BusinessRulesEngine();