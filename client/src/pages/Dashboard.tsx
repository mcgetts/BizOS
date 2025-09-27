import { useEffect, useState } from "react";
import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, isToday, isSameDay, addDays, subDays, subMonths } from "date-fns";
import type { Project, Task, User, Client } from "@shared/schema";

interface DashboardKPIs {
  revenue: { current: number; target: number; growth: number };
  clients: { current: number; target: number; growth: number };
  projects: { current: number; target: number; growth: number };
  team: { current: number; target: number; growth: number };
}

interface CompanyEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: "meeting" | "deadline" | "milestone" | "announcement" | "holiday";
  priority: "low" | "medium" | "high" | "urgent";
  attendees?: string[];
  location?: string;
}

interface ClientEvent {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  date: Date;
  type: "sale" | "project_start" | "project_end" | "review" | "contract";
  value?: number;
  status: "upcoming" | "completed" | "cancelled";
}
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  CalendarIcon,
  Building2,
  Users,
  MapPin,
  Star,
  PoundSterling
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6);

  // Role-based dashboard customization
  const userRole = user?.role || 'employee';
  const isExecutive = userRole === 'admin';
  const isManager = userRole === 'manager' || isExecutive;
  const isEmployee = userRole === 'employee';

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: ["/api/dashboard/kpis"],
    enabled: isAuthenticated,
  });

  const { data: revenueTrends } = useQuery<Array<{
    month: string;
    year: number;
    revenue: number;
    invoiceCount: number;
  }>>({
    queryKey: ["/api/dashboard/revenue-trends", { months: selectedPeriod }],
    enabled: isAuthenticated,
  });

  // Generate real company events from project data
  const companyEvents: CompanyEvent[] = React.useMemo(() => {
    if (!projects) return [];

    const events: CompanyEvent[] = [];
    const today = new Date();

    // Add project deadlines as company events
    projects.forEach(project => {
      if (project.endDate) {
        const endDate = new Date(project.endDate);
        const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilEnd > 0 && daysUntilEnd <= 30) {
          events.push({
            id: `project-deadline-${project.id}`,
            title: `${project.name} Deadline`,
            description: `Project completion deadline approaching`,
            date: endDate,
            type: daysUntilEnd <= 7 ? "deadline" : "milestone",
            priority: daysUntilEnd <= 7 ? "urgent" : daysUntilEnd <= 14 ? "high" : "medium"
          });
        }
      }

      // Add project start dates if in the future
      if (project.startDate) {
        const startDate = new Date(project.startDate);
        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilStart > 0 && daysUntilStart <= 14) {
          events.push({
            id: `project-start-${project.id}`,
            title: `${project.name} Kickoff`,
            description: `Project kickoff meeting and planning session`,
            date: startDate,
            type: "meeting",
            priority: "medium"
          });
        }
      }
    });

    // Add some strategic company events
    const strategicEvents: CompanyEvent[] = [
      {
        id: "quarterly-review",
        title: "Quarterly Business Review",
        description: "Q4 performance review and Q1 planning",
        date: addDays(today, 5),
        type: "meeting",
        priority: "high",
        attendees: ["Executive Team"],
        location: "Conference Room A"
      }
    ];

    return [...events, ...strategicEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [projects]);

  // Generate real client events from client and project data
  const clientEvents: ClientEvent[] = React.useMemo(() => {
    if (!clients || !projects) return [];

    const events: ClientEvent[] = [];
    const today = new Date();

    // Generate client touchpoint events based on last contact dates
    clients.forEach(client => {
      if (client.lastContactDate) {
        const lastContact = new Date(client.lastContactDate);
        const daysSinceContact = Math.ceil((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

        // Schedule follow-up based on client status
        const followUpDays = client.status === 'client' ? 30 : 14; // Clients every 30 days, leads every 14
        const nextContactDate = addDays(lastContact, followUpDays);

        if (nextContactDate >= today && nextContactDate <= addDays(today, 30)) {
          events.push({
            id: `client-followup-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            title: client.status === 'client' ? "Regular Check-in" : "Lead Follow-up",
            description: `Scheduled ${client.status === 'client' ? 'client' : 'prospect'} touchpoint`,
            date: nextContactDate,
            type: client.status === 'client' ? "review" : "sale",
            status: "upcoming"
          });
        }
      }
    });

    // Add project-related client events
    projects.forEach(project => {
      const projectClient = clients.find(c => c.id === project.clientId);
      if (projectClient && project.endDate) {
        const endDate = new Date(project.endDate);
        const reviewDate = addDays(endDate, 3); // Schedule review 3 days after project end

        if (reviewDate >= today && reviewDate <= addDays(today, 45)) {
          events.push({
            id: `project-review-${project.id}`,
            clientId: projectClient.id,
            clientName: projectClient.name,
            title: "Project Review & Feedback",
            description: `Post-project review for ${project.name}`,
            date: reviewDate,
            type: "review",
            status: "upcoming"
          });
        }
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [clients, projects]);


  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }


  // Generate enhanced executive alerts with recommended actions
  const currentDate = new Date();
  const alerts = React.useMemo(() => {
    const alertList = [];

    // Critical Priority: Blocked tasks (with specific actions)
    const blockedTasks = tasks?.filter(t => t.status === 'blocked') || [];
    if (blockedTasks.length > 0) {
      const task = blockedTasks[0];
      const assignedUser = users?.find(u => u.id === task.assignedTo);
      alertList.push({
        id: task.id,
        title: "Critical: Task Blocked",
        description: `${task.title} is blocked and preventing progress`,
        priority: "Critical",
        type: "destructive" as const,
        actionUrl: `/tasks?focus=${task.id}`,
        entityType: "task",
        recommendedAction: `Contact ${assignedUser?.firstName || 'assignee'} to resolve blocker`,
        quickActions: [
          { label: "View Task", url: `/tasks?focus=${task.id}` },
          { label: "Contact Team", url: "/team" }
        ]
      });
    }

    // High Priority: Overdue tasks (with escalation options)
    const overdueTasks = tasks?.filter(t =>
      t.dueDate && new Date(t.dueDate) < currentDate && t.status !== 'completed'
    ) || [];
    if (overdueTasks.length > 0) {
      const task = overdueTasks[0];
      const daysOverdue = Math.ceil((currentDate.getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
      alertList.push({
        id: task.id,
        title: "Overdue Task Requires Action",
        description: `${task.title} is ${daysOverdue} days overdue`,
        priority: "High",
        type: "destructive" as const,
        actionUrl: `/tasks?focus=${task.id}`,
        entityType: "task",
        recommendedAction: daysOverdue > 3 ? "Escalate or reassign immediately" : "Follow up with assignee",
        quickActions: [
          { label: "Review Task", url: `/tasks?focus=${task.id}` },
          { label: "Reschedule", url: `/tasks?focus=${task.id}` }
        ]
      });
    }

    // High Priority: Projects at risk (resource or timeline issues)
    const projectsAtRisk = projects?.filter(p => p.endDate && p.status === 'in_progress').map(p => {
      const daysToDeadline = Math.ceil((new Date(p.endDate!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const projectTasks = tasks?.filter(t => t.projectId === p.id) || [];
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Risk assessment based on time vs progress
      const expectedProgress = Math.max(0, 100 - (daysToDeadline / 30) * 100); // Rough calculation
      const isAtRisk = daysToDeadline <= 14 && (progress < expectedProgress - 20 || progress < 50);

      return { ...p, daysToDeadline, progress, isAtRisk };
    }).filter(p => p.isAtRisk).slice(0, 1) || [];

    if (projectsAtRisk.length > 0) {
      const project = projectsAtRisk[0];
      alertList.push({
        id: project.id,
        title: "Project At Risk",
        description: `${project.name} may miss deadline (${project.progress.toFixed(0)}% complete, ${project.daysToDeadline} days left)`,
        priority: "High",
        type: "warning" as const,
        actionUrl: `/projects?focus=${project.id}`,
        entityType: "project",
        recommendedAction: project.daysToDeadline <= 7 ? "Consider scope reduction or resource reallocation" : "Accelerate task completion",
        quickActions: [
          { label: "View Project", url: `/projects?focus=${project.id}` },
          { label: "Resource Planning", url: "/analytics?tab=team" }
        ]
      });
    }

    // Medium Priority: Team utilization issues
    if (users && users.length > 0) {
      // Mock utilization data - in real app, this would come from actual time tracking
      const overUtilizedUsers = users.filter(u => u.role !== 'admin').slice(0, 2); // Mock: assume first 2 are overutilized
      if (overUtilizedUsers.length > 0) {
        alertList.push({
          id: "team-utilization",
          title: "Team Utilization Alert",
          description: `${overUtilizedUsers.length} team members may be overloaded`,
          priority: "Medium",
          type: "warning" as const,
          actionUrl: "/analytics?tab=team",
          entityType: "team",
          recommendedAction: "Review workload distribution and consider hiring",
          quickActions: [
            { label: "Team Analytics", url: "/analytics?tab=team" },
            { label: "Resource Planning", url: "/team" }
          ]
        });
      }
    }

    // Low Priority: Opportunities (positive alerts)
    const recentCompletions = tasks?.filter(t =>
      t.status === 'completed' && t.updatedAt &&
      new Date(t.updatedAt) > subDays(currentDate, 7)
    ) || [];

    if (recentCompletions.length >= 5) {
      alertList.push({
        id: "productivity-milestone",
        title: "Productivity Milestone",
        description: `Team completed ${recentCompletions.length} tasks this week`,
        priority: "Low",
        type: "primary" as const,
        actionUrl: "/analytics?tab=team",
        entityType: "achievement",
        recommendedAction: "Consider team recognition or bonus structure",
        quickActions: [
          { label: "View Analytics", url: "/analytics?tab=team" },
          { label: "Team Management", url: "/team" }
        ]
      });
    }

    return alertList.slice(0, 3); // Limit to 3 most important alerts
  }, [tasks, projects, users, currentDate]);

  // Generate recent activity from real data
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const getInitialsAvatar = (firstName: string, lastName: string) =>
    `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=6366f1&color=fff&size=32`;

  // Enhanced recent activity with more real data sources
  const recentActivity = [
    // Recent completed tasks
    ...(tasks?.filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 2)
      .map(task => {
        const user = users?.find(u => u.id === task.assignedTo) || users?.[0];
        return {
          user: user ? `${user.firstName} ${user.lastName}` : 'Team Member',
          action: 'completed task',
          target: task.title,
          time: task.updatedAt ? getTimeAgo(new Date(task.updatedAt)) : 'Recently',
          status: 'Completed',
          avatar: (user && user.firstName && user.lastName) ? getInitialsAvatar(user.firstName, user.lastName) : '',
          type: 'task'
        };
      }) || []),
    // Recent project updates
    ...(projects?.filter(p => p.status === 'in_progress')
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 1)
      .map(project => {
        const user = users?.find(u => u.id === project.managerId) || users?.find(u => u.role === 'manager') || users?.[1];
        return {
          user: user ? `${user.firstName} ${user.lastName}` : 'Project Manager',
          action: 'updated project',
          target: project.name,
          time: project.updatedAt ? getTimeAgo(new Date(project.updatedAt)) : 'Recently',
          status: 'In Progress',
          avatar: (user && user.firstName && user.lastName) ? getInitialsAvatar(user.firstName, user.lastName) : '',
          type: 'project'
        };
      }) || []),
    // Recent client interactions
    ...(clients?.filter(c => c.lastContactDate)
      .sort((a, b) => new Date(b.lastContactDate || 0).getTime() - new Date(a.lastContactDate || 0).getTime())
      .slice(0, 1)
      .map(client => {
        const user = users?.find(u => u.id === client.assignedTo) || users?.find(u => u.role === 'manager') || users?.[0];
        return {
          user: user ? `${user.firstName} ${user.lastName}` : 'Sales Team',
          action: 'contacted client',
          target: client.name,
          time: client.lastContactDate ? getTimeAgo(new Date(client.lastContactDate)) : 'Recently',
          status: client.status === 'client' ? 'Active Client' : 'Lead',
          avatar: (user && user.firstName && user.lastName) ? getInitialsAvatar(user.firstName, user.lastName) : '',
          type: 'client'
        };
      }) || []),
    // Recent new users
    ...(users?.filter(u => u.createdAt)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 1)
      .map(user => {
        const admin = users?.find(u => u.role === 'admin') || users?.[0];
        return {
          user: admin ? `${admin.firstName} ${admin.lastName}` : 'Admin',
          action: 'added new team member',
          target: `${user.firstName} ${user.lastName}`,
          time: user.createdAt ? getTimeAgo(new Date(user.createdAt)) : 'Recently',
          status: user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Employee',
          avatar: admin && admin.firstName && admin.lastName ? getInitialsAvatar(admin.firstName, admin.lastName) : '',
          type: 'user'
        };
      }) || [])
  ].slice(0, 4);

  // Fallback to sample data if no real activity
  const fallbackActivity = [
    {
      user: "System",
      action: "initialized",
      target: "Dashboard",
      time: "Recently",
      status: "Active",
      avatar: "https://ui-avatars.com/api/?name=System&background=6366f1&color=fff&size=32",
      type: "system"
    }
  ];

  const displayActivity = recentActivity.length > 0 ? recentActivity : fallbackActivity;

  // Get upcoming events for the calendar section
  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    const upcomingCompanyEvents = companyEvents
      .filter(event => event.date >= today && event.date <= addDays(today, 30))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);

    const upcomingClientEvents = clientEvents
      .filter(event => event.date >= today && event.date <= addDays(today, 30) && event.status === "upcoming")
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 2);

    return { companyEvents: upcomingCompanyEvents, clientEvents: upcomingClientEvents };
  };

  const upcomingEvents = getUpcomingEvents();

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting": return "blue";
      case "deadline": return "red";
      case "milestone": return "green";
      case "announcement": return "purple";
      case "holiday": return "gray";
      case "sale": return "emerald";
      case "project_start": return "blue";
      case "project_end": return "indigo";
      case "review": return "yellow";
      case "contract": return "orange";
      default: return "gray";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return AlertTriangle;
      case "high": return TrendingUp;
      case "medium": return Clock;
      case "low": return CheckCircle;
      default: return Clock;
    }
  };

  const displayProjects = projects?.slice(0, 3) || [];

  const dashboardTitle = isExecutive ? 'Executive Dashboard' :
                       isManager ? 'Management Dashboard' :
                       'My Dashboard';

  return (
    <Layout title={dashboardTitle} breadcrumbs={["Dashboard"]}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <DashboardKPIs userRole={userRole} />


        {/* Revenue Chart - Executive/Manager Only */}
        {isManager && (
          <Card className="glassmorphism" data-testid="card-revenue-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue Trends</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={selectedPeriod === 12 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod(12)}
                  >
                    12M
                  </Button>
                  <Button
                    variant={selectedPeriod === 6 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod(6)}
                  >
                    6M
                  </Button>
                  <Button
                    variant={selectedPeriod === 3 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod(3)}
                  >
                    3M
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {revenueTrends && revenueTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueTrends}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="month"
                        className="text-xs"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        className="text-xs"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{label}</p>
                                <p className="text-sm text-primary">
                                  Revenue: £{payload[0].value?.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payload[0].payload.invoiceCount} invoices
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        className="drop-shadow-sm"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">No revenue data available</div>
                      <div className="text-xs">Complete some paid invoices to see trends</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Personal Dashboard */}
        {isEmployee && (
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle>My Work Overview</CardTitle>
              <p className="text-sm text-muted-foreground">Your assigned tasks and upcoming deadlines</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {tasks?.filter(t => t.assignedTo === user?.id && t.status !== 'completed').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Tasks</div>
                </div>
                <div className="text-center p-4 bg-warning/10 rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {tasks?.filter(t => t.assignedTo === user?.id && t.dueDate && new Date(t.dueDate) <= addDays(new Date(), 3)).length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Due This Week</div>
                </div>
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {tasks?.filter(t => t.assignedTo === user?.id && t.status === 'completed' && t.updatedAt && new Date(t.updatedAt) > subDays(new Date(), 7)).length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed This Week</div>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/tasks'}
                >
                  View All Tasks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/projects'}
                >
                  My Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive Alerts, Upcoming Events, and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts - Role-based title */}
          <Card className="glassmorphism" data-testid="card-alerts">
            <CardHeader>
              <CardTitle>
                {isExecutive ? 'Executive Alerts' :
                 isManager ? 'Management Alerts' :
                 'My Alerts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <div
                      key={alert.id || index}
                      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                        alert.type === 'destructive'
                          ? 'bg-destructive/10 border-destructive/20 hover:bg-destructive/15'
                          : alert.type === 'warning'
                          ? 'bg-warning/10 border-warning/20 hover:bg-warning/15'
                          : 'bg-primary/10 border-primary/20 hover:bg-primary/15'
                      }`}
                      data-testid={`alert-${index}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          alert.type === 'destructive'
                            ? 'bg-destructive/20'
                            : alert.type === 'warning'
                            ? 'bg-warning/20'
                            : 'bg-primary/20'
                        }`}>
                          {alert.priority === 'Critical' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                          {alert.priority === 'High' && <TrendingUp className="w-4 h-4 text-warning" />}
                          {alert.priority === 'Medium' && <Clock className="w-4 h-4 text-warning" />}
                          {alert.priority === 'Low' && <CheckCircle className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-foreground">{alert.title}</div>
                              <Badge
                                variant={alert.priority === 'Critical' || alert.priority === 'High' ? "destructive" :
                                        alert.priority === 'Medium' ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {alert.priority}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{alert.description}</div>
                          </div>

                          {alert.recommendedAction && (
                            <div className={`text-xs p-2 rounded border-l-2 ${
                              alert.type === 'destructive'
                                ? 'bg-destructive/5 border-l-destructive text-destructive'
                                : alert.type === 'warning'
                                ? 'bg-warning/5 border-l-warning text-warning'
                                : 'bg-primary/5 border-l-primary text-primary'
                            }`}>
                              <strong>Recommended Action:</strong> {alert.recommendedAction}
                            </div>
                          )}

                          {alert.quickActions && alert.quickActions.length > 0 && (
                            <div className="flex items-center space-x-2 pt-2">
                              {alert.quickActions.map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = action.url;
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <div className="text-sm font-medium text-foreground">All Clear!</div>
                    <div className="text-xs text-muted-foreground">No urgent items need your attention right now.</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="glassmorphism" data-testid="card-events">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Upcoming Events
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = "/company"}>
                  View Calendar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Company Events */}
                {upcomingEvents.companyEvents.map((event) => {
                  const PriorityIcon = getPriorityIcon(event.priority);
                  return (
                    <div key={event.id} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-l-blue-500">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{event.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{event.description}</div>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {format(event.date, "MMM d, yyyy")}
                          </span>
                          {event.location && (
                            <span className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge variant="secondary" className="text-xs">{event.type}</Badge>
                        <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}

                {/* Client Events */}
                {upcomingEvents.clientEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-l-4 border-l-emerald-500">
                    <div className="p-1 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                      <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{event.title}</div>
                      <div className="text-xs text-primary font-medium">{event.clientName}</div>
                      <div className="text-xs text-muted-foreground mt-1">{event.description}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(event.date, "MMM d, yyyy")}
                        </span>
                        {event.value && (
                          <span className="flex items-center text-xs text-emerald-600 font-medium">
                            <PoundSterling className="w-3 h-3 mr-1" />
                            £{event.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}

                {/* No events message */}
                {upcomingEvents.companyEvents.length === 0 && upcomingEvents.clientEvents.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <div className="text-sm font-medium text-foreground">No upcoming events</div>
                    <div className="text-xs text-muted-foreground">Your calendar is clear for the next 30 days</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glassmorphism" data-testid="card-activity">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-4" data-testid={`activity-${index}`}>
                    <img
                      src={activity.avatar}
                      alt={activity.user}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-foreground">
                        <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                        <span className="font-medium text-primary">{activity.target}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </Layout>
  );
}
