import { useState, useEffect, Fragment } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import type { Project, InsertProject, Client, User, Task } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Calendar, 
  Users,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  TrendingUp
} from "lucide-react";

// Form validation schema for project creation/editing
// Use a custom schema that handles form inputs (strings) while maintaining compatibility
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  budget: z.string().optional(),
  actualCost: z.string().optional(),
  progress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  completedAt: z.date().optional(),
  tags: z.array(z.string()).optional(),
  isClientPortalEnabled: z.boolean().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

// Project Form Component
function ProjectForm({ project, onSuccess }: { project?: Project; onSuccess: () => void }) {
  const { toast } = useToast();
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      clientId: project?.clientId || "",
      managerId: project?.managerId || "",
      status: project?.status || "planning",
      priority: project?.priority || "medium",
      budget: project?.budget || "0",
      actualCost: project?.actualCost || "0",
      progress: project?.progress?.toString() || "0",
      startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      tags: project?.tags || [],
      isClientPortalEnabled: project?.isClientPortalEnabled ?? true,
    },
  });

  // Fetch clients for dropdown
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch users for manager dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Success", description: "Project created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertProject>) => {
      const response = await apiRequest("PUT", `/api/projects/${project?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Success", description: "Project updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    const submitData: InsertProject = {
      name: data.name,
      description: data.description || null,
      clientId: data.clientId && data.clientId.trim() !== "" ? data.clientId : null,
      managerId: data.managerId && data.managerId.trim() !== "" ? data.managerId : null,
      status: data.status || null,
      priority: data.priority || null,
      budget: data.budget || null,
      actualCost: data.actualCost || null,
      progress: data.progress ? parseInt(data.progress) : 0,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      completedAt: null,
      tags: data.tags || null,
      isClientPortalEnabled: data.isClientPortalEnabled ?? true,
    };

    if (project) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Website Redesign" {...field} data-testid="input-project-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company ? `(${client.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Manager</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project-manager">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users?.filter(user => user.role === 'manager' || user.role === 'admin').map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50000" {...field} data-testid="input-project-budget" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actualCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual Cost ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} data-testid="input-project-actual-cost" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="progress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progress (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" placeholder="0" {...field} data-testid="input-project-progress" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-project-start-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-project-end-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Project description and objectives..." {...field} data-testid="input-project-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isClientPortalEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Client Portal Access</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Allow client to view project progress and updates
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-client-portal"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading} data-testid="button-save-project">
            {isLoading ? "Saving..." : project ? "Update Project" : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Projects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

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

  const { data: projects, isLoading: projectsLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Fetch clients for display
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  // Fetch tasks for project display
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/projects/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "planning": return "secondary";
      case "review": return "outline";
      case "completed": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return Clock;
      case "completed": return CheckCircle;
      case "cancelled": return AlertTriangle;
      default: return FolderOpen;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    return client ? `${client.name}${client.company ? ` (${client.company})` : ''}` : 'No client';
  };

  const getProjectTasks = (projectId: string) => {
    return tasks?.filter(task => task.projectId === projectId) || [];
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 dark:text-green-400";
      case "in_progress": return "text-blue-600 dark:text-blue-400";
      case "review": return "text-yellow-600 dark:text-yellow-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const filteredProjects = projects?.filter((project: Project) => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || project.status === selectedStatus;
    const matchesPriority = selectedPriority === "all" || project.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  return (
    <Layout title="Project Management" breadcrumbs={["Projects"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
                data-testid="input-search-projects"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-40" data-testid="select-filter-priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-project">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <ProjectForm
                onSuccess={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold" data-testid="text-active-projects">
                    {projects?.filter((p: any) => p.status === 'active').length || 0}
                  </p>
                </div>
                <FolderOpen className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Planning</p>
                  <p className="text-2xl font-bold" data-testid="text-planning-projects">
                    {projects?.filter((p: any) => p.status === 'planning').length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold" data-testid="text-completed-projects">
                    {projects?.filter((p: any) => p.status === 'completed').length || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold" data-testid="text-total-budget">
                    ${projects?.reduce((sum: number, project: any) => sum + (parseFloat(project.budget) || 0), 0).toLocaleString() || '0'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid/Table */}
        <Card className="glassmorphism">
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Failed to load projects</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No projects found matching your search" : "No projects found. Start your first project to get organized."}
                </p>
                {!searchTerm && (
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-4" data-testid="button-add-first-project">
                        <Plus className="w-4 h-4 mr-2" />
                        Start First Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                      </DialogHeader>
                      <ProjectForm
                        onSuccess={() => setIsAddDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-projects">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Project</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Client</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Progress</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Status</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Priority</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Budget</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Due Date</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProjects.map((project: any, index: number) => {
                      const StatusIcon = getStatusIcon(project.status);
                      const projectTasks = getProjectTasks(project.id);
                      const isExpanded = expandedProject === project.id;
                      
                      return (
                        <Fragment key={project.id}>
                          <tr data-testid={`row-project-${index}`}>
                            <td className="py-4">
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                  className="p-1 h-6 w-6"
                                  data-testid={`button-expand-${index}`}
                                >
                                  {isExpanded ? "−" : "+"}
                                </Button>
                                <div>
                                  <div className="font-medium text-foreground">{project.name}</div>
                                  <div className="text-sm text-muted-foreground">{project.description}</div>
                                  {projectTasks.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">{getClientName(project.clientId)}</div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={project.progress || 0} 
                                className="w-20 h-2"
                                data-testid={`progress-${index}`}
                              />
                              <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="w-4 h-4" />
                              <Badge variant={getStatusColor(project.status)} data-testid={`badge-status-${index}`}>
                                {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant={getPriorityColor(project.priority)} data-testid={`badge-priority-${index}`}>
                              {project.priority?.charAt(0).toUpperCase() + project.priority?.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">
                              ${parseFloat(project.budget || 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {project.endDate 
                                ? new Date(project.endDate).toLocaleDateString()
                                : 'Not set'
                              }
                            </div>
                          </td>
                          <td className="py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setEditingProject(project)}
                                  data-testid={`button-edit-${index}`}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      data-testid={`button-delete-${index}`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMutation.mutate(project.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                        
                        {/* Expanded Tasks Row */}
                        {isExpanded && (
                          <tr key={`${project.id}-tasks`}>
                            <td colSpan={8} className="py-4 px-6 bg-muted/50">
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm text-muted-foreground mb-3">
                                  Project Tasks ({projectTasks.length})
                                </h4>
                                {projectTasks.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No tasks assigned to this project</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {projectTasks.map((task, taskIndex) => (
                                      <div 
                                        key={task.id} 
                                        className="p-3 bg-background rounded-md border border-border"
                                        data-testid={`task-${taskIndex}`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-medium text-sm">{task.title}</div>
                                          <Badge 
                                            variant="outline" 
                                            className={getTaskStatusColor(task.status || "todo")}
                                          >
                                            {task.status || "todo"}
                                          </Badge>
                                        </div>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>
                                            {task.priority && (
                                              <Badge variant="outline" className="text-xs mr-2">
                                                {task.priority}
                                              </Badge>
                                            )}
                                            {task.assignedTo && (
                                              <span>Assigned</span>
                                            )}
                                          </span>
                                          {task.dueDate && (
                                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Project Dialog */}
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            {editingProject && (
              <ProjectForm
                project={editingProject}
                onSuccess={() => setEditingProject(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}