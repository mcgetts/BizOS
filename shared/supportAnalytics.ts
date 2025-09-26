import type { SupportTicket, SupportTicketComment, User } from './schema';

export interface SupportKPIs {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgFirstResponseTime: number; // minutes
  avgResolutionTime: number; // minutes
  slaComplianceRate: number; // percentage
  customerSatisfactionScore: number; // 1-5
  escalationRate: number; // percentage
  ticketVolumeGrowth: number; // percentage
  agentWorkload: number; // avg tickets per agent
}

export interface AgentPerformance {
  userId: string;
  userName: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  avgResponseTime: number; // minutes
  avgResolutionTime: number; // minutes
  customerSatisfaction: number; // 1-5
  escalationsReceived: number;
  workloadScore: number; // 1-100
  efficiencyRating: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

export interface SupportTrends {
  ticketVolume: Array<{ date: string; count: number; category: string }>;
  responseTimeTrend: Array<{ date: string; avgMinutes: number }>;
  resolutionTimeTrend: Array<{ date: string; avgMinutes: number }>;
  satisfactionTrend: Array<{ date: string; avgRating: number }>;
  categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
  priorityDistribution: Array<{ priority: string; count: number; percentage: number }>;
}

export interface SupportAnalytics {
  kpis: SupportKPIs;
  agentPerformance: AgentPerformance[];
  trends: SupportTrends;
  predictions: {
    nextWeekVolume: number;
    potentialBottlenecks: string[];
    recommendedActions: string[];
  };
}

/**
 * Calculate comprehensive support KPIs
 */
export function calculateSupportKPIs(
  tickets: SupportTicket[],
  timeRange: { start: Date; end: Date },
  previousPeriodTickets?: SupportTicket[]
): SupportKPIs {
  const now = new Date();
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  // Calculate response times (excluding null values)
  const responseTimesMinutes = tickets
    .filter(t => t.actualResponseMinutes)
    .map(t => t.actualResponseMinutes!);
  const avgFirstResponseTime = responseTimesMinutes.length > 0
    ? responseTimesMinutes.reduce((sum, time) => sum + time, 0) / responseTimesMinutes.length
    : 0;

  // Calculate resolution times
  const resolutionTimesMinutes = tickets
    .filter(t => t.actualResolutionMinutes)
    .map(t => t.actualResolutionMinutes!);
  const avgResolutionTime = resolutionTimesMinutes.length > 0
    ? resolutionTimesMinutes.reduce((sum, time) => sum + time, 0) / resolutionTimesMinutes.length
    : 0;

  // SLA compliance rate
  const slaCompliantTickets = tickets.filter(t => t.slaStatus === 'on_track').length;
  const slaComplianceRate = totalTickets > 0 ? (slaCompliantTickets / totalTickets) * 100 : 100;

  // Customer satisfaction score
  const ratedTickets = tickets.filter(t => t.satisfactionRating);
  const customerSatisfactionScore = ratedTickets.length > 0
    ? ratedTickets.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) / ratedTickets.length
    : 0;

  // Escalation rate
  const escalatedTickets = tickets.filter(t => (t.escalationLevel || 0) > 0).length;
  const escalationRate = totalTickets > 0 ? (escalatedTickets / totalTickets) * 100 : 0;

  // Volume growth calculation
  const previousTotal = previousPeriodTickets?.length || 0;
  const ticketVolumeGrowth = previousTotal > 0
    ? ((totalTickets - previousTotal) / previousTotal) * 100
    : 0;

  // Calculate agent workload (rough estimate)
  const uniqueAssignees = new Set(tickets.filter(t => t.assignedTo).map(t => t.assignedTo));
  const agentWorkload = uniqueAssignees.size > 0 ? totalTickets / uniqueAssignees.size : 0;

  return {
    totalTickets,
    openTickets,
    resolvedTickets,
    avgFirstResponseTime,
    avgResolutionTime,
    slaComplianceRate,
    customerSatisfactionScore,
    escalationRate,
    ticketVolumeGrowth,
    agentWorkload
  };
}

/**
 * Calculate individual agent performance metrics
 */
export function calculateAgentPerformance(
  tickets: SupportTicket[],
  users: User[]
): AgentPerformance[] {
  const agents = users.filter(u => u.role === 'employee' || u.role === 'manager');

  return agents.map(agent => {
    const agentTickets = tickets.filter(t => t.assignedTo === agent.id);
    const resolvedTickets = agentTickets.filter(t => t.status === 'resolved' || t.status === 'closed');

    // Response time calculation
    const responseTimes = agentTickets
      .filter(t => t.actualResponseMinutes)
      .map(t => t.actualResponseMinutes!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Resolution time calculation
    const resolutionTimes = resolvedTickets
      .filter(t => t.actualResolutionMinutes)
      .map(t => t.actualResolutionMinutes!);
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    // Customer satisfaction
    const ratedTickets = agentTickets.filter(t => t.satisfactionRating);
    const customerSatisfaction = ratedTickets.length > 0
      ? ratedTickets.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) / ratedTickets.length
      : 0;

    // Escalations received
    const escalationsReceived = agentTickets.filter(t => (t.escalationLevel || 0) > 0).length;

    // Workload score (considering ticket count, priority, and complexity)
    const urgentTickets = agentTickets.filter(t => t.priority === 'urgent').length;
    const highTickets = agentTickets.filter(t => t.priority === 'high').length;
    const workloadScore = Math.min(100,
      (agentTickets.length * 10) +
      (urgentTickets * 20) +
      (highTickets * 10) +
      (escalationsReceived * 15)
    );

    // Efficiency rating
    let efficiencyRating: 'excellent' | 'good' | 'average' | 'needs_improvement' = 'average';
    const resolutionRate = agentTickets.length > 0 ? (resolvedTickets.length / agentTickets.length) * 100 : 0;

    if (resolutionRate >= 90 && customerSatisfaction >= 4.5 && avgResponseTime <= 120) {
      efficiencyRating = 'excellent';
    } else if (resolutionRate >= 80 && customerSatisfaction >= 4.0 && avgResponseTime <= 240) {
      efficiencyRating = 'good';
    } else if (resolutionRate >= 70 && customerSatisfaction >= 3.5) {
      efficiencyRating = 'average';
    } else {
      efficiencyRating = 'needs_improvement';
    }

    return {
      userId: agent.id,
      userName: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email || 'Unknown',
      ticketsAssigned: agentTickets.length,
      ticketsResolved: resolvedTickets.length,
      avgResponseTime,
      avgResolutionTime,
      customerSatisfaction,
      escalationsReceived,
      workloadScore,
      efficiencyRating
    };
  });
}

/**
 * Generate support trends and distributions
 */
export function calculateSupportTrends(
  tickets: SupportTicket[],
  timeRange: { start: Date; end: Date }
): SupportTrends {
  // Group tickets by day for volume trend
  const ticketVolume = groupTicketsByDate(tickets, timeRange);

  // Response time trend
  const responseTimeTrend = calculateTimeTrend(tickets, 'response', timeRange);

  // Resolution time trend
  const resolutionTimeTrend = calculateTimeTrend(tickets, 'resolution', timeRange);

  // Satisfaction trend
  const satisfactionTrend = calculateSatisfactionTrend(tickets, timeRange);

  // Category distribution
  const categoryDistribution = calculateCategoryDistribution(tickets);

  // Priority distribution
  const priorityDistribution = calculatePriorityDistribution(tickets);

  return {
    ticketVolume,
    responseTimeTrend,
    resolutionTimeTrend,
    satisfactionTrend,
    categoryDistribution,
    priorityDistribution
  };
}

/**
 * Generate predictive insights
 */
export function generateSupportPredictions(
  tickets: SupportTicket[],
  trends: SupportTrends
): { nextWeekVolume: number; potentialBottlenecks: string[]; recommendedActions: string[] } {
  // Simple linear regression for volume prediction
  const recentVolume = trends.ticketVolume.slice(-7); // Last 7 days
  const avgDailyVolume = recentVolume.reduce((sum, day) => sum + day.count, 0) / recentVolume.length;
  const nextWeekVolume = Math.round(avgDailyVolume * 7);

  // Identify potential bottlenecks
  const potentialBottlenecks: string[] = [];
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const urgentOpenTickets = openTickets.filter(t => t.priority === 'urgent');
  const overdueTickets = tickets.filter(t => t.slaStatus === 'breached');

  if (urgentOpenTickets.length > 5) {
    potentialBottlenecks.push(`${urgentOpenTickets.length} urgent tickets require immediate attention`);
  }
  if (overdueTickets.length > 0) {
    potentialBottlenecks.push(`${overdueTickets.length} tickets have breached SLA`);
  }
  if (avgDailyVolume > 10) {
    potentialBottlenecks.push('High ticket volume may overwhelm support team');
  }

  // Generate recommended actions
  const recommendedActions: string[] = [];
  const escalationRate = (tickets.filter(t => (t.escalationLevel || 0) > 0).length / tickets.length) * 100;
  const avgResponseTime = tickets
    .filter(t => t.actualResponseMinutes)
    .reduce((sum, t) => sum + (t.actualResponseMinutes || 0), 0) /
    tickets.filter(t => t.actualResponseMinutes).length || 0;

  if (escalationRate > 15) {
    recommendedActions.push('Review escalation procedures and agent training');
  }
  if (avgResponseTime > 240) { // 4 hours
    recommendedActions.push('Implement faster initial response protocols');
  }
  if (nextWeekVolume > avgDailyVolume * 7 * 1.2) {
    recommendedActions.push('Consider additional staffing for increased volume');
  }

  return {
    nextWeekVolume,
    potentialBottlenecks,
    recommendedActions
  };
}

