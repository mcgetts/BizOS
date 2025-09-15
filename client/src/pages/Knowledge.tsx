import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { KnowledgeArticle } from "@shared/schema";
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
  Edit
} from "lucide-react";

export default function Knowledge() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredArticles = articles?.filter((article: KnowledgeArticle) =>
    article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const categories = ["sop", "training", "policy", "faq", "guide"];
  const publishedCount = articles?.filter((a: KnowledgeArticle) => a.status === 'published').length || 0;
  const totalViews = articles?.reduce((sum: number, article: KnowledgeArticle) => sum + (article.viewCount || 0), 0) || 0;

  return (
    <Layout title="Knowledge Hub" breadcrumbs={["Knowledge"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
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
          </div>
          <Button data-testid="button-add-article">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>

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
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
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
                      <Button className="mt-4" data-testid="button-create-first-article">
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
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm" data-testid={`button-edit-${index}`}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-more-${index}`}>
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
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
