import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Timer,
  Target,
  DollarSign,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users,
  FolderOpen,
  ExternalLink,
  Calculator
} from "lucide-react";
import type {
  User,
  Project,
  Task,
  TimeEntry
} from "@shared/schema";

// Timer state interface
interface TimerState {
  isRunning: boolean;
  startTime: Date | null;
  elapsedTime: number;
  currentProject: string | null;
  currentTask: string | null;
  description: string;
}

// Integration data interfaces
interface BudgetImpact {
  projectId: string;
  costPerHour: number;
  estimatedCost: number;
  budgetRemaining: number;
  utilizationPercent: number;
}

interface TeamUtilizationUpdate {
  userId: string;
  hoursLogged: number;
  utilizationPercent: number;
  capacityRemaining: number;
}

export default function TimeTracking() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    currentProject: null,
    currentTask: null,
    description: ""
  });

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

  // Fetch projects for dropdown
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Fetch tasks for selected project
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks", timer.currentProject],
    enabled: isAuthenticated && !!timer.currentProject,
  });

  // Fetch today's time entries
  const { data: todayEntries, isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/today"],
    enabled: isAuthenticated,
  });

  // Timer interval effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer.isRunning && timer.startTime) {
      interval = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsedTime: Date.now() - (prev.startTime?.getTime() || 0)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.startTime]);

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading time tracking dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formatTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    if (!timer.currentProject) {
      toast({
        title: "Project Required",
        description: "Please select a project before starting the timer",
        variant: "destructive"
      });
      return;
    }
    setTimer(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date(),
      elapsedTime: 0
    }));
  };

  const pauseTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      startTime: null
    }));
  };

  const stopTimer = async () => {
    if (timer.elapsedTime > 0 && timer.currentProject) {
      try {
        const hours = timer.elapsedTime / (1000 * 60 * 60);

        // Save time entry to database
        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: timer.currentProject,
            taskId: timer.currentTask,
            description: timer.description,
            hours: parseFloat(hours.toFixed(2)),
            date: new Date().toISOString(),
            billable: true,
          }),
        });

        if (response.ok) {
          // Send integration updates
          await updateBudgetImpact(timer.currentProject, hours);
          await updateTeamUtilization(hours);

          toast({
            title: "Time Entry Saved",
            description: `Logged ${hours.toFixed(2)} hours to ${projects?.find(p => p.id === timer.currentProject)?.name}`,
          });

          // Refresh today's entries
          window.location.reload();
        } else {
          throw new Error('Failed to save time entry');
        }
      } catch (error) {
        console.error('Error saving time entry:', error);
        toast({
          title: "Error",
          description: "Failed to save time entry. Please try again.",
          variant: "destructive",
        });
      }
    }

    setTimer({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      currentProject: null,
      currentTask: null,
      description: ""
    });
  };

  // Integration functions
  const updateBudgetImpact = async (projectId: string, hours: number) => {
    try {
      // Calculate budget impact
      const project = projects?.find(p => p.id === projectId);
      if (!project) return;

      const costPerHour = 75; // Mock rate - would come from user/project settings
      const cost = hours * costPerHour;

      // Send to Finance Hub
      await fetch('/api/budget-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          hours,
          cost,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to update budget impact:', error);
    }
  };

  const updateTeamUtilization = async (hours: number) => {
    try {
      // Send to Team Hub
      await fetch('/api/team-utilization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          hoursLogged: hours,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to update team utilization:', error);
    }
  };

  // Calculate budget impact for current session
  const calculateBudgetImpact = (): BudgetImpact | null => {
    if (!timer.currentProject || timer.elapsedTime === 0) return null;

    const hours = timer.elapsedTime / (1000 * 60 * 60);
    const costPerHour = 75; // Mock rate
    const estimatedCost = hours * costPerHour;

    return {
      projectId: timer.currentProject,
      costPerHour,
      estimatedCost,
      budgetRemaining: 50000 - estimatedCost, // Mock budget
      utilizationPercent: (estimatedCost / 50000) * 100
    };
  };

  const budgetImpact = calculateBudgetImpact();

  const todayTotal = todayEntries?.reduce((sum, entry) => sum + parseFloat(entry.hours || "0"), 0) || 0;
  const weekTotal = todayTotal * 5; // Mock calculation

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Time Tracking</h1>
            <p className="text-muted-foreground">
              Track time, analyze productivity, and manage project budgets
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Timer Widget */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5" />
                <span>Active Timer</span>
              </div>
              {timer.isRunning && timer.currentProject && (
                <Badge variant="outline" className="bg-primary/10 border-primary/30">
                  Budget Impact: £{((timer.elapsedTime / (1000 * 60 * 60)) * 85).toFixed(2)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Timer Display */}
              <div className="text-center lg:text-left">
                <div className="text-4xl font-mono font-bold text-primary mb-2">
                  {formatTime(timer.elapsedTime)}
                </div>
                {timer.isRunning && timer.currentProject && (
                  <div className="text-sm text-muted-foreground mb-3">
                    Billable value: £{((timer.elapsedTime / (1000 * 60 * 60)) * 85).toFixed(2)}
                  </div>
                )}
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <Button
                    onClick={timer.isRunning ? pauseTimer : startTimer}
                    size="sm"
                    className={timer.isRunning ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    {timer.isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {timer.isRunning ? "Pause" : "Start"}
                  </Button>
                  <Button onClick={stopTimer} variant="outline" size="sm">
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>

              {/* Project Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={timer.currentProject || ""}
                    onValueChange={(value) => setTimer(prev => ({ ...prev, currentProject: value, currentTask: null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project, index) => {
                        const budgetHours = [120, 80, 60, 40][index] || 100;
                        const usedHours = budgetHours * (0.5 + Math.random() * 0.4);
                        const remainingHours = budgetHours - usedHours;
                        return (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{project.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {remainingHours.toFixed(0)}h left
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Info for Selected Project */}
                {timer.currentProject && (
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Project Budget</span>
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Allocated:</span>
                        <span className="font-medium">120h (£10,200)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Used:</span>
                        <span className="text-orange-600 font-medium">78.5h (£6,672)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Remaining:</span>
                        <span className="text-green-600 font-medium">41.5h (£3,528)</span>
                      </div>
                      <Progress value={65.4} className="h-2 mt-2" />
                      <div className="text-xs text-center text-muted-foreground">65.4% utilized</div>
                    </div>
                  </div>
                )}

                {timer.currentProject && (
                  <div className="space-y-2">
                    <Label htmlFor="task">Task (Optional)</Label>
                    <Select
                      value={timer.currentTask || ""}
                      onValueChange={(value) => setTimer(prev => ({ ...prev, currentTask: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks?.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What are you working on?"
                  value={timer.description}
                  onChange={(e) => setTimer(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTotal.toFixed(1)}h</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>{todayEntries?.length || 0} entries</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weekTotal.toFixed(1)}h</div>
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>+12% vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billable Rate</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87.3%</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>of total hours</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">94.2%</div>
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>efficiency score</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            {/* Daily Budget Impact Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-green-700">Today's Revenue</div>
                      <div className="text-2xl font-bold text-green-800">
                        £{(todayTotal * 85).toFixed(0)}
                      </div>
                      <div className="text-xs text-green-600">
                        {todayTotal.toFixed(1)}h × £85/hr average
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-700">Budget Utilization</div>
                      <div className="text-2xl font-bold text-blue-800">73.2%</div>
                      <div className="text-xs text-blue-600">
                        Across {projects?.length || 0} active projects
                      </div>
                    </div>
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-purple-700">Budget Remaining</div>
                      <div className="text-2xl font-bold text-purple-800">£18,450</div>
                      <div className="text-xs text-purple-600">
                        217h remaining this month
                      </div>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Integration Hooks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center space-x-2">
                      <Calculator className="h-4 w-4 text-orange-600" />
                      <span>Finance Hub Integration</span>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/finance" className="text-orange-600 hover:text-orange-700">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Auto-billing entries:</span>
                      <Badge variant="outline">{todayEntries?.length || 0} today</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending invoices:</span>
                      <Badge variant="secondary">3 updated</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Budget alerts:</span>
                      <Badge variant={timer.currentProject ? "default" : "outline"}>
                        {timer.currentProject ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {budgetImpact && (
                      <div className="p-2 bg-orange-50 rounded text-xs">
                        <span className="font-medium">Live Budget Impact:</span>
                        £{budgetImpact.estimatedCost.toFixed(2)} ({budgetImpact.utilizationPercent.toFixed(1)}% utilization)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>Team Hub Integration</span>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/team" className="text-indigo-600 hover:text-indigo-700">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Your utilization:</span>
                      <Badge variant="default">87.5%</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Capacity remaining:</span>
                      <Badge variant="outline">{(40 - todayTotal * 5).toFixed(1)}h/week</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Team avg utilization:</span>
                      <Badge variant="secondary">82.3%</Badge>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded text-xs">
                      <span className="font-medium">Auto-sync:</span> Time entries update your workload in real-time
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Today's Time Entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entriesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : todayEntries && todayEntries.length > 0 ? (
                  <div className="space-y-4">
                    {todayEntries.map((entry, index) => (
                      <div key={entry.id || index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {projects?.find(p => p.id === entry.projectId)?.name || "Unknown Project"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.description || "No description"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="font-semibold">{entry.hours}h</div>
                              {entry.billable && (
                                <div className="text-xs text-green-600 font-medium">
                                  £{(parseFloat(entry.hours || "0") * 85).toFixed(0)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant={entry.billable ? "default" : "secondary"} className="text-xs">
                            {entry.billable ? "Billable" : "Non-billable"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Time Entries Today</h3>
                    <p className="text-muted-foreground mb-4">
                      Start tracking your time using the timer above
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="week" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Timesheet</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View and edit your time entries for the week
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Weekly Timesheet View</h3>
                  <p className="text-muted-foreground mb-4">
                    Interactive weekly timesheet with project breakdown coming next
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6.2h</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+0.5h from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">92.3%</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Excellent focus</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£2,840</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Distractions</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">12</div>
                  <div className="flex items-center space-x-1 text-xs text-orange-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>-3 from last week</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Time Distribution</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    How you spend your time across projects
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { project: "E-commerce Platform", hours: 28.5, percentage: 42, color: "bg-blue-500" },
                      { project: "Mobile App Redesign", hours: 18.2, percentage: 27, color: "bg-green-500" },
                      { project: "API Integration", hours: 12.3, percentage: 18, color: "bg-purple-500" },
                      { project: "Client Meetings", hours: 8.7, percentage: 13, color: "bg-orange-500" }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.project}</span>
                          <span className="text-sm text-muted-foreground">{item.hours}h ({item.percentage}%)</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full ${item.color} transition-all duration-300`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Productivity Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Productivity Trends</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your productivity over the last 2 weeks
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { day: "Mon", hours: 7.5, efficiency: 95 },
                      { day: "Tue", hours: 6.2, efficiency: 82 },
                      { day: "Wed", hours: 8.1, efficiency: 97 },
                      { day: "Thu", hours: 5.8, efficiency: 78 },
                      { day: "Fri", hours: 7.0, efficiency: 89 },
                      { day: "Sat", hours: 3.2, efficiency: 72 },
                      { day: "Sun", hours: 2.1, efficiency: 65 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <span className="w-8 text-sm text-muted-foreground">{item.day}</span>
                        <div className="flex-1 flex items-center space-x-2">
                          <Progress value={(item.hours / 8) * 100} className="flex-1 h-2" />
                          <span className="text-sm font-medium w-12">{item.hours}h</span>
                          <span className={`text-xs px-2 py-1 rounded-full w-16 text-center ${
                            item.efficiency > 90 ? "bg-green-100 text-green-800" :
                            item.efficiency > 75 ? "bg-orange-100 text-orange-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {item.efficiency}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Peak Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Peak Hours</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: "9-10 AM", productivity: 96, hours: 2.1 },
                      { time: "10-11 AM", productivity: 89, hours: 1.9 },
                      { time: "2-3 PM", productivity: 85, hours: 1.8 },
                      { time: "3-4 PM", productivity: 82, hours: 1.7 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.time}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={item.productivity} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground w-8">{item.productivity}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Project Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Project Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projects?.slice(0, 4).map((project, index) => {
                      const performance = 75 + Math.random() * 25; // Mock data
                      return (
                        <div key={project.id} className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate flex-1 mr-2">
                            {project.name}
                          </span>
                          <Badge
                            variant={performance > 90 ? "default" : performance > 75 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {performance.toFixed(0)}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>AI Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-1">
                        Schedule Focus Time
                      </div>
                      <div className="text-xs text-blue-700">
                        Block 9-11 AM for deep work tasks
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-green-800 mb-1">
                        Take More Breaks
                      </div>
                      <div className="text-xs text-green-700">
                        15-min breaks every 90 minutes
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-sm font-medium text-orange-800 mb-1">
                        Batch Similar Tasks
                      </div>
                      <div className="text-xs text-orange-700">
                        Group client calls on Tuesdays
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Report Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Time Reports & Budget Tracking</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generate detailed time reports and track project budgets
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select defaultValue="month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
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
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select defaultValue="summary">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="budget">Budget Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <div className="flex space-x-2">
                      <Button className="flex-1">
                        Generate
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Budget Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Project Budgets</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Track time budgets against actual hours
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {projects?.slice(0, 4).map((project, index) => {
                      const budgetHours = [120, 80, 60, 40][index] || 100;
                      const usedHours = budgetHours * (0.5 + Math.random() * 0.4); // Mock data
                      const percentage = (usedHours / budgetHours) * 100;
                      const remainingHours = budgetHours - usedHours;

                      return (
                        <div key={project.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{project.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {usedHours.toFixed(1)}h of {budgetHours}h used
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${
                                percentage > 100 ? "text-red-600" :
                                percentage > 85 ? "text-orange-600" : "text-green-600"
                              }`}>
                                {percentage.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {remainingHours > 0 ? `${remainingHours.toFixed(1)}h left` : "Over budget"}
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <Progress value={Math.min(percentage, 100)} className="h-3" />
                            {percentage > 100 && (
                              <div className="absolute top-0 right-0 h-3 w-2 bg-red-600 rounded-r-full" />
                            )}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Start: Jan 15</span>
                            <span>Due: {["Mar 20", "Feb 28", "Apr 10", "May 15"][index]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Budget Performance</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Monthly budget vs actual comparison
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["January", "February", "March", "April"].map((month, index) => {
                      const budgeted = 160 + (index * 20);
                      const actual = budgeted * (0.8 + Math.random() * 0.4);
                      const variance = actual - budgeted;

                      return (
                        <div key={month} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{month}</span>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-muted-foreground">
                                Budget: {budgeted}h
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Actual: {actual.toFixed(0)}h
                              </span>
                              <Badge
                                variant={variance < 0 ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {variance > 0 ? "+" : ""}{variance.toFixed(0)}h
                              </Badge>
                            </div>
                          </div>
                          <div className="relative h-4 bg-muted rounded-full">
                            <div
                              className="absolute top-0 left-0 h-full bg-primary rounded-full"
                              style={{ width: `${Math.min((actual / budgeted) * 100, 100)}%` }}
                            />
                            {actual > budgeted && (
                              <div
                                className="absolute top-0 left-0 h-full bg-red-600/30 rounded-full"
                                style={{ width: `${(actual / budgeted) * 100}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Time Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Detailed Time Report</span>
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-muted-foreground">
                    September 2025 - All Projects
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Project</th>
                        <th className="text-left p-3 font-medium">Task</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-center p-3 font-medium">Hours</th>
                        <th className="text-center p-3 font-medium">Billable</th>
                        <th className="text-right p-3 font-medium">Rate</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { date: "Sep 24", project: "E-commerce Platform", task: "Frontend Development", desc: "Implement shopping cart", hours: 3.5, billable: true, rate: 85, amount: 297.50 },
                        { date: "Sep 24", project: "Mobile App", task: "UI Design", desc: "Create user profile screens", hours: 2.0, billable: true, rate: 95, amount: 190.00 },
                        { date: "Sep 23", project: "API Integration", task: "Backend Development", desc: "Payment gateway integration", hours: 4.0, billable: true, rate: 90, amount: 360.00 },
                        { date: "Sep 23", project: "Internal Meeting", task: "Team Standup", desc: "Daily standup meeting", hours: 0.5, billable: false, rate: 0, amount: 0.00 },
                        { date: "Sep 22", project: "E-commerce Platform", task: "Testing", desc: "Unit tests for cart functionality", hours: 2.5, billable: true, rate: 85, amount: 212.50 }
                      ].map((entry, index) => (
                        <tr key={index} className="border-b hover:bg-muted/20">
                          <td className="p-3 text-sm">{entry.date}</td>
                          <td className="p-3 text-sm font-medium">{entry.project}</td>
                          <td className="p-3 text-sm">{entry.task}</td>
                          <td className="p-3 text-sm text-muted-foreground">{entry.desc}</td>
                          <td className="p-3 text-sm text-center font-mono">{entry.hours}h</td>
                          <td className="p-3 text-center">
                            <Badge variant={entry.billable ? "default" : "secondary"} className="text-xs">
                              {entry.billable ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-right font-mono">
                            {entry.billable ? `£${entry.rate}` : "-"}
                          </td>
                          <td className="p-3 text-sm text-right font-mono font-semibold">
                            {entry.billable ? `£${entry.amount.toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={4} className="p-3 text-sm font-semibold">Total</td>
                        <td className="p-3 text-sm text-center font-mono font-semibold">12.5h</td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-sm text-right">-</td>
                        <td className="p-3 text-sm text-right font-mono font-bold">£1,060.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}