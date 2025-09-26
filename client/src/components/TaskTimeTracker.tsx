import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, InsertTimeEntry } from "@shared/schema";
import {
  Play,
  Pause,
  Square,
  Clock,
  Timer,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface TaskTimeTrackerProps {
  task: Task;
  compact?: boolean;
  showBudgetImpact?: boolean;
}

interface TimerState {
  isRunning: boolean;
  startTime: Date | null;
  elapsedTime: number;
  description: string;
}

interface BudgetImpact {
  estimatedCost: number;
  budgetRemaining: number;
  utilizationPercent: number;
  isOverBudget: boolean;
}

export function TaskTimeTracker({ task, compact = false, showBudgetImpact = true }: TaskTimeTrackerProps) {
  const { toast } = useToast();
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    description: ""
  });
  const [manualEntry, setManualEntry] = useState({
    hours: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [budgetImpact, setBudgetImpact] = useState<BudgetImpact | null>(null);

  // Timer effect
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

  // Calculate budget impact when timer changes
  useEffect(() => {
    if (timer.elapsedTime > 0 && showBudgetImpact) {
      calculateBudgetImpact();
    }
  }, [timer.elapsedTime, showBudgetImpact]);

  const calculateBudgetImpact = async () => {
    try {
      const hours = timer.elapsedTime / (1000 * 60 * 60);
      const response = await apiRequest("POST", "/api/tasks/budget-impact", {
        taskId: task.id,
        additionalHours: hours
      });
      const impact = await response.json();
      setBudgetImpact(impact);
    } catch (error) {
      console.error("Failed to calculate budget impact:", error);
    }
  };

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-entries/start", {
        taskId: task.id,
        description: timer.description || `Working on ${task.title}`
      });
      return response.json();
    },
    onSuccess: () => {
      setTimer(prev => ({
        ...prev,
        isRunning: true,
        startTime: new Date(),
        elapsedTime: 0
      }));
      toast({
        title: "Timer Started",
        description: `Tracking time for "${task.title}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    },
  });

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const hours = timer.elapsedTime / (1000 * 60 * 60);
      const timeEntry: InsertTimeEntry = {
        taskId: task.id,
        userId: null, // Will be set by backend
        hours: hours.toString(),
        description: timer.description || `Worked on ${task.title}`,
        date: new Date(),
        billable: true
      };

      const response = await apiRequest("POST", "/api/time-entries", timeEntry);
      return response.json();
    },
    onSuccess: (newEntry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });

      setTimer({
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        description: ""
      });

      const hours = (newEntry.hours || 0).toFixed(2);
      toast({
        title: "Time Logged",
        description: `${hours} hours logged for "${task.title}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log time entry",
        variant: "destructive",
      });
    },
  });

  // Manual time entry mutation
  const manualEntryMutation = useMutation({
    mutationFn: async () => {
      const timeEntry: InsertTimeEntry = {
        taskId: task.id,
        userId: null,
        hours: manualEntry.hours,
        description: manualEntry.description,
        date: new Date(manualEntry.date),
        billable: true
      };

      const response = await apiRequest("POST", "/api/time-entries", timeEntry);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });

      setManualEntry({
        hours: "",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });

      toast({
        title: "Time Entry Added",
        description: `${manualEntry.hours} hours logged for "${task.title}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add time entry",
        variant: "destructive",
      });
    },
  });

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    startTimerMutation.mutate();
  };

  const handleStopTimer = () => {
    stopTimerMutation.mutate();
  };

  const handlePauseTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: false
    }));
  };

  const handleResumeTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date(Date.now() - prev.elapsedTime)
    }));
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {timer.isRunning ? (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Timer className="w-3 h-3 mr-1" />
              {formatTime(timer.elapsedTime)}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handlePauseTimer}
                  >
                    <Pause className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pause Timer</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600"
                    onClick={handleStopTimer}
                    disabled={stopTimerMutation.isPending}
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop & Log Time</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : timer.elapsedTime > 0 ? (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(timer.elapsedTime)}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleResumeTimer}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Resume Timer</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600"
                    onClick={handleStopTimer}
                    disabled={stopTimerMutation.isPending}
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop & Log Time</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-blue-600"
              >
                <Play className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Track Time</h4>

                <div className="space-y-2">
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    placeholder="What are you working on?"
                    value={timer.description}
                    onChange={(e) => setTimer(prev => ({ ...prev, description: e.target.value }))}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleStartTimer}
                    disabled={startTimerMutation.isPending}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    <Play className="w-3 h-3" />
                    Start Timer
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Manual Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Time Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Hours</Label>
                          <Input
                            type="number"
                            step="0.25"
                            placeholder="2.5"
                            value={manualEntry.hours}
                            onChange={(e) => setManualEntry(prev => ({ ...prev, hours: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={manualEntry.date}
                            onChange={(e) => setManualEntry(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="What did you work on?"
                            value={manualEntry.description}
                            onChange={(e) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={() => manualEntryMutation.mutate()}
                          disabled={!manualEntry.hours || manualEntryMutation.isPending}
                          className="w-full"
                        >
                          {manualEntryMutation.isPending ? "Adding..." : "Add Time Entry"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {budgetImpact && showBudgetImpact && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Budget Impact</span>
                      {budgetImpact.isOverBudget && (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="ml-1 font-medium">${budgetImpact.estimatedCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className={`ml-1 font-medium ${budgetImpact.isOverBudget ? 'text-red-600' : ''}`}>
                          ${budgetImpact.budgetRemaining.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Time logged indicator */}
        {(task.actualHours && parseFloat(task.actualHours) > 0) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  {task.actualHours}h
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total time logged: {task.actualHours} hours</p>
                {task.estimatedHours && (
                  <p>Estimated: {task.estimatedHours} hours</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Full view for detailed pages
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Timer className="w-4 h-4 text-blue-600" />
          Time Tracking
        </h3>
        {timer.isRunning && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Timer className="w-3 h-3 mr-1" />
            Running
          </Badge>
        )}
      </div>

      {timer.isRunning || timer.elapsedTime > 0 ? (
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-blue-600">
              {formatTime(timer.elapsedTime)}
            </div>
            <p className="text-sm text-muted-foreground">
              {timer.description || `Working on ${task.title}`}
            </p>
          </div>

          <div className="flex gap-2 justify-center">
            {timer.isRunning ? (
              <>
                <Button variant="outline" onClick={handlePauseTimer}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={handleStopTimer}
                  disabled={stopTimerMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop & Log
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleResumeTimer}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button
                  onClick={handleStopTimer}
                  disabled={stopTimerMutation.isPending}
                  variant="outline"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Log Time
                </Button>
              </>
            )}
          </div>

          {budgetImpact && showBudgetImpact && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Budget Impact
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <div className="font-medium">${budgetImpact.estimatedCost.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Budget Remaining</span>
                  <div className={`font-medium ${budgetImpact.isOverBudget ? 'text-red-600' : ''}`}>
                    ${budgetImpact.budgetRemaining.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Utilization</span>
                  <div className="font-medium">{budgetImpact.utilizationPercent.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Description (optional)</Label>
            <Input
              placeholder="What will you work on?"
              value={timer.description}
              onChange={(e) => setTimer(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStartTimer}
              disabled={startTimerMutation.isPending}
              className="flex-1 gap-2"
            >
              <Play className="w-4 h-4" />
              Start Timer
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Manual Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      step="0.25"
                      placeholder="2.5"
                      value={manualEntry.hours}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, hours: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={manualEntry.date}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What did you work on?"
                      value={manualEntry.description}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => manualEntryMutation.mutate()}
                    disabled={!manualEntry.hours || manualEntryMutation.isPending}
                    className="w-full"
                  >
                    {manualEntryMutation.isPending ? "Adding..." : "Add Time Entry"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Time summary */}
      {(task.actualHours && parseFloat(task.actualHours) > 0) && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Logged</span>
            <span className="font-medium">{task.actualHours} hours</span>
          </div>
          {task.estimatedHours && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated</span>
              <span className="font-medium">{task.estimatedHours} hours</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}