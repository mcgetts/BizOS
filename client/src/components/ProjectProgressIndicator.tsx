import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  Users,
  Calendar,
  Target,
  AlertCircle,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectProgressResult {
  progress: number;
  suggestedStatus: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasksCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextActions: string[];
}

interface CompletionEstimate {
  estimatedCompletionDate: Date | null;
  daysRemaining: number | null;
  velocity: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

interface ProjectProgressIndicatorProps {
  projectId: string;
  projectName: string;
  currentProgress?: number;
  currentStatus?: string;
  showDetailedView?: boolean;
  onProgressUpdate?: () => void;
}

export function ProjectProgressIndicator({
  projectId,
  projectName,
  currentProgress = 0,
  currentStatus = 'planning',
  showDetailedView = false,
  onProgressUpdate
}: ProjectProgressIndicatorProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch detailed progress metrics
  const { data: progressData, isLoading: progressLoading } = useQuery<ProjectProgressResult>({
    queryKey: ["/api/projects", projectId, "progress"],
    enabled: showDetailedView,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch completion estimate
  const { data: estimateData, isLoading: estimateLoading } = useQuery<CompletionEstimate>({
    queryKey: ["/api/projects", projectId, "completion-estimate"],
    enabled: showDetailedView,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Recalculate progress mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/recalculate-progress`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "completion-estimate"] });

      toast({
        title: "Progress Updated",
        description: `Project progress recalculated to ${data.project.progress}%`
      });

      if (onProgressUpdate) {
        onProgressUpdate();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recalculate project progress",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsRefreshing(false);
    }
  });

  const handleRefreshProgress = () => {
    setIsRefreshing(true);
    recalculateMutation.mutate();
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getConfidenceColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-500';
    }
  };

  const progressToUse = progressData?.progress ?? currentProgress;
  const suggestedStatus = progressData?.suggestedStatus;
  const statusNeedsUpdate = suggestedStatus && suggestedStatus !== currentStatus;

  if (!showDetailedView) {
    // Simple progress bar view
    return (
      <div className="flex items-center gap-2">
        <Progress value={progressToUse} className="flex-1 h-2" />
        <span className="text-sm font-medium text-muted-foreground">{progressToUse}%</span>
        {statusNeedsUpdate && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Status could be updated to: {suggestedStatus}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  if (progressLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5" />
            Project Progress
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshProgress}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar with Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-lg font-bold">{progressToUse}%</span>
          </div>
          <Progress value={progressToUse} className="h-3" />

          {statusNeedsUpdate && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Consider updating status to <strong>{suggestedStatus}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Task Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Tasks</span>
              <span className="font-medium">{progressData?.totalTasks || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Completed
              </span>
              <span className="font-medium text-green-600">{progressData?.completedTasks || 0}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                In Progress
              </span>
              <span className="font-medium text-blue-600">{progressData?.inProgressTasks || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Blocked/Overdue
              </span>
              <span className="font-medium text-red-600">
                {(progressData?.blockedTasks || 0) + (progressData?.overdueTasksCount || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        {progressData?.riskLevel && (
          <div className={`p-3 rounded-lg border ${getRiskColor(progressData.riskLevel)}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Risk Level: {progressData.riskLevel.toUpperCase()}</span>
            </div>
            {progressData.nextActions && progressData.nextActions.length > 0 && (
              <ul className="mt-2 text-sm space-y-1">
                {progressData.nextActions.map((action, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Completion Estimate */}
        {estimateData && !estimateLoading && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium text-sm">Completion Estimate</span>
              <Badge
                variant="outline"
                className={`text-xs ${getConfidenceColor(estimateData.confidenceLevel)}`}
              >
                {estimateData.confidenceLevel} confidence
              </Badge>
            </div>

            {estimateData.estimatedCompletionDate ? (
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target Date</span>
                  <span>
                    {formatDistanceToNow(new Date(estimateData.estimatedCompletionDate), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Velocity</span>
                  <span>{estimateData.velocity.toFixed(1)} tasks/day</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>Not enough data for reliable estimate</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}