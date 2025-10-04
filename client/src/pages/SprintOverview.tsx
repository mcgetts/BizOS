import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
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
import { insertSprintSchema } from "@shared/schema";
import type { Product, Sprint, UserStory, InsertSprint } from "@shared/schema";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

// Sprint status configuration
const SPRINT_STATUSES = {
  planning: { label: "Planning", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: Clock },
  active: { label: "Active", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: Target },
};

// Sprint Card Component with Metrics
function SprintCard({
  sprint,
  stories,
  onEdit,
  onDelete,
  onClick
}: {
  sprint: Sprint;
  stories: UserStory[];
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const status = SPRINT_STATUSES[sprint.status as keyof typeof SPRINT_STATUSES] || SPRINT_STATUSES.planning;
  const StatusIcon = status.icon;

  // Calculate metrics
  const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const completedPoints = stories.filter(s => s.status === "completed").reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const progressPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const capacity = sprint.capacity || 0;
  const capacityUtilization = capacity > 0 ? (totalPoints / capacity) * 100 : 0;
  const isOverCapacity = totalPoints > capacity && capacity > 0;
  const isNearCapacity = capacityUtilization >= 90 && capacityUtilization <= 100;

  // Calculate days remaining
  const now = new Date();
  const endDate = new Date(sprint.endDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isEnding = daysRemaining > 0 && daysRemaining <= 3;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-lg">{sprint.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>
              {status.label}
            </Badge>
            {isOverCapacity && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Over
              </Badge>
            )}
            {isEnding && sprint.status === "active" && (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                <Clock className="w-3 h-3 mr-1" />
                {daysRemaining}d
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Dates */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
          </div>

          {/* Goal */}
          {sprint.goal && (
            <p className="text-sm line-clamp-2 text-gray-700 dark:text-gray-300">{sprint.goal}</p>
          )}

          {/* Capacity */}
          {capacity > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Capacity</span>
                <span className="font-semibold">
                  {totalPoints} / {capacity} pts ({Math.round(capacityUtilization)}%)
                </span>
              </div>
              <Progress value={Math.min(capacityUtilization, 100)} className="h-1.5" />
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Progress</span>
              <span className="font-semibold">
                {completedPoints} / {totalPoints} pts ({progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-gray-500">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Sprint Overview Component
export default function SprintOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/product/:productId/sprint-overview");
  const [, navigate] = useLocation();
  const productId = params?.productId || "";

  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

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

  // Fetch all stories for all sprints
  const { data: allStories = [] } = useQuery<UserStory[]>({
    queryKey: [`/api/products/${productId}/all-stories`],
    queryFn: async () => {
      // Fetch stories for each sprint
      const storyPromises = sprints.map(sprint =>
        apiRequest("GET", `/api/sprints/${sprint.id}/stories`).then(res => res.json())
      );
      const results = await Promise.all(storyPromises);
      return results.flat();
    },
    enabled: sprints.length > 0,
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

  // Calculate overall metrics
  const activeSprints = sprints.filter(s => s.status === "active");
  const planningSprints = sprints.filter(s => s.status === "planning");
  const completedSprints = sprints.filter(s => s.status === "completed");

  // Calculate velocity (average completed points from completed sprints)
  const velocityData = completedSprints
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .map(sprint => {
      const sprintStories = allStories.filter(s => s.sprintId === sprint.id);
      const completedPoints = sprintStories
        .filter(s => s.status === "completed")
        .reduce((sum, s) => sum + (s.storyPoints || 0), 0);
      const committedPoints = sprintStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
      return {
        name: sprint.name,
        velocity: completedPoints,
        committed: committedPoints,
        capacity: sprint.capacity || 0,
      };
    });

  const averageVelocity = velocityData.length > 0
    ? Math.round(velocityData.reduce((a, b) => a + b.velocity, 0) / velocityData.length)
    : 0;

  // Calculate commitment accuracy
  const totalCommitted = velocityData.reduce((sum, d) => sum + d.committed, 0);
  const totalCompleted = velocityData.reduce((sum, d) => sum + d.velocity, 0);
  const commitmentAccuracy = totalCommitted > 0
    ? Math.round((totalCompleted / totalCommitted) * 100)
    : 0;

  return (
    <Layout
      title={product?.name || "Sprint Overview"}
      subtitle="Manage and monitor all sprints"
      icon={BarChart3}
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

      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Sprint Management</h2>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sprints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeSprints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedSprints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{averageVelocity} pts</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Commitment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{commitmentAccuracy}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Velocity Trend Chart */}
      {velocityData.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base">Velocity Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="capacity" fill="#9ca3af" name="Capacity" />
                <Bar dataKey="committed" fill="#fbbf24" name="Committed" />
                <Bar dataKey="velocity" fill="#3b82f6" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Average Velocity</p>
                <p className="text-lg font-bold text-purple-600">{averageVelocity} pts</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Commitment Accuracy</p>
                <p className="text-lg font-bold text-orange-600">{commitmentAccuracy}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Completed</p>
                <p className="text-lg font-bold text-green-600">{totalCompleted} pts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprints Grid */}
      {sprintsLoading ? (
        <div className="text-center py-12">Loading sprints...</div>
      ) : sprints.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprints
            .sort((a, b) => {
              // Sort: active > planning > completed > cancelled
              const statusOrder = { active: 0, planning: 1, completed: 2, cancelled: 3 };
              const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 4;
              const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 4;
              if (aOrder !== bOrder) return aOrder - bOrder;
              // Then by start date descending
              return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
            })
            .map((sprint) => {
              const sprintStories = allStories.filter(s => s.sprintId === sprint.id);
              return (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  stories={sprintStories}
                  onEdit={() => {
                    setEditingSprint(sprint);
                    setIsSprintDialogOpen(true);
                  }}
                  onDelete={() => {
                    if (confirm(`Delete sprint "${sprint.name}"? All stories will be unassigned from this sprint.`)) {
                      deleteSprintMutation.mutate(sprint.id);
                    }
                  }}
                  onClick={() => navigate(`/product/${productId}/sprints`)}
                />
              );
            })}
        </div>
      )}
    </Layout>
  );
}
