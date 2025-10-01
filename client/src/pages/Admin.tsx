import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { User, SystemVariable, ProjectTemplate, InsertProjectTemplate, TaskTemplate } from "@shared/schema";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectTemplateSchema, insertTaskTemplateSchema } from "@shared/schema";
import { z } from "zod";
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
  Trash2,
  FileText,
  Plus,
  Copy,
  Clock,
  PoundSterling,
  Folder
} from "lucide-react";
import {
  IndustrySelect,
  PrioritySelect,
  TemplateCategorySelect,
  IndustryBadge,
  getIndustryLabel
} from "@/components/ui/StandardSelects";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    systemUptime: "99.9%",
    storageUsed: "2.4 GB",
    apiCalls: 15420
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [newVariable, setNewVariable] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    dataType: 'string',
  });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // User management state
  const [viewUserDialogOpen, setViewUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // User management mutations - MUST be before any conditional returns
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User updated successfully" });
      setEditUserDialogOpen(false);
      setSelectedUser(null);
      // Refresh users list
      fetch('/api/users', { credentials: 'include' })
        .then(res => res.json())
        .then(setSystemUsers);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User deleted successfully" });
      setDeleteUserDialogOpen(false);
      setSelectedUser(null);
      // Refresh users list
      fetch('/api/users', { credentials: 'include' })
        .then(res => res.json())
        .then(setSystemUsers);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User created successfully" });
      setAddUserDialogOpen(false);
      // Refresh users list
      fetch('/api/users', { credentials: 'include' })
        .then(res => res.json())
        .then(setSystemUsers);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
    },
  });

  // Access Control state
  const [accessControlSettings, setAccessControlSettings] = useState<{
    domains: string[];
    requireDomain: boolean;
  }>({ domains: [], requireDomain: false });
  const [newDomain, setNewDomain] = useState('');
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    role: 'employee' as 'admin' | 'manager' | 'employee' | 'client',
    expiresInDays: 7,
    notes: ''
  });

  // Access Control queries
  const { data: accessControlData, refetch: refetchAccessControl } = useQuery({
    queryKey: ["/api/admin/access-control/settings"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Update state when access control data changes
  useEffect(() => {
    if (accessControlData) {
      setAccessControlSettings({
        domains: (accessControlData as any).domains || [],
        requireDomain: (accessControlData as any).requireDomain || false
      });
    }
  }, [accessControlData]);

  const { data: invitations = [], refetch: refetchInvitations } = useQuery<any[]>({
    queryKey: ["/api/admin/invitations"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Access Control mutations
  const updateDomainsMutation = useMutation({
    mutationFn: async (data: { domains: string[]; requireDomain: boolean }) => {
      const response = await fetch('/api/admin/access-control/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update domains');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-control/settings"] });
      toast({ title: "Success", description: "Access control settings updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update access control settings", variant: "destructive" });
    },
  });


  // Access Control handlers
  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    const updatedDomains = [...accessControlSettings.domains, newDomain.trim()];
    setAccessControlSettings(prev => ({ ...prev, domains: updatedDomains }));
    updateDomainsMutation.mutate({ 
      domains: updatedDomains, 
      requireDomain: accessControlSettings.requireDomain 
    });
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    const updatedDomains = accessControlSettings.domains.filter(d => d !== domain);
    setAccessControlSettings(prev => ({ ...prev, domains: updatedDomains }));
    updateDomainsMutation.mutate({ 
      domains: updatedDomains, 
      requireDomain: accessControlSettings.requireDomain 
    });
  };

  const handleToggleRequireDomain = (checked: boolean) => {
    setAccessControlSettings(prev => ({ ...prev, requireDomain: checked }));
    updateDomainsMutation.mutate({ 
      domains: accessControlSettings.domains, 
      requireDomain: checked 
    });
  };

  // User action handlers
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteUserDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setIsResettingPassword(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to send password reset');

      const data = await response.json();
      toast({
        title: "Password Reset Sent",
        description: `Reset email sent to ${data.email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);

        // Fetch users
        const usersResponse = await fetch('/api/users');
        let userCount = 5; // Default fallback
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          setSystemUsers(users);
          userCount = users.length;
        }

        // Fetch KPI data
        const kpiResponse = await fetch('/api/dashboard/kpis');
        if (kpiResponse.ok) {
          const kpis = await kpiResponse.json();
          setSystemStats(prev => ({
            ...prev,
            totalUsers: userCount || 5, // Use actual user count
            activeUsers: Math.max(1, userCount - 1), // Active users slightly less than total
            totalProjects: kpis.projects?.current || 0
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


  // System variables queries and mutations
  const { data: systemVariables } = useQuery<SystemVariable[]>({
    queryKey: ["/api/system-variables"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Helper function to get variable value
  const getVariableValue = (key: string, defaultValue: string = '') => {
    return formValues[key] || systemVariables?.find(v => v.key === key)?.value || defaultValue;
  };

  // Update form values when systemVariables change
  useEffect(() => {
    if (systemVariables) {
      const newFormValues: Record<string, string> = {};
      systemVariables.forEach(variable => {
        newFormValues[variable.key] = variable.value;
      });
      setFormValues(prev => ({ ...newFormValues, ...prev }));
    }
  }, [systemVariables]);

  const createVariableMutation = useMutation({
    mutationFn: async (variableData: any) => {
      const response = await fetch('/api/system-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(variableData),
      });
      if (!response.ok) throw new Error('Failed to create system variable');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-variables"] });
      setNewVariable({ key: '', value: '', description: '', category: 'general', dataType: 'string' });
      toast({ title: "Success", description: "System variable created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create system variable", variant: "destructive" });
    },
  });

  const updateVariableMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: any }) => {
      const response = await fetch(`/api/system-variables/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to update system variable ${key}:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          data: data
        });
        throw new Error(`Failed to update system variable: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (_, { key, data }) => {
      // Update local form state immediately
      setFormValues(prev => ({ ...prev, [key]: data.value }));
      queryClient.invalidateQueries({ queryKey: ["/api/system-variables"] });
      toast({ title: "Success", description: "System variable updated successfully" });
    },
    onError: (error: any) => {
      console.error("Update variable mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to update system variable: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  const deleteVariableMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch(`/api/system-variables/${key}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete system variable');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-variables"] });
      toast({ title: "Success", description: "System variable deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete system variable", variant: "destructive" });
    },
  });

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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
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
                    <Button onClick={() => setAddUserDialogOpen(true)} data-testid="button-add-user">
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
                                <div
                                  className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleViewUser(user)}
                                >
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant={getRoleColor(user.role || 'employee')} data-testid={`badge-role-${index}`}>
                              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee'}
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewUser(user)}
                                data-testid={`button-view-${index}`}
                                title="View user details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                data-testid={`button-edit-${index}`}
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                data-testid={`button-delete-${index}`}
                                title="Delete user"
                              >
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

          <TabsContent value="templates" className="space-y-4">
            <TemplateManagement />
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
              {/* Access Control Settings */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Access Control</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage signup restrictions and allowed domains</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Require Domain Restriction</p>
                      <p className="text-xs text-muted-foreground">Only allow signups from specified domains</p>
                    </div>
                    <Switch 
                      checked={accessControlSettings.requireDomain}
                      onCheckedChange={handleToggleRequireDomain}
                      data-testid="switch-require-domain"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-domain">Allowed Domains</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="new-domain"
                        placeholder="example.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                        data-testid="input-new-domain"
                      />
                      <Button 
                        onClick={handleAddDomain}
                        size="sm"
                        data-testid="button-add-domain"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {accessControlSettings.domains.length > 0 ? (
                    <div className="space-y-2">
                      {accessControlSettings.domains.map((domain, index) => (
                        <div 
                          key={domain} 
                          className="flex items-center justify-between p-2 rounded-md bg-muted"
                          data-testid={`domain-item-${index}`}
                        >
                          <span className="text-sm">{domain}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveDomain(domain)}
                            data-testid={`button-remove-domain-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No domains configured. Open signup enabled.</p>
                  )}
                </CardContent>
              </Card>

              {/* Create Invitation */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Create Invitation</CardTitle>
                  <p className="text-sm text-muted-foreground">Generate invitation tokens for new users</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={newInvitation.email}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                      data-testid="input-invite-email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select 
                      value={newInvitation.role}
                      onValueChange={(value: any) => setNewInvitation(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger id="invite-role" data-testid="select-invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="invite-expires">Expires In (Days)</Label>
                    <Input
                      id="invite-expires"
                      type="number"
                      min="1"
                      max="30"
                      value={newInvitation.expiresInDays}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 7 }))}
                      data-testid="input-invite-expires"
                    />
                  </div>

                  <div>
                    <Label htmlFor="invite-notes">Notes (Optional)</Label>
                    <Textarea
                      id="invite-notes"
                      placeholder="Additional notes..."
                      value={newInvitation.notes}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, notes: e.target.value }))}
                      data-testid="textarea-invite-notes"
                    />
                  </div>

                  <Button 
                    onClick={() => createInvitationMutation.mutate(newInvitation)}
                    disabled={!newInvitation.email || createInvitationMutation.isPending}
                    className="w-full"
                    data-testid="button-create-invitation"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {createInvitationMutation.isPending ? "Creating..." : "Create Invitation"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Invitations List */}
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Invitations</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage pending invitations</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => cleanupInvitationsMutation.mutate()}
                    disabled={cleanupInvitationsMutation.isPending}
                    data-testid="button-cleanup-invitations"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup Expired
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invitations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-invitations">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Email</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Role</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Status</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Expires</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {invitations.map((invitation, index) => (
                          <tr key={invitation.token} data-testid={`row-invitation-${index}`}>
                            <td className="py-3 text-sm">{invitation.email}</td>
                            <td className="py-3">
                              <Badge variant="outline">{invitation.role}</Badge>
                            </td>
                            <td className="py-3">
                              <Badge variant={
                                invitation.status === 'pending' ? 'default' :
                                invitation.status === 'used' ? 'secondary' : 'destructive'
                              }>
                                {invitation.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">
                              {new Date(invitation.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              {invitation.status === 'pending' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => revokeInvitationMutation.mutate(invitation.token)}
                                  disabled={revokeInvitationMutation.isPending}
                                  data-testid={`button-revoke-${index}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active invitations. Create one above to invite users.
                  </p>
                )}
              </CardContent>
            </Card>
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

          <TabsContent value="settings" className="space-y-6">
            {/* Business Settings */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Core business information and financial settings</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Company Information</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Company Name</Label>
                        <Input
                          value={getVariableValue('company_name', 'BizOS Inc.')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, company_name: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'company_name',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Company Email</Label>
                        <Input
                          type="email"
                          placeholder="contact@company.com"
                          value={getVariableValue('company_email')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, company_email: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'company_email',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Company Phone</Label>
                        <Input
                          placeholder="+44 20 1234 5678"
                          value={getVariableValue('company_phone')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, company_phone: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'company_phone',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>VAT Number</Label>
                        <Input
                          placeholder="GB123456789"
                          value={getVariableValue('vat_number')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, vat_number: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'vat_number',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Financial Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Default Currency</Label>
                        <Select
                          value={getVariableValue('default_currency', 'GBP')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, default_currency: value }));
                            updateVariableMutation.mutate({
                              key: 'default_currency',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                            <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                            <SelectItem value="CAD">CAD ($) - Canadian Dollar</SelectItem>
                            <SelectItem value="AUD">AUD ($) - Australian Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Decimal Places</Label>
                        <Select
                          value={getVariableValue('decimal_places', '2')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, decimal_places: value }));
                            updateVariableMutation.mutate({
                              key: 'decimal_places',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 (No decimals)</SelectItem>
                            <SelectItem value="1">1 decimal place</SelectItem>
                            <SelectItem value="2">2 decimal places</SelectItem>
                            <SelectItem value="3">3 decimal places</SelectItem>
                            <SelectItem value="4">4 decimal places</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Default Tax Rate (%)</Label>
                        <Input
                          type="number"
                          placeholder="20"
                          min="0"
                          max="100"
                          step="0.01"
                          value={getVariableValue('tax_rate_default')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, tax_rate_default: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'tax_rate_default',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Invoice Prefix</Label>
                        <Input
                          placeholder="INV-"
                          value={getVariableValue('invoice_prefix')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'invoice_prefix',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Localization Settings */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Localization & Time Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Regional and time zone preferences</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Regional Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Timezone</Label>
                        <Select
                          value={getVariableValue('timezone', 'Europe/London')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, timezone: value }));
                            updateVariableMutation.mutate({
                              key: 'timezone',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                            <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Los Angeles (PST/PDT)</SelectItem>
                            <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date Format</Label>
                        <Select
                          value={getVariableValue('date_format', 'DD/MM/YYYY')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, date_format: value }));
                            updateVariableMutation.mutate({
                              key: 'date_format',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                            <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Time Format</Label>
                        <Select
                          value={getVariableValue('time_format', '24h')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, time_format: value }));
                            updateVariableMutation.mutate({
                              key: 'time_format',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24h">24 Hour (14:30)</SelectItem>
                            <SelectItem value="12h">12 Hour (2:30 PM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>First Day of Week</Label>
                        <Select
                          value={getVariableValue('first_day_of_week', '1')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, first_day_of_week: value }));
                            updateVariableMutation.mutate({
                              key: 'first_day_of_week',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Business Hours</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Business Hours Start</Label>
                        <Input
                          type="time"
                          value={getVariableValue('business_hours_start', '09:00')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, business_hours_start: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'business_hours_start',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Business Hours End</Label>
                        <Input
                          type="time"
                          value={getVariableValue('business_hours_end', '17:00')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, business_hours_end: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'business_hours_end',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operations Settings */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Operations Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Targets, SLAs, and operational preferences</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Business Targets</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Annual Revenue Target</Label>
                        <Input
                          type="number"
                          placeholder="500000"
                          value={getVariableValue('revenue_target_annual')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, revenue_target_annual: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'revenue_target_annual',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Annual Pipeline Target</Label>
                        <Input
                          type="number"
                          placeholder="200000"
                          value={getVariableValue('pipeline_target_annual')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, pipeline_target_annual: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'pipeline_target_annual',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Active Projects Target</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={getVariableValue('projects_target_annual')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, projects_target_annual: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'projects_target_annual',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Max Open Tickets</Label>
                        <Input
                          type="number"
                          placeholder="5"
                          value={getVariableValue('tickets_target_max')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, tickets_target_max: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'tickets_target_max',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Support & SLAs</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Ticket Prefix</Label>
                        <Input
                          placeholder="TKT-"
                          value={getVariableValue('ticket_prefix')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, ticket_prefix: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'ticket_prefix',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>SLA Response Time (hours)</Label>
                        <Input
                          type="number"
                          placeholder="24"
                          min="1"
                          max="168"
                          value={getVariableValue('sla_response_hours')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, sla_response_hours: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'sla_response_hours',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>SLA Resolution Time (hours)</Label>
                        <Input
                          type="number"
                          placeholder="72"
                          min="1"
                          max="168"
                          value={getVariableValue('sla_resolution_hours')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, sla_resolution_hours: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'sla_resolution_hours',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-assign Tickets</Label>
                          <p className="text-xs text-muted-foreground">Automatically assign new tickets</p>
                        </div>
                        <Switch
                          checked={getVariableValue('ticket_auto_assign') === 'true'}
                          onCheckedChange={(checked) => {
                            const value = checked.toString();
                            setFormValues(prev => ({ ...prev, ticket_auto_assign: value }));
                            updateVariableMutation.mutate({
                              key: 'ticket_auto_assign',
                              data: { value }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Experience Settings */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>User Experience Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Interface and notification preferences</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Interface Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Default Theme</Label>
                        <Select
                          value={getVariableValue('theme_default', 'light')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, theme_default: value }));
                            updateVariableMutation.mutate({
                              key: 'theme_default',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Items Per Page</Label>
                        <Select
                          value={getVariableValue('pagination_default_size', '20')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, pagination_default_size: value }));
                            updateVariableMutation.mutate({
                              key: 'pagination_default_size',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 items</SelectItem>
                            <SelectItem value="20">20 items</SelectItem>
                            <SelectItem value="50">50 items</SelectItem>
                            <SelectItem value="100">100 items</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Default Chart Period</Label>
                        <Select
                          value={getVariableValue('chart_default_period', '6')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, chart_default_period: value }));
                            updateVariableMutation.mutate({
                              key: 'chart_default_period',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="6">6 months</SelectItem>
                            <SelectItem value="12">12 months</SelectItem>
                            <SelectItem value="24">24 months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-refresh Dashboard</Label>
                          <p className="text-xs text-muted-foreground">Automatically refresh dashboard data</p>
                        </div>
                        <Switch
                          checked={getVariableValue('dashboard_refresh_auto', 'true') === 'true'}
                          onCheckedChange={(checked) => {
                            const value = checked.toString();
                            setFormValues(prev => ({ ...prev, dashboard_refresh_auto: value }));
                            updateVariableMutation.mutate({
                              key: 'dashboard_refresh_auto',
                              data: { value }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-xs text-muted-foreground">Send system alerts via email</p>
                        </div>
                        <Switch
                          checked={getVariableValue('email_enabled', 'true') === 'true'}
                          onCheckedChange={(checked) => {
                            const value = checked.toString();
                            setFormValues(prev => ({ ...prev, email_enabled: value }));
                            updateVariableMutation.mutate({
                              key: 'email_enabled',
                              data: { value }
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Email From Name</Label>
                        <Input
                          placeholder="BizOS System"
                          value={getVariableValue('email_from_name')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, email_from_name: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'email_from_name',
                            data: { value: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Daily Digest Time</Label>
                        <Input
                          type="time"
                          value={getVariableValue('notification_digest_hour', '09:00')}
                          onChange={(e) => setFormValues(prev => ({ ...prev, notification_digest_hour: e.target.value }))}
                          onBlur={(e) => updateVariableMutation.mutate({
                            key: 'notification_digest_hour',
                            data: { value: e.target.value.split(':')[0] }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Management Settings */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>User Management Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Default user settings and security preferences</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Default User Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Default User Role</Label>
                        <Select
                          value={getVariableValue('default_user_role', 'employee')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, default_user_role: value }));
                            updateVariableMutation.mutate({
                              key: 'default_user_role',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Session Timeout (minutes)</Label>
                        <Select
                          value={getVariableValue('session_timeout', '120')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, session_timeout: value }));
                            updateVariableMutation.mutate({
                              key: 'session_timeout',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                            <SelectItem value="480">8 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Require 2FA for Admins</Label>
                          <p className="text-xs text-muted-foreground">Force two-factor authentication for admin users</p>
                        </div>
                        <Switch
                          checked={getVariableValue('require_2fa_admin') === 'true'}
                          onCheckedChange={(checked) => {
                            const value = checked.toString();
                            setFormValues(prev => ({ ...prev, require_2fa_admin: value }));
                            updateVariableMutation.mutate({
                              key: 'require_2fa_admin',
                              data: { value }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Project Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Default Project Status</Label>
                        <Select
                          value={getVariableValue('default_project_status', 'planning')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, default_project_status: value }));
                            updateVariableMutation.mutate({
                              key: 'default_project_status',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Auto-archive Projects (days)</Label>
                        <Select
                          value={getVariableValue('project_archive_days', '90')}
                          onValueChange={(value) => {
                            setFormValues(prev => ({ ...prev, project_archive_days: value }));
                            updateVariableMutation.mutate({
                              key: 'project_archive_days',
                              data: { value }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="180">180 days</SelectItem>
                            <SelectItem value="365">365 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Management Dialogs */}
        {/* View User Dialog */}
        <Dialog open={viewUserDialogOpen} onOpenChange={setViewUserDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 pb-4 border-b">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-medium text-primary">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="font-medium">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Enhanced Role</Label>
                    <p className="font-medium">{selectedUser.enhancedRole || selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{selectedUser.department || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Position</Label>
                    <p className="font-medium">{selectedUser.position || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Login</Label>
                    <p className="font-medium">
                      {selectedUser.lastLoginAt
                        ? new Date(selectedUser.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedUser.address && (
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{selectedUser.address}</p>
                  </div>
                )}

                {selectedUser.skills && selectedUser.skills.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUser.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewUserDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setViewUserDialogOpen(false);
                    handleEditUser(selectedUser);
                  }}>
                    Edit User
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      defaultValue={selectedUser.firstName || ''}
                      id="edit-firstName"
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      defaultValue={selectedUser.lastName || ''}
                      id="edit-lastName"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      defaultValue={selectedUser.email || ''}
                      id="edit-email"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      defaultValue={selectedUser.phone || ''}
                      id="edit-phone"
                    />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <Select defaultValue={selectedUser.role || 'employee'} onValueChange={(value) => {
                      (document.getElementById('edit-role') as any).value = value;
                    }}>
                      <SelectTrigger id="edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Enhanced Role</Label>
                    <Select defaultValue={selectedUser.enhancedRole || selectedUser.role || 'employee'} onValueChange={(value) => {
                      (document.getElementById('edit-enhancedRole') as any).value = value;
                    }}>
                      <SelectTrigger id="edit-enhancedRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      defaultValue={selectedUser.department || ''}
                      id="edit-department"
                    />
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input
                      defaultValue={selectedUser.position || ''}
                      id="edit-position"
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Textarea
                    defaultValue={selectedUser.address || ''}
                    id="edit-address"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label className="text-base">Active Status</Label>
                    <p className="text-sm text-muted-foreground">User can access the system</p>
                  </div>
                  <Switch
                    defaultChecked={selectedUser.isActive}
                    id="edit-isActive"
                  />
                </div>

                <div className="p-4 border rounded-lg bg-warning/10 border-warning/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Password Reset</Label>
                      <p className="text-sm text-muted-foreground">Send password reset email to user</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleResetPassword}
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? "Sending..." : "Reset Password"}
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const firstName = (document.getElementById('edit-firstName') as HTMLInputElement).value;
                      const lastName = (document.getElementById('edit-lastName') as HTMLInputElement).value;
                      const email = (document.getElementById('edit-email') as HTMLInputElement).value;
                      const phone = (document.getElementById('edit-phone') as HTMLInputElement).value;
                      const role = (document.getElementById('edit-role') as any).value;
                      const enhancedRole = (document.getElementById('edit-enhancedRole') as any).value;
                      const department = (document.getElementById('edit-department') as HTMLInputElement).value;
                      const position = (document.getElementById('edit-position') as HTMLInputElement).value;
                      const address = (document.getElementById('edit-address') as HTMLTextAreaElement).value;
                      const isActive = (document.getElementById('edit-isActive') as HTMLInputElement).checked;

                      updateUserMutation.mutate({
                        id: selectedUser.id,
                        data: {
                          firstName,
                          lastName,
                          email,
                          phone,
                          role,
                          enhancedRole,
                          department,
                          position,
                          address,
                          isActive
                        }
                      });
                    }}
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?
                </p>
                <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/50">
                  <p className="text-sm font-medium text-destructive">Warning: This action cannot be undone</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All data associated with this user will be permanently deleted.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteUserMutation.mutate(selectedUser.id)}
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input placeholder="John" id="new-firstName" />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input placeholder="Doe" id="new-lastName" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" placeholder="john.doe@example.com" id="new-email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input placeholder="+44 20 1234 5678" id="new-phone" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input type="password" placeholder="Min. 8 characters" id="new-password" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must contain uppercase, lowercase, and number
                  </p>
                </div>
                <div>
                  <Label>Role *</Label>
                  <Select defaultValue="employee" onValueChange={(value) => {
                    (document.getElementById('new-role') as any).value = value;
                  }}>
                    <SelectTrigger id="new-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Input placeholder="IT" id="new-department" />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input placeholder="Software Developer" id="new-position" />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-primary/5">
                <p className="text-sm font-medium">Note:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  An email will be sent to the user with their login credentials and initial setup instructions.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const firstName = (document.getElementById('new-firstName') as HTMLInputElement).value;
                    const lastName = (document.getElementById('new-lastName') as HTMLInputElement).value;
                    const email = (document.getElementById('new-email') as HTMLInputElement).value;
                    const phone = (document.getElementById('new-phone') as HTMLInputElement).value;
                    const password = (document.getElementById('new-password') as HTMLInputElement).value;
                    const role = (document.getElementById('new-role') as any).value;
                    const department = (document.getElementById('new-department') as HTMLInputElement).value;
                    const position = (document.getElementById('new-position') as HTMLInputElement).value;

                    if (!firstName || !lastName || !email || !password) {
                      toast({
                        title: "Validation Error",
                        description: "Please fill in all required fields",
                        variant: "destructive"
                      });
                      return;
                    }

                    createUserMutation.mutate({
                      firstName,
                      lastName,
                      email,
                      phone,
                      password,
                      role,
                      enhancedRole: role,
                      department,
                      position,
                      isActive: true
                    });
                  }}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Template Management Component
function TemplateManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  // Form for creating new templates
  const templateForm = useForm<z.infer<typeof insertProjectTemplateSchema>>({
    resolver: zodResolver(insertProjectTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      category: "",
      estimatedDuration: undefined,
      defaultBudget: "",
      defaultPriority: "medium",
      tags: []
    }
  });

  // Fetch project templates
  const { data: templates, isLoading: templatesLoading } = useQuery<ProjectTemplate[]>({
    queryKey: ["/api/project-templates"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertProjectTemplateSchema>) => {
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
      setIsCreateDialogOpen(false);
      templateForm.reset();
      toast({ title: "Success", description: "Project template created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create project template", variant: "destructive" });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof insertProjectTemplateSchema> }) => {
      const response = await fetch(`/api/project-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      templateForm.reset();
      toast({ title: "Success", description: "Project template updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project template", variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/project-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete template');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
      toast({ title: "Success", description: "Project template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete project template", variant: "destructive" });
    },
  });

  // Removed getIndustryColor - now using centralized constants

  const handleEdit = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    // Populate form with existing data
    templateForm.setValue("name", template.name);
    templateForm.setValue("description", template.description || "");
    templateForm.setValue("industry", template.industry || "");
    templateForm.setValue("category", template.category || "");
    templateForm.setValue("estimatedDuration", template.estimatedDuration || undefined);
    templateForm.setValue("defaultBudget", template.defaultBudget || "");
    templateForm.setValue("defaultPriority", template.defaultPriority || "medium");
    templateForm.setValue("tags", template.tags || []);
    setIsEditDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof insertProjectTemplateSchema>) => {
    if (selectedTemplate && isEditDialogOpen) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    templateForm.reset();
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Template Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Create and manage project templates for quick project setup
            </p>
          </div>
          <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEditDialogOpen ? "Edit Project Template" : "Create New Project Template"}
                </DialogTitle>
              </DialogHeader>
              <Form {...templateForm}>
                <form onSubmit={templateForm.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={templateForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="E.g., Website Development" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <IndustrySelect
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              placeholder="Select industry"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <TemplateCategorySelect
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              placeholder="Select category"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="estimatedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Duration (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="defaultBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Budget</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="defaultPriority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Priority</FormLabel>
                          <FormControl>
                            <PrioritySelect
                              value={field.value || "medium"}
                              onValueChange={field.onChange}
                              placeholder="Select priority"
                              showColors={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={templateForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what this template includes..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    >
                      {isEditDialogOpen
                        ? (updateTemplateMutation.isPending ? "Updating..." : "Update Template")
                        : (createTemplateMutation.isPending ? "Creating..." : "Create Template")
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templatesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !templates?.length ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No project templates created yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first template to speed up project creation
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Folder className="w-4 h-4" />
                        <h3 className="font-semibold text-base">{template.name}</h3>
                      </div>
                      {template.industry && (
                        <IndustryBadge
                          industry={template.industry}
                          className="text-xs"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        title="Edit template"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        disabled={deleteTemplateMutation.isPending}
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {template.estimatedDuration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.estimatedDuration} days
                      </div>
                    )}
                    {template.defaultBudget && (
                      <div className="flex items-center gap-1">
                        <PoundSterling className="w-3 h-3" />
                        £{parseFloat(template.defaultBudget).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
