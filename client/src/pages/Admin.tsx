import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Users, 
  Shield, 
  Database,
  BarChart3,
  Bell,
  Palette,
  Key,
  Activity,
  Server,
  Globe,
  Lock,
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [systemUsers, setSystemUsers] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    systemUptime: "99.9%",
    storageUsed: "2.4 GB",
    apiCalls: 15420
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);

        // Fetch users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          setSystemUsers(users);
        }

        // Fetch KPI data
        const kpiResponse = await fetch('/api/dashboard/kpis');
        if (kpiResponse.ok) {
          const kpis = await kpiResponse.json();
          setSystemStats(prev => ({
            ...prev,
            totalUsers: kpis.team.current + 2, // Add admins
            activeUsers: kpis.team.current,
            totalProjects: kpis.projects.current
          }));
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isAuthenticated && user?.role === 'admin') {
      fetchData();
    }
  }, [isAuthenticated, user, toast]);

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

  // Check if user has admin privileges
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      // Redirect non-admin users
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <Layout title="Admin Portal" breadcrumbs={["Admin"]}>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading admin data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const recentActivities = [
    {
      user: "Sarah Johnson",
      action: "Created new project",
      target: "E-commerce Platform",
      timestamp: "2 hours ago",
      type: "create"
    },
    {
      user: "Mike Chen",
      action: "Updated user permissions",
      target: "Emily Rodriguez",
      timestamp: "4 hours ago",
      type: "update"
    },
    {
      user: "Admin",
      action: "System backup completed",
      target: "Database",
      timestamp: "6 hours ago",
      type: "system"
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "default"; 
      case "employee": return "secondary";
      case "client": return "outline";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "suspended": return "destructive";
      default: return "secondary";
    }
  };

  const filteredUsers = systemUsers.filter((user) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.role?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Layout title="Admin Portal" breadcrumbs={["Admin"]}>
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">System Administration</h2>
            <p className="text-sm text-muted-foreground">Manage users, system settings, and monitor performance</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" data-testid="button-system-health">
              <Activity className="w-4 h-4 mr-2" />
              System Health
            </Button>
            <Button data-testid="button-backup">
              <Database className="w-4 h-4 mr-2" />
              Backup Now
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glassmorphism">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold" data-testid="text-total-users">
                    {systemStats.totalUsers}
                  </p>
                </div>
                <Users className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-active-users">
                    {systemStats.activeUsers}
                  </p>
                </div>
                <Activity className="w-6 h-6 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Projects</p>
                  <p className="text-2xl font-bold" data-testid="text-total-projects">
                    {systemStats.totalProjects}
                  </p>
                </div>
                <BarChart3 className="w-6 h-6 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-uptime">
                    {systemStats.systemUptime}
                  </p>
                </div>
                <Server className="w-6 h-6 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage</p>
                  <p className="text-2xl font-bold" data-testid="text-storage">
                    {systemStats.storageUsed}
                  </p>
                </div>
                <Database className="w-6 h-6 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">API Calls</p>
                  <p className="text-2xl font-bold" data-testid="text-api-calls">
                    {systemStats.apiCalls.toLocaleString()}
                  </p>
                </div>
                <Globe className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                        data-testid="input-search-users"
                      />
                    </div>
                    <Button data-testid="button-add-user">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-users">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-sm font-medium text-muted-foreground py-3">User</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-3">Role</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-3">Status</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-3">Last Login</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((user, index) => (
                        <tr key={user.id} data-testid={`row-user-${index}`}>
                          <td className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant={getRoleColor(user.role)} data-testid={`badge-role-${index}`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <Badge variant={getStatusColor(user.isActive ? "active" : "inactive")} data-testid={`badge-status-${index}`}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-muted-foreground">
                              {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : "Never"}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-${index}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-${index}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-delete-${index}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge variant="default">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Response Time</span>
                    <span className="text-sm text-success">120ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Server Load</span>
                    <span className="text-sm text-warning">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-primary">2.1GB / 8GB</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3" data-testid={`activity-${index}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === 'create' ? 'bg-success' :
                          activity.type === 'update' ? 'bg-warning' : 'bg-primary'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                            <span className="font-medium text-primary">{activity.target}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Require 2FA for all admin accounts</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">IP Allowlist</p>
                      <p className="text-xs text-muted-foreground">Restrict admin access to specific IPs</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Session Timeout</p>
                      <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>API Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active API Keys</span>
                    <span className="text-sm text-foreground">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rate Limit</span>
                    <span className="text-sm text-foreground">1000/hour</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Manage API Keys
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Track user engagement, system performance, and business metrics
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <Input defaultValue="BizOS Inc." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Zone</label>
                    <Input defaultValue="UTC-8 (PST)" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Currency</label>
                    <Input defaultValue="USD" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Send system alerts via email</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Slack Integration</p>
                      <p className="text-xs text-muted-foreground">Post updates to Slack</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Weekly Reports</p>
                      <p className="text-xs text-muted-foreground">Automated system reports</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
