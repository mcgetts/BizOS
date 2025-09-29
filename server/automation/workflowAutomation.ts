import { businessRulesEngine, type TriggerEvent } from './businessRulesEngine.js';
import { db } from '../db.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  projects,
  tasks,
  salesOpportunities,
  clients,
  supportTickets,
  timeEntries,
  users
} from '../../shared/schema.js';
import { sentryService } from '../monitoring/sentryService.js';

export interface WorkflowTrigger {
  id: string;
  name: string;
  description: string;
  eventType: TriggerEvent;
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AutomationMetrics {
  totalTriggers: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  topTriggers: Array<{ event: string; count: number }>;
  recentActivity: Array<{ timestamp: Date; event: string; result: string }>;
}

export class WorkflowAutomation {
  private triggers: Map<string, WorkflowTrigger> = new Map();
  private automationHistory: Array<{ timestamp: Date; event: string; result: string }> = [];

  constructor() {
    this.initializeTriggers();
    this.startPeriodicChecks();
  }

  /**
   * Initialize workflow triggers
   */
  private initializeTriggers(): void {
    const triggers: WorkflowTrigger[] = [
      {
        id: 'project_status_monitor',
        name: 'Project Status Monitor',
        description: 'Monitor project status changes and trigger appropriate workflows',
        eventType: 'project_status_changed',
        isActive: true,
        triggerCount: 0
      },
      {
        id: 'task_completion_monitor',
        name: 'Task Completion Monitor',
        description: 'Handle task completion events and project progress updates',
        eventType: 'task_completed',
        isActive: true,
        triggerCount: 0
      },
      {
        id: 'opportunity_conversion_monitor',
        name: 'Opportunity Conversion Monitor',
        description: 'Process won opportunities and create follow-up actions',
        eventType: 'opportunity_won',
        isActive: true,
        triggerCount: 0
      },
      {
        id: 'client_onboarding_monitor',
        name: 'Client Onboarding Monitor',
        description: 'Trigger onboarding workflows for new clients',
        eventType: 'client_created',
        isActive: true,
        triggerCount: 0
      },
      {
        id: 'support_escalation_monitor',
        name: 'Support Escalation Monitor',
        description: 'Monitor support tickets for escalation conditions',
        eventType: 'support_ticket_escalated',
        isActive: true,
        triggerCount: 0
      },
      {
        id: 'deadline_monitor',
        name: 'Project Deadline Monitor',
        description: 'Check for approaching project deadlines',
        eventType: 'project_deadline_approaching',
        isActive: true,
        triggerCount: 0
      },
      {
        id: 'overdue_task_monitor',
        name: 'Overdue Task Monitor',
        description: 'Identify and process overdue tasks',
        eventType: 'task_overdue',
        isActive: true,
        triggerCount: 0
      }
    ];

    triggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger);
    });

    console.log(`✅ Initialized ${triggers.length} workflow triggers`);
  }

  /**
   * Start periodic checks for time-based triggers
   */
  private startPeriodicChecks(): void {
    // Check every 5 minutes for deadline and overdue conditions
    setInterval(async () => {
      await this.checkProjectDeadlines();
      await this.checkOverdueTasks();
      await this.checkSupportTicketEscalation();
    }, 5 * 60 * 1000);

    // Daily cleanup and metrics
    setInterval(async () => {
      await this.cleanupAutomationHistory();
    }, 24 * 60 * 60 * 1000);

    console.log('✅ Started workflow automation periodic checks');
  }

  /**
   * Trigger workflow automation for entity events
   */
  async triggerWorkflow(
    eventType: TriggerEvent,
    entityData: Record<string, any>,
    triggeredBy: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`🔄 Workflow automation triggered: ${eventType}`, { entityData, triggeredBy });

      // Find and update trigger
      const trigger = Array.from(this.triggers.values())
        .find(t => t.eventType === eventType && t.isActive);

      if (trigger) {
        trigger.lastTriggered = new Date();
        trigger.triggerCount++;
      }

      // Enrich entity data with related information
      const enrichedData = await this.enrichEntityData(eventType, entityData);

      // Trigger business rules engine
      await businessRulesEngine.trigger(eventType, enrichedData, triggeredBy);

      // Record automation history
      this.automationHistory.push({
        timestamp: new Date(),
        event: eventType,
        result: 'success'
      });

    } catch (error) {
      console.error('Workflow automation failed:', error);

      this.automationHistory.push({
        timestamp: new Date(),
        event: eventType,
        result: 'failed'
      });

      sentryService.captureException(error as Error, {
        feature: 'workflow_automation',
        action: 'trigger_workflow',
        additionalData: { eventType, triggeredBy }
      });
    }
  }

  /**
   * Enrich entity data with related information
   */
  private async enrichEntityData(eventType: TriggerEvent, data: Record<string, any>): Promise<Record<string, any>> {
    const enriched = { ...data };

    try {
      switch (eventType) {
        case 'project_status_changed':
        case 'project_deadline_approaching':
          if (data.projectId || data.id) {
            const projectId = data.projectId || data.id;
            const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
            if (project[0]) {
              enriched.project = project[0];

              // Get client information
              if (project[0].clientId) {
                const client = await db.select().from(clients).where(eq(clients.id, project[0].clientId)).limit(1);
                if (client[0]) {
                  enriched.client = client[0];
                }
              }

              // Get project creator information
              if (project[0].createdBy) {
                const user = await db.select().from(users).where(eq(users.id, project[0].createdBy)).limit(1);
                if (user[0]) {
                  enriched.user = user[0];
                }
              }
            }
          }
          break;

        case 'task_completed':
        case 'task_overdue':
          if (data.taskId || data.id) {
            const taskId = data.taskId || data.id;
            const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
            if (task[0]) {
              enriched.task = task[0];

              // Get project information
              if (task[0].projectId) {
                const project = await db.select().from(projects).where(eq(projects.id, task[0].projectId)).limit(1);
                if (project[0]) {
                  enriched.project = project[0];
                }
              }

              // Get assigned user information
              if (task[0].assignedTo) {
                const user = await db.select().from(users).where(eq(users.id, task[0].assignedTo)).limit(1);
                if (user[0]) {
                  enriched.user = user[0];
                }
              }
            }
          }
          break;

        case 'opportunity_won':
        case 'opportunity_lost':
          if (data.opportunityId || data.id) {
            const opportunityId = data.opportunityId || data.id;
            const opportunity = await db.select().from(salesOpportunities).where(eq(salesOpportunities.id, opportunityId)).limit(1);
            if (opportunity[0]) {
              enriched.opportunity = opportunity[0];

              // Get client information
              if (opportunity[0].clientId) {
                const client = await db.select().from(clients).where(eq(clients.id, opportunity[0].clientId)).limit(1);
                if (client[0]) {
                  enriched.client = client[0];
                }
              }

              // Get assigned user information
              if (opportunity[0].assignedTo) {
                const user = await db.select().from(users).where(eq(users.id, opportunity[0].assignedTo)).limit(1);
                if (user[0]) {
                  enriched.user = user[0];
                }
              }
            }
          }
          break;

        case 'client_created':
          if (data.clientId || data.id) {
            const clientId = data.clientId || data.id;
            const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
            if (client[0]) {
              enriched.client = client[0];

              // Get account manager information
              if (client[0].accountManager) {
                const user = await db.select().from(users).where(eq(users.id, client[0].accountManager)).limit(1);
                if (user[0]) {
                  enriched.user = user[0];
                }
              }
            }
          }
          break;

        case 'support_ticket_created':
        case 'support_ticket_escalated':
          if (data.ticketId || data.id) {
            const ticketId = data.ticketId || data.id;
            const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
            if (ticket[0]) {
              enriched.ticket = ticket[0];

              // Get user information
              if (ticket[0].userId) {
                const user = await db.select().from(users).where(eq(users.id, ticket[0].userId)).limit(1);
                if (user[0]) {
                  enriched.user = user[0];
                }
              }
            }
          }
          break;
      }

      // Add computed fields
      enriched.now = new Date();
      enriched.timestamp = new Date();

    } catch (error) {
      console.error('Failed to enrich entity data:', error);
      // Continue with original data even if enrichment fails
    }

    return enriched;
  }

  /**
   * Check for approaching project deadlines
   */
  private async checkProjectDeadlines(): Promise<void> {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const approachingProjects = await db.select()
        .from(projects)
        .where(
          and(
            eq(projects.status, 'active'),
            gte(projects.endDate, new Date()),
            lte(projects.endDate, sevenDaysFromNow)
          )
        );

      for (const project of approachingProjects) {
        const daysUntilDeadline = Math.ceil(
          (project.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        await this.triggerWorkflow(
          'project_deadline_approaching',
          {
            ...project,
            daysUntilDeadline
          },
          'system'
        );
      }

      if (approachingProjects.length > 0) {
        console.log(`⏰ Found ${approachingProjects.length} projects with approaching deadlines`);
      }

    } catch (error) {
      console.error('Failed to check project deadlines:', error);
    }
  }

  /**
   * Check for overdue tasks
   */
  private async checkOverdueTasks(): Promise<void> {
    try {
      const now = new Date();

      const overdueTasks = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, 'todo'),
            lte(tasks.dueDate, now)
          )
        );

      for (const task of overdueTasks) {
        const hoursOverdue = Math.floor(
          (Date.now() - task.dueDate!.getTime()) / (1000 * 60 * 60)
        );

        await this.triggerWorkflow(
          'task_overdue',
          {
            ...task,
            hoursOverdue
          },
          'system'
        );
      }

      if (overdueTasks.length > 0) {
        console.log(`🚨 Found ${overdueTasks.length} overdue tasks`);
      }

    } catch (error) {
      console.error('Failed to check overdue tasks:', error);
    }
  }

  /**
   * Check for support ticket escalation conditions
   */
  private async checkSupportTicketEscalation(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const escalationTickets = await db.select()
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.status, 'open'),
            lte(supportTickets.createdAt, twentyFourHoursAgo)
          )
        );

      for (const ticket of escalationTickets) {
        const hoursOpen = Math.floor(
          (Date.now() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
        );

        await this.triggerWorkflow(
          'support_ticket_escalated',
          {
            ...ticket,
            hoursOpen
          },
          'system'
        );
      }

      if (escalationTickets.length > 0) {
        console.log(`📞 Found ${escalationTickets.length} tickets requiring escalation`);
      }

    } catch (error) {
      console.error('Failed to check support ticket escalation:', error);
    }
  }

  /**
   * Clean up old automation history
   */
  private async cleanupAutomationHistory(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.automationHistory = this.automationHistory.filter(
      entry => entry.timestamp > thirtyDaysAgo
    );

    console.log(`🧹 Cleaned up automation history, kept ${this.automationHistory.length} recent entries`);
  }

  /**
   * Get automation metrics
   */
  getMetrics(): AutomationMetrics {
    const triggers = Array.from(this.triggers.values());
    const recentHistory = this.automationHistory.slice(-50);

    const totalExecutions = recentHistory.length;
    const successCount = recentHistory.filter(h => h.result === 'success').length;
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

    // Calculate top triggers
    const triggerCounts = new Map<string, number>();
    recentHistory.forEach(entry => {
      triggerCounts.set(entry.event, (triggerCounts.get(entry.event) || 0) + 1);
    });

    const topTriggers = Array.from(triggerCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTriggers: triggers.length,
      totalExecutions,
      successRate,
      avgExecutionTime: 0, // Would need timing data
      topTriggers,
      recentActivity: recentHistory.slice(-10)
    };
  }

  /**
   * Get all triggers
   */
  getTriggers(): WorkflowTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Update trigger status
   */
  updateTrigger(id: string, isActive: boolean): boolean {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.isActive = isActive;
      return true;
    }
    return false;
  }

  /**
   * Get business rules engine statistics
   */
  getBusinessRulesStats(): Record<string, any> {
    return businessRulesEngine.getStatistics();
  }

  /**
   * Get all business rules
   */
  getBusinessRules() {
    return businessRulesEngine.getRules();
  }

  /**
   * Get all workflows/triggers for API
   */
  getWorkflows(): WorkflowTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Toggle trigger on/off
   */
  async toggleTrigger(triggerId: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const success = this.updateTrigger(triggerId, enabled);
      if (success) {
        return {
          success: true,
          message: `Trigger ${enabled ? 'enabled' : 'disabled'} successfully`
        };
      } else {
        return {
          success: false,
          message: 'Trigger not found'
        };
      }
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
      return {
        success: false,
        message: 'Failed to toggle trigger'
      };
    }
  }
}

// Global instance
export const workflowAutomation = new WorkflowAutomation();