import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import type { Task, InsertTask, Project, User, Company } from "@shared/schema";
import { useTableSort, SortConfig } from "@/hooks/useTableSort";
import { SortableTableHead } from "@/components/SortableHeader";
import { z } from "zod";
import { 
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Calendar,
  User as UserIcon,
  FolderOpen,
  Timer,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Table,
  LayoutGrid
} from "lucide-react";

// Form validation schema for task creation/editing
const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// Status configuration with colors for kanban headers
const statusConfig = [
  { key: "todo", label: "To Do", color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100" },
  { key: "blocked", label: "Blocked", color: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100" },
  { key: "review", label: "Review", color: "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100" },
  { key: "completed", label: "Completed", color: "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100" },
];

// Helper functions for status and priority styling
const getStatusBadge = (status: string) => {
  const statusItem = statusConfig.find(s => s.key === status);
  if (statusItem) {
    return statusItem.color;
  }
  // Fallback for any status not in statusConfig
  const styles = {
    blocked: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100",
  };
  return styles[status as keyof typeof styles] || statusConfig[0].color; // Default to todo color
};

const getPriorityBadge = (priority: string) => {
  const styles = {
    low: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    medium: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    high: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
    urgent: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
  };
  return styles[priority as keyof typeof styles] || styles.medium;
};

const getStatusIcon = (status: string) => {
  const icons = {
    todo: Clock,
    in_progress: Play,
    review: RotateCcw,
    completed: CheckCircle2,
  };
  const Icon = icons[status as keyof typeof icons] || Clock;
  return <Icon className="h-4 w-4" />;
};

const isOverdue = (dueDate: string | Date | null) => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  return due < today && due.toDateString() !== today.toDateString();
};

// Task Form Component
function TaskForm({ task, onSuccess }: { task?: Task; onSuccess: () => void }) {
  const { toast } = useToast();
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      projectId: task?.projectId || "",
      assignedTo: task?.assignedTo || "",
      status: task?.status || "todo",
      priority: task?.priority || "medium",
      estimatedHours: task?.estimatedHours ? String(task.estimatedHours) : "",
      actualHours: task?.actualHours ? String(task.actualHours) : "",
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      tags: task?.tags || [],
    },
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch users for assignee dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertTask>) => {
      const response = await apiRequest("PUT", `/api/tasks/${task?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    const submitData: InsertTask = {
      title: data.title,
      description: data.description || null,
      projectId: data.projectId && data.projectId.trim() !== "" ? data.projectId : null,
      assignedTo: data.assignedTo && data.assignedTo.trim() !== "" ? data.assignedTo : null,
      createdBy: null, // Will be set by backend
      status: data.status || "todo",
      priority: data.priority || "medium",
      estimatedHours: data.estimatedHours && data.estimatedHours.trim() !== "" ? data.estimatedHours : null,
      actualHours: data.actualHours && data.actualHours.trim() !== "" ? data.actualHours : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      completedAt: null,
      tags: data.tags || null,
    };

    if (task) {
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
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Task Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Update website navigation" {...field} data-testid="input-task-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detailed description of the task..." {...field} data-testid="textarea-task-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
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
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assignee</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-assignee">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users?.map((user) => (
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
                    <SelectTrigger data-testid="select-task-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
                    <SelectTrigger data-testid="select-task-priority">
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
            name="estimatedHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.5" placeholder="8.0" {...field} data-testid="input-task-estimated-hours" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actualHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.5" placeholder="6.5" {...field} data-testid="input-task-actual-hours" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-task-due-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading} data-testid="button-save-task">
            {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Main Tasks Page Component
export default function Tasks() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Fetch tasks
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  // Fetch projects and users for display
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });

  // Handle authentication errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view tasks.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (authLoading || isLoading) {
    return (
      <Layout title="Task Management">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title="Task Management">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Please log in to view and manage tasks.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Filter tasks based on search and filters
  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesProject = projectFilter === "all" || task.projectId === projectFilter;
    const matchesAssignee = assigneeFilter === "all" || task.assignedTo === assigneeFilter;

    // For company filtering, we need to look up the project details
    let matchesCompany = true;

    if (companyFilter !== "all") {
      const project = projects?.find(p => p.id === task.projectId);
      if (project) {
        matchesCompany = companyFilter === "all" || project.companyId === companyFilter;
      } else {
        // If task has no project, it doesn't match specific company filters
        matchesCompany = companyFilter === "all";
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee && matchesCompany;
  }) || [];

  // Sorting configuration
  const sortConfigs: SortConfig[] = [
    { key: 'title', type: 'string' },
    {
      key: 'status',
      type: 'custom',
      customOrder: { todo: 0, in_progress: 1, blocked: 2, review: 3, completed: 4 }
    },
    {
      key: 'priority',
      type: 'custom',
      customOrder: { low: 0, medium: 1, high: 2 }
    },
    {
      key: 'project',
      type: 'string',
      accessor: (task: Task) => projects?.find(p => p.id === task.projectId)?.name || ''
    },
    {
      key: 'assignee',
      type: 'string',
      accessor: (task: Task) => {
        const user = users?.find(u => u.id === task.assignedTo);
        return user ? `${user.firstName} ${user.lastName}` : '';
      }
    },
    { key: 'dueDate', type: 'date' },
    {
      key: 'hours',
      type: 'number',
      accessor: (task: Task) => parseFloat(task.actualHours?.toString() || '0')
    }
  ];

  const { sortedData: sortedTasks, sortState, handleSort } = useTableSort(filteredTasks, sortConfigs);

  // Calculate stats
  const totalTasks = tasks?.length || 0;
  const activeTasks = tasks?.filter(t => t.status !== "completed").length || 0;
  const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
  const overdueTasks = tasks?.filter(t => t.dueDate && isOverdue(t.dueDate) && t.status !== "completed").length || 0;
  const totalEstimatedHours = tasks?.reduce((sum, t) => sum + (parseFloat(t.estimatedHours || "0")), 0) || 0;
  const totalActualHours = tasks?.reduce((sum, t) => sum + (parseFloat(t.actualHours || "0")), 0) || 0;

  // Helper functions to get related data
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "No Project";
    const project = projects?.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return "Unassigned";
    const user = users?.find(u => u.id === assigneeId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "No Company";
    const company = companies?.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingTask(null);
  };

  return (
    <Layout title="Task Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-page-title">
              Task Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and track your team's tasks and progress
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-task">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <TaskForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-tasks">{activeTasks}</div>
              <p className="text-xs text-muted-foreground">
                {totalTasks > 0 ? `${Math.round((activeTasks / totalTasks) * 100)}% of total` : "No tasks"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-tasks">{completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% completion rate` : "No tasks"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-overdue-tasks">{overdueTasks}</div>
              <p className="text-xs text-muted-foreground">
                {overdueTasks > 0 ? "Requires attention" : "All tasks on time"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Tracked</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-hours">{totalActualHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                {totalEstimatedHours > 0 ? `${totalEstimatedHours.toFixed(1)}h estimated` : "No estimates"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-tasks"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-priority">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-project">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-assignee">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-company">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="flex justify-end gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <Table className="h-4 w-4" />
            Table
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
        </div>

        {/* Tasks Views */}
        {viewMode === "table" ? (
          <div className="border rounded-lg">
            <TableComponent>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    column="title"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Task
                  </SortableTableHead>
                  <SortableTableHead
                    column="status"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Status
                  </SortableTableHead>
                  <SortableTableHead
                    column="priority"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Priority
                  </SortableTableHead>
                  <SortableTableHead
                    column="project"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Project
                  </SortableTableHead>
                  <SortableTableHead
                    column="assignee"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Assignee
                  </SortableTableHead>
                  <SortableTableHead
                    column="dueDate"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Due Date
                  </SortableTableHead>
                  <SortableTableHead
                    column="hours"
                    currentSort={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  >
                    Hours
                  </SortableTableHead>
                  <th className="w-[50px] p-2">Actions</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.map((task) => (
                  <TableRow key={task.id} className={isOverdue(task.dueDate) && task.status !== "completed" ? "bg-red-50 dark:bg-red-950" : ""}>
                    <TableCell>
                      <div>
                        <div
                          className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                          data-testid={`text-task-title-${task.id}`}
                          onClick={() => setViewingTask(task)}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1" data-testid={`text-task-description-${task.id}`}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(task.status || "todo")} data-testid={`badge-status-${task.id}`}>
                        {getStatusIcon(task.status || "todo")}
                        <span className="ml-1 capitalize">{task.status?.replace("_", " ")}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadge(task.priority || "medium")} data-testid={`badge-priority-${task.id}`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-task-project-${task.id}`}>{getProjectName(task.projectId)}</TableCell>
                    <TableCell data-testid={`text-task-assignee-${task.id}`}>{getAssigneeName(task.assignedTo)}</TableCell>
                    <TableCell>
                      {task.dueDate && (
                        <div className={`${isOverdue(task.dueDate) && task.status !== "completed" ? "text-red-600 dark:text-red-400 font-medium" : ""}`} data-testid={`text-task-due-date-${task.id}`}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-task-hours-${task.id}`}>
                      {(task.estimatedHours || task.actualHours) && (
                        <span>{task.actualHours || 0}h / {task.estimatedHours || 0}h</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-task-menu-${task.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTask(task)} data-testid={`button-edit-task-${task.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`button-delete-task-${task.id}`}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{task.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${task.id}`}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(task.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-${task.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableComponent>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {statusConfig.map((statusItem) => {
              const statusTasks = filteredTasks.filter(task => task.status === statusItem.key);
              return (
                <div key={statusItem.key} className="flex flex-col">
                  <div className={`${statusItem.color} p-3 rounded-t-lg border-b mb-4`}>
                    <h3 className="font-semibold text-center">
                      {statusItem.label} ({statusTasks.length})
                    </h3>
                  </div>
                  <div className="space-y-3 flex-1 bg-gray-50 dark:bg-gray-800 rounded-b-lg p-2 min-h-[140px]">
                    {statusTasks.map((task) => (
                      <Card key={task.id} className={`${isOverdue(task.dueDate) && task.status !== "completed" ? "border-red-200 dark:border-red-800" : ""}`} data-testid={`card-task-${task.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle
                                className="text-sm font-semibold cursor-pointer hover:text-blue-600 hover:underline"
                                data-testid={`text-task-title-${task.id}`}
                                onClick={() => setViewingTask(task)}
                              >
                                {task.title}
                              </CardTitle>
                              {task.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2" data-testid={`text-task-description-${task.id}`}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-task-menu-${task.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingTask(task)} data-testid={`button-edit-task-${task.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`button-delete-task-${task.id}`}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{task.title}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel data-testid={`button-cancel-delete-${task.id}`}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMutation.mutate(task.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`button-confirm-delete-${task.id}`}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityBadge(task.priority || "medium")} data-testid={`badge-priority-${task.id}`}>
                              {task.priority}
                            </Badge>
                            {isOverdue(task.dueDate) && task.status !== "completed" && (
                              <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" data-testid={`badge-overdue-${task.id}`}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <FolderOpen className="h-3 w-3 mr-1" />
                              <span className="truncate" data-testid={`text-task-project-${task.id}`}>{getProjectName(task.projectId)}</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <UserIcon className="h-3 w-3 mr-1" />
                              <span className="truncate" data-testid={`text-task-assignee-${task.id}`}>{getAssigneeName(task.assignedTo)}</span>
                            </div>
                            {task.dueDate && (
                              <div className={`flex items-center ${isOverdue(task.dueDate) && task.status !== "completed" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                                <Calendar className="h-3 w-3 mr-1" />
                                <span data-testid={`text-task-due-date-${task.id}`}>{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all" || projectFilter !== "all" || assigneeFilter !== "all" || companyFilter !== "all"
                ? "Try adjusting your search criteria or filters."
                : "Get started by creating your first task."}
            </p>
            {!searchTerm && statusFilter === "all" && priorityFilter === "all" && projectFilter === "all" && assigneeFilter === "all" && companyFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-task">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Task
              </Button>
            )}
          </div>
        )}

        {/* View Task Dialog */}
        <Dialog open={!!viewingTask} onOpenChange={() => setViewingTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingTask?.title}</DialogTitle>
            </DialogHeader>
            {viewingTask && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge className={getStatusBadge(viewingTask.status || 'todo')} variant="outline">
                      {viewingTask.status ? viewingTask.status.charAt(0).toUpperCase() + viewingTask.status.slice(1) : 'To Do'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priority</label>
                    <Badge className={`mt-1 ${getPriorityBadge(viewingTask.priority || 'medium')}`}>
                      {viewingTask.priority ? viewingTask.priority.charAt(0).toUpperCase() + viewingTask.priority.slice(1) : 'Medium'}
                    </Badge>
                  </div>
                </div>

                {viewingTask.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{viewingTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <div className="flex items-center text-sm mt-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      {viewingTask.dueDate
                        ? new Date(viewingTask.dueDate).toLocaleDateString()
                        : 'No due date'
                      }
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                    <div className="flex items-center text-sm mt-1">
                      <UserIcon className="w-4 h-4 mr-2" />
                      {getAssigneeName(viewingTask.assignedTo) || 'Unassigned'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Project</label>
                    <div className="flex items-center text-sm mt-1">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      {getProjectName(viewingTask.projectId) || 'No project'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Project</label>
                    <div className="text-sm mt-1">
                      {viewingTask.projectId ? getProjectName(viewingTask.projectId) : 'No project'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <label className="font-medium">Created</label>
                    <div>{viewingTask.createdAt ? new Date(viewingTask.createdAt).toLocaleDateString() : 'Unknown'}</div>
                  </div>
                  <div>
                    <label className="font-medium">Last Updated</label>
                    <div>{viewingTask.updatedAt ? new Date(viewingTask.updatedAt).toLocaleDateString() : 'Unknown'}</div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingTask(null)}>
                Close
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (viewingTask) {
                      setViewingTask(null);
                      // Use the existing delete mutation
                      const deleteTask = async () => {
                        try {
                          const response = await fetch(`/api/tasks/${viewingTask.id}`, {
                            method: 'DELETE'
                          });
                          if (response.ok) {
                            window.location.reload();
                          }
                        } catch (error) {
                          console.error('Failed to delete task:', error);
                        }
                      };

                      if (confirm(`Are you sure you want to delete "${viewingTask.title}"? This action cannot be undone.`)) {
                        deleteTask();
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={() => {
                  if (viewingTask) {
                    setViewingTask(null);
                    setEditingTask(viewingTask);
                  }
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            {editingTask && <TaskForm task={editingTask} onSuccess={handleEditSuccess} />}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}