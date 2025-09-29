import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Project, Task, User, Client } from "@shared/schema";
import {
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Bell,
  Calendar,
  BarChart3,
  Star,
  AlertTriangle,
  Users,
  FolderOpen,
  CheckSquare,
  Plus,
  Zap,
} from "lucide-react";

// Import home-specific components
import { WelcomeBanner } from "@/components/home/WelcomeBanner";
import { MyTasksWidget } from "@/components/home/MyTasksWidget";
import { UrgentAlertsWidget } from "@/components/home/UrgentAlertsWidget";
import { UpcomingEventsWidget } from "@/components/home/UpcomingEventsWidget";
import { QuickActionsHub } from "@/components/home/QuickActionsHub";
import { AnalyticsSnapshot } from "@/components/home/AnalyticsSnapshot";

interface DashboardKPIs {
  revenue: { current: number; target: number; growth: number };
  clients: { current: number; target: number; growth: number };
  projects: { current: number; target: number; growth: number };
  team: { current: number; target: number; growth: number };
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'task' | 'project' | 'client' | 'system';
  avatar?: string;
  status?: string;
}

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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

  // Data queries
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Quick navigation based on user role
  const getQuickNavigation = () => {
    const baseNavigation = [
      { icon: FolderOpen, label: "Projects", href: "/projects", count: projects?.length || 0 },
      { icon: CheckSquare, label: "Tasks", href: "/tasks", count: tasks?.filter(t => t.assignedTo === user?.id && t.status !== 'completed').length || 0 },
      { icon: Users, label: "Team", href: "/team", count: users?.length || 0 },
    ];

    // Add role-specific navigation
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      baseNavigation.push(
        { icon: BarChart3, label: "Analytics", href: "/analytics", count: null },
        { icon: Star, label: "Admin", href: "/admin", count: null }
      );
    }

    return baseNavigation;
  };

  const quickNavigation = getQuickNavigation();

  // Generate personalized greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const userDisplayName = user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : "User";

  return (
    <Layout title="Home" breadcrumbs={["Home"]}>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <WelcomeBanner
          greeting={getGreeting()}
          userName={userDisplayName}
          userRole={user?.role || "Employee"}
          currentTime={currentTime}
        />

        {/* Executive KPIs */}
        <DashboardKPIs />

        {/* Quick Navigation Grid */}
        <Card className="glassmorphism">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="h-20 flex-col space-y-2 hover:bg-primary/10 transition-all duration-200"
                    onClick={() => window.location.href = item.href}
                  >
                    <div className="relative">
                      <Icon className="w-6 h-6" />
                      {item.count !== null && item.count > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                        >
                          {item.count}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Tasks Widget */}
          <MyTasksWidget userId={user?.id} />

          {/* Urgent Alerts Widget */}
          <UrgentAlertsWidget projects={projects} tasks={tasks} />

          {/* Upcoming Events Widget */}
          <UpcomingEventsWidget />
        </div>

        {/* Secondary Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions Hub */}
          <QuickActionsHub userRole={user?.role} />

          {/* Analytics Snapshot */}
          <AnalyticsSnapshot />
        </div>

        {/* Recent Activity Feed */}
        <Card className="glassmorphism">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/dashboard"}>
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Show recent system activity */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-foreground">
                    Welcome to your new <span className="font-medium text-primary">Central Hub</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(currentTime, "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
                <Badge variant="outline">System</Badge>
              </div>

              {/* Placeholder for when real activity data is available */}
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-sm">Activity feed will populate as you use the system</div>
                <div className="text-xs">Complete tasks and projects to see recent activity here</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}