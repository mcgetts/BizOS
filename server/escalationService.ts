import { db } from './db';
import { supportTickets, ticketEscalations, users } from '@shared/schema';
import type { SupportTicket, TicketEscalation, User } from '@shared/schema';
import { checkEscalationNeeded, calculateSlaMetrics } from '@shared/slaUtils';
import { eq, and, or, lte, sql } from 'drizzle-orm';
import { wsManager } from './websocketManager';
import { emailService } from './emailService';
import { IntegrationManager, defaultIntegrationConfig } from './integrations';

interface EscalationRule {
  level: number;
  name: string;
  triggerAfterHours: number;
  assignToRole: string;
  notifyUsers: string[];
  actions: string[];
}

interface EscalationResult {
  ticketId: string;
  escalated: boolean;
  escalationLevel: number;
  assignedTo?: string;
  reason: string;
  notifications: string[];
}

export class EscalationService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private integrationManager: IntegrationManager;

  constructor() {
    this.integrationManager = new IntegrationManager(defaultIntegrationConfig);
  }

  /**
   * Start the auto-escalation service
   */
  start(intervalMinutes: number = 30) {
    if (this.isRunning) {
      console.log('Escalation service already running');
      return;
    }

    console.log(`Starting escalation service with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately, then on interval
    this.processEscalations();
    this.intervalId = setInterval(() => {
      this.processEscalations();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the auto-escalation service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Escalation service stopped');
  }

  /**
   * Process all tickets for potential escalation
   */
  async processEscalations(): Promise<EscalationResult[]> {
    try {
      console.log('Processing ticket escalations...');

      // Get all open/in_progress tickets
      const activeTickets = await db
        .select()
        .from(supportTickets)
        .where(
          and(
            or(
              eq(supportTickets.status, 'open'),
              eq(supportTickets.status, 'in_progress')
            )
          )
        );

      const results: EscalationResult[] = [];

      for (const ticket of activeTickets) {
        const result = await this.processTicketEscalation(ticket);
        if (result.escalated) {
          results.push(result);
        }
      }

      // Update SLA statuses
      await this.updateSlaStatuses(activeTickets);

      if (results.length > 0) {
        console.log(`Escalated ${results.length} tickets`);
      }

      return results;
    } catch (error) {
      console.error('Error processing escalations:', error);
      return [];
    }
  }

  /**
   * Process escalation for a single ticket
   */
  async processTicketEscalation(ticket: SupportTicket): Promise<EscalationResult> {
    const escalationCheck = checkEscalationNeeded(ticket);

    if (!escalationCheck?.needsEscalation) {
      return {
        ticketId: ticket.id,
        escalated: false,
        escalationLevel: ticket.escalationLevel || 0,
        reason: 'No escalation needed'
      } as EscalationResult;
    }

    // Get escalation rules for this ticket
    const escalationRules = this.getEscalationRules(ticket);
    const targetRule = escalationRules.find(rule => rule.level === escalationCheck.escalationLevel);

    if (!targetRule) {
      return {
        ticketId: ticket.id,
        escalated: false,
        escalationLevel: ticket.escalationLevel || 0,
        reason: 'No escalation rule found'
      } as EscalationResult;
    }

    // Find user to escalate to
    const targetUser = await this.findEscalationTarget(targetRule);

    if (!targetUser) {
      console.warn(`No user found for escalation rule: ${targetRule.assignToRole}`);
      return {
        ticketId: ticket.id,
        escalated: false,
        escalationLevel: ticket.escalationLevel || 0,
        reason: `No ${targetRule.assignToRole} available`
      } as EscalationResult;
    }

    // Create escalation record
    await db.insert(ticketEscalations).values({
      ticketId: ticket.id,
      fromUserId: ticket.assignedTo,
      toUserId: targetUser.id,
      escalationLevel: escalationCheck.escalationLevel,
      reason: escalationCheck.reason,
      automatedRule: targetRule.name,
      createdAt: new Date()
    });

    // Update ticket
    await db.update(supportTickets)
      .set({
        assignedTo: targetUser.id,
        escalationLevel: escalationCheck.escalationLevel,
        escalatedAt: new Date(),
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticket.id));

    // Send notifications
    const notifications = await this.sendEscalationNotifications(ticket, targetUser, targetRule, escalationCheck.reason);

    return {
      ticketId: ticket.id,
      escalated: true,
      escalationLevel: escalationCheck.escalationLevel,
      assignedTo: targetUser.id,
      reason: escalationCheck.reason,
      notifications
    };
  }

  /**
   * Get escalation rules for a ticket
   */
  private getEscalationRules(ticket: SupportTicket): EscalationRule[] {
    const priority = ticket.priority || 'medium';
    const businessImpact = ticket.businessImpact || 'medium';

    // Define escalation rules based on priority and business impact
    if (priority === 'urgent' && businessImpact === 'critical') {
      return [
        { level: 1, name: 'Urgent Critical L1', triggerAfterHours: 0.5, assignToRole: 'senior_agent', notifyUsers: [], actions: ['notify_manager'] },
        { level: 2, name: 'Urgent Critical L2', triggerAfterHours: 2, assignToRole: 'manager', notifyUsers: [], actions: ['notify_director'] },
        { level: 3, name: 'Urgent Critical L3', triggerAfterHours: 4, assignToRole: 'admin', notifyUsers: [], actions: ['emergency_protocol'] }
      ];
    } else if (priority === 'urgent' || businessImpact === 'critical') {
      return [
        { level: 1, name: 'High Priority L1', triggerAfterHours: 1, assignToRole: 'senior_agent', notifyUsers: [], actions: ['notify_manager'] },
        { level: 2, name: 'High Priority L2', triggerAfterHours: 4, assignToRole: 'manager', notifyUsers: [], actions: [] }
      ];
    } else if (priority === 'high' || businessImpact === 'high') {
      return [
        { level: 1, name: 'Medium Priority L1', triggerAfterHours: 2, assignToRole: 'senior_agent', notifyUsers: [], actions: [] },
        { level: 2, name: 'Medium Priority L2', triggerAfterHours: 8, assignToRole: 'manager', notifyUsers: [], actions: [] }
      ];
    } else {
      return [
        { level: 1, name: 'Standard L1', triggerAfterHours: 24, assignToRole: 'manager', notifyUsers: [], actions: [] }
      ];
    }
  }

  /**
   * Find appropriate user for escalation
   */
  private async findEscalationTarget(rule: EscalationRule): Promise<User | null> {
    let targetRole: string;

    switch (rule.assignToRole) {
      case 'senior_agent':
        targetRole = 'employee'; // Assuming senior agents are employees with specific skills
        break;
      case 'manager':
        targetRole = 'manager';
        break;
      case 'director':
      case 'admin':
        targetRole = 'admin';
        break;
      default:
        targetRole = 'manager';
    }

    // Find users with the target role
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, targetRole))
      .limit(1);

    return targetUser || null;
  }

  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(
    ticket: SupportTicket,
    targetUser: User,
    rule: EscalationRule,
    reason: string
  ): Promise<string[]> {
    const notifications: string[] = [];

    try {
      // WebSocket notification to assigned user
      wsManager.sendToUser(targetUser.id, {
        type: 'notification',
        data: {
          id: `escalation-${ticket.id}`,
          type: 'ticket_escalated',
          title: 'Ticket Escalated to You',
          message: `Support ticket #${ticket.ticketNumber} has been escalated to you`,
          priority: 'high',
          actionUrl: `/support?ticket=${ticket.id}`,
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            escalationLevel: rule.level,
            reason
          }
        }
      });
      notifications.push(`websocket:${targetUser.id}`);

      // Email notification
      if (targetUser.email) {
        await emailService.sendEscalationNotification(
          targetUser.email,
          ticket,
          rule.level,
          reason
        );
        notifications.push(`email:${targetUser.email}`);
      }

      // Third-party integrations (Slack/Teams)
      await this.integrationManager.notifyEscalation(
        ticket,
        rule.level,
        reason,
        targetUser
      );
      notifications.push(`integrations:escalation`);

    } catch (error) {
      console.error('Error sending escalation notifications:', error);
    }

    return notifications;
  }

  /**
   * Update SLA statuses for active tickets
   */
  private async updateSlaStatuses(tickets: SupportTicket[]): Promise<void> {
    for (const ticket of tickets) {
      const slaMetrics = calculateSlaMetrics(ticket);

      if (slaMetrics.slaStatus !== ticket.slaStatus) {
        await db.update(supportTickets)
          .set({
            slaStatus: slaMetrics.slaStatus,
            updatedAt: new Date()
          })
          .where(eq(supportTickets.id, ticket.id));

        // Send SLA breach alerts
        if (slaMetrics.slaStatus === 'breached') {
          await this.sendSlaBreachAlert(ticket);
        }
      }
    }
  }

  /**
   * Send SLA breach alert
   */
  private async sendSlaBreachAlert(ticket: SupportTicket): Promise<void> {
    try {
      // Get assigned user and managers
      const assignedUser = ticket.assignedTo
        ? await db.select().from(users).where(eq(users.id, ticket.assignedTo)).limit(1)
        : [];

      const managers = await db
        .select()
        .from(users)
        .where(or(eq(users.role, 'manager'), eq(users.role, 'admin')));

      // Notify assigned user
      if (assignedUser.length > 0) {
        wsManager.sendToUser(assignedUser[0].id, {
          type: 'notification',
          data: {
            id: `sla-breach-${ticket.id}`,
            type: 'sla_breach',
            title: 'SLA Breach Alert',
            message: `Ticket #${ticket.ticketNumber} has breached its SLA`,
            priority: 'urgent',
            actionUrl: `/support?ticket=${ticket.id}`,
            metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber }
          }
        });
      }

      // Notify managers
      for (const manager of managers) {
        wsManager.sendToUser(manager.id, {
          type: 'notification',
          data: {
            id: `sla-breach-mgr-${ticket.id}`,
            type: 'sla_breach',
            title: 'SLA Breach - Management Alert',
            message: `Support ticket #${ticket.ticketNumber} has breached SLA`,
            priority: 'urgent',
            actionUrl: `/support?ticket=${ticket.id}`,
            metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber }
          }
        });
      }

      // Third-party integrations (Slack/Teams) for SLA breach
      await this.integrationManager.notifySLABreach(ticket);

    } catch (error) {
      console.error('Error sending SLA breach alert:', error);
    }
  }

  /**
   * Manual escalation of a ticket
   */
  async escalateTicket(
    ticketId: string,
    fromUserId: string,
    toUserId: string,
    reason: string,
    level?: number
  ): Promise<TicketEscalation> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const escalationLevel = level || (ticket.escalationLevel || 0) + 1;

    // Create escalation record
    const [escalation] = await db
      .insert(ticketEscalations)
      .values({
        ticketId,
        fromUserId,
        toUserId,
        escalationLevel,
        reason,
        createdAt: new Date()
      })
      .returning();

    // Update ticket
    await db.update(supportTickets)
      .set({
        assignedTo: toUserId,
        escalationLevel,
        escalatedAt: new Date(),
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticketId));

    // Send notifications
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, toUserId));

    if (targetUser) {
      wsManager.sendToUser(toUserId, {
        type: 'notification',
        data: {
          id: `manual-escalation-${ticketId}`,
          type: 'ticket_escalated',
          title: 'Ticket Manually Escalated to You',
          message: `Support ticket #${ticket.ticketNumber} has been escalated to you`,
          priority: 'high',
          actionUrl: `/support?ticket=${ticketId}`,
          metadata: {
            ticketId,
            ticketNumber: ticket.ticketNumber,
            escalationLevel,
            reason
          }
        }
      });
    }

    return escalation;
  }

  /**
   * Get escalation status for tickets
   */
  async getEscalationStatus(): Promise<{
    totalActiveTickets: number;
    escalatedTickets: number;
    overdueTickets: number;
    slaBreaches: number;
  }> {
    const now = new Date();

    const [stats] = await db
      .select({
        totalActive: sql<number>`count(case when status in ('open', 'in_progress') then 1 end)`,
        escalated: sql<number>`count(case when escalation_level > 0 then 1 end)`,
        overdue: sql<number>`count(case when sla_breach_at < ${now} and status in ('open', 'in_progress') then 1 end)`,
        breached: sql<number>`count(case when sla_status = 'breached' then 1 end)`
      })
      .from(supportTickets);

    return {
      totalActiveTickets: stats.totalActive || 0,
      escalatedTickets: stats.escalated || 0,
      overdueTickets: stats.overdue || 0,
      slaBreaches: stats.breached || 0
    };
  }
}

// Singleton instance
export const escalationService = new EscalationService();