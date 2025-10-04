import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSprintSchema, insertUserStorySchema } from "@shared/schema";
import type { Product, Sprint, UserStory, InsertSprint, InsertUserStory } from "@shared/schema";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Users,
  Edit,
  Trash2,
  PlayCircle,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Sprint Form Schema
const sprintFormSchema = insertSprintSchema.pick({
  name: true,
  goal: true,
  startDate: true,
  endDate: true,
  status: true,
  capacity: true,
  productId: true,
});

type SprintFormData = z.infer<typeof sprintFormSchema>;

// User Story Form Schema
const userStoryFormSchema = insertUserStorySchema.pick({
  title: true,
  asA: true,
  iWant: true,
  soThat: true,
  status: true,
  priority: true,
  storyPoints: true,
  productId: true,
  featureId: true,
  epicId: true,
  sprintId: true,
});

type UserStoryFormData = z.infer<typeof userStoryFormSchema>;

// Sprint Form Component
function SprintForm({
  sprint,
  productId,
  onSuccess
}: {
  sprint?: Sprint;
  productId: string;
  onSuccess: () => void
}) {
  const { toast } = useToast();

  const form = useForm<SprintFormData>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues: {
      name: sprint?.name || "",
      goal: sprint?.goal || "",
      startDate: sprint?.startDate ? new Date(sprint.startDate) : undefined,
      endDate: sprint?.endDate ? new Date(sprint.endDate) : undefined,
      status: sprint?.status || "planning",
      capacity: sprint?.capacity || undefined,
      productId: productId,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSprint) => {
      const response = await apiRequest("POST", "/api/sprints", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/sprints`] });
      toast({ title: "Sprint created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create sprint",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertSprint>) => {
      const response = await apiRequest("PATCH", `/api/sprints/${sprint?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/sprints`] });
      toast({ title: "Sprint updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update sprint",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SprintFormData) => {
    if (sprint) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as InsertSprint);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sprint Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Sprint 23" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sprint Goal</FormLabel>
              <FormControl>
                <Textarea placeholder="What is the main objective of this sprint?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
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
                  <Input
                    type="date"
                    {...field}
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
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
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (Story Points)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 40"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {sprint ? "Update Sprint" : "Create Sprint"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// User Story Form Component
function UserStoryForm({
  story,
  productId,
  onSuccess
}: {
  story?: UserStory;
  productId: string;
  onSuccess: () => void
}) {
  const { toast } = useToast();

  const form = useForm<UserStoryFormData>({
    resolver: zodResolver(userStoryFormSchema),
    defaultValues: {
      title: story?.title || "",
      asA: story?.asA || "",
      iWant: story?.iWant || "",
      soThat: story?.soThat || "",
      status: story?.status || "backlog",
      priority: story?.priority || "medium",
      storyPoints: story?.storyPoints || undefined,
      productId: productId,
      featureId: story?.featureId || undefined,
      epicId: story?.epicId || undefined,
      sprintId: story?.sprintId || undefined,
    },
  });

  // Fetch sprints for dropdown
  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: [`/api/products/${productId}/sprints`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertUserStory) => {
      const response = await apiRequest("POST", "/api/stories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/sprints`] });
      toast({ title: "User story created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertUserStory>) => {
      const response = await apiRequest("PATCH", `/api/stories/${story?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      if (story?.sprintId) {
        queryClient.invalidateQueries({ queryKey: [`/api/sprints/${story.sprintId}/stories`] });
      }
      toast({ title: "User story updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserStoryFormData) => {
    // Convert "none" to undefined for optional fields
    const cleanedData = {
      ...data,
      sprintId: data.sprintId && data.sprintId !== "none" ? data.sprintId : undefined,
    };

    if (story) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData as InsertUserStory);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Story Title</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the story" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="asA"
            render={({ field }) => (
              <FormItem>
                <FormLabel>As a...</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., power user, admin, visitor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="iWant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I want...</FormLabel>
                <FormControl>
                  <Textarea placeholder="What do you want to do?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="soThat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>So that...</FormLabel>
                <FormControl>
                  <Textarea placeholder="Why is this valuable?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
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

          <FormField
            control={form.control}
            name="storyPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Story Points</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select points" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="13">13</SelectItem>
                    <SelectItem value="21">21</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="sprintId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sprint (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sprint" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Sprint (Backlog)</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {story ? "Update Story" : "Create Story"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Sprint status configuration
const SPRINT_STATUSES = {
  planning: { label: "Planning", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: Clock },
  active: { label: "Active", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: Target },
};

// Story status configuration (reuse from ProductDetail)
const STORY_STATUSES = {
  backlog: { label: "Backlog", column: "backlog" },
  planned: { label: "Planned", column: "todo" },
  in_progress: { label: "In Progress", column: "in_progress" },
  in_review: { label: "In Review", column: "review" },
  completed: { label: "Completed", column: "done" },
  cancelled: { label: "Cancelled", column: "backlog" },
};

// Main Sprint Board Component
export default function SprintBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/product/:productId/sprints");
  const productId = params?.productId || "";

  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null);

  // Fetch product
  const { data: product } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  // Fetch sprints
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: [`/api/products/${productId}/sprints`],
    enabled: !!productId,
  });

  // Fetch stories for selected sprint
  const { data: stories = [] } = useQuery<UserStory[]>({
    queryKey: [`/api/sprints/${selectedSprint}/stories`],
    enabled: !!selectedSprint,
  });

  // Delete sprint mutation
  const deleteSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      await apiRequest("DELETE", `/api/sprints/${sprintId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/sprints`] });
      toast({ title: "Sprint deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete sprint",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete story mutation
  const deleteStoryMutation = useMutation({
    mutationFn: async (storyId: string) => {
      await apiRequest("DELETE", `/api/stories/${storyId}`);
    },
    onSuccess: () => {
      if (selectedSprint) {
        queryClient.invalidateQueries({ queryKey: [`/api/sprints/${selectedSprint}/stories`] });
      }
      toast({ title: "User story deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update story status mutation (for drag-and-drop)
  const updateStoryStatusMutation = useMutation({
    mutationFn: async ({ storyId, status }: { storyId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/stories/${storyId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      if (selectedSprint) {
        queryClient.invalidateQueries({ queryKey: [`/api/sprints/${selectedSprint}/stories`] });
      }
      toast({ title: "Story status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update story status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Drag-and-drop handlers
  const [draggedStory, setDraggedStory] = useState<UserStory | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (story: UserStory) => {
    setDraggedStory(story);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedStory) return;

    // Map column to status
    const statusMap: Record<string, string> = {
      backlog: "backlog",
      todo: "planned",
      in_progress: "in_progress",
      review: "in_review",
      done: "completed",
    };

    const newStatus = statusMap[columnKey];

    if (newStatus && draggedStory.status !== newStatus) {
      updateStoryStatusMutation.mutate({
        storyId: draggedStory.id,
        status: newStatus,
      });
    }

    setDraggedStory(null);
  };

  // Auto-select first active or planning sprint
  useEffect(() => {
    if (!selectedSprint && sprints.length > 0) {
      const activeSprint = sprints.find(s => s.status === "active") || sprints.find(s => s.status === "planning") || sprints[0];
      if (activeSprint) {
        setSelectedSprint(activeSprint.id);
      }
    }
  }, [sprints, selectedSprint]);

  const activeSprint = sprints.find(s => s.id === selectedSprint);

  // Group stories by column
  const columns = {
    backlog: stories.filter(s => s.status === "backlog" || s.status === "cancelled"),
    todo: stories.filter(s => s.status === "planned"),
    in_progress: stories.filter(s => s.status === "in_progress"),
    review: stories.filter(s => s.status === "in_review"),
    done: stories.filter(s => s.status === "completed"),
  };

  const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const completedPoints = columns.done.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const progressPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // Capacity calculations
  const capacity = activeSprint?.capacity || 0;
  const capacityUtilization = capacity > 0 ? (totalPoints / capacity) * 100 : 0;
  const isOverCapacity = totalPoints > capacity && capacity > 0;
  const isNearCapacity = capacityUtilization >= 90 && capacityUtilization <= 100;
  const remainingCapacity = capacity - totalPoints;

  // Sprint progress calculations
  const inProgressPoints = columns.in_progress.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const reviewPoints = columns.review.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const todoPoints = columns.todo.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const backlogPoints = columns.backlog.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  // Get capacity status color
  const getCapacityStatusColor = () => {
    if (!capacity) return "bg-gray-100 text-gray-800";
    if (isOverCapacity) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (isNearCapacity) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  };

  // Burndown chart data calculation
  const getBurndownData = () => {
    if (!activeSprint) return [];

    const startDate = new Date(activeSprint.startDate);
    const endDate = new Date(activeSprint.endDate);
    const today = new Date();

    // Calculate total days in sprint
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.min(
      Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      totalDays
    );

    // Generate burndown data
    const data = [];
    for (let day = 0; day <= totalDays; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);

      // Ideal burndown: linear from totalPoints to 0
      const idealRemaining = totalPoints - (totalPoints / totalDays) * day;

      // Actual remaining: total - completed (simplified - in real app would track daily)
      // For now, we'll show current state at current day
      let actualRemaining = totalPoints;
      if (day === daysPassed) {
        actualRemaining = totalPoints - completedPoints;
      } else if (day > daysPassed) {
        actualRemaining = null; // Future days
      } else {
        // Past days - interpolate for demo (in real app, would have historical data)
        const progressRate = completedPoints / Math.max(daysPassed, 1);
        actualRemaining = totalPoints - (progressRate * day);
      }

      data.push({
        day: day,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ideal: Math.max(0, Math.round(idealRemaining)),
        actual: actualRemaining !== null ? Math.max(0, Math.round(actualRemaining)) : null,
      });
    }

    return data;
  };

  const burndownData = getBurndownData();

  // Sprint health assessment
  const getSprintHealth = () => {
    if (!activeSprint || totalPoints === 0) return { status: "unknown", message: "", color: "gray" };

    const startDate = new Date(activeSprint.startDate);
    const endDate = new Date(activeSprint.endDate);
    const today = new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, totalDays - daysPassed);

    const expectedProgress = (daysPassed / totalDays) * 100;
    const actualProgress = progressPercentage;
    const variance = actualProgress - expectedProgress;

    // Determine health status
    if (actualProgress >= 100) {
      return {
        status: "complete",
        message: "Sprint complete! 🎉",
        color: "green",
        recommendations: ["Review sprint retrospective", "Plan next sprint"]
      };
    }

    if (variance >= 10) {
      return {
        status: "ahead",
        message: `${Math.round(variance)}% ahead of schedule`,
        color: "green",
        recommendations: ["Consider adding more stories", "Maintain current pace"]
      };
    }

    if (variance <= -20) {
      return {
        status: "at-risk",
        message: `${Math.round(Math.abs(variance))}% behind schedule`,
        color: "red",
        recommendations: [
          "Remove low-priority stories",
          "Request additional resources",
          "Identify and resolve blockers"
        ]
      };
    }

    if (variance <= -10) {
      return {
        status: "behind",
        message: `${Math.round(Math.abs(variance))}% behind schedule`,
        color: "yellow",
        recommendations: [
          "Review story complexity",
          "Check for blockers",
          "Consider scope adjustment"
        ]
      };
    }

    return {
      status: "on-track",
      message: "On track",
      color: "green",
      recommendations: ["Maintain current velocity", "Monitor for blockers"]
    };
  };

  const sprintHealth = getSprintHealth();

  return (
    <Layout
      title={product?.name || "Sprint Board"}
      subtitle="Manage sprints and track user stories"
      icon={Calendar}
      user={user}
    >
      {/* Back Button */}
      <div className="mb-4">
        <Link href={`/product/${productId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Product
          </Button>
        </Link>
      </div>

      {/* Sprint Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 flex-1">
          <Select value={selectedSprint || ""} onValueChange={setSelectedSprint}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((sprint) => {
                const status = SPRINT_STATUSES[sprint.status as keyof typeof SPRINT_STATUSES];
                const StatusIcon = status.icon;
                return (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" />
                      <span>{sprint.name}</span>
                      <Badge className={`${status.color} text-xs ml-2`}>{status.label}</Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {activeSprint && (
            <>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{completedPoints} / {totalPoints} pts ({progressPercentage}%)</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSprint(activeSprint);
                    setIsSprintDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Sprint
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete sprint "${activeSprint.name}"? All stories will be unassigned from this sprint.`)) {
                      deleteSprintMutation.mutate(activeSprint.id);
                      setSelectedSprint(null);
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <Dialog open={isSprintDialogOpen} onOpenChange={(open) => {
          setIsSprintDialogOpen(open);
          if (!open) setEditingSprint(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Sprint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSprint ? "Edit Sprint" : "Create New Sprint"}</DialogTitle>
            </DialogHeader>
            <SprintForm
              sprint={editingSprint || undefined}
              productId={productId}
              onSuccess={() => {
                setIsSprintDialogOpen(false);
                setEditingSprint(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Sprint Goal Card */}
      {activeSprint && activeSprint.goal && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Sprint Goal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300">{activeSprint.goal}</p>
          </CardContent>
        </Card>
      )}

      {/* Sprint Metrics Card */}
      {activeSprint && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-base">Sprint Metrics</CardTitle>
              </div>
              <div className="flex gap-2">
                {isOverCapacity && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Over Capacity
                  </Badge>
                )}
                {isNearCapacity && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Near Capacity
                  </Badge>
                )}
                {sprintHealth.status === "ahead" && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Ahead of Schedule
                  </Badge>
                )}
                {sprintHealth.status === "at-risk" && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    At Risk
                  </Badge>
                )}
                {sprintHealth.status === "behind" && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                    Behind Schedule
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Capacity Utilization */}
              {capacity > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Capacity Utilization</span>
                    <span className="text-sm font-semibold">
                      {totalPoints} / {capacity} pts ({Math.round(capacityUtilization)}%)
                    </span>
                  </div>
                  <Progress value={Math.min(capacityUtilization, 100)} className="h-2" />
                  {isOverCapacity && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      ⚠️ Sprint is {Math.abs(remainingCapacity)} points over capacity
                    </p>
                  )}
                  {isNearCapacity && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      ⚠️ Sprint is at {Math.round(capacityUtilization)}% capacity
                    </p>
                  )}
                  {!isOverCapacity && !isNearCapacity && capacity > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ {remainingCapacity} points remaining in sprint capacity
                    </p>
                  )}
                </div>
              )}

              {/* Sprint Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Sprint Progress</span>
                  <span className="text-sm font-semibold">
                    {completedPoints} / {totalPoints} pts ({progressPercentage}%)
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className={`text-xs mt-1 ${
                  sprintHealth.color === "green" ? "text-green-600 dark:text-green-400" :
                  sprintHealth.color === "yellow" ? "text-yellow-600 dark:text-yellow-400" :
                  sprintHealth.color === "red" ? "text-red-600 dark:text-red-400" :
                  "text-gray-600"
                }`}>
                  {sprintHealth.message}
                </p>
              </div>

              {/* Story Points Breakdown */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-500">{backlogPoints}</div>
                  <div className="text-xs text-gray-500">Backlog</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{todoPoints}</div>
                  <div className="text-xs text-gray-500">To Do</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{inProgressPoints}</div>
                  <div className="text-xs text-gray-500">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{reviewPoints}</div>
                  <div className="text-xs text-gray-500">Review</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{completedPoints}</div>
                  <div className="text-xs text-gray-500">Done</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Burndown Chart & Recommendations */}
      {activeSprint && burndownData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Burndown Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Sprint Burndown</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Ideal"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Actual"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sprint Health & Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-base">Sprint Health</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className={`text-3xl font-bold mb-2 ${
                    sprintHealth.color === "green" ? "text-green-600" :
                    sprintHealth.color === "yellow" ? "text-yellow-600" :
                    sprintHealth.color === "red" ? "text-red-600" :
                    "text-gray-600"
                  }`}>
                    {sprintHealth.status === "complete" ? "✓" :
                     sprintHealth.status === "ahead" ? "↑" :
                     sprintHealth.status === "on-track" ? "→" :
                     sprintHealth.status === "behind" ? "↓" : "!"}
                  </div>
                  <p className="text-sm font-semibold">{sprintHealth.message}</p>
                </div>

                {sprintHealth.recommendations && sprintHealth.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {sprintHealth.recommendations.map((rec, index) => (
                        <li key={index} className="text-xs flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {selectedSprint ? (
        <div className="grid grid-cols-5 gap-4">
          {/* Backlog Column */}
          <Card
            className={`transition-colors ${dragOverColumn === 'backlog' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'backlog')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'backlog')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Backlog</span>
                <Badge variant="outline">{columns.backlog.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {columns.backlog.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => {
                    setEditingStory(story);
                    setIsStoryDialogOpen(true);
                  }}
                  onDelete={() => deleteStoryMutation.mutate(story.id)}
                  onDragStart={() => handleDragStart(story)}
                />
              ))}
              {columns.backlog.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No stories</p>
              )}
            </CardContent>
          </Card>

          {/* To Do Column */}
          <Card
            className={`transition-colors ${dragOverColumn === 'todo' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'todo')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'todo')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>To Do</span>
                <Badge variant="outline">{columns.todo.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {columns.todo.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => {
                    setEditingStory(story);
                    setIsStoryDialogOpen(true);
                  }}
                  onDelete={() => deleteStoryMutation.mutate(story.id)}
                  onDragStart={() => handleDragStart(story)}
                />
              ))}
              {columns.todo.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No stories</p>
              )}
            </CardContent>
          </Card>

          {/* In Progress Column */}
          <Card
            className={`transition-colors ${dragOverColumn === 'in_progress' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'in_progress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'in_progress')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>In Progress</span>
                <Badge variant="outline">{columns.in_progress.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {columns.in_progress.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => {
                    setEditingStory(story);
                    setIsStoryDialogOpen(true);
                  }}
                  onDelete={() => deleteStoryMutation.mutate(story.id)}
                  onDragStart={() => handleDragStart(story)}
                />
              ))}
              {columns.in_progress.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No stories</p>
              )}
            </CardContent>
          </Card>

          {/* Review Column */}
          <Card
            className={`transition-colors ${dragOverColumn === 'review' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'review')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'review')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Review</span>
                <Badge variant="outline">{columns.review.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {columns.review.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => {
                    setEditingStory(story);
                    setIsStoryDialogOpen(true);
                  }}
                  onDelete={() => deleteStoryMutation.mutate(story.id)}
                  onDragStart={() => handleDragStart(story)}
                />
              ))}
              {columns.review.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No stories</p>
              )}
            </CardContent>
          </Card>

          {/* Done Column */}
          <Card
            className={`transition-colors ${dragOverColumn === 'done' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Done</span>
                <Badge variant="outline">{columns.done.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {columns.done.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => {
                    setEditingStory(story);
                    setIsStoryDialogOpen(true);
                  }}
                  onDelete={() => deleteStoryMutation.mutate(story.id)}
                  onDragStart={() => handleDragStart(story)}
                />
              ))}
              {columns.done.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No stories</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No sprints yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first sprint to start planning
            </p>
            <Button onClick={() => setIsSprintDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Sprint
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Story Dialog */}
      <Dialog open={isStoryDialogOpen} onOpenChange={setIsStoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingStory ? "Edit User Story" : "Create New User Story"}</DialogTitle>
          </DialogHeader>
          <UserStoryForm
            story={editingStory || undefined}
            productId={productId}
            onSuccess={() => {
              setIsStoryDialogOpen(false);
              setEditingStory(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// Story Card Component (enhanced for Kanban with drag-and-drop)
function StoryCard({
  story,
  onEdit,
  onDelete,
  onDragStart,
}: {
  story: UserStory;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      className="p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-medium flex-1 cursor-pointer" onClick={onEdit}>{story.title}</p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this user story?")) {
                onDelete();
              }
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {story.asA && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-1">
          As a {story.asA}
        </p>
      )}
      <div className="flex items-center justify-between">
        {story.storyPoints && (
          <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
            {story.storyPoints} pts
          </span>
        )}
        {story.assignedTo && (
          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
            {story.assignedTo.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
