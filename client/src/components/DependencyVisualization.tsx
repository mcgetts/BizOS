import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Task, TaskDependency, Project } from "@shared/schema";
import {
  GitBranch,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Network,
  Target,
  Zap,
  Eye,
  Link2,
  Unlink,
  RotateCcw
} from "lucide-react";

interface DependencyVisualizationProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  projects?: Project[];
  onDependencyChange?: () => void;
  projectFilter?: string;
  showNetworkView?: boolean;
}

interface DependencyNode {
  task: Task;
  dependsOn: Task[];
  dependents: Task[];
  level: number;
  isBlocking: boolean;
  isCritical: boolean;
}

interface CircularDependency {
  tasks: Task[];
  dependencies: TaskDependency[];
}

export function DependencyVisualization({
  tasks,
  dependencies,
  projects,
  onDependencyChange,
  projectFilter,
  showNetworkView = false
}: DependencyVisualizationProps) {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'network' | 'hierarchy'>('list');
  const [showCircularWarnings, setShowCircularWarnings] = useState(true);
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [newDependency, setNewDependency] = useState({ taskId: '', dependsOnTaskId: '' });

  // Create dependency mutation
  const createDependencyMutation = useMutation({
    mutationFn: async (dependency: { taskId: string; dependsOnTaskId: string }) => {
      const response = await apiRequest("POST", "/api/task-dependencies", dependency);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-dependencies"] });
      toast({ title: "Success", description: "Task dependency created successfully" });
      setIsAddingDependency(false);
      setNewDependency({ taskId: '', dependsOnTaskId: '' });
      if (onDependencyChange) onDependencyChange();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create dependency. Check for circular dependencies.",
        variant: "destructive"
      });
    },
  });

  // Delete dependency mutation
  const deleteDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      await apiRequest("DELETE", `/api/task-dependencies/${dependencyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-dependencies"] });
      toast({ title: "Success", description: "Task dependency removed successfully" });
      if (onDependencyChange) onDependencyChange();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove dependency",
        variant: "destructive"
      });
    },
  });

  // Filter tasks by project if specified
  const filteredTasks = useMemo(() => {
    if (!projectFilter) return tasks;
    return tasks.filter(task => task.projectId === projectFilter);
  }, [tasks, projectFilter]);

  // Build dependency network
  const dependencyNetwork = useMemo(() => {
    const network = new Map<string, DependencyNode>();

    // Initialize nodes
    filteredTasks.forEach(task => {
      network.set(task.id, {
        task,
        dependsOn: [],
        dependents: [],
        level: 0,
        isBlocking: false,
        isCritical: false
      });
    });

    // Build relationships
    dependencies.forEach(dep => {
      const taskNode = network.get(dep.taskId!);
      const dependsOnNode = network.get(dep.dependsOnTaskId!);

      if (taskNode && dependsOnNode) {
        const dependsOnTask = filteredTasks.find(t => t.id === dep.dependsOnTaskId);
        const dependentTask = filteredTasks.find(t => t.id === dep.taskId);

        if (dependsOnTask) taskNode.dependsOn.push(dependsOnTask);
        if (dependentTask) dependsOnNode.dependents.push(dependentTask);
      }
    });

    // Calculate levels and flags
    network.forEach(node => {
      node.isBlocking = node.dependents.length > 0 && node.task.status !== 'completed';
      node.isCritical = node.dependents.length > 2 ||
                        (node.dependents.length > 0 && node.task.status === 'todo');

      // Calculate depth level
      const calculateLevel = (nodeId: string, visited = new Set()): number => {
        if (visited.has(nodeId)) return 0; // Circular dependency
        visited.add(nodeId);

        const currentNode = network.get(nodeId);
        if (!currentNode || currentNode.dependsOn.length === 0) return 0;

        return 1 + Math.max(...currentNode.dependsOn.map(dep => calculateLevel(dep.id, new Set(visited))));
      };

      node.level = calculateLevel(node.task.id);
    });

    return network;
  }, [filteredTasks, dependencies]);

  // Detect circular dependencies
  const circularDependencies = useMemo(() => {
    const circles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (taskId: string, path: Task[]): void => {
      if (recursionStack.has(taskId)) {
        // Found a cycle
        const cycleStart = path.findIndex(task => task.id === taskId);
        if (cycleStart >= 0) {
          const cycleTasks = path.slice(cycleStart);
          const cycleDeps = dependencies.filter(dep =>
            cycleTasks.some(t => t.id === dep.taskId) &&
            cycleTasks.some(t => t.id === dep.dependsOnTaskId)
          );
          circles.push({ tasks: cycleTasks, dependencies: cycleDeps });
        }
        return;
      }

      if (visited.has(taskId)) return;

      visited.add(taskId);
      recursionStack.add(taskId);

      const currentTask = filteredTasks.find(t => t.id === taskId);
      if (currentTask) {
        const taskDependencies = dependencies.filter(dep => dep.taskId === taskId);

        taskDependencies.forEach(dep => {
          const dependsOnTask = filteredTasks.find(t => t.id === dep.dependsOnTaskId);
          if (dependsOnTask) {
            detectCycle(dependsOnTask.id, [...path, currentTask]);
          }
        });
      }

      recursionStack.delete(taskId);
    };

    filteredTasks.forEach(task => {
      if (!visited.has(task.id)) {
        detectCycle(task.id, []);
      }
    });

    return circles;
  }, [filteredTasks, dependencies]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "blocked":
        return "text-red-600 bg-red-50 border-red-200";
      case "review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "No Project";
    const project = projects?.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const handleAddDependency = () => {
    if (!newDependency.taskId || !newDependency.dependsOnTaskId) {
      toast({
        title: "Error",
        description: "Please select both tasks for the dependency",
        variant: "destructive"
      });
      return;
    }

    if (newDependency.taskId === newDependency.dependsOnTaskId) {
      toast({
        title: "Error",
        description: "A task cannot depend on itself",
        variant: "destructive"
      });
      return;
    }

    createDependencyMutation.mutate(newDependency);
  };

  // Render dependency list view
  const renderListView = () => (
    <div className="space-y-4">
      {circularDependencies.length > 0 && showCircularWarnings && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Circular Dependencies Detected!</strong> Found {circularDependencies.length} circular dependency chain(s).
            This can cause project delays and should be resolved.
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto ml-2"
              onClick={() => setShowCircularWarnings(false)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {Array.from(dependencyNetwork.values())
          .sort((a, b) => b.level - a.level)
          .map((node) => (
            <Card
              key={node.task.id}
              className={`transition-all hover:shadow-md ${
                node.isCritical ? 'border-orange-200 bg-orange-50' :
                node.isBlocking ? 'border-yellow-200 bg-yellow-50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{node.task.title}</h4>
                      <Badge className={getStatusColor(node.task.status || 'todo')} variant="outline">
                        {node.task.status || 'todo'}
                      </Badge>
                      {node.isCritical && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                Critical
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This task is blocking multiple other tasks</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {node.isBlocking && !node.isCritical && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                Blocking
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Other tasks are waiting for this one</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getProjectName(node.task.projectId)} • Level {node.level}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTask(node.task)}
                    className="ml-2"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Dependencies */}
                {node.dependsOn.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Depends on ({node.dependsOn.length})
                    </p>
                    <div className="space-y-1">
                      {node.dependsOn.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                          <div className="flex items-center gap-2 flex-1">
                            <Badge className={getStatusColor(dep.status || 'todo')} variant="outline">
                              {dep.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            </Badge>
                            <span className="truncate">{dep.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const dependency = dependencies.find(d => d.taskId === node.task.id && d.dependsOnTaskId === dep.id);
                              if (dependency) {
                                deleteDependencyMutation.mutate(dependency.id);
                              }
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Unlink className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependents */}
                {node.dependents.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      Blocking ({node.dependents.length})
                    </p>
                    <div className="space-y-1">
                      {node.dependents.map((dependent) => (
                        <div key={dependent.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                          <Badge className={getStatusColor(dependent.status || 'todo')} variant="outline">
                            {dependent.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          </Badge>
                          <span className="truncate flex-1">{dependent.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {node.dependsOn.length === 0 && node.dependents.length === 0 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    No dependencies
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );

  // Render network view (simplified for now)
  const renderNetworkView = () => (
    <div className="p-6 bg-muted/10 rounded-lg text-center">
      <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-medium text-lg mb-2">Interactive Network View</h3>
      <p className="text-muted-foreground mb-4">
        Visual network diagram showing task dependencies as connected nodes.
      </p>
      <p className="text-sm text-muted-foreground">
        This advanced visualization is coming in a future update. For now, use the list view to manage dependencies.
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Dependency Management
            {circularDependencies.length > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200" variant="outline">
                {circularDependencies.length} Issues
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7"
              >
                List
              </Button>
              <Button
                variant={viewMode === 'network' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('network')}
                className="h-7"
              >
                Network
              </Button>
            </div>
            <Dialog open={isAddingDependency} onOpenChange={setIsAddingDependency}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Dependency
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Task Dependency</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Task that depends on another</label>
                    <Select value={newDependency.taskId} onValueChange={(value) => setNewDependency(prev => ({ ...prev, taskId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTasks.map(task => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title} ({getProjectName(task.projectId)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Task it depends on</label>
                    <Select value={newDependency.dependsOnTaskId} onValueChange={(value) => setNewDependency(prev => ({ ...prev, dependsOnTaskId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dependency..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTasks
                          .filter(task => task.id !== newDependency.taskId)
                          .map(task => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title} ({getProjectName(task.projectId)})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsAddingDependency(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddDependency}
                      disabled={createDependencyMutation.isPending}
                    >
                      {createDependencyMutation.isPending ? "Adding..." : "Add Dependency"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'list' ? renderListView() : renderNetworkView()}
      </CardContent>
    </Card>
  );
}