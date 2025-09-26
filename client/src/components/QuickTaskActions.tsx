import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import type { InsertTask, User, Project } from "@shared/schema";
import {
  Plus,
  Zap,
  Clock,
  Users,
  Calendar,
  Target,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  X
} from "lucide-react";
import { z } from "zod";

// Quick task creation schema
const quickTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
});

type QuickTaskData = z.infer<typeof quickTaskSchema>;

interface QuickTaskActionsProps {
  project: Project;
  users?: User[];
  onTaskCreated?: () => void;
  compact?: boolean;
}

// Pre-defined quick task templates organized by category
const TASK_TEMPLATES = {
  development: [
    {
      title: "Code review and feedback",
      priority: "high",
      estimatedHours: "1.5",
      description: "Review code changes and provide constructive feedback",
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    {
      title: "Setup development environment",
      priority: "medium",
      estimatedHours: "4",
      description: "Initialize project setup and development tools",
      icon: <Target className="w-4 h-4" />
    },
    {
      title: "Write unit tests",
      priority: "medium",
      estimatedHours: "3",
      description: "Create comprehensive unit tests for new features",
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    {
      title: "Deploy to staging",
      priority: "high",
      estimatedHours: "1",
      description: "Deploy latest changes to staging environment",
      icon: <ArrowRight className="w-4 h-4" />
    }
  ],
  client: [
    {
      title: "Client feedback session",
      priority: "high",
      estimatedHours: "1",
      description: "Schedule and conduct client feedback meeting",
      icon: <Users className="w-4 h-4" />
    },
    {
      title: "Prepare client presentation",
      priority: "medium",
      estimatedHours: "2",
      description: "Create presentation materials for client meeting",
      icon: <Target className="w-4 h-4" />
    },
    {
      title: "Client requirements gathering",
      priority: "high",
      estimatedHours: "2",
      description: "Collect and document detailed client requirements",
      icon: <Users className="w-4 h-4" />
    },
    {
      title: "Send project update",
      priority: "low",
      estimatedHours: "0.5",
      description: "Prepare and send weekly project update to client",
      icon: <Users className="w-4 h-4" />
    }
  ],
  planning: [
    {
      title: "Sprint planning session",
      priority: "high",
      estimatedHours: "2",
      description: "Plan tasks and goals for upcoming sprint",
      icon: <Calendar className="w-4 h-4" />
    },
    {
      title: "Risk assessment review",
      priority: "medium",
      estimatedHours: "1.5",
      description: "Identify and document potential project risks",
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      title: "Update project timeline",
      priority: "medium",
      estimatedHours: "1",
      description: "Review and adjust project milestones and deadlines",
      icon: <Calendar className="w-4 h-4" />
    },
    {
      title: "Team capacity planning",
      priority: "low",
      estimatedHours: "1",
      description: "Assess team availability and workload distribution",
      icon: <Users className="w-4 h-4" />
    }
  ],
  documentation: [
    {
      title: "Update project documentation",
      priority: "low",
      estimatedHours: "2",
      description: "Review and update project documentation and README",
      icon: <Target className="w-4 h-4" />
    },
    {
      title: "Create API documentation",
      priority: "medium",
      estimatedHours: "3",
      description: "Document API endpoints and usage examples",
      icon: <Target className="w-4 h-4" />
    },
    {
      title: "Write user manual",
      priority: "medium",
      estimatedHours: "4",
      description: "Create comprehensive user guide and tutorials",
      icon: <Target className="w-4 h-4" />
    },
    {
      title: "Update changelog",
      priority: "low",
      estimatedHours: "0.5",
      description: "Document recent changes and version updates",
      icon: <Target className="w-4 h-4" />
    }
  ]
};

// Legacy template support
const QUICK_TASK_TEMPLATES = [
  ...TASK_TEMPLATES.development.slice(0, 2),
  ...TASK_TEMPLATES.client.slice(0, 1),
  ...TASK_TEMPLATES.planning.slice(0, 1)
];

export function QuickTaskActions({ project, users, onTaskCreated, compact = false }: QuickTaskActionsProps) {
  const { toast } = useToast();
  const [isQuickMode, setIsQuickMode] = useState(true);
  const [quickTitle, setQuickTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof TASK_TEMPLATES>("development");
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const form = useForm<QuickTaskData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      priority: "medium",
      dueDate: "",
      estimatedHours: "",
    },
  });

  // Quick task creation mutation
  const createQuickTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const taskData: InsertTask = {
        title: title.trim(),
        description: null,
        projectId: project.id,
        assignedTo: null,
        createdBy: null, // Will be set by backend
        status: "todo",
        priority: "medium",
        estimatedHours: null,
        actualHours: null,
        dueDate: null,
        completedAt: null,
        tags: null,
      };

      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      toast({
        title: "Task Created",
        description: `"${newTask.title}" added to ${project.name}`,
      });

      setQuickTitle("");
      if (onTaskCreated) {
        onTaskCreated();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Full task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: QuickTaskData) => {
      const taskData: InsertTask = {
        title: data.title,
        description: data.description || null,
        projectId: project.id,
        assignedTo: data.assignedTo || null,
        createdBy: null,
        status: "todo",
        priority: data.priority || "medium",
        estimatedHours: data.estimatedHours || null,
        actualHours: null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: null,
        tags: null,
      };

      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      toast({
        title: "Task Created",
        description: `"${newTask.title}" added to ${project.name}`,
      });

      form.reset();
      setIsDialogOpen(false);
      if (onTaskCreated) {
        onTaskCreated();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Template task creation with enhanced metadata
  const createFromTemplate = (template: any) => {
    const taskData: InsertTask = {
      title: template.title,
      description: template.description || null,
      projectId: project.id,
      assignedTo: null,
      createdBy: null,
      status: "todo",
      priority: template.priority,
      estimatedHours: template.estimatedHours,
      actualHours: null,
      dueDate: null,
      completedAt: null,
      tags: null,
    };

    // Use the full task creation mutation to include description
    createTaskMutation.mutate({
      title: template.title,
      description: template.description || "",
      assignedTo: "",
      priority: template.priority,
      estimatedHours: template.estimatedHours,
      dueDate: "",
    });
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    createQuickTaskMutation.mutate(quickTitle);
  };

  const handleFullSubmit = (data: QuickTaskData) => {
    createTaskMutation.mutate(data);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="w-3 h-3" />
            Quick Task
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Add Task to {project.name}</h4>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-2">
              <Input
                placeholder="Enter task title..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                disabled={createQuickTaskMutation.isPending}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!quickTitle.trim() || createQuickTaskMutation.isPending}
                  className="flex-1"
                >
                  {createQuickTaskMutation.isPending ? "Creating..." : "Add Task"}
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      More Options
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Task for {project.name}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleFullSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Title *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter task title..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Task description..." {...field} rows={3} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="assignedTo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assignee</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Unassigned" />
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
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Medium" />
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
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
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
                                  <Input type="number" step="0.5" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createTaskMutation.isPending}
                          >
                            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </form>

            {/* Quick Templates */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Quick templates:</p>
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as keyof typeof TASK_TEMPLATES)}>
                  <SelectTrigger className="w-24 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Dev</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="planning">Plan</SelectItem>
                    <SelectItem value="documentation">Docs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                {TASK_TEMPLATES[selectedCategory].slice(0, 3).map((template, index) => (
                  <button
                    key={index}
                    onClick={() => createFromTemplate(template)}
                    disabled={createTaskMutation.isPending}
                    className="w-full text-left p-2 text-xs rounded border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title={template.description}
                  >
                    {template.icon}
                    <span className="flex-1 truncate">{template.title}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{template.estimatedHours}h</span>
                      <Badge className={getPriorityColor(template.priority)} variant="outline">
                        {template.priority}
                      </Badge>
                    </div>
                  </button>
                ))}
                {TASK_TEMPLATES[selectedCategory].length > 3 && (
                  <button
                    onClick={() => setShowAllTemplates(true)}
                    className="w-full text-center p-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    +{TASK_TEMPLATES[selectedCategory].length - 3} more templates
                  </button>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full view for project detail pages
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Quick Task Actions
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickMode(true)}
            className={`px-2 py-1 text-xs rounded ${
              isQuickMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Quick
          </button>
          <button
            onClick={() => setIsQuickMode(false)}
            className={`px-2 py-1 text-xs rounded ${
              !isQuickMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      {isQuickMode ? (
        <div className="space-y-3">
          <form onSubmit={handleQuickSubmit} className="flex gap-2">
            <Input
              placeholder="Add a quick task..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              disabled={createQuickTaskMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!quickTitle.trim() || createQuickTaskMutation.isPending}
            >
              {createQuickTaskMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Template Category</Label>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as keyof typeof TASK_TEMPLATES)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="client">Client Work</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {TASK_TEMPLATES[selectedCategory].map((template, index) => (
                <button
                  key={index}
                  onClick={() => createFromTemplate(template)}
                  disabled={createTaskMutation.isPending}
                  className="p-3 text-left rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  title={template.description}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      {template.icon}
                      <div className="flex-1">
                        <span className="font-medium text-sm block">{template.title}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(template.priority)} variant="outline">
                        {template.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{template.estimatedHours}h</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFullSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter detailed task title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed task description..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                      <Input type="number" step="0.5" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="gap-2"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}