import React, { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTouch, useIsTouchDevice } from "@/hooks/use-touch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, Clock, GitBranch, Users } from "lucide-react";
import type { Task, Project, User, TaskDependency } from "@shared/schema";
import { getStatusBadge, getPriorityBadge } from "@/lib/statusUtils";
import { calculateCriticalPath, getCriticalTasksForProject, type CriticalPathResult } from "@/lib/criticalPathAnalysis";
import { MobileGantt } from "@/components/mobile/MobileGantt";

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
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const { touchState, bindToElement } = useTouch();
  const [timeScale, setTimeScale] = useState<TimeScale>(isMobile ? "week" : "month");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<TaskWithProject | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(true);

  // Return mobile-optimized Gantt chart for small screens
  if (isMobile) {
    return <MobileGantt tasks={tasks} projects={projects} users={users} dependencies={dependencies} />;
  }

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
      pixelsPerDay: isMobile
        ? (timeScale === "week" ? 15 : timeScale === "month" ? 3 : 1)
        : (timeScale === "week" ? 20 : timeScale === "month" ? 4 : 1)
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

  // Calculate critical path analysis for all projects
  const criticalPathResults = useMemo(() => {
    const results = new Map<string, CriticalPathResult>();

    projects.forEach(project => {
      const criticalPath = getCriticalTasksForProject(project.id, tasks, dependencies);
      results.set(project.id, criticalPath);
    });

    return results;
  }, [tasks, dependencies, projects]);

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

  // Get task bar color based on status and critical path
  const getTaskBarColor = (task: TaskWithProject) => {
    const projectId = task.projectId;
    const criticalPath = projectId ? criticalPathResults.get(projectId) : null;
    const isCritical = criticalPath?.nodes.get(task.id)?.isCritical || false;

    if (showCriticalPath && isCritical) {
      return 'bg-red-600 border-2 border-red-800'; // Critical path highlight
    }

    switch (task.status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'todo': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Calculate dependency connections for SVG lines
  const getDependencyConnections = useMemo(() => {
    const connections: Array<{
      from: { x: number, y: number, taskId: string };
      to: { x: number, y: number, taskId: string };
    }> = [];

    const taskPositions = new Map<string, { x: number, y: number, width: number }>();

    // Calculate task positions (simplified for dependency lines)
    let yOffset = 120; // Start after header

    Array.from(tasksByProject.entries()).forEach(([projectKey, projectTasks]) => {
      const isCollapsed = collapsedProjects.has(projectKey);
      yOffset += 60; // Project header height

      if (!isCollapsed) {
        projectTasks.forEach(task => {
          const barStyle = getTaskBarStyle(task);
          const xPos = parseFloat(barStyle.left.replace('px', ''));
          const width = parseFloat(barStyle.width.replace('px', ''));

          taskPositions.set(task.id, {
            x: xPos + width / 2, // Center of task bar
            y: yOffset + 30, // Middle of task row
            width
          });
          yOffset += 70; // Task row height
        });
      }
    });

    // Generate connection lines
    dependencies.forEach(dep => {
      const fromTask = taskPositions.get(dep.dependsOnTaskId!);
      const toTask = taskPositions.get(dep.taskId!);

      if (fromTask && toTask && dep.dependsOnTaskId && dep.taskId) {
        connections.push({
          from: { x: fromTask.x + fromTask.width / 2, y: fromTask.y, taskId: dep.dependsOnTaskId },
          to: { x: toTask.x - toTask.width / 2, y: toTask.y, taskId: dep.taskId }
        });
      }
    });

    return connections;
  }, [tasksByProject, dependencies, collapsedProjects, timelineConfig]);

  const toggleProject = (projectId: string) => {
    const newCollapsed = new Set(collapsedProjects);
    if (newCollapsed.has(projectId)) {
      newCollapsed.delete(projectId);
    } else {
      newCollapsed.add(projectId);
    }
    setCollapsedProjects(newCollapsed);
  };

  // Drag & Drop handlers for task scheduling
  const handleTaskMouseDown = (task: TaskWithProject, event: React.MouseEvent) => {
    event.preventDefault();
    setDraggedTask(task);

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!draggedTask) return;

    // Calculate new start date based on mouse position
    const timelineElement = document.querySelector('[data-timeline]');
    if (!timelineElement) return;

    const rect = timelineElement.getBoundingClientRect();
    const relativeX = event.clientX - rect.left - dragOffset.x;
    const daysFromStart = relativeX / timelineConfig.pixelsPerDay;

    const newStartDate = new Date(timelineConfig.startDate);
    newStartDate.setDate(newStartDate.getDate() + daysFromStart);

    // Visual feedback would go here (ghost bar, etc.)
  };

  const handleMouseUp = async (event: MouseEvent) => {
    if (!draggedTask) return;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Calculate final position and update task
    const timelineElement = document.querySelector('[data-timeline]');
    if (!timelineElement) {
      setDraggedTask(null);
      return;
    }

    const rect = timelineElement.getBoundingClientRect();
    const relativeX = event.clientX - rect.left - dragOffset.x;
    const daysFromStart = Math.round(relativeX / timelineConfig.pixelsPerDay);

    const newStartDate = new Date(timelineConfig.startDate);
    newStartDate.setDate(newStartDate.getDate() + daysFromStart);

    // Calculate new due date maintaining duration
    const originalDuration = draggedTask.dueDate && draggedTask.startDate
      ? (new Date(draggedTask.dueDate).getTime() - new Date(draggedTask.startDate).getTime()) / (1000 * 60 * 60 * 24)
      : 7;

    const newDueDate = new Date(newStartDate);
    newDueDate.setDate(newDueDate.getDate() + originalDuration);

    try {
      // Update task with new dates
      const response = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...draggedTask,
          startDate: newStartDate.toISOString(),
          dueDate: newDueDate.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      // Refresh tasks (assuming parent component handles this)
      // queryClient.invalidateQueries(['tasks']);

    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setDraggedTask(null);
      setDragOffset({ x: 0, y: 0 });
    }
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
            {/* Critical Path Toggle */}
            <Button
              variant={showCriticalPath ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCriticalPath(!showCriticalPath)}
              className="text-xs"
            >
              Critical Path
            </Button>

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
                <div
                  data-timeline
                  style={{ width: `${totalTimelineWidth}px`, minWidth: '800px' }}
                  className="relative"
                >
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

                  {/* SVG Dependency Connectors */}
                  <svg
                    className="absolute top-0 left-0 pointer-events-none z-10"
                    style={{ width: `${totalTimelineWidth}px`, height: '100vh' }}
                  >
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="#f97316"
                          stroke="#f97316"
                          strokeWidth="1"
                        />
                      </marker>
                    </defs>
                    {getDependencyConnections.map((connection, index) => {
                      const { from, to } = connection;
                      const midX = (from.x + to.x) / 2;
                      const midY = from.y < to.y ? from.y + 20 : from.y - 20;

                      return (
                        <path
                          key={index}
                          d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                          stroke="#f97316"
                          strokeWidth="2"
                          fill="none"
                          markerEnd="url(#arrowhead)"
                          opacity="0.7"
                        />
                      );
                    })}
                  </svg>
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
                                      <span className="truncate">
                                        {`${task.assignedUser.firstName || ''} ${task.assignedUser.lastName || ''}`.trim() || task.assignedUser.email || 'Unknown User'}
                                      </span>
                                    </div>
                                  )}
                                  {task.dependencies && task.dependencies.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <GitBranch className="h-3 w-3 mr-1" />
                                      {task.dependencies.length} deps
                                    </Badge>
                                  )}
                                  {(() => {
                                    const criticalPath = task.projectId ? criticalPathResults.get(task.projectId) : null;
                                    const isCritical = criticalPath?.nodes.get(task.id)?.isCritical || false;
                                    return showCriticalPath && isCritical && (
                                      <Badge variant="destructive" className="text-xs">
                                        Critical
                                      </Badge>
                                    );
                                  })()}
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
                                className={`absolute top-4 h-6 ${getTaskBarColor(task)} rounded flex items-center px-2 text-white text-xs font-medium shadow-sm cursor-move hover:shadow-md transition-shadow ${
                                  draggedTask?.id === task.id ? 'opacity-50' : ''
                                }`}
                                style={getTaskBarStyle(task)}
                                onMouseDown={(e) => handleTaskMouseDown(task, e)}
                                title="Drag to reschedule task"
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
            {showCriticalPath && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 border border-red-800 rounded"></div>
                <span>Critical Path</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}