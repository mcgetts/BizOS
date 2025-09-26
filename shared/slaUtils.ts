import type { SupportTicket, SlaConfiguration } from './schema';

export interface SlaMetrics {
  responseTimeHours: number;
  resolutionTimeHours: number;
  slaBreachAt: Date;
  slaStatus: 'on_track' | 'at_risk' | 'breached';
  timeRemaining: number; // minutes
  percentTimeElapsed: number;
}

export interface EscalationRule {
  level: number;
  name: string;
  triggerAfterHours: number;
  assignToRole: string;
  notifyUsers: string[];
  actions: string[];
}

// Default SLA configurations based on priority and business impact
export const DEFAULT_SLA_CONFIGS: Record<string, Partial<SlaConfiguration>> = {
  'urgent-critical': {
    name: 'Urgent Critical Issues',
    priority: 'urgent',
    businessImpact: 'critical',
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    escalationLevels: JSON.stringify([
      { level: 1, triggerAfterHours: 0.5, assignToRole: 'senior_agent' },
      { level: 2, triggerAfterHours: 2, assignToRole: 'manager' },
      { level: 3, triggerAfterHours: 4, assignToRole: 'director' }
    ])
  },
  'urgent-high': {
    name: 'Urgent High Impact',
    priority: 'urgent',
    businessImpact: 'high',
    responseTimeHours: 2,
    resolutionTimeHours: 8,
    escalationLevels: JSON.stringify([
      { level: 1, triggerAfterHours: 1, assignToRole: 'senior_agent' },
      { level: 2, triggerAfterHours: 4, assignToRole: 'manager' }
    ])
  },
  'high-critical': {
    name: 'High Priority Critical',
    priority: 'high',
    businessImpact: 'critical',
    responseTimeHours: 2,
    resolutionTimeHours: 12,
    escalationLevels: JSON.stringify([
      { level: 1, triggerAfterHours: 1, assignToRole: 'senior_agent' },
      { level: 2, triggerAfterHours: 6, assignToRole: 'manager' }
    ])
  },
  'high-high': {
    name: 'High Priority High Impact',
    priority: 'high',
    businessImpact: 'high',
    responseTimeHours: 4,
    resolutionTimeHours: 24,
    escalationLevels: JSON.stringify([
      { level: 1, triggerAfterHours: 2, assignToRole: 'senior_agent' }
    ])
  },
  'medium-medium': {
    name: 'Medium Priority Medium Impact',
    priority: 'medium',
    businessImpact: 'medium',
    responseTimeHours: 8,
    resolutionTimeHours: 48,
    escalationLevels: JSON.stringify([
      { level: 1, triggerAfterHours: 24, assignToRole: 'manager' }
    ])
  },
  'low-low': {
    name: 'Low Priority Low Impact',
    priority: 'low',
    businessImpact: 'low',
    responseTimeHours: 24,
    resolutionTimeHours: 168, // 1 week
    escalationLevels: JSON.stringify([])
  }
};

/**
 * Calculate SLA metrics for a support ticket
 */
export function calculateSlaMetrics(
  ticket: SupportTicket,
  slaConfig?: SlaConfiguration
): SlaMetrics {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);

  // Use ticket-specific SLA times or fall back to defaults
  const responseTimeHours = ticket.responseTimeHours || slaConfig?.responseTimeHours || getDefaultSlaHours(ticket, 'response');
  const resolutionTimeHours = ticket.resolutionTimeHours || slaConfig?.resolutionTimeHours || getDefaultSlaHours(ticket, 'resolution');

  // Calculate SLA breach time
  const slaBreachAt = new Date(createdAt.getTime() + (resolutionTimeHours * 60 * 60 * 1000));

  // Calculate time remaining
  const timeRemainingMs = slaBreachAt.getTime() - now.getTime();
  const timeRemaining = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60))); // minutes

  // Calculate percentage of time elapsed
  const totalTimeMs = resolutionTimeHours * 60 * 60 * 1000;
  const elapsedTimeMs = now.getTime() - createdAt.getTime();
  const percentTimeElapsed = Math.min(100, Math.max(0, (elapsedTimeMs / totalTimeMs) * 100));

  // Determine SLA status
  let slaStatus: 'on_track' | 'at_risk' | 'breached' = 'on_track';

  if (timeRemainingMs <= 0) {
    slaStatus = 'breached';
  } else if (percentTimeElapsed >= 80) {
    slaStatus = 'at_risk';
  }

  return {
    responseTimeHours,
    resolutionTimeHours,
    slaBreachAt,
    slaStatus,
    timeRemaining,
    percentTimeElapsed
  };
}

/**
 * Get default SLA hours based on priority and business impact
 */
function getDefaultSlaHours(ticket: SupportTicket, type: 'response' | 'resolution'): number {
  const key = `${ticket.priority || 'medium'}-${ticket.businessImpact || 'medium'}`;
  const config = DEFAULT_SLA_CONFIGS[key] || DEFAULT_SLA_CONFIGS['medium-medium'];

  return type === 'response'
    ? config.responseTimeHours || 8
    : config.resolutionTimeHours || 48;
}

/**
 * Check if a ticket needs escalation
 */
export function checkEscalationNeeded(
  ticket: SupportTicket,
  slaConfig?: SlaConfiguration
): { needsEscalation: boolean; escalationLevel: number; reason: string } | null {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Get escalation rules
  const escalationLevels = slaConfig?.escalationLevels
    ? JSON.parse(slaConfig.escalationLevels) as EscalationRule[]
    : getDefaultEscalationRules(ticket);

  const currentLevel = ticket.escalationLevel || 0;

  // Find next escalation level
  for (const rule of escalationLevels) {
    if (rule.level > currentLevel && hoursElapsed >= rule.triggerAfterHours) {
      return {
        needsEscalation: true,
        escalationLevel: rule.level,
        reason: `Ticket has been open for ${Math.floor(hoursElapsed)} hours without resolution`
      };
    }
  }

  return null;
}

/**
 * Get default escalation rules based on ticket priority and business impact
 */
function getDefaultEscalationRules(ticket: SupportTicket): EscalationRule[] {
  const key = `${ticket.priority || 'medium'}-${ticket.businessImpact || 'medium'}`;
  const config = DEFAULT_SLA_CONFIGS[key] || DEFAULT_SLA_CONFIGS['medium-medium'];

  return config.escalationLevels
    ? JSON.parse(config.escalationLevels) as EscalationRule[]
    : [];
}

/**
 * Calculate actual response and resolution times
 */
export function calculateActualTimes(ticket: SupportTicket): {
  actualResponseMinutes?: number;
  actualResolutionMinutes?: number;
} {
  const createdAt = new Date(ticket.createdAt);
  const result: any = {};

  // Calculate actual response time
  if (ticket.firstResponseAt) {
    const responseAt = new Date(ticket.firstResponseAt);
    result.actualResponseMinutes = Math.floor((responseAt.getTime() - createdAt.getTime()) / (1000 * 60));
  }

  // Calculate actual resolution time
  if (ticket.resolvedAt) {
    const resolvedAt = new Date(ticket.resolvedAt);
    result.actualResolutionMinutes = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60));
  }

  return result;
}

/**
 * Determine business impact based on client and category
 */
export function calculateBusinessImpact(
  category: string,
  priority: string,
  clientType?: string
): 'low' | 'medium' | 'high' | 'critical' {
  // Critical categories
  if (['security', 'data_loss', 'system_down'].includes(category)) {
    return 'critical';
  }

  // High impact for enterprise clients
  if (clientType === 'enterprise') {
    if (priority === 'urgent') return 'critical';
    if (priority === 'high') return 'high';
  }

  // Map priority to business impact
  switch (priority) {
    case 'urgent': return 'high';
    case 'high': return 'medium';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'medium';
  }
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Overdue';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${remainingMinutes}m`;
  }
}

/**
 * Get SLA status color for UI
 */
export function getSlaStatusColor(slaStatus: string): string {
  switch (slaStatus) {
    case 'on_track': return 'green';
    case 'at_risk': return 'orange';
    case 'breached': return 'red';
    default: return 'gray';
  }
}

/**
 * Generate SLA report for analytics
 */
export function generateSlaReport(tickets: SupportTicket[]) {
  const total = tickets.length;
  const onTrack = tickets.filter(t => t.slaStatus === 'on_track').length;
  const atRisk = tickets.filter(t => t.slaStatus === 'at_risk').length;
  const breached = tickets.filter(t => t.slaStatus === 'breached').length;

  const avgResponseTime = tickets
    .filter(t => t.actualResponseMinutes)
    .reduce((sum, t) => sum + (t.actualResponseMinutes || 0), 0) /
    tickets.filter(t => t.actualResponseMinutes).length || 0;

  const avgResolutionTime = tickets
    .filter(t => t.actualResolutionMinutes)
    .reduce((sum, t) => sum + (t.actualResolutionMinutes || 0), 0) /
    tickets.filter(t => t.actualResolutionMinutes).length || 0;

  return {
    total,
    onTrack,
    atRisk,
    breached,
    slaComplianceRate: total > 0 ? ((onTrack / total) * 100).toFixed(1) : '0',
    avgResponseTimeHours: (avgResponseTime / 60).toFixed(1),
    avgResolutionTimeHours: (avgResolutionTime / 60).toFixed(1)
  };
}