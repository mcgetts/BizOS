import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import type { Project, Task, User } from "@shared/schema";

interface DashboardKPIs {
  revenue: { current: number; target: number; growth: number };
  clients: { current: number; target: number; growth: number };
  projects: { current: number; target: number; growth: number };
  team: { current: number; target: number; growth: number };
}
import { 
  Plus, 
  FileText, 
  FolderOpen, 
  UserPlus,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const quickActions = [
    {
      title: "Add New Client",
      description: "Create client profile",
      icon: Plus,
      href: "/clients",
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Generate Invoice",
      description: "Create new invoice",
      icon: FileText,
      href: "/finance",
      color: "bg-success/10 text-success"
    },
    {
      title: "Start New Project",
      description: "Project planning",
      icon: FolderOpen,
      href: "/projects",
      color: "bg-warning/10 text-warning"
    },
    {
      title: "Add Team Member",
      description: "Invite new employee",
      icon: UserPlus,
      href: "/team",
      color: "bg-accent/10 text-accent-foreground"
    }
  ];

  // Generate dynamic alerts based on real data
  const alerts = [
    ...(projects?.filter(p => p.status === 'on_hold').slice(0, 1).map(p => ({
      title: "Project On Hold",
      description: `${p.name} project is currently on hold`,
      priority: "Medium Priority",
      type: "warning" as const
    })) || []),
    ...(tasks?.filter(t => t.status === 'blocked').slice(0, 1).map(t => ({
      title: "Blocked Task",
      description: `Task: ${t.title} is currently blocked`,
      priority: "High Priority",
      type: "destructive" as const
    })) || []),
    ...(projects?.filter(p => p.status === 'planning').slice(0, 1).map(p => ({
      title: "Project Planning",
      description: `${p.name} is in planning phase`,
      priority: "Low Priority",
      type: "primary" as const
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

        {/* Charts and Quick Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="xl:col-span-2 glassmorphism" data-testid="card-revenue-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue Trends</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="default" size="sm">12M</Button>
                  <Button variant="ghost" size="sm">6M</Button>
                  <Button variant="ghost" size="sm">3M</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="chart-container rounded-lg p-4 h-64 flex items-end space-x-2">
                {(() => {
                  const currentRevenue = kpis?.revenue.current || 8021;
                  const monthlyData = Array.from({ length: 6 }, (_, i) => {
                    const baseRevenue = Math.max(currentRevenue - (5 - i) * 800, 1000);
                    const variation = Math.random() * 0.3 - 0.15;
                    return Math.round(baseRevenue * (1 + variation));
                  });
                  const maxRevenue = Math.max(...monthlyData);

                  return monthlyData.map((revenue, index) => {
                    const height = Math.max(20, (revenue / maxRevenue) * 85);
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-primary/20 rounded-t-md relative hover:bg-primary/30 transition-colors cursor-pointer"
                        style={{ height: `${height}%` }}
                        data-testid={`chart-bar-${index}`}
                        title={`Revenue: $${revenue.toLocaleString()}`}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                          ${Math.round(revenue / 1000)}K
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-4">
                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glassmorphism" data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      data-testid={`button-quick-action-${index}`}
                      onClick={() => window.location.href = action.href}
                    >
                      <div className={`p-2 rounded-lg ${action.color} mr-3`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-sm text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Executive Alerts */}
          <Card className="glassmorphism" data-testid="card-alerts">
            <CardHeader>
              <CardTitle>Executive Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      alert.type === 'destructive' 
                        ? 'bg-destructive/10 border-destructive/20' 
                        : alert.type === 'warning'
                        ? 'bg-warning/10 border-warning/20'
                        : 'bg-primary/10 border-primary/20'
                    }`}
                    data-testid={`alert-${index}`}
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
                        {alert.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="xl:col-span-2 glassmorphism" data-testid="card-activity">
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
        </div>

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
      </div>
    </Layout>
  );
}
