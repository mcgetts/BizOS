import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEpicSchema, insertFeatureSchema, insertUserStorySchema } from "@shared/schema";
import type { Product, Epic, Feature, UserStory, Sprint, InsertEpic, InsertFeature, InsertUserStory } from "@shared/schema";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Layers,
  Target,
  ListChecks,
  Edit,
  Trash2,
  ChevronRight,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

// Epic status configuration
const EPIC_STATUSES = {
  planned: { label: "Planned", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

// Feature status configuration
const FEATURE_STATUSES = {
  backlog: { label: "Backlog", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  planned: { label: "Planned", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  in_review: { label: "In Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

// Epic Form Schema
const epicFormSchema = insertEpicSchema.pick({
  title: true,
  description: true,
  status: true,
  priority: true,
  productId: true,
});

type EpicFormData = z.infer<typeof epicFormSchema>;

// Feature Form Schema
const featureFormSchema = insertFeatureSchema.pick({
  title: true,
  description: true,
  status: true,
  priority: true,
  productId: true,
  epicId: true,
});

type FeatureFormData = z.infer<typeof featureFormSchema>;

// Epic Form Component
function EpicForm({
  epic,
  productId,
  onSuccess
}: {
  epic?: Epic;
  productId: string;
  onSuccess: () => void
}) {
  const { toast } = useToast();

  const form = useForm<EpicFormData>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: {
      title: epic?.title || "",
      description: epic?.description || "",
      status: epic?.status || "planned",
      priority: epic?.priority || "medium",
      productId: productId,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEpic) => {
      const response = await apiRequest("POST", "/api/epics", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/epics`] });
      toast({ title: "Epic created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create epic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertEpic>) => {
      const response = await apiRequest("PATCH", `/api/epics/${epic?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/epics`] });
      toast({ title: "Epic updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update epic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EpicFormData) => {
    if (epic) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as InsertEpic);
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
              <FormLabel>Epic Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Phase 11: UX Enhancement" {...field} />
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
                <Textarea placeholder="Describe this epic" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
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
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {epic ? "Update Epic" : "Create Epic"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Feature Form Component
function FeatureForm({
  feature,
  productId,
  epicId,
  onSuccess
}: {
  feature?: Feature;
  productId: string;
  epicId?: string;
  onSuccess: () => void
}) {
  const { toast } = useToast();

  const form = useForm<FeatureFormData>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      title: feature?.title || "",
      description: feature?.description || "",
      status: feature?.status || "backlog",
      priority: feature?.priority || "medium",
      productId: productId,
      epicId: epicId || feature?.epicId || undefined,
    },
  });

  // Fetch epics for dropdown
  const { data: epics = [] } = useQuery<Epic[]>({
    queryKey: [`/api/products/${productId}/epics`],
  });

  // Fetch sprints for dropdown
  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: [`/api/products/${productId}/sprints`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFeature) => {
      const response = await apiRequest("POST", "/api/features", data);
      return response.json();
    },
    onSuccess: () => {
      if (epicId) {
        queryClient.invalidateQueries({ queryKey: [`/api/epics/${epicId}/features`] });
      }
      toast({ title: "Feature created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertFeature>) => {
      const response = await apiRequest("PATCH", `/api/features/${feature?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      if (epicId) {
        queryClient.invalidateQueries({ queryKey: [`/api/epics/${epicId}/features`] });
      }
      toast({ title: "Feature updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeatureFormData) => {
    // Convert "none" or empty string epicId to undefined
    const cleanedData = {
      ...data,
      epicId: data.epicId && data.epicId !== "none" ? data.epicId : undefined,
    };

    if (feature) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData as InsertFeature);
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
              <FormLabel>Feature Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Command Palette" {...field} />
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
                <Textarea placeholder="Describe this feature" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="epicId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Epic (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select epic" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Epic</SelectItem>
                  {epics.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      {epic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {feature ? "Update Feature" : "Create Feature"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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

// User Story Form Component
function UserStoryForm({
  story,
  productId,
  featureId,
  epicId,
  onSuccess
}: {
  story?: UserStory;
  productId: string;
  featureId?: string;
  epicId?: string;
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
      featureId: featureId || story?.featureId || undefined,
      epicId: epicId || story?.epicId || undefined,
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
      if (featureId) {
        queryClient.invalidateQueries({ queryKey: [`/api/features/${featureId}/stories`] });
      }
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
      if (featureId) {
        queryClient.invalidateQueries({ queryKey: [`/api/features/${featureId}/stories`] });
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

// Main Product Detail Component
export default function ProductDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/product/:id");
  const productId = params?.id || "";

  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Fetch product
  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  // Fetch epics
  const { data: epics = [], isLoading: epicsLoading } = useQuery<Epic[]>({
    queryKey: [`/api/products/${productId}/epics`],
    enabled: !!productId,
  });

  // Delete epic mutation
  const deleteEpicMutation = useMutation({
    mutationFn: async (epicId: string) => {
      await apiRequest("DELETE", `/api/epics/${epicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/epics`] });
      toast({ title: "Epic deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete epic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      await apiRequest("DELETE", `/api/features/${featureId}`);
    },
    onSuccess: () => {
      if (selectedEpicId) {
        queryClient.invalidateQueries({ queryKey: [`/api/epics/${selectedEpicId}/features`] });
      }
      toast({ title: "Feature deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete feature",
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
      if (selectedFeatureId) {
        queryClient.invalidateQueries({ queryKey: [`/api/features/${selectedFeatureId}/stories`] });
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

  if (productLoading) {
    return (
      <Layout title="Loading..." subtitle="" icon={Layers} user={user}>
        <div className="text-center py-12">Loading product...</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout title="Not Found" subtitle="" icon={Layers} user={user}>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Product not found</h3>
            <Link href="/product">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout
      title={product.name}
      subtitle={product.description || "Product details and roadmap"}
      icon={Layers}
      user={user}
    >
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/product">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/product/${productId}/sprint-overview`}>
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Sprint Overview
            </Button>
          </Link>
          <Link href={`/product/${productId}/sprints`}>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Sprint Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Type</p>
              <Badge variant="outline">{product.productType}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <Badge className={
                product.status === "launched" ? "bg-green-100 text-green-800" :
                product.status === "development" ? "bg-blue-100 text-blue-800" :
                "bg-gray-100 text-gray-800"
              }>
                {product.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Epics</p>
              <p className="font-semibold">{epics.length}</p>
            </div>
          </div>
          {product.vision && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-1">Vision</p>
              <p className="text-sm">{product.vision}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Epics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Epics & Features</h2>
          <Dialog open={isEpicDialogOpen} onOpenChange={setIsEpicDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Epic
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Epic</DialogTitle>
              </DialogHeader>
              <EpicForm
                productId={productId}
                onSuccess={() => setIsEpicDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {epicsLoading ? (
          <div className="text-center py-12">Loading epics...</div>
        ) : epics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No epics yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first epic to start organizing features
              </p>
              <Button onClick={() => setIsEpicDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Epic
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {epics.map((epic) => (
              <EpicCard
                key={epic.id}
                epic={epic}
                productId={productId}
                onEdit={(epic) => {
                  setEditingEpic(epic);
                  setIsEpicDialogOpen(true);
                }}
                onDelete={(epicId) => {
                  if (confirm("Are you sure you want to delete this epic?")) {
                    deleteEpicMutation.mutate(epicId);
                  }
                }}
                onAddFeature={(epicId) => {
                  setSelectedEpicId(epicId);
                  setIsFeatureDialogOpen(true);
                }}
                onAddStory={(featureId, epicId) => {
                  setSelectedFeatureId(featureId);
                  setSelectedEpicId(epicId);
                  setIsStoryDialogOpen(true);
                }}
                onEditStory={(story) => {
                  setEditingStory(story);
                  setSelectedFeatureId(story.featureId || null);
                  setSelectedEpicId(story.epicId || null);
                  setIsStoryDialogOpen(true);
                }}
                onDeleteStory={(storyId) => {
                  deleteStoryMutation.mutate(storyId);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Epic Dialog */}
      <Dialog
        open={isEpicDialogOpen && !!editingEpic}
        onOpenChange={(open) => {
          if (!open) setEditingEpic(null);
          setIsEpicDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Epic</DialogTitle>
          </DialogHeader>
          {editingEpic && (
            <EpicForm
              epic={editingEpic}
              productId={productId}
              onSuccess={() => {
                setIsEpicDialogOpen(false);
                setEditingEpic(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Feature Dialog */}
      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
          </DialogHeader>
          <FeatureForm
            productId={productId}
            epicId={selectedEpicId || undefined}
            onSuccess={() => {
              setIsFeatureDialogOpen(false);
              setSelectedEpicId(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* User Story Dialog */}
      <Dialog open={isStoryDialogOpen} onOpenChange={setIsStoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingStory ? "Edit User Story" : "Create New User Story"}</DialogTitle>
          </DialogHeader>
          <UserStoryForm
            story={editingStory || undefined}
            productId={productId}
            featureId={selectedFeatureId || undefined}
            epicId={selectedEpicId || undefined}
            onSuccess={() => {
              setIsStoryDialogOpen(false);
              setEditingStory(null);
              setSelectedFeatureId(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// Epic Card Component
function EpicCard({
  epic,
  productId,
  onEdit,
  onDelete,
  onAddFeature,
  onAddStory,
  onEditStory,
  onDeleteStory,
}: {
  epic: Epic;
  productId: string;
  onEdit: (epic: Epic) => void;
  onDelete: (epicId: string) => void;
  onAddFeature: (epicId: string) => void;
  onAddStory: (featureId: string, epicId: string) => void;
  onEditStory: (story: UserStory) => void;
  onDeleteStory: (storyId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  // Fetch features for this epic
  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: [`/api/epics/${epic.id}/features`],
    enabled: expanded,
  });

  const statusConfig = EPIC_STATUSES[epic.status as keyof typeof EPIC_STATUSES] || EPIC_STATUSES.planned;
  const completedFeatures = features.filter(f => f.status === "completed").length;
  const progressPercentage = features.length > 0 ? Math.round((completedFeatures / features.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="p-0 h-auto"
              >
                <ChevronRight className={`w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </Button>
              <CardTitle className="text-lg">{epic.title}</CardTitle>
              <Badge className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
            {epic.description && (
              <CardDescription className="ml-7">{epic.description}</CardDescription>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(epic)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(epic.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="ml-7 mt-2">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{features.length} features</span>
            <span>•</span>
            <span>{completedFeatures} completed</span>
            <span>•</span>
            <span>{progressPercentage}% progress</span>
          </div>
          <Progress value={progressPercentage} className="mt-2" />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Features</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddFeature(epic.id)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Feature
              </Button>
            </div>
            {features.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No features yet</p>
            ) : (
              <div className="space-y-2">
                {features.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    isExpanded={expandedFeatures.has(feature.id)}
                    onToggle={() => {
                      const newExpanded = new Set(expandedFeatures);
                      if (expandedFeatures.has(feature.id)) {
                        newExpanded.delete(feature.id);
                      } else {
                        newExpanded.add(feature.id);
                      }
                      setExpandedFeatures(newExpanded);
                    }}
                    onAddStory={() => onAddStory(feature.id, epic.id)}
                    onEditStory={onEditStory}
                    onDeleteStory={onDeleteStory}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Feature Card Component (shows user stories)
function FeatureCard({
  feature,
  isExpanded,
  onToggle,
  onAddStory,
  onEditStory,
  onDeleteStory,
  onEditFeature,
  onDeleteFeature,
}: {
  feature: Feature;
  isExpanded: boolean;
  onToggle: () => void;
  onAddStory: () => void;
  onEditStory: (story: UserStory) => void;
  onDeleteStory: (storyId: string) => void;
  onEditFeature: (feature: Feature) => void;
  onDeleteFeature: (featureId: string) => void;
}) {
  // Fetch user stories for this feature when expanded
  const { data: stories = [] } = useQuery<UserStory[]>({
    queryKey: [`/api/features/${feature.id}/stories`],
    enabled: isExpanded,
  });

  const featureStatus = FEATURE_STATUSES[feature.status as keyof typeof FEATURE_STATUSES] || FEATURE_STATUSES.backlog;
  const completedStories = stories.filter(s => s.status === "completed").length;
  const storyPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  return (
    <div className="border rounded-lg group/feature">
      <div
        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={onToggle}>
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          <div className="flex-1">
            <p className="font-medium text-sm">{feature.title}</p>
            {feature.description && (
              <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
            )}
            {stories.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>{stories.length} stories</span>
                <span>•</span>
                <span>{storyPoints} points</span>
                <span>•</span>
                <span>{completedStories} completed</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge className={featureStatus.color}>
            {featureStatus.label}
          </Badge>
          <div className="flex gap-0.5 opacity-0 group-hover/feature:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEditFeature(feature);
              }}
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFeature(feature.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t">
          <div className="flex items-center justify-between mt-3 mb-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase">User Stories</h5>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onAddStory();
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Story
            </Button>
          </div>
          {stories.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No user stories yet</p>
          ) : (
            <div className="space-y-1">
              {stories.map((story) => {
                const storyStatus = FEATURE_STATUSES[story.status as keyof typeof FEATURE_STATUSES] || FEATURE_STATUSES.backlog;
                return (
                  <div
                    key={story.id}
                    className="flex items-start justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 group"
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => onEditStory(story)}>
                      <p className="text-xs font-medium">{story.title}</p>
                      {story.asA && (
                        <p className="text-xs text-gray-500 mt-1">
                          As a {story.asA}, I want {story.iWant}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {story.storyPoints && (
                        <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {story.storyPoints}
                        </span>
                      )}
                      <Badge className={`${storyStatus.color} text-xs`}>
                        {storyStatus.label}
                      </Badge>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStory(story);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this user story?")) {
                              onDeleteStory(story.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
