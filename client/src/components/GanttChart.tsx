import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, Clock, GitBranch, Users } from "lucide-react";
import type { Task, Project, User, TaskDependency } from "@shared/schema";
import { getStatusBadge, getPriorityBadge } from "@/lib/statusUtils";

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  dependencies: TaskDependency[];
}

type TimeScale = "week" | "month" | "quarter";

interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  timeScale: TimeScale;
  pixelsPerDay: number;
}

interface TaskWithProject extends Task {
  project?: Project;
  assignedUser?: User;
  dependencies?: TaskDependency[];
}

export function GanttChart({ tasks, projects, users, dependencies }: GanttChartProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>("month");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  // Calculate timeline configuration
  const timelineConfig = useMemo((): TimelineConfig => {
    const now = new Date();
    const tasksWithDates = tasks.filter(task => task.startDate || task.dueDate);

    if (tasksWithDates.length === 0) {
      // Default to 3 months if no tasks have dates
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return {
        startDate,
        endDate,
        timeScale,
        pixelsPerDay: timeScale === "week" ? 20 : timeScale === "month" ? 4 : 1
      };
    }

    const allDates = tasksWithDates.flatMap(task => [
      task.startDate ? new Date(task.startDate) : null,
      task.dueDate ? new Date(task.dueDate) : null,
      task.createdAt ? new Date(task.createdAt) : null
    ]).filter(Boolean) as Date[];

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add buffer
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 7);

    return {
      startDate,
      endDate,
      timeScale,
      pixelsPerDay: timeScale === "week" ? 20 : timeScale === "month" ? 4 : 1
    };
  }, [tasks, timeScale]);

  // Generate time scale markers
  const timeMarkers = useMemo(() => {
    const markers: Array<{ date: Date; label: string; type: 'major' | 'minor' }> = [];
    const current = new Date(timelineConfig.startDate);

    while (current <= timelineConfig.endDate) {
      if (timeScale === "week") {
        // Weekly view - show days
        markers.push({
          date: new Date(current),
          label: current.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
          type: current.getDay() === 1 ? 'major' : 'minor' // Monday as major
        });
        current.setDate(current.getDate() + 1);
      } else if (timeScale === "month") {
        // Monthly view - show weeks
        if (current.getDate() === 1 || current.getDay() === 1) {
          markers.push({
            date: new Date(current),
            label: current.getDate() === 1
              ? current.toLocaleDateString("en-US", { month: "short" })
              : current.getDate().toString(),
            type: current.getDate() === 1 ? 'major' : 'minor'
          });
        }
        current.setDate(current.getDate() + 1);
      } else {
        // Quarterly view - show months
        if (current.getDate() === 1) {
          markers.push({
            date: new Date(current),
            label: current.toLocaleDateString("en-US", { month: "short", year: current.getMonth() === 0 ? "numeric" : undefined }),
            type: current.getMonth() % 3 === 0 ? 'major' : 'minor'
          });
        }
        current.setDate(current.getDate() + 7); // Jump by weeks in quarterly view
      }
    }

    return markers;
  }, [timelineConfig, timeScale]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped = new Map<string, TaskWithProject[]>();

    tasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      const assignedUser = users.find(u => u.id === task.assignedTo);
      const taskDependencies = dependencies.filter(d => d.taskId === task.id);

      const enhancedTask: TaskWithProject = {
        ...task,
        project,
        assignedUser,
        dependencies: taskDependencies
      };

      const projectKey = project?.id || "unassigned";
      if (!grouped.has(projectKey)) {
        grouped.set(projectKey, []);
      }
      grouped.get(projectKey)!.push(enhancedTask);
    });

    return grouped;
  }, [tasks, projects, users, dependencies]);

  // Calculate position and width for a task bar
  const getTaskBarStyle = (task: TaskWithProject) => {
    const startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt || Date.now());
    const endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const startOffset = Math.max(0, (startDate.getTime() - timelineConfig.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      left: `${startOffset * timelineConfig.pixelsPerDay}px`,
      width: `${duration * timelineConfig.pixelsPerDay}px`
    };
  };

  // Get task bar color based on status
  const getTaskBarColor = (task: TaskWithProject) => {
    switch (task.status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'todo': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const toggleProject = (projectId: string) => {
    const newCollapsed = new Set(collapsedProjects);
    if (newCollapsed.has(projectId)) {
      newCollapsed.delete(projectId);
    } else {
      newCollapsed.add(projectId);
    }
    setCollapsedProjects(newCollapsed);
  };

  const totalTimelineWidth = timeMarkers.length * timelineConfig.pixelsPerDay;
  const today = new Date();
  const todayOffset = (today.getTime() - timelineConfig.startDate.getTime()) / (1000 * 60 * 60 * 24) * timelineConfig.pixelsPerDay;

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline & Gantt Chart
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Time Scale Controls */}
            <div className="flex rounded-md border">
              {(['week', 'month', 'quarter'] as TimeScale[]).map((scale) => (
                <Button
                  key={scale}
                  variant={timeScale === scale ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeScale(scale)}
                  className="rounded-none first:rounded-l-md last:rounded-r-md"
                >
                  {scale.charAt(0).toUpperCase() + scale.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Timeline Header */}
          <div className="relative">
            <div className="flex border-b">
              <div className="w-80 p-4 border-r bg-muted/50">
                <div className="font-semibold">Project / Task</div>
              </div>
              <div className="flex-1 relative overflow-x-auto">
                <div style={{ width: `${totalTimelineWidth}px`, minWidth: '800px' }} className="relative">
                  {/* Time scale markers */}
                  <div className="flex border-b bg-muted/30 h-10">
                    {timeMarkers.map((marker, index) => (
                      <div
                        key={index}
                        className={`absolute top-0 flex flex-col items-center justify-center h-10 text-xs font-medium ${
                          marker.type === 'major' ? 'text-foreground border-l-2 border-border' : 'text-muted-foreground border-l border-muted'
                        }`}
                        style={{
                          left: `${((marker.date.getTime() - timelineConfig.startDate.getTime()) / (1000 * 60 * 60 * 24)) * timelineConfig.pixelsPerDay}px`,
                          width: `${timelineConfig.pixelsPerDay}px`
                        }}
                      >
                        <span className="truncate px-1">{marker.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Today indicator */}
                  {todayOffset >= 0 && todayOffset <= totalTimelineWidth && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                      style={{ left: `${todayOffset}px` }}
                    >
                      <div className="absolute -top-2 -left-8 text-xs text-red-500 font-medium">
                        Today
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Groups and Tasks */}
          <div className="space-y-1">
            {Array.from(tasksByProject.entries()).map(([projectKey, projectTasks]) => {
              const project = projects.find(p => p.id === projectKey);
              const isCollapsed = collapsedProjects.has(projectKey);
              const projectName = project?.name || "Unassigned Tasks";

              return (
                <div key={projectKey} className="border rounded-lg overflow-hidden">
                  {/* Project Header */}
                  <Collapsible
                    open={!isCollapsed}
                    onOpenChange={() => toggleProject(projectKey)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer">
                        <div className="w-80 flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <div className="font-semibold text-lg">{projectName}</div>
                          <Badge variant="outline" className="ml-2">
                            {projectTasks.length} tasks
                          </Badge>
                          {project && (
                            <Badge className={getStatusBadge(project.status || 'planning')}>
                              {project.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 relative" style={{ minWidth: '800px' }}>
                          {/* Project timeline bar if project has dates */}
                          {project?.startDate && project?.endDate && (
                            <div
                              className="absolute top-2 h-2 bg-primary/30 rounded"
                              style={getTaskBarStyle({
                                ...projectTasks[0],
                                startDate: project.startDate,
                                dueDate: project.endDate
                              } as TaskWithProject)}
                            />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {/* Tasks */}
                      <div className="divide-y">
                        {projectTasks.map((task) => (
                          <div key={task.id} className="flex items-center hover:bg-muted/20">
                            <div className="w-80 p-3 border-r">
                              <div className="space-y-2">
                                <div className="font-medium truncate">{task.title}</div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Badge className={getStatusBadge(task.status || 'todo')} variant="outline">
                                    {task.status}
                                  </Badge>
                                  <Badge className={getPriorityBadge(task.priority || "medium")}>
                                    {task.priority}
                                  </Badge>
                                  {task.assignedUser && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Users className="h-3 w-3" />
                                      <span className="truncate">{task.assignedUser.name}</span>
                                    </div>
                                  )}
                                  {task.dependencies && task.dependencies.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <GitBranch className="h-3 w-3 mr-1" />
                                      {task.dependencies.length} deps
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {task.startDate && (
                                    <span>Start: {new Date(task.startDate).toLocaleDateString()}</span>
                                  )}
                                  {task.startDate && task.dueDate && <span> • </span>}
                                  {task.dueDate && (
                                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 relative p-3" style={{ minWidth: '800px' }}>
                              {/* Task bar */}
                              <div
                                className={`absolute top-4 h-6 ${getTaskBarColor(task)} rounded flex items-center px-2 text-white text-xs font-medium shadow-sm`}
                                style={getTaskBarStyle(task)}
                              >
                                <span className="truncate">{task.title}</span>
                              </div>

                              {/* Dependency indicators */}
                              {task.dependencies && task.dependencies.length > 0 && (
                                <div className="absolute top-3 -left-1 w-2 h-8 bg-orange-400 opacity-75 rounded-l" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>To Do</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-red-500"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-400 rounded-l"></div>
              <span>Has Dependencies</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}