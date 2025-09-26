import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, Project, User } from "@shared/schema";
import {
  FolderOpen,
  ArrowRight,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  Eye,
  ExternalLink,
  Zap
} from "lucide-react";

interface QuickProjectActionsProps {
  task: Task;
  onNavigateToProject?: (projectId: string) => void;
  compact?: boolean;
}

export function QuickProjectActions({ task, onNavigateToProject, compact = true }: QuickProjectActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch projects to show project context
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isOpen,
  });

  // Fetch users for project manager info
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Get the project this task belongs to
  const project = projects?.find(p => p.id === task.projectId);

  // Get other tasks in the same project
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isOpen && !!project,
  });

  const projectTasks = tasks?.filter(t => t.projectId === task.projectId) || [];
  const relatedTasks = projectTasks.filter(t => t.id !== task.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "paused":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
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

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return "Unassigned";
    const manager = users?.find(u => u.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : "Unknown";
  };

  const handleNavigateToProject = () => {
    if (project && onNavigateToProject) {
      onNavigateToProject(project.id);
      setIsOpen(false);
    }
  };

  if (!task.projectId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No Project
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This task is not assigned to a project</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-blue-50">
            <FolderOpen className="w-3 h-3 mr-1" />
            {project?.name || "Loading..."}
            <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          {project ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    {project.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {project.description || "No description available"}
                  </p>
                </div>
                <Badge className={getStatusColor(project.status || '')} variant="outline">
                  {project.status || 'Planning'}
                </Badge>
              </div>

              {/* Project Progress & Health */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-2" />
                </div>

                {/* Project Health Indicators */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        projectTasks.filter(t => t.status === 'completed').length / Math.max(projectTasks.length, 1) > 0.8
                          ? 'bg-green-500'
                          : projectTasks.filter(t => t.status === 'completed').length / Math.max(projectTasks.length, 1) > 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`} />
                      <span className="text-muted-foreground">Health</span>
                    </div>
                    <div className="font-medium">
                      {projectTasks.length > 0
                        ? Math.round((projectTasks.filter(t => t.status === 'completed').length / projectTasks.length) * 100)
                        : 0
                      }%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Tasks</span>
                    </div>
                    <div className="font-medium">{projectTasks.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {projectTasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed') ? (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      )}
                      <span className="text-muted-foreground">Status</span>
                    </div>
                    <div className="font-medium text-xs">
                      {projectTasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')
                        ? 'At Risk'
                        : 'On Track'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Manager:</span>
                  </div>
                  <p className="font-medium truncate">{getManagerName(project.managerId)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Due:</span>
                  </div>
                  <p className="font-medium">
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString()
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>

              {/* Related Tasks */}
              {relatedTasks.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Related Tasks ({relatedTasks.length})
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {relatedTasks.slice(0, 5).map((relatedTask) => (
                      <div key={relatedTask.id} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-medium truncate flex-1 pr-2">
                          {relatedTask.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {relatedTask.status || 'todo'}
                        </Badge>
                      </div>
                    ))}
                    {relatedTasks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        +{relatedTasks.length - 5} more tasks...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={handleNavigateToProject}
                  className="flex-1 gap-2"
                >
                  <Eye className="w-3 h-3" />
                  View Project
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open project in new tab/window
                    window.open(`/projects#${project.id}`, '_blank');
                    setIsOpen(false);
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading project details...</p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Full view (for task detail pages)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Project Context
        </CardTitle>
      </CardHeader>
      <CardContent>
        {project ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  {project.name}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {project.description || "No description available"}
                </p>
              </div>
              <Badge className={getStatusColor(project.status || '')} variant="outline">
                {project.status || 'Planning'}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-3" />
              </div>

              {/* Detailed Health Metrics */}
              <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 rounded">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className={`w-3 h-3 rounded-full ${
                      projectTasks.filter(t => t.status === 'completed').length / Math.max(projectTasks.length, 1) > 0.8
                        ? 'bg-green-500'
                        : projectTasks.filter(t => t.status === 'completed').length / Math.max(projectTasks.length, 1) > 0.5
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`} />
                    <span className="text-xs text-muted-foreground">Health</span>
                  </div>
                  <div className="font-medium text-sm">
                    {projectTasks.length > 0
                      ? Math.round((projectTasks.filter(t => t.status === 'completed').length / projectTasks.length) * 100)
                      : 0
                    }%
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <div className="font-medium text-sm">
                    {projectTasks.filter(t => t.status === 'in_progress').length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <div className="font-medium text-sm">{projectTasks.length}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {projectTasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed') ? (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    )}
                    <span className="text-xs text-muted-foreground">Status</span>
                  </div>
                  <div className="font-medium text-xs">
                    {projectTasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')
                      ? 'At Risk'
                      : 'On Track'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Project Manager</span>
                </div>
                <p className="font-medium">{getManagerName(project.managerId)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due Date</span>
                </div>
                <p className="font-medium">
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString()
                    : 'Not set'
                  }
                </p>
              </div>
            </div>

            {relatedTasks.length > 0 && (
              <div className="border-t pt-4">
                <h5 className="font-medium text-sm mb-3">
                  Related Tasks ({relatedTasks.length})
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {relatedTasks.map((relatedTask) => (
                    <div key={relatedTask.id} className="flex items-center justify-between p-3 rounded border hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{relatedTask.title}</p>
                        {relatedTask.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {relatedTask.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {relatedTask.priority && (
                          <Badge className={getPriorityColor(relatedTask.priority)} variant="outline">
                            {relatedTask.priority}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {relatedTask.status || 'todo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleNavigateToProject}
                className="flex-1 gap-2"
              >
                <Eye className="w-4 h-4" />
                View Full Project
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`/projects#${project.id}`, '_blank');
                }}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}