import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertKnowledgeArticleSchema, type KnowledgeArticle, type InsertKnowledgeArticle, type User } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  Search, 
  BookOpen, 
  FileText,
  Users,
  Eye,
  Clock,
  Tag,
  MoreHorizontal,
  Star,
  Download,
  Edit,
  Trash2,
  Settings,
  Globe,
  Lock,
  ChevronDown
} from "lucide-react";

// Enhanced form schema with better validation
const formSchema = insertKnowledgeArticleSchema.extend({
  tags: z.array(z.string()).optional().default([]),
  category: z.string().optional(),
  content: z.string().min(10, "Content must be at least 10 characters"),
  title: z.string().min(3, "Title must be at least 3 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function Knowledge() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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

  const { data: articles, isLoading: articlesLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ["/api/knowledge"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: async (data: InsertKnowledgeArticle) => {
      return apiRequest("/api/knowledge", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      setCreateModalOpen(false);
      toast({
        title: "Success",
        description: "Knowledge article created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      });
    },
  });

  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertKnowledgeArticle> }) => {
      return apiRequest(`/api/knowledge/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      setEditModalOpen(false);
      setEditingArticle(null);
      toast({
        title: "Success",
        description: "Knowledge article updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update article",
        variant: "destructive",
      });
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/knowledge/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      toast({
        title: "Success",
        description: "Knowledge article deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      });
    },
  });

  // Form for creating articles
  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "guide",
      tags: [],
      status: "draft",
      isPublic: false,
    },
  });

  // Form for editing articles
  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "guide",
      tags: [],
      status: "draft",
      isPublic: false,
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
      case "published": return "default";
      case "draft": return "secondary";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  const getAuthorName = (authorId: string | null) => {
    if (!authorId || !users) return "Unknown";
    const author = users.find(u => u.id === authorId);
    return author ? `${author.firstName || ""} ${author.lastName || ""}`.trim() : "Unknown";
  };

  const handleTagAdd = (form: any, currentTags: string[]) => {
    if (tagInput.trim() && !currentTags.includes(tagInput.trim())) {
      const newTags = [...currentTags, tagInput.trim()];
      form.setValue("tags", newTags);
      setTagInput("");
    }
  };

  const handleTagRemove = (form: any, currentTags: string[], tagToRemove: string) => {
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    form.setValue("tags", newTags);
  };

  const onCreateSubmit = (data: FormData) => {
    createArticleMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data });
    }
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    editForm.reset({
      title: article.title,
      content: article.content,
      category: article.category || "guide",
      tags: article.tags || [],
      status: article.status || "draft",
      isPublic: article.isPublic || false,
    });
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteArticleMutation.mutate(id);
  };

  const filteredArticles = articles?.filter((article: KnowledgeArticle) => {
    const matchesSearch = article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || article.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const categories = ["sop", "training", "policy", "faq", "guide"];
  const publishedCount = articles?.filter((a: KnowledgeArticle) => a.status === 'published').length || 0;
  const draftCount = articles?.filter((a: KnowledgeArticle) => a.status === 'draft').length || 0;
  const archivedCount = articles?.filter((a: KnowledgeArticle) => a.status === 'archived').length || 0;
  const totalViews = articles?.reduce((sum: number, article: KnowledgeArticle) => sum + (article.viewCount || 0), 0) || 0;

  return (
    <Layout title="Knowledge Hub" breadcrumbs={["Knowledge"]}>
      <div className="space-y-6">

        {/* Edit Article Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Knowledge Article</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter article title..." {...field} data-testid="input-edit-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "guide"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your article content here..."
                          className="min-h-[300px]"
                          {...field}
                          data-testid="textarea-edit-content"
                        />
                      </FormControl>
                      <FormDescription>
                        Use markdown formatting for rich text content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Add a tag..."
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleTagAdd(editForm, field.value || []);
                                }
                              }}
                              data-testid="input-edit-tag"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleTagAdd(editForm, field.value || [])}
                              data-testid="button-edit-add-tag"
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleTagRemove(editForm, field.value || [], tag)}
                                  className="ml-1 text-xs"
                                  data-testid={`button-edit-remove-tag-${index}`}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Public Article</FormLabel>
                            <FormDescription>
                              Make this article accessible to everyone
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="switch-edit-public"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditModalOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateArticleMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateArticleMutation.isPending ? "Updating..." : "Update Article"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                  <p className="text-2xl font-bold" data-testid="text-total-articles">
                    {articles?.length || 0}
                  </p>
                </div>
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-published-articles">
                    {publishedCount}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold" data-testid="text-total-views">
                    {totalViews.toLocaleString()}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold" data-testid="text-categories">
                    {categories.length}
                  </p>
                </div>
                <Tag className="w-8 h-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
              data-testid="input-search-knowledge"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48" data-testid="select-category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="articles" data-testid="tab-articles">Articles</TabsTrigger>
            <TabsTrigger value="sops" data-testid="tab-sops">SOPs</TabsTrigger>
            <TabsTrigger value="training" data-testid="tab-training">Training</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Knowledge Articles</CardTitle>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-article">
                          <Plus className="w-4 h-4 mr-2" />
                          New Asset
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create Knowledge Article</DialogTitle>
                        </DialogHeader>
                        <Form {...createForm}>
                          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={createForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter article title..." {...field} data-testid="input-article-title" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createForm.control}
                                name="category"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "guide"}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-article-category">
                                          <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {categories.map((category) => (
                                          <SelectItem key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={createForm.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Content</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Write your article content here..."
                                      className="min-h-[200px]"
                                      {...field}
                                      data-testid="input-article-content"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Use markdown formatting for better presentation.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="tags"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tags</FormLabel>
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Add a tag..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleTagAdd(createForm, field.value || []);
                                          }
                                        }}
                                        data-testid="input-article-tag"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleTagAdd(createForm, field.value || [])}
                                        data-testid="button-add-tag"
                                      >
                                        Add
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {(field.value || []).map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={() => handleTagRemove(createForm, field.value || [], tag)}
                                            className="ml-1 text-xs"
                                            data-testid={`button-remove-tag-${index}`}
                                          >
                                            ×
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={createForm.control}
                                name="status"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-article-status">
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createForm.control}
                                name="isPublic"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Public Access</FormLabel>
                                      <FormDescription>
                                        Allow public access to this article
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-article-public"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateModalOpen(false)}
                                data-testid="button-cancel-create"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={createArticleMutation.isPending}
                                data-testid="button-submit-create"
                              >
                                {createArticleMutation.isPending ? "Creating..." : "Create Article"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {articlesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No articles found matching your search" : "No knowledge articles found. Create your first article to build your knowledge base."}
                    </p>
                    {!searchTerm && (
                      <Button 
                        className="mt-4" 
                        data-testid="button-create-first-article"
                        onClick={() => setCreateModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Article
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((article: any, index: number) => (
                      <Card key={article.id} className="glassmorphism hover:shadow-lg transition-shadow" data-testid={`card-article-${index}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground line-clamp-2" data-testid={`text-title-${index}`}>
                                {article.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {article.category?.charAt(0).toUpperCase() + article.category?.slice(1)}
                              </p>
                            </div>
                            <Badge variant={getStatusColor(article.status)} data-testid={`badge-status-${index}`}>
                              {article.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {article.content?.substring(0, 150)}...
                          </p>
                          
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {article.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {article.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{article.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <Eye className="w-3 h-3" />
                                <span>{article.viewCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                              </div>
                              {article.authorId && (
                                <div className="flex items-center space-x-1">
                                  <Users className="w-3 h-3" />
                                  <span>{getAuthorName(article.authorId)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="flex items-center">
                                {article.isPublic ? (
                                  <div title="Public article"><Globe className="w-3 h-3 text-blue-500" /></div>
                                ) : (
                                  <div title="Private article"><Lock className="w-3 h-3 text-gray-500" /></div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                                    <MoreHorizontal className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(article)} data-testid={`menu-edit-${index}`}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      // TODO: Implement view article
                                      toast({
                                        title: "Coming Soon",
                                        description: "Article view functionality will be implemented",
                                      });
                                    }}
                                    data-testid={`menu-view-${index}`}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      // TODO: Implement duplicate article
                                      toast({
                                        title: "Coming Soon",
                                        description: "Article duplication will be implemented",
                                      });
                                    }}
                                    data-testid={`menu-duplicate-${index}`}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`menu-delete-${index}`}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Article</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{article.title}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel data-testid={`button-cancel-delete-${index}`}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDelete(article.id)}
                                          data-testid={`button-confirm-delete-${index}`}
                                          className="bg-destructive hover:bg-destructive/90"
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sops" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Standard Operating Procedures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No SOPs created yet. Create your first Standard Operating Procedure.</p>
                  <Button className="mt-4" data-testid="button-create-sop">
                    <Plus className="w-4 h-4 mr-2" />
                    Create SOP
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Training Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No training materials available. Add training content for your team.</p>
                  <Button className="mt-4" data-testid="button-add-training">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Training Material
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Document Repository</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet. Start building your document library.</p>
                  <Button className="mt-4" data-testid="button-upload-document">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
