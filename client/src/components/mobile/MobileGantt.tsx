import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, ChevronRight, ChevronDown } from "lucide-react";
import { useTouch } from "@/hooks/use-touch";
import type { Task, Project, User, TaskDependency } from "@shared/schema";
import { getStatusBadge, getPriorityBadge } from "@/lib/statusUtils";

interface MobileGanttProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  dependencies: TaskDependency[];
}

interface TaskWithProject extends Task {
  project?: Project;
  assignedUser?: User;
}

export function MobileGantt({ tasks, projects, users, dependencies }: MobileGanttProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('list');
  const { touchState, bindToElement } = useTouch();

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped = new Map<string, TaskWithProject[]>();

    tasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      const assignedUser = users.find(u => u.id === task.assignedTo);

      const enhancedTask: TaskWithProject = {
        ...task,
        project,
        assignedUser,
      };

      const projectKey = project?.id || "unassigned";
      if (!grouped.has(projectKey)) {
        grouped.set(projectKey, []);
      }
      grouped.get(projectKey)!.push(enhancedTask);
    });

    return grouped;
  }, [tasks, projects, users]);

  const formatDateRange = (task: TaskWithProject) => {
    const start = task.startDate ? new Date(task.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) : 'Not set';
    const end = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) : 'Not set';
    return `${start} → ${end}`;
  };

  const getDaysRemaining = (task: TaskWithProject) => {
    if (!task.dueDate) return null;
    const now = new Date();
    const due = new Date(task.dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const TaskCard = ({ task }: { task: TaskWithProject }) => {
    const daysRemaining = getDaysRemaining(task);

    return (
      <Card className="mb-3 touch-manipulation">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
            <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>{formatDateRange(task)}</span>
              {daysRemaining !== null && (
                <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining < 3 ? "secondary" : "outline"}
                       className="text-xs">
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                </Badge>
              )}
            </div>

            {task.assignedUser && (
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{task.assignedUser.name}</span>
              </div>
            )}

            {task.description && (
              <p className="text-xs leading-relaxed mt-2 bg-muted/50 p-2 rounded">
                {task.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProjectSection = ({ projectId, projectTasks }: { projectId: string, projectTasks: TaskWithProject[] }) => {
    const project = projects.find(p => p.id === projectId);
    const isExpanded = selectedProject === projectId || selectedProject === null;

    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    const totalTasks = projectTasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div className="mb-6">
        <Card>
          <CardHeader
            className="pb-3 touch-manipulation cursor-pointer"
            onClick={() => setSelectedProject(isExpanded && selectedProject === projectId ? null : projectId)}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>{project?.name || 'Unassigned Tasks'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{completedTasks}/{totalTasks}</span>
                <Badge variant="outline" className="text-xs">
                  {progress}%
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>

          {isExpanded && (
            <CardContent className="pt-0">
              <div className="space-y-0">
                {projectTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'timeline' | 'list')} className="w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Project Timeline</h2>
          <TabsList className="grid w-32 grid-cols-2">
            <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {Array.from(tasksByProject.entries()).map(([projectId, projectTasks]) => (
                <ProjectSection
                  key={projectId}
                  projectId={projectId}
                  projectTasks={projectTasks}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 m-0">
          <div className="p-4 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>Timeline view coming soon...</p>
            <p className="text-xs mt-1">Switch to List view for now</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}