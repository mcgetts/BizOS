import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { users } from "@shared/schema";
import type { Task, User, Project } from "@shared/schema";
import { useTableSort, SortConfig } from "@/hooks/useTableSort";
import { SortableTableHead } from "@/components/SortableHeader";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  Clock,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Calendar,
  Award,
  Eye,
  Edit,
  Trash2,
  Table,
  LayoutGrid,
  Activity,
  Target,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Zap,
  Settings,
  RefreshCw,
  Filter,
  Download,
  FolderOpen,
  CheckSquare
} from "lucide-react";
import { z } from "zod";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Unified interfaces combining Team and Resources data
interface WorkloadCalculation {
  userId: string;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  actualWorkedHours: number;
  availableHours: number;
  utilizationPercentage: number;
  overallocationHours: number;
  isOverallocated: boolean;
  activeProjectsCount: number;
  activeTasksCount: number;
  conflictingAllocations: any[];
}

interface TeamUtilization {
  totalTeamMembers: number;
  averageUtilization: number;
  overallocatedMembers: number;
  underutilizedMembers: number;
  optimalUtilizationMembers: number;
  totalCapacityHours: number;
  totalAllocatedHours: number;
}

interface EnhancedUser extends User {
  workload?: WorkloadCalculation;
  productivity?: number;
  currentProjects?: string[];
  recentActivity?: string[];
  skills?: string[] | null;
}

// Form schema for adding team members - strengthen validation
const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email('Please enter a valid email address'),
  role: z.string().min(1, 'Role is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type InsertUser = z.infer<typeof insertUserSchema>;

// Edit form schema - require at least one field to update
const editUserSchema = insertUserSchema.extend({
  id: z.string(),
}).partial().required({ id: true }).refine(
  (data) => {
    // Require at least one field besides id to be provided
    const { id, ...rest } = data;
    return Object.values(rest).some(value => value !== undefined && value !== '' && value !== null);
  },
  { message: 'At least one field must be updated' }
);

type EditUser = z.infer<typeof editUserSchema>;

export default function TeamHub() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("directory");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("week");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

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

  // Fetch team data
  const { data: teamMembers, isLoading: teamLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Fetch team utilization
  const { data: teamUtilization, isLoading: utilizationLoading } = useQuery<TeamUtilization>({
    queryKey: ["/api/team/utilization", selectedTimeRange],
    enabled: isAuthenticated,
  });

  // Fetch individual workloads
  const { data: workloads, isLoading: workloadsLoading } = useQuery<WorkloadCalculation[]>({
    queryKey: ["/api/workloads", selectedTimeRange],
    enabled: isAuthenticated,
  });

  // Fetch projects for context
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Mutations for CRUD operations
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertUser> }) => {
      return apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive",
      });
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member',
        variant: 'destructive',
      });
    },
  });

  // Enhanced team members with workload data
  const enhancedTeamMembers: EnhancedUser[] = (teamMembers || []).map(member => {
    const workload = workloads?.find(w => w.userId === member.id);
    return {
      ...member,
      workload,
      productivity: 85 + Math.random() * 15, // Mock data
      currentProjects: projects?.filter(p => p.id === member.id).map(p => p.name) || [],
      recentActivity: [`Updated task on ${new Date().toLocaleDateString()}`],
      skills: (member as any).skills || null
    };
  });

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || user.id || 'Unknown User';
  };

  // Edit form setup
  const editForm = useForm<EditUser>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      department: '',
      position: '',
      phone: '',
      address: '',
      isActive: true,
    },
  });

  // Add form setup
  const addForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee', // Set default role to meet validation
      department: '',
      position: '',
      phone: '',
      address: '',
      isActive: true,
    },
  });

  // Update form when editing member changes
  useEffect(() => {
    if (editingMember) {
      editForm.reset({
        id: editingMember.id,
        firstName: editingMember.firstName || '',
        lastName: editingMember.lastName || '',
        email: editingMember.email || '',
        role: editingMember.role || '',
        department: editingMember.department || '',
        position: editingMember.position || '',
        phone: editingMember.phone || '',
        address: editingMember.address || '',
        isActive: editingMember.isActive ?? true,
      });
    }
  }, [editingMember, editForm]);

  const onEditSubmit = async (data: EditUser) => {
    if (!editingMember) return;
    const { id, ...updateData } = data;
    await updateUserMutation.mutateAsync({ id: editingMember.id, data: updateData });
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    await deleteUserMutation.mutateAsync(memberToDelete.id);
  };

  const onAddSubmit = async (data: InsertUser) => {
    await addUserMutation.mutateAsync(data);
  };

  // Generate chart data
  const generateUtilizationData = () => {
    return enhancedTeamMembers.map(member => ({
      name: getUserDisplayName(member).split(' ')[0],
      utilization: member.workload?.utilizationPercentage || 0,
      capacity: member.workload?.totalCapacityHours || 40,
      allocated: member.workload?.totalAllocatedHours || 0,
    }));
  };

  const generateDepartmentData = () => {
    const departments = enhancedTeamMembers.reduce((acc, member) => {
      const dept = member.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(departments).map(([name, value]) => ({ name, value }));
  };

  if (isLoading || teamLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading team data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredMembers = enhancedTeamMembers.filter((member) => {
    const displayName = getUserDisplayName(member).toLowerCase();
    const role = (member.role || '').toLowerCase();
    const department = (member.department || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = displayName.includes(searchLower) ||
                         role.includes(searchLower) ||
                         department.includes(searchLower) ||
                         email.includes(searchLower);

    const matchesDepartment = selectedDepartment === "all" ||
                             (member.department || '').toLowerCase() === selectedDepartment;

    const matchesRole = selectedRole === "all" ||
                       (member.role || '').toLowerCase() === selectedRole;

    const matchesStatus = selectedStatus === "all" ||
                         (selectedStatus === "active" && member.isActive) ||
                         (selectedStatus === "inactive" && !member.isActive);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Team</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="workloads">Workloads</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
          </TabsList>

          {/* Directory Tab */}
          <TabsContent value="directory" className="space-y-4">
            {/* Team Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enhancedTeamMembers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {enhancedTeamMembers.filter(m => m.isActive).length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Departments</CardTitle>
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(enhancedTeamMembers.map(m => m.department).filter(Boolean)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">Active departments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamUtilization?.averageUtilization?.toFixed(1) || '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +5% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overallocated</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {teamUtilization?.overallocatedMembers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Members need attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  data-testid="input-search-members"
                />
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {Array.from(new Set(enhancedTeamMembers.map(m => m.department).filter(Boolean))).map(dept => (
                      <SelectItem key={dept} value={dept!.toLowerCase()}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  data-testid="button-view-table"
                >
                  <Table className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-member">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </div>

            {/* Team Members Display */}
            {viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar>
                          <AvatarImage
                            src={`https://ui-avatars.com/api/?name=${getUserDisplayName(member)}&background=6366f1&color=fff`}
                            alt={getUserDisplayName(member)}
                          />
                          <AvatarFallback>
                            {getUserDisplayName(member).split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 
                            className="font-medium cursor-pointer hover:text-blue-600 transition-colors" 
                            data-testid={`text-member-name-${member.id}`}
                            onClick={() => {
                              setSelectedMember(member);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            {getUserDisplayName(member)}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`text-member-role-${member.id}`}>{member.role}</p>
                        </div>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{member.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <LayoutGrid className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{member.department || 'No department'}</span>
                        </div>
                        {member.workload && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Utilization</span>
                              <span>{member.workload.utilizationPercentage.toFixed(1)}%</span>
                            </div>
                            <Progress
                              value={member.workload.utilizationPercentage}
                              className={`h-2 ${
                                member.workload.utilizationPercentage > 100 ? 'bg-red-100' :
                                member.workload.utilizationPercentage > 85 ? 'bg-yellow-100' : 'bg-green-100'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center space-x-1">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{member.workload?.activeProjectsCount || 0} projects</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`menu-trigger-grid-${member.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMember(member);
                              setIsDetailsDialogOpen(true);
                            }} data-testid={`menu-view-grid-${member.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingMember(member);
                              setIsEditDialogOpen(true);
                            }} data-testid={`menu-edit-grid-${member.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {user?.role === 'admin' && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setMemberToDelete(member);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                                data-testid={`menu-delete-grid-${member.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <TableComponent>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Utilization</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://ui-avatars.com/api/?name=${getUserDisplayName(member)}&background=6366f1&color=fff`}
                                  alt={getUserDisplayName(member)}
                                />
                                <AvatarFallback>
                                  {getUserDisplayName(member).split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p 
                                  className="font-medium cursor-pointer hover:text-blue-600 transition-colors" 
                                  data-testid={`text-table-name-${member.id}`}
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setIsDetailsDialogOpen(true);
                                  }}
                                >
                                  {getUserDisplayName(member)}
                                </p>
                                <p className="text-sm text-muted-foreground" data-testid={`text-table-email-${member.id}`}>{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-table-role-${member.id}`}>{member.role || 'No role'}</TableCell>
                          <TableCell data-testid={`text-table-department-${member.id}`}>{member.department || 'No department'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{member.workload?.utilizationPercentage.toFixed(1) || '0'}%</span>
                              <Progress
                                value={member.workload?.utilizationPercentage || 0}
                                className="w-16 h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell>{member.workload?.activeProjectsCount || 0}</TableCell>
                          <TableCell>
                            <Badge variant={member.isActive ? "default" : "secondary"} data-testid={`badge-status-${member.id}`}>
                              {member.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`menu-trigger-table-${member.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedMember(member);
                                  setIsDetailsDialogOpen(true);
                                }} data-testid={`menu-view-table-${member.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEditingMember(member);
                                  setIsEditDialogOpen(true);
                                }} data-testid={`menu-edit-table-${member.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {user?.role === 'admin' && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setMemberToDelete(member);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600"
                                    data-testid={`menu-delete-table-${member.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableComponent>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Workloads Tab */}
          <TabsContent value="workloads" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Team Workload Analysis</h3>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Utilization Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Team Utilization Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={generateUtilizationData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="utilization" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Individual Workloads */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Workloads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enhancedTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage
                            src={`https://ui-avatars.com/api/?name=${getUserDisplayName(member)}&background=6366f1&color=fff`}
                            alt={getUserDisplayName(member)}
                          />
                          <AvatarFallback>
                            {getUserDisplayName(member).split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getUserDisplayName(member)}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm font-medium">Capacity</p>
                          <p className="text-lg">{member.workload?.totalCapacityHours || 40}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Allocated</p>
                          <p className="text-lg">{member.workload?.totalAllocatedHours || 0}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Utilization</p>
                          <Badge variant={
                            (member.workload?.utilizationPercentage || 0) > 100 ? "destructive" :
                            (member.workload?.utilizationPercentage || 0) > 85 ? "secondary" : "default"
                          }>
                            {member.workload?.utilizationPercentage.toFixed(1) || '0'}%
                          </Badge>
                        </div>
                        <div className="w-32">
                          <Progress
                            value={member.workload?.utilizationPercentage || 0}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generateDepartmentData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {generateDepartmentData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Average Productivity</span>
                      <span className="font-medium">87.5%</span>
                    </div>
                    <Progress value={87.5} />

                    <div className="flex justify-between items-center">
                      <span>Task Completion Rate</span>
                      <span className="font-medium">92.1%</span>
                    </div>
                    <Progress value={92.1} />

                    <div className="flex justify-between items-center">
                      <span>On-time Delivery</span>
                      <span className="font-medium">84.3%</span>
                    </div>
                    <Progress value={84.3} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Needs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Frontend Developers</span>
                      <Badge>2 needed</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>DevOps Engineers</span>
                      <Badge>1 needed</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>UX Designers</span>
                      <Badge>1 needed</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skill Gaps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>React Development</span>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Cloud Architecture</span>
                      <Badge variant="secondary">Medium</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Mobile Development</span>
                      <Badge variant="secondary">Medium</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">+15%</div>
                      <p className="text-sm text-muted-foreground">Team growth this year</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">3.2</div>
                      <p className="text-sm text-muted-foreground">Avg projects per member</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={addForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-add-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-add-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-add-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={addForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-add-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-add-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={addForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-add-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-add-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-add-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      addForm.reset();
                    }}
                    data-testid="button-add-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addUserMutation.isPending}
                    data-testid="button-add-member"
                  >
                    {addUserMutation.isPending ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedMember ? getUserDisplayName(selectedMember) : 'Team Member Details'}
              </DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={`https://ui-avatars.com/api/?name=${getUserDisplayName(selectedMember)}&background=6366f1&color=fff`}
                      alt={getUserDisplayName(selectedMember)}
                    />
                    <AvatarFallback>
                      {getUserDisplayName(selectedMember).split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{getUserDisplayName(selectedMember)}</h3>
                    <p className="text-muted-foreground">{selectedMember.role}</p>
                    <p className="text-sm">{selectedMember.department}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>Email: {selectedMember.email}</p>
                      <p>Phone: {selectedMember.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Current Workload</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Utilization</span>
                        <span>{selectedMember.workload?.utilizationPercentage.toFixed(1) || '0'}%</span>
                      </div>
                      <Progress value={selectedMember.workload?.utilizationPercentage || 0} />
                      <p className="text-sm text-muted-foreground">
                        {selectedMember.workload?.activeProjectsCount || 0} active projects
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setEditingMember(selectedMember);
                      setIsDetailsDialogOpen(false);
                      setIsEditDialogOpen(true);
                    }}
                    variant="outline"
                    data-testid={`button-edit-details-${selectedMember.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Member
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      onClick={() => {
                        setMemberToDelete(selectedMember);
                        setIsDetailsDialogOpen(false);
                        setIsDeleteDialogOpen(true);
                      }}
                      variant="destructive"
                      data-testid={`button-delete-details-${selectedMember.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Member
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Edit {editingMember ? getUserDisplayName(editingMember) : 'Team Member'}
              </DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingMember(null);
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    data-testid="button-save"
                  >
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete {memberToDelete ? getUserDisplayName(memberToDelete) : 'this team member'}?
                This action cannot be undone.
              </p>
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  This will permanently remove the member from the system.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setMemberToDelete(null);
                }}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteUserMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}