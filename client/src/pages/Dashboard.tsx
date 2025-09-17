import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, Task, User, CompanyGoal } from "@shared/schema";

interface DashboardKPIs {
  revenue: { current: number; target: number; growth: number };
  clients: { current: number; target: number; growth: number };
  projects: { current: number; target: number; growth: number };
  team: { current: number; target: number; growth: number };
}
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6);
  const [newGoal, setNewGoal] = useState({
    metric: '',
    target: '',
    year: new Date().getFullYear(),
    quarter: null as number | null,
  });
  const queryClient = useQueryClient();

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

  // Company goals queries and mutations (admin only)
  const { data: companyGoals } = useQuery<CompanyGoal[]>({
    queryKey: ["/api/company-goals"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: any) => {
      const response = await fetch('/api/company-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(goalData),
      });
      if (!response.ok) throw new Error('Failed to create goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      setNewGoal({ metric: '', target: '', year: new Date().getFullYear(), quarter: null });
      toast({ title: "Success", description: "Company goal created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create company goal", variant: "destructive" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await fetch(`/api/company-goals/${goalId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete goal');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      toast({ title: "Success", description: "Company goal deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete company goal", variant: "destructive" });
    },
  });

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

  const recentActivity = [
    // Recent completed tasks
    ...(tasks?.filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 2)
      .map(task => {
        const user = users?.find(u => u.id === task.assigneeId) || users?.[0];
        return {
          user: user ? `${user.firstName} ${user.lastName}` : 'Team Member',
          action: 'completed task',
          target: task.title,
          time: getTimeAgo(new Date(task.updatedAt)),
          status: 'Completed',
          avatar: user ? getInitialsAvatar(user.firstName, user.lastName) : ''
        };
      }) || []),
    // Recent in-progress projects
    ...(projects?.filter(p => p.status === 'in_progress')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 1)
      .map(project => {
        const user = users?.find(u => u.role === 'manager') || users?.[1];
        return {
          user: user ? `${user.firstName} ${user.lastName}` : 'Project Manager',
          action: 'is working on',
          target: project.name,
          time: getTimeAgo(new Date(project.updatedAt)),
          status: 'In Progress',
          avatar: user ? getInitialsAvatar(user.firstName, user.lastName) : ''
        };
      }) || [])
  ].slice(0, 3);

  // Fallback to sample data if no real activity
  const fallbackActivity = [
    {
      user: "Team Member",
      action: "working on",
      target: "System Updates",
      time: "Recently",
      status: "Active",
      avatar: "https://ui-avatars.com/api/?name=Team+Member&background=6366f1&color=fff&size=32"
    }
  ];

  const displayActivity = recentActivity.length > 0 ? recentActivity : fallbackActivity;

  const displayProjects = projects?.slice(0, 3) || [];

  return (
    <Layout title="Executive Dashboard" breadcrumbs={["Dashboard"]}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <DashboardKPIs />

        {/* Charts and Executive Alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="xl:col-span-2 glassmorphism" data-testid="card-revenue-chart">
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
              <div className="chart-container rounded-lg p-4 h-64">
                {revenueTrends && revenueTrends.length > 0 ? (
                  <>
                    <div className="flex items-end justify-between space-x-2 h-48">
                      {(() => {
                        const maxRevenue = Math.max(...revenueTrends.map(d => d.revenue), 1);
                        return revenueTrends.map((data, index) => {
                          const height = maxRevenue > 0 ? Math.max(10, (data.revenue / maxRevenue) * 85) : 10;
                          return (
                            <div
                              key={`${data.year}-${data.month}`}
                              className="flex-1 relative group"
                            >
                              <div
                                className="bg-gradient-to-t from-primary/60 to-primary/80 rounded-t-lg hover:from-primary/70 hover:to-primary/90 transition-all duration-200 cursor-pointer"
                                style={{ height: `${height}%` }}
                                data-testid={`chart-bar-${index}`}
                              >
                                {/* Tooltip on hover */}
                                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-popover border rounded-md px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                  <div className="font-medium">${data.revenue.toLocaleString()}</div>
                                  <div className="text-muted-foreground">{data.invoiceCount} invoices</div>
                                </div>
                              </div>
                              {/* Value label */}
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                                {data.revenue > 0 ? `$${(data.revenue / 1000).toFixed(0)}K` : '$0'}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-6">
                      {revenueTrends.map((data) => (
                        <span key={`${data.year}-${data.month}`} className="flex-1 text-center">
                          {data.month}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
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
        </div>

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
                  <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Overview */}
        <Card className="glassmorphism" data-testid="card-projects-overview">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Projects Overview</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/projects"}>View All Projects</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-sm font-medium text-muted-foreground py-3">Project</th>
                    <th className="text-left text-sm font-medium text-muted-foreground py-3">Client</th>
                    <th className="text-left text-sm font-medium text-muted-foreground py-3">Progress</th>
                    <th className="text-left text-sm font-medium text-muted-foreground py-3">Status</th>
                    <th className="text-left text-sm font-medium text-muted-foreground py-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayProjects.map((project, index) => (
                    <tr key={project.id} data-testid={`project-row-${index}`}>
                      <td className="py-4">
                        <div className="font-medium text-foreground">{project.name}</div>
                        <div className="text-sm text-muted-foreground">Development</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-foreground">
                          {project.clientId ? `Client ${project.clientId.slice(-3)}` : 'Internal Project'}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant={
                            project.status === "in_progress" ? "default" :
                            project.status === "completed" ? "secondary" :
                            project.status === "planning" ? "outline" : "destructive"
                          }
                          data-testid={`badge-status-${index}`}
                        >
                          {project.status === "in_progress" ? "In Progress" :
                           project.status === "completed" ? "Completed" :
                           project.status === "planning" ? "Planning" :
                           project.status === "on_hold" ? "On Hold" :
                           project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-foreground">
                          {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No due date'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Company Goals Management - Admin Only */}
        {user?.role === 'admin' && (
          <Card className="glassmorphism" data-testid="card-company-goals">
            <CardHeader>
              <CardTitle>Company Goals Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Create New Goal Form */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <Label htmlFor="metric">Metric</Label>
                    <Select
                      value={newGoal.metric}
                      onValueChange={(value) => setNewGoal({ ...newGoal, metric: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="pipeline">Pipeline Value</SelectItem>
                        <SelectItem value="projects">Active Projects</SelectItem>
                        <SelectItem value="tickets">Open Tickets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target">Target</Label>
                    <Input
                      id="target"
                      type="number"
                      placeholder="Enter target"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newGoal.year}
                      onChange={(e) => setNewGoal({ ...newGoal, year: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quarter">Quarter (Optional)</Label>
                    <Select
                      value={newGoal.quarter?.toString() || ''}
                      onValueChange={(value) => setNewGoal({ ...newGoal, quarter: value ? parseInt(value) : null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Annual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => createGoalMutation.mutate(newGoal)}
                    disabled={!newGoal.metric || !newGoal.target || createGoalMutation.isPending}
                  >
                    Add Goal
                  </Button>
                </div>

                {/* Existing Goals List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Current Goals</h3>
                  {companyGoals && companyGoals.length > 0 ? (
                    <div className="space-y-2">
                      {companyGoals.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium capitalize">
                              {goal.metric} - {goal.year}{goal.quarter ? ` Q${goal.quarter}` : ' (Annual)'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Target: {goal.metric === 'revenue' || goal.metric === 'pipeline'
                                ? `$${Number(goal.target).toLocaleString()}`
                                : Number(goal.target).toLocaleString()}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteGoalMutation.mutate(goal.id)}
                            disabled={deleteGoalMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-sm">No company goals set yet</div>
                      <div className="text-xs">Add goals above to track KPI targets</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
