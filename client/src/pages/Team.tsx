import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  LayoutGrid
} from "lucide-react";
import { z } from "zod";

// Form schema for adding team members
const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  skills: z.string().optional().transform(str => str ? str.split(',').map(s => s.trim()) : []),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type InsertUser = z.infer<typeof insertUserSchema>;

export default function Team() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

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

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: teamMembers, isLoading: isLoadingTeam } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Form for adding new team members
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "employee",
      department: "",
      position: "",
      phone: "",
      address: "",
      skills: [],
      isActive: true,
    },
  });

  // Mutation for adding team members
  const addMemberMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to add team member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member added successfully!",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for editing team members
  const editMemberMutation = useMutation({
    mutationFn: async (data: InsertUser & { id: string }) => {
      const response = await fetch(`/api/users/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = 'Failed to update team member';
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.message || errorMessage;
        } catch {
          errorMessage = response.status === 401 ? 'Unauthorized - please log in again' :
                       response.status === 403 ? 'Permission denied - admin/manager role required' :
                       errorMessage;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member updated successfully!",
      });
      setEditingMember(null);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form for editing team members
  const editForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "employee",
      department: "",
      position: "",
      phone: "",
      address: "",
      skills: [],
      isActive: true,
    },
  });

  // Update edit form when editingMember changes
  useEffect(() => {
    if (editingMember) {
      editForm.reset({
        email: editingMember.email || "",
        firstName: editingMember.firstName || "",
        lastName: editingMember.lastName || "",
        role: editingMember.role || "employee",
        department: editingMember.department || "",
        position: editingMember.position || "",
        phone: editingMember.phone || "",
        address: editingMember.address || "",
        skills: editingMember.skills || [],
        isActive: editingMember.isActive ?? true,
      });
    }
  }, [editingMember, editForm]);

  const onSubmit = (data: InsertUser) => {
    addMemberMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertUser) => {
    if (editingMember) {
      editMemberMutation.mutate({
        ...data,
        id: editingMember.id,
      });
    }
  };


  if (isLoading || !isAuthenticated || isLoadingTeam) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const actualTeamMembers = teamMembers || [];

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  const getUserDisplayName = (user: User) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
  };

  const getUserInitials = (user: User) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  };

  const getMemberTasks = (memberId: string) => {
    return tasks?.filter(task => task.assignedTo === memberId) || [];
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 dark:text-green-400";
      case "in_progress": return "text-blue-600 dark:text-blue-400";
      case "review": return "text-yellow-600 dark:text-yellow-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const filteredMembers = actualTeamMembers.filter((member) => {
    const displayName = getUserDisplayName(member).toLowerCase();
    const role = (member.role || '').toLowerCase();
    const department = (member.department || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return displayName.includes(searchLower) ||
           role.includes(searchLower) ||
           department.includes(searchLower) ||
           email.includes(searchLower);
  });

  // Sorting configuration
  const sortConfigs: SortConfig[] = [
    {
      key: 'name',
      type: 'string',
      accessor: (member: User) => getUserDisplayName(member)
    },
    { key: 'role', type: 'string' },
    { key: 'department', type: 'string' },
    {
      key: 'contact',
      type: 'string',
      accessor: (member: User) => member.email || member.phone || ''
    },
    {
      key: 'tasks',
      type: 'number',
      accessor: (member: User) => getMemberTasks(member.id).filter(t => t.status !== 'completed').length
    },
    {
      key: 'status',
      type: 'custom',
      customOrder: { true: 0, false: 1 },
      accessor: (member: User) => member.isActive?.toString() || 'false'
    }
  ];

  const { sortedData: sortedMembers, sortState, handleSort } = useTableSort(filteredMembers, sortConfigs);

  const openDetailsDialog = (member: User) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
  };

  return (
    <Layout title="Team Management" breadcrumbs={["Team"]}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold" data-testid="text-total-members">
                    {actualTeamMembers.length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                  <p className="text-2xl font-bold" data-testid="text-active-members">
                    {actualTeamMembers.filter(m => m.isActive).length}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Productivity</p>
                  <p className="text-2xl font-bold" data-testid="text-avg-productivity">
                    N/A
                  </p>
                </div>
                <Award className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                  <p className="text-2xl font-bold" data-testid="text-active-tasks">
                    {tasks?.filter((task: any) => task.status !== 'completed').length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
              data-testid="input-search-team"
            />
          </div>
        </div>

        {/* Team Members Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team Members</h2>
          <div className="flex items-center gap-4">
            <div className="flex justify-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2"
              >
                <Table className="h-4 w-4" />
                Table
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-member">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} value={field.value ?? ""} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} value={field.value ?? ""} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email" {...field} value={field.value ?? ""} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter department" {...field} value={field.value ?? ""} data-testid="input-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter position" {...field} value={field.value ?? ""} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addMemberMutation.isPending}
                      className="flex-1"
                      data-testid="button-save"
                    >
                      {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Members Views */}
        {viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => {
              const memberTasks = getMemberTasks(member.id);
              const activeTasks = memberTasks.filter(task => task.status !== 'completed');

              return (
                <Card key={member.id} className="glassmorphism" data-testid={`card-member-${index}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.profileImageUrl || ''} alt={getUserDisplayName(member)} />
                        <AvatarFallback>
                          {getUserInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3
                          className="font-semibold text-foreground cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openDetailsDialog(member)}
                          data-testid={`text-member-name-${index}`}
                        >
                          {getUserDisplayName(member)}
                        </h3>
                        <p className="text-sm text-muted-foreground">{member.role || 'No role assigned'}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(member.isActive || false)}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Department</p>
                      <p className="text-foreground">{member.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Position</p>
                      <p className="text-foreground">{member.position || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Email</p>
                      <p className="text-foreground truncate">{member.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Phone</p>
                      <p className="text-foreground">{member.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {activeTasks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Active Tasks ({activeTasks.length})</p>
                      <div className="space-y-1">
                        {activeTasks.slice(0, 3).map((task, taskIndex) => (
                          <div key={task.id} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                            <span className="truncate">{task.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                        {activeTasks.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{activeTasks.length - 3} more tasks
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {member.skills && member.skills.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.map((skill, skillIndex) => (
                          <Badge key={skillIndex} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailsDialog(member)}
                      data-testid={`button-view-${index}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetailsDialog(member)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingMember(member)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const deleteMember = async () => {
                              try {
                                const response = await fetch(`/api/users/${member.id}`, {
                                  method: 'DELETE',
                                });

                                if (response.ok) {
                                  queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                  toast({
                                    title: "Success",
                                    description: `${getUserDisplayName(member)} has been deleted successfully`,
                                  });
                                } else {
                                  const errorData = await response.text();
                                  let errorMessage = 'Failed to delete team member';
                                  try {
                                    const parsedError = JSON.parse(errorData);
                                    errorMessage = parsedError.message || errorMessage;
                                  } catch {
                                    errorMessage = response.status === 401 ? 'Unauthorized - please log in again' :
                                               response.status === 403 ? 'Permission denied - admin role required' :
                                               errorMessage;
                                  }
                                  toast({
                                    title: "Error",
                                    description: errorMessage,
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                console.error('Failed to delete member:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to delete team member. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            };

                            if (confirm(`Are you sure you want to delete ${getUserDisplayName(member)}? This action cannot be undone.`)) {
                              deleteMember();
                            }
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Card className="glassmorphism">
            <CardContent className="p-0">
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      column="name"
                      currentSort={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    >
                      Member
                    </SortableTableHead>
                    <SortableTableHead
                      column="role"
                      currentSort={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    >
                      Role
                    </SortableTableHead>
                    <SortableTableHead
                      column="department"
                      currentSort={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    >
                      Department
                    </SortableTableHead>
                    <SortableTableHead
                      column="position"
                      currentSort={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    >
                      Position
                    </SortableTableHead>
                    <SortableTableHead
                      column="email"
                      currentSort={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    >
                      Email
                    </SortableTableHead>
                    <SortableTableHead
                      column="status"
                      currentSort={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    >
                      Status
                    </SortableTableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMembers.map((member, index) => {
                    const memberTasks = getMemberTasks(member.id);
                    const activeTasks = memberTasks.filter(task => task.status !== 'completed');

                    return (
                      <TableRow key={member.id} data-testid={`row-member-${index}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.profileImageUrl || ''} alt={getUserDisplayName(member)} />
                              <AvatarFallback>
                                {getUserInitials(member)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{getUserDisplayName(member)}</div>
                              {activeTasks.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {activeTasks.length} active tasks
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.role || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{member.department || 'N/A'}</TableCell>
                        <TableCell>{member.position || 'N/A'}</TableCell>
                        <TableCell>{member.email || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(member.isActive || false)}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailsDialog(member)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingMember(member)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const deleteMember = async () => {
                                    try {
                                      const response = await fetch(`/api/users/${member.id}`, {
                                        method: 'DELETE',
                                      });

                                      if (response.ok) {
                                        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                        toast({
                                          title: "Success",
                                          description: `${getUserDisplayName(member)} has been deleted successfully`,
                                        });
                                      } else {
                                        const errorData = await response.text();
                                        let errorMessage = 'Failed to delete team member';
                                        try {
                                          const parsedError = JSON.parse(errorData);
                                          errorMessage = parsedError.message || errorMessage;
                                        } catch {
                                          errorMessage = response.status === 401 ? 'Unauthorized - please log in again' :
                                                     response.status === 403 ? 'Permission denied - admin role required' :
                                                     errorMessage;
                                        }
                                        toast({
                                          title: "Error",
                                          description: errorMessage,
                                          variant: "destructive",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Failed to delete member:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to delete team member. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  };

                                  if (confirm(`Are you sure you want to delete ${getUserDisplayName(member)}? This action cannot be undone.`)) {
                                    deleteMember();
                                  }
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableComponent>
            </CardContent>
          </Card>
        )}

        {filteredMembers.length === 0 && (
          <Card className="glassmorphism">
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No team members found matching your search" : "No team members found"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* View Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Team Member Details</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedMember.profileImageUrl || ''} alt={getUserDisplayName(selectedMember)} />
                    <AvatarFallback>
                      {getUserInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{getUserDisplayName(selectedMember)}</h3>
                    <p className="text-muted-foreground">{selectedMember.role || 'No role assigned'}</p>
                    <Badge variant={getStatusColor(selectedMember.isActive || false)} className="mt-1">
                      {selectedMember.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Contact</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        {selectedMember.email || 'N/A'}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        {selectedMember.phone || 'N/A'}
                      </div>
                      <div className="flex items-start text-sm">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5" />
                        <span>{selectedMember.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Work</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        {selectedMember.department || 'N/A'}
                      </div>
                      <div className="flex items-center text-sm">
                        <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                        {selectedMember.position || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedMember.skills && selectedMember.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const memberTasks = getMemberTasks(selectedMember.id);
                  const activeTasks = memberTasks.filter(task => task.status !== 'completed');

                  if (activeTasks.length > 0) {
                    return (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          Active Tasks ({activeTasks.length})
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {activeTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                              <span className="truncate">{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {task.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedMember) {
                      setIsDetailsDialogOpen(false);
                      // Delete functionality - implement API call
                    }
                  }}
                >
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    if (selectedMember) {
                      setEditingMember(selectedMember);
                      setIsDetailsDialogOpen(false);
                    }
                  }}
                >
                  Edit
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Team Member</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="Enter last name" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger>
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
                        <Input placeholder="Enter department" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="Enter phone number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter address" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editMemberMutation.isPending}
                    className="flex-1"
                  >
                    {editMemberMutation.isPending ? "Updating..." : "Update Member"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </Layout>
  );
}
