import { useState, useEffect, Fragment } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
  TrendingUp,
  LayoutGrid,
  Table,
  Building2,
  Eye
} from "lucide-react";

// Form validation schema for project creation/editing
// Use a custom schema that handles form inputs (strings) while maintaining compatibility
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  companyId: z.string().optional(),
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
      companyId: (project as any)?.companyId || "",
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

  // Fetch companies for dropdown
  const { data: companies } = useQuery<any[]>({
    queryKey: ["/api/companies"],
  });

  // Fetch users for manager dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch tasks for this project
  const { data: projectTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!project?.id,
    select: (allTasks) => allTasks?.filter(task => task.projectId === project?.id) || [],
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
      companyId: data.companyId && data.companyId.trim() !== "" ? data.companyId : null,
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
    } as any;

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
                        {client.name}
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
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
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
                    <SelectItem value="paused">Paused</SelectItem>
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
                <FormLabel>Budget (£)</FormLabel>
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
                <FormLabel>Actual Cost (£)</FormLabel>
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

        {/* Tasks Section - Only show when editing existing project */}
        {project && projectTasks && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-base font-medium mb-4">Project Tasks ({projectTasks.length})</h3>
              {projectTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No tasks assigned to this project yet.</p>
              ) : (
                <div className="space-y-3">
                  {projectTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          {task.priority && (
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Badge
                          variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'in_progress' ? 'secondary' :
                            task.status === 'blocked' ? 'destructive' : 'outline'
                          }
                          className="text-xs"
                        >
                          {task.status || 'todo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");

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

  // Fetch companies for project display
  const { data: companies } = useQuery<any[]>({
    queryKey: ["/api/companies"],
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
      case "active":
      case "in_progress": return "default";
      case "planning": return "secondary";
      case "review": return "outline";
      case "completed": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "in_progress": return Clock;
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

  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return 'No client';
    const client = clients?.find(c => c.id === clientId);
    return client ? client.name : 'No client';
  };

  const getCompanyName = (companyId: string | null | undefined) => {
    if (!companyId) return 'No company';
    const company = companies?.find(c => c.id === companyId);
    return company ? company.name : 'No company';
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

  const groupProjectsByStatus = () => {
    // Exclude cancelled status from Kanban view
    const statuses = ["planning", "active", "review", "paused", "completed"];
    const grouped = statuses.reduce((acc, status) => {
      if (status === "active") {
        // Only include "active" status projects
        acc[status] = filteredProjects.filter(project =>
          project.status === "active" && project.status !== "cancelled"
        );
      } else if (status === "paused") {
        // Include both "paused" and "on_hold" in the paused column
        acc[status] = filteredProjects.filter(project =>
          (project.status === "paused" || project.status === "on_hold") && project.status !== "cancelled"
        );
      } else {
        acc[status] = filteredProjects.filter(project => project.status === status && project.status !== "cancelled");
      }
      return acc;
    }, {} as Record<string, Project[]>);

    // Handle any projects with status not in our predefined list (but exclude cancelled)
    const unhandledProjects = filteredProjects.filter(project =>
      !["planning", "active", "review", "paused", "on_hold", "completed", "cancelled"].includes(project.status || "") &&
      project.status !== "cancelled"
    );

    if (unhandledProjects.length > 0) {
      // Add them to a default category or create new ones
      unhandledProjects.forEach(project => {
        const status = project.status || "planning";
        if (!grouped[status]) {
          grouped[status] = [];
        }
        grouped[status].push(project);
      });
    }

    return grouped;
  };

  const projectsByStatus = groupProjectsByStatus();

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
                <SelectItem value="paused">Paused</SelectItem>
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
                    {projects?.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length || 0}
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
                    £{projects?.reduce((sum: number, project: any) => sum + (parseFloat(project.budget) || 0), 0).toLocaleString() || '0'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex justify-center">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              data-testid="button-kanban-view"
            >
              Board
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              data-testid="button-table-view"
            >
              Table
            </Button>
          </div>
        </div>

        {/* Loading and Error States */}
        {projectsLoading ? (
          <Card className="glassmorphism">
            <CardContent>
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="glassmorphism">
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Failed to load projects</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card className="glassmorphism">
            <CardContent>
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
            </CardContent>
          </Card>
        ) : viewMode === "kanban" ? (
          /* Kanban View */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {Object.entries(projectsByStatus).map(([status, statusProjects]) => (
              <Card key={status} className="glassmorphism">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="capitalize">{status}</span>
                    <Badge variant="secondary" className="text-xs">
                      {statusProjects.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {statusProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id || '');
                    return (
                      <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3
                                className="font-medium text-sm cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => setViewingProject(project)}
                              >
                                {project.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">{getCompanyName((project as any).companyId)}</p>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <Badge variant={getPriorityColor(project.priority || '')}>
                                {project.priority ? project.priority.charAt(0).toUpperCase() + project.priority.slice(1) : 'Medium'}
                              </Badge>
                              <span className="text-muted-foreground">
                                {project.progress || 0}%
                              </span>
                            </div>

                            <Progress value={project.progress || 0} className="h-1" />

                            {projectTasks.length > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Tasks</span>
                                <Badge variant="outline" className="text-xs">
                                  {projectTasks.length}
                                </Badge>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3 mr-1" />
                                {project.endDate
                                  ? new Date(project.endDate).toLocaleDateString()
                                  : 'No due date'
                                }
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewingProject(project)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditingProject(project)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-projects">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Project</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Client</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Company</th>
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

                      return (
                        <tr key={project.id} data-testid={`row-project-${index}`}>
                          <td className="py-4">
                            <div
                              className="font-medium text-foreground cursor-pointer hover:text-blue-600 hover:underline"
                              onClick={() => setViewingProject(project)}
                            >
                              {project.name}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">{getClientName(project.clientId)}</div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">{getCompanyName((project as any).companyId)}</div>
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
                              £{parseFloat(project.budget || 0).toLocaleString()}
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
                                  onClick={() => setViewingProject(project)}
                                  data-testid={`button-view-${index}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* View Project Details Dialog */}
        <Dialog open={!!viewingProject} onOpenChange={() => setViewingProject(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingProject?.name}</DialogTitle>
            </DialogHeader>
            {viewingProject && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Client</label>
                    <p className="text-sm">{getClientName(viewingProject.clientId)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="text-sm">{getCompanyName((viewingProject as any).companyId)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={getStatusColor(viewingProject.status || '')}>
                      {viewingProject.status?.charAt(0).toUpperCase() + viewingProject.status?.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priority</label>
                    <Badge variant={getPriorityColor(viewingProject.priority || '')}>
                      {viewingProject.priority ? viewingProject.priority.charAt(0).toUpperCase() + viewingProject.priority.slice(1) : 'Medium'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Progress</label>
                    <div className="flex items-center space-x-2">
                      <Progress value={viewingProject.progress || 0} className="flex-1" />
                      <span className="text-sm">{viewingProject.progress || 0}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Budget</label>
                    <p className="text-sm">£{parseFloat(viewingProject.budget || '0').toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-sm">
                      {viewingProject.startDate ? new Date(viewingProject.startDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <p className="text-sm">
                      {viewingProject.endDate ? new Date(viewingProject.endDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>

                {viewingProject.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{viewingProject.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tasks ({getProjectTasks(viewingProject.id || '').length})</label>
                  <div className="mt-2 space-y-2">
                    {getProjectTasks(viewingProject.id || '').length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No tasks assigned to this project.</p>
                    ) : (
                      getProjectTasks(viewingProject.id || '').map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {task.status || 'todo'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingProject(null)}>
                Close
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (viewingProject) {
                      setViewingProject(null);
                      // Delete functionality will be handled by the existing AlertDialog in dropdown
                      // For now, we'll trigger the existing delete process
                      const deleteProject = async () => {
                        try {
                          const response = await fetch(`/api/projects/${viewingProject.id}`, {
                            method: 'DELETE'
                          });
                          if (response.ok) {
                            // Refresh projects list
                            window.location.reload();
                          }
                        } catch (error) {
                          console.error('Failed to delete project:', error);
                        }
                      };

                      if (confirm(`Are you sure you want to delete "${viewingProject.name}"? This action cannot be undone.`)) {
                        deleteProject();
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={() => {
                  if (viewingProject) {
                    setViewingProject(null);
                    setEditingProject(viewingProject);
                  }
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}