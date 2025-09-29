import { useEffect, useState } from "react";
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

  // Mock company events data - in a real app, this would come from an API
  const companyEvents: CompanyEvent[] = [
    {
      id: "1",
      title: "Quarterly Board Meeting",
      description: "Q4 financial review and strategic planning",
      date: addDays(new Date(), 5),
      type: "meeting",
      priority: "high",
      attendees: ["John Doe", "Jane Smith", "Mike Johnson"],
      location: "Conference Room A"
    },
    {
      id: "2",
      title: "Product Launch Deadline",
      description: "Final deadline for new product release",
      date: addDays(new Date(), 10),
      type: "deadline",
      priority: "urgent"
    },
    {
      id: "3",
      title: "Team Building Event",
      description: "Annual team building and celebration",
      date: addDays(new Date(), 15),
      type: "announcement",
      priority: "medium",
      location: "City Center Hotel"
    }
  ];

  // Mock client events data - in a real app, this would come from an API
  const clientEvents: ClientEvent[] = [
    {
      id: "1",
      clientId: "client-1",
      clientName: "TechCorp Solutions",
      title: "Contract Renewal",
      description: "Annual contract renewal discussion",
      date: addDays(new Date(), 3),
      type: "contract",
      value: 150000,
      status: "upcoming"
    },
    {
      id: "2",
      clientId: "client-2",
      clientName: "StartupX",
      title: "Project Kickoff",
      description: "New mobile app development project",
      date: addDays(new Date(), 8),
      type: "project_start",
      value: 75000,
      status: "upcoming"
    },
    {
      id: "3",
      clientId: "client-3",
      clientName: "Enterprise Ltd",
      title: "Monthly Review",
      description: "Progress review and next steps",
      date: addDays(new Date(), 12),
      type: "review",
      status: "upcoming"
    }
  ];


  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }


  // Generate dynamic alerts based on real data
  const currentDate = new Date();
  const alerts = [
    // High Priority: Blocked tasks
    ...(tasks?.filter(t => t.status === 'blocked').slice(0, 1).map(t => ({
      id: t.id,
      title: "Blocked Task",
      description: `${t.title} is currently blocked and needs attention`,
      priority: "High Priority",
      type: "destructive" as const,
      actionUrl: "/tasks",
      entityType: "task"
    })) || []),

    // High Priority: Overdue tasks
    ...(tasks?.filter(t => t.dueDate && new Date(t.dueDate) < currentDate && t.status !== 'completed').slice(0, 1).map(t => ({
      id: t.id,
      title: "Overdue Task",
      description: `${t.title} is overdue since ${new Date(t.dueDate!).toLocaleDateString()}`,
      priority: "High Priority",
      type: "destructive" as const,
      actionUrl: "/tasks",
      entityType: "task"
    })) || []),

    // Medium Priority: Projects on hold
    ...(projects?.filter(p => p.status === 'on_hold').slice(0, 1).map(p => ({
      id: p.id,
      title: "Project On Hold",
      description: `${p.name} project has been put on hold`,
      priority: "Medium Priority",
      type: "warning" as const,
      actionUrl: "/projects",
      entityType: "project"
    })) || []),

    // Medium Priority: Projects approaching deadline
    ...(projects?.filter(p => p.endDate && p.status === 'in_progress').map(p => {
      const daysToDeadline = Math.ceil((new Date(p.endDate!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, daysToDeadline };
    }).filter(p => p.daysToDeadline <= 7 && p.daysToDeadline > 0).slice(0, 1).map(p => ({
      id: p.id,
      title: "Project Deadline Approaching",
      description: `${p.name} is due in ${p.daysToDeadline} days`,
      priority: "Medium Priority",
      type: "warning" as const,
      actionUrl: "/projects",
      entityType: "project"
    })) || []),

    // Low Priority: New projects in planning
    ...(projects?.filter(p => p.status === 'planning').slice(0, 1).map(p => ({
      id: p.id,
      title: "Project Planning",
      description: `${p.name} is in planning phase and ready for review`,
      priority: "Low Priority",
      type: "primary" as const,
      actionUrl: "/projects",
      entityType: "project"
    })) || []),

    // Low Priority: Tasks pending review
    ...(tasks?.filter(t => t.status === 'review').slice(0, 1).map(t => ({
      id: t.id,
      title: "Task Pending Review",
      description: `${t.title} is waiting for review and approval`,
      priority: "Low Priority",
      type: "primary" as const,
      actionUrl: "/tasks",
      entityType: "task"
    })) || [])
  ].slice(0, 3);

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

  return (
    <Layout title="Executive Dashboard" breadcrumbs={["Dashboard"]}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <DashboardKPIs />


        {/* Revenue Chart */}
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

        {/* Executive Alerts, Upcoming Events, and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executive Alerts */}
          <Card className="glassmorphism" data-testid="card-alerts">
            <CardHeader>
              <CardTitle>Executive Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <div
                      key={alert.id || index}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        alert.type === 'destructive'
                          ? 'bg-destructive/10 border-destructive/20 hover:bg-destructive/20'
                          : alert.type === 'warning'
                          ? 'bg-warning/10 border-warning/20 hover:bg-warning/20'
                          : 'bg-primary/10 border-primary/20 hover:bg-primary/20'
                      }`}
                      data-testid={`alert-${index}`}
                      onClick={() => window.location.href = alert.actionUrl}
                      title={`Click to view ${alert.entityType}`}
                    >
                      <div className={`p-1 rounded-full ${
                        alert.type === 'destructive'
                          ? 'bg-destructive/20'
                          : alert.type === 'warning'
                          ? 'bg-warning/20'
                          : 'bg-primary/20'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          alert.type === 'destructive'
                            ? 'bg-destructive'
                            : alert.type === 'warning'
                            ? 'bg-warning'
                            : 'bg-primary'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{alert.title}</div>
                        <div className="text-xs text-muted-foreground">{alert.description}</div>
                        <div className={`text-xs ${
                          alert.type === 'destructive'
                            ? 'text-destructive'
                            : alert.type === 'warning'
                            ? 'text-warning'
                            : 'text-primary'
                        }`}>
                          {alert.priority} • Click to view
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
