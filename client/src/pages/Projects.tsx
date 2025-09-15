import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Calendar, 
  Users,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function Projects() {
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

  const { data: projects, isLoading: projectsLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
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

  const filteredProjects = projects?.filter((project: Project) =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          </div>
          <Button data-testid="button-add-project">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
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
                <Users className="w-8 h-8 text-accent-foreground" />
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
                  <Button className="mt-4" data-testid="button-add-first-project">
                    <Plus className="w-4 h-4 mr-2" />
                    Start First Project
                  </Button>
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
                            <div className="font-medium text-foreground">{project.name}</div>
                            <div className="text-sm text-muted-foreground">{project.description}</div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">Client {index + 1}</div>
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
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
