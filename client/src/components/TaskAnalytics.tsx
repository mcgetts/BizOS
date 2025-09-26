import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, User, Project } from "@shared/schema";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  Zap,
  PieChart,
  Activity,
  Award,
  Brain,
  Lightbulb
} from "lucide-react";

interface TaskAnalyticsProps {
  tasks: Task[];
  users?: User[];
  projects?: Project[];
  compact?: boolean;
}

interface ProductivityMetrics {
  tasksCompletedToday: number;
  averageCompletionTime: number;
  efficiencyScore: number;
  streakDays: number;
  burnoutRisk: 'low' | 'medium' | 'high';
  topPerformers: { userId: string; score: number }[];
  bottlenecks: { taskId: string; daysStuck: number }[];
  predictions: {
    tasksToCompleteThisWeek: number;
    projectCompletionDates: { projectId: string; estimatedDate: Date }[];
  };
}

interface TeamMetrics {
  totalProductivity: number;
  averageTasksPerUser: number;
  collaborationScore: number;
  skillGaps: string[];
  teamVelocity: number;
  workloadBalance: { userId: string; overloaded: boolean }[];
}

export function TaskAnalytics({ tasks, users, projects, compact = false }: TaskAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Fetch productivity analytics
  const { data: productivityMetrics } = useQuery<ProductivityMetrics>({
    queryKey: ["/api/analytics/productivity", timeRange, selectedUser, selectedProject],
  });

  // Fetch team analytics
  const { data: teamMetrics } = useQuery<TeamMetrics>({
    queryKey: ["/api/analytics/team", timeRange],
  });

  // Calculate local metrics from tasks
  const getLocalMetrics = () => {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "1d":
        startDate.setDate(now.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const filteredTasks = tasks.filter(task => {
      const taskDate = new Date(task.updatedAt || task.createdAt);
      const matchesTimeRange = taskDate >= startDate;
      const matchesUser = selectedUser === "all" || task.assignedTo === selectedUser;
      const matchesProject = selectedProject === "all" || task.projectId === selectedProject;

      return matchesTimeRange && matchesUser && matchesProject;
    });

    const completedTasks = filteredTasks.filter(task => task.status === "completed");
    const inProgressTasks = filteredTasks.filter(task => task.status === "in_progress");
    const overdueTasks = filteredTasks.filter(task => {
      if (!task.dueDate || task.status === "completed") return false;
      return new Date(task.dueDate) < now;
    });

    return {
      totalTasks: filteredTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      overdueTasks: overdueTasks.length,
      completionRate: filteredTasks.length > 0 ? (completedTasks.length / filteredTasks.length) * 100 : 0,
      averageTimeToComplete: completedTasks.length > 0 ?
        completedTasks.reduce((acc, task) => {
          if (task.completedAt && task.createdAt) {
            const diff = new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
            return acc + (diff / (1000 * 60 * 60 * 24)); // days
          }
          return acc;
        }, 0) / completedTasks.length : 0
    };
  };

  const localMetrics = getLocalMetrics();

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getBurnoutColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600";
      case "medium": return "text-yellow-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const getProjectName = (projectId: string) => {
    const project = projects?.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Quick Analytics
            </CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1D</SelectItem>
                <SelectItem value="7d">7D</SelectItem>
                <SelectItem value="30d">30D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className={`font-medium ${getEfficiencyColor(localMetrics.completionRate)}`}>
                  {localMetrics.completionRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={localMetrics.completionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg. Days</span>
                <span className="font-medium">
                  {localMetrics.averageTimeToComplete.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>to complete</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-xs text-muted-foreground">Completed</span>
                <Badge variant="outline" className="text-xs h-4">
                  {localMetrics.completedTasks}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span className="text-xs text-muted-foreground">Overdue</span>
                <Badge variant={localMetrics.overdueTasks > 0 ? "destructive" : "outline"} className="text-xs h-4">
                  {localMetrics.overdueTasks}
                </Badge>
              </div>
            </div>
          </div>

          {productivityMetrics && (
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Brain className="w-3 h-3 text-purple-600" />
                  <span className="text-muted-foreground">Efficiency Score</span>
                </div>
                <span className={`font-medium ${getEfficiencyColor(productivityMetrics.efficiencyScore)}`}>
                  {productivityMetrics.efficiencyScore}/100
                </span>
              </div>
              {productivityMetrics.burnoutRisk !== 'low' && (
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className={getBurnoutColor(productivityMetrics.burnoutRisk)}>
                    {productivityMetrics.burnoutRisk.charAt(0).toUpperCase() + productivityMetrics.burnoutRisk.slice(1)} burnout risk
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="productivity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="team">Team Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="productivity" className="space-y-4">
          {/* Core Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {localMetrics.completionRate.toFixed(1)}%
                </div>
                <Progress value={localMetrics.completionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {localMetrics.completedTasks} of {localMetrics.totalTasks} tasks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Avg. Completion Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {localMetrics.averageTimeToComplete.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">days per task</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Efficiency Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getEfficiencyColor(productivityMetrics?.efficiencyScore || 0)}`}>
                  {productivityMetrics?.efficiencyScore || 0}
                </div>
                <p className="text-xs text-muted-foreground">out of 100</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {productivityMetrics?.streakDays || 0}
                </div>
                <p className="text-xs text-muted-foreground">consecutive days</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Burnout Risk Assessment</h4>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${getBurnoutColor(productivityMetrics?.burnoutRisk || 'low')}`}
                      variant="outline"
                    >
                      {productivityMetrics?.burnoutRisk || 'Low'} Risk
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lightbulb className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Based on task completion velocity and workload</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {productivityMetrics?.bottlenecks && productivityMetrics.bottlenecks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Potential Bottlenecks</h4>
                    <div className="space-y-2">
                      {productivityMetrics.bottlenecks.slice(0, 3).map((bottleneck) => {
                        const task = tasks.find(t => t.id === bottleneck.taskId);
                        return (
                          <div key={bottleneck.taskId} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <span className="text-sm font-medium truncate">{task?.title || 'Unknown Task'}</span>
                            <Badge variant="destructive" className="text-xs">
                              {bottleneck.daysStuck} days
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productivityMetrics?.topPerformers && productivityMetrics.topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {productivityMetrics.topPerformers.slice(0, 5).map((performer, index) => (
                      <div key={performer.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 text-xs">
                            {index + 1}
                          </Badge>
                          <span className="text-sm font-medium">
                            {getUserName(performer.userId)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 font-medium">
                            {performer.score}
                          </span>
                          <Award className="w-4 h-4 text-amber-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No performance data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {teamMetrics?.teamVelocity || 0}
                </div>
                <p className="text-xs text-muted-foreground">tasks per week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Collaboration Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {teamMetrics?.collaborationScore || 0}%
                </div>
                <p className="text-xs text-muted-foreground">cross-functional work</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Workload Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {teamMetrics?.workloadBalance?.filter(w => !w.overloaded).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">balanced team members</p>
              </CardContent>
            </Card>
          </div>

          {teamMetrics?.skillGaps && teamMetrics.skillGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identified Skill Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {teamMetrics.skillGaps.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-orange-600 border-orange-200">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                AI Predictions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">This Week's Forecast</h4>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {productivityMetrics?.predictions?.tasksToCompleteThisWeek || 0}
                  </div>
                  <span className="text-sm text-muted-foreground">tasks likely to be completed</span>
                </div>
              </div>

              {productivityMetrics?.predictions?.projectCompletionDates &&
               productivityMetrics.predictions.projectCompletionDates.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Project Completion Estimates</h4>
                  <div className="space-y-2">
                    {productivityMetrics.predictions.projectCompletionDates.slice(0, 5).map((prediction) => (
                      <div key={prediction.projectId} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">
                          {getProjectName(prediction.projectId)}
                        </span>
                        <Badge variant="outline">
                          {new Date(prediction.estimatedDate).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}