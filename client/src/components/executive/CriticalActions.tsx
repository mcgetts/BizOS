import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Users,
  Zap,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CriticalAction {
  id: string;
  type: "approval" | "decision" | "escalation" | "alert";
  priority: "urgent" | "high" | "medium";
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  category: "financial" | "hr" | "project" | "client" | "strategic";
  metadata?: {
    amount?: number;
    deadline?: string;
    [key: string]: any;
  };
}

interface CriticalActionsData {
  urgent: CriticalAction[];
  thisWeek: CriticalAction[];
  total: number;
}

const categoryIcons = {
  financial: DollarSign,
  hr: Users,
  project: FileText,
  client: AlertCircle,
  strategic: Zap,
};

const priorityConfig = {
  urgent: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    border: "border-l-red-500",
    text: "URGENT",
  },
  high: {
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    border: "border-l-orange-500",
    text: "HIGH",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    border: "border-l-yellow-500",
    text: "MEDIUM",
  },
};

function ActionItem({ action }: { action: CriticalAction }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const Icon = categoryIcons[action.category];
  const config = priorityConfig[action.priority];

  const approveMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(`/api/executive/approve/${action.type}/${actionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      if (!response.ok) throw new Error("Failed to approve action");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executive/critical-actions"] });
      toast({
        title: "Action Approved",
        description: "The action has been successfully approved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(`/api/executive/approve/${action.type}/${actionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      });
      if (!response.ok) throw new Error("Failed to reject action");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executive/critical-actions"] });
      toast({
        title: "Action Rejected",
        description: "The action has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject action. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4 bg-card hover:shadow-md transition-shadow",
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">{action.title}</h4>
            <Badge className={cn("text-xs whitespace-nowrap", config.badge)}>
              {config.text}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{action.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {action.requestedBy}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(action.requestedAt).toLocaleDateString()}
            </span>
            {action.metadata?.amount && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                £{action.metadata.amount.toLocaleString()}
              </span>
            )}
          </div>
          {action.type === "approval" && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => approveMutation.mutate(action.id)}
                disabled={approveMutation.isPending}
                className="h-8"
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMutation.mutate(action.id)}
                disabled={rejectMutation.isPending}
                className="h-8"
              >
                <ThumbsDown className="w-3 h-3 mr-1" />
                Reject
              </Button>
              <Button size="sm" variant="ghost" className="h-8">
                <ArrowRight className="w-3 h-3 mr-1" />
                Details
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CriticalActions() {
  const { data, isLoading, error } = useQuery<CriticalActionsData>({
    queryKey: ["/api/executive/critical-actions"],
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Actions Requiring Your Decision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            Actions Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load pending actions at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Actions Requiring Your Decision
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {data.total} pending action{data.total !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {/* Urgent Actions */}
            {data.urgent.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Urgent ({data.urgent.length})
                  </h3>
                </div>
                {data.urgent.map((action) => (
                  <ActionItem key={action.id} action={action} />
                ))}
              </div>
            )}

            {/* This Week Actions */}
            {data.thisWeek.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                    This Week ({data.thisWeek.length})
                  </h3>
                </div>
                {data.thisWeek.map((action) => (
                  <ActionItem key={action.id} action={action} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {data.urgent.length === 0 && data.thisWeek.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">All Clear!</h3>
                <p className="text-sm text-muted-foreground">
                  No pending actions requiring your attention at this time.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