// Helper functions
function groupTicketsByDate(tickets: SupportTicket[], timeRange: { start: Date; end: Date }) {
  const dateGroups: Record<string, { count: number; categories: Record<string, number> }> = {};

  tickets.forEach(ticket => {
    const date = new Date(ticket.createdAt).toISOString().split('T')[0];
    if (!dateGroups[date]) {
      dateGroups[date] = { count: 0, categories: {} };
    }
    dateGroups[date].count++;

    const category = ticket.category || 'general';
    dateGroups[date].categories[category] = (dateGroups[date].categories[category] || 0) + 1;
  });

  return Object.entries(dateGroups).map(([date, data]) => ({
    date,
    count: data.count,
    category: 'all' // For aggregated view
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTimeTrend(
  tickets: SupportTicket[],
  type: 'response' | 'resolution',
  timeRange: { start: Date; end: Date }
) {
  const dateGroups: Record<string, number[]> = {};
  const timeField = type === 'response' ? 'actualResponseMinutes' : 'actualResolutionMinutes';

  tickets.forEach(ticket => {
    const timeValue = ticket[timeField];
    if (timeValue) {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(timeValue);
    }
  });

  return Object.entries(dateGroups).map(([date, times]) => ({
    date,
    avgMinutes: times.reduce((sum, time) => sum + time, 0) / times.length
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSatisfactionTrend(tickets: SupportTicket[], timeRange: { start: Date; end: Date }) {
  const dateGroups: Record<string, number[]> = {};

  tickets.forEach(ticket => {
    if (ticket.satisfactionRating) {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(ticket.satisfactionRating);
    }
  });

  return Object.entries(dateGroups).map(([date, ratings]) => ({
    date,
    avgRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateCategoryDistribution(tickets: SupportTicket[]) {
  const categories: Record<string, number> = {};

  tickets.forEach(ticket => {
    const category = ticket.category || 'general';
    categories[category] = (categories[category] || 0) + 1;
  });

  const total = tickets.length;
  return Object.entries(categories).map(([category, count]) => ({
    category,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  })).sort((a, b) => b.count - a.count);
}

function calculatePriorityDistribution(tickets: SupportTicket[]) {
  const priorities: Record<string, number> = {};

  tickets.forEach(ticket => {
    const priority = ticket.priority || 'medium';
    priorities[priority] = (priorities[priority] || 0) + 1;
  });

  const total = tickets.length;
  return Object.entries(priorities).map(([priority, count]) => ({
    priority,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  })).sort((a, b) => {
    const order = { urgent: 4, high: 3, medium: 2, low: 1 };
    return (order[priority as keyof typeof order] || 0) - (order[priority as keyof typeof order] || 0);
  });
}

/**
 * Format time for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return `${days}d ${remainingHours}h`;
  }
}

/**
 * Get performance color based on metric
 */
export function getPerformanceColor(metric: string, value: number): string {
  switch (metric) {
    case 'responseTime':
      if (value <= 60) return 'green'; // 1 hour
      if (value <= 240) return 'yellow'; // 4 hours
      return 'red';
    case 'resolutionTime':
      if (value <= 1440) return 'green'; // 24 hours
      if (value <= 4320) return 'yellow'; // 3 days
      return 'red';
    case 'satisfaction':
      if (value >= 4.5) return 'green';
      if (value >= 3.5) return 'yellow';
      return 'red';
    case 'slaCompliance':
      if (value >= 95) return 'green';
      if (value >= 85) return 'yellow';
      return 'red';
    default:
      return 'blue';
  }
}