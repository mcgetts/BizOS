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
import type { Project } from "@shared/schema";
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

  const alerts = [
    {
      title: "Overdue Invoice",
      description: "TechCorp payment 15 days overdue",
      priority: "High Priority",
      type: "destructive" as const
    },
    {
      title: "Project Delay",
      description: "Mobile App project behind schedule",
      priority: "Medium Priority",
      type: "warning" as const
    },
    {
      title: "New Lead",
      description: "Enterprise client inquiry received",
      priority: "Low Priority",
      type: "primary" as const
    }
  ];

  const recentActivity = [
    {
      user: "Sarah Johnson",
      action: "completed the",
      target: "Q4 Financial Report",
      time: "2 hours ago",
      status: "Completed",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    {
      user: "Mike Chen",
      action: "started a new project",
      target: "E-commerce Platform",
      time: "4 hours ago",
      status: "In Progress",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    {
      user: "Emily Rodriguez",
      action: "added new client",
      target: "Global Dynamics Inc.",
      time: "6 hours ago",
      status: "Added",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    }
  ];

  const sampleProjects = projects?.slice(0, 3) || [
    {
      id: "1",
      name: "E-commerce Platform",
      clientId: "client-1",
      progress: 75,
      status: "active",
      endDate: "2024-12-15T00:00:00Z"
    },
    {
      id: "2", 
      name: "Mobile App Redesign",
      clientId: "client-2",
      progress: 45,
      status: "review",
      endDate: "2025-01-20T00:00:00Z"
    },
    {
      id: "3",
      name: "Brand Identity Package", 
      clientId: "client-3",
      progress: 90,
      status: "active",
      endDate: "2024-12-30T00:00:00Z"
    }
  ];

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
                {[45, 55, 65, 70, 75, 85].map((height, index) => (
                  <div 
                    key={index}
                    className="flex-1 bg-primary/20 rounded-t-md relative"
                    style={{ height: `${height}%` }}
                    data-testid={`chart-bar-${index}`}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                      ${42 + index * 8}K
                    </div>
                  </div>
                ))}
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
                {recentActivity.map((activity, index) => (
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
              <Button variant="ghost" size="sm">View All Projects</Button>
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
                  {sampleProjects.map((project, index) => (
                    <tr key={project.id} data-testid={`project-row-${index}`}>
                      <td className="py-4">
                        <div className="font-medium text-foreground">{project.name}</div>
                        <div className="text-sm text-muted-foreground">Development</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-foreground">Sample Client {index + 1}</div>
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
                          variant={project.status === "active" ? "default" : "secondary"}
                          data-testid={`badge-status-${index}`}
                        >
                          {project.status === "active" ? "In Progress" : "Review"}
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
