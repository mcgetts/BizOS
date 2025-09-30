import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMetrics {
  id: number;
  name: string;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
  progress: number;
  budget: number;
  spent: number;
  deadline: string;
  daysRemaining: number;
  teamSize: number;
  priority: "critical" | "high" | "medium" | "low";
  healthStatus: "on-track" | "at-risk" | "delayed";
  roi: number;
  strategicValue: "transformational" | "high-impact" | "standard";
}

interface StrategicProjectsData {
  totalProjects: number;
  activeProjects: number;
  completedThisQuarter: number;
  onTimePercentage: number;
  onBudgetPercentage: number;
  averageROI: number;
  totalBudget: number;
  totalSpent: number;
  projects: ProjectMetrics[];
  atRiskProjects: ProjectMetrics[];
  criticalPath: {
    projectName: string;
    milestone: string;
    dueDate: string;
    blockers: number;
  }[];
}

function ProjectStatusBadge({ status }: { status: ProjectMetrics["status"] }) {
  const config = {
    planning: {
      label: "Planning",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    on_hold: {
      label: "On Hold",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    },
    completed: {
      label: "Completed",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    },
  };

  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      {label}
    </Badge>
  );
}

function ProjectHealthIndicator({ health }: { health: ProjectMetrics["healthStatus"] }) {
  const config = {
    "on-track": {
      icon: CheckCircle,
      label: "On Track",
      color: "text-green-600 dark:text-green-400",
    },
    "at-risk": {
      icon: AlertTriangle,
      label: "At Risk",
      color: "text-yellow-600 dark:text-yellow-400",
    },
    delayed: {
      icon: AlertCircle,
      label: "Delayed",
      color: "text-red-600 dark:text-red-400",
    },
  };

  const { icon: Icon, label, color } = config[health];

  return (
    <div className={cn("flex items-center gap-1 text-xs", color)}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectMetrics }) {
  const budgetUtilization = (project.spent / project.budget) * 100;
  const isBudgetConcern = budgetUtilization > 90;

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground">{project.name}</h4>
              {project.strategicValue === "transformational" && (
                <Zap className="w-3 h-3 text-purple-500" title="Transformational Initiative" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <ProjectHealthIndicator health={project.healthStatus} />
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              project.priority === "critical" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
              project.priority === "high" && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
            )}
          >
            {project.priority.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground">Budget</p>
            <p className={cn("font-semibold", isBudgetConcern && "text-red-600 dark:text-red-400")}>
              £{project.spent.toLocaleString()} / £{project.budget.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Timeline</p>
            <p className={cn("font-semibold", project.daysRemaining < 7 && "text-yellow-600 dark:text-yellow-400")}>
              {project.daysRemaining > 0 ? `${project.daysRemaining} days left` : "Overdue"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {project.teamSize}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              ROI {project.roi}%
            </span>
          </div>
          <button className="text-xs text-primary hover:underline">Details →</button>
        </div>
      </div>
    </div>
  );
}

export function StrategicProjects() {
  const { data, isLoading, error } = useQuery<StrategicProjectsData>({
    queryKey: ["/api/executive/strategic-projects"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Strategic Projects Portfolio
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
            Strategic Projects Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load strategic projects data at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Strategic Projects Portfolio
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active Projects</p>
            <p className="text-2xl font-bold">{data.activeProjects}</p>
            <p className="text-xs text-muted-foreground">of {data.totalProjects} total</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">On Time</p>
            <p className={cn("text-2xl font-bold", data.onTimePercentage >= 80 ? "text-green-600" : "text-yellow-600")}>
              {data.onTimePercentage}%
            </p>
            <p className="text-xs text-muted-foreground">delivery rate</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">On Budget</p>
            <p
              className={cn("text-2xl font-bold", data.onBudgetPercentage >= 75 ? "text-green-600" : "text-yellow-600")}
            >
              {data.onBudgetPercentage}%
            </p>
            <p className="text-xs text-muted-foreground">within budget</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg ROI</p>
            <p className="text-2xl font-bold text-blue-600">{data.averageROI}%</p>
            <p className="text-xs text-muted-foreground">expected return</p>
          </div>
        </div>

        {/* Budget Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Portfolio Budget Utilization</span>
            <span className="text-sm font-semibold">
              £{data.totalSpent.toLocaleString()} / £{data.totalBudget.toLocaleString()}
            </span>
          </div>
          <Progress value={(data.totalSpent / data.totalBudget) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {((data.totalSpent / data.totalBudget) * 100).toFixed(1)}% of total budget allocated
          </p>
        </div>

        {/* At Risk Alert */}
        {data.atRiskProjects.length > 0 && (
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  {data.atRiskProjects.length} Project{data.atRiskProjects.length !== 1 ? "s" : ""} Need Attention
                </h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Projects at risk of missing deadlines or exceeding budgets
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Critical Path Milestones */}
        {data.criticalPath.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-foreground">Critical Path Milestones</h3>
            </div>
            <div className="space-y-2">
              {data.criticalPath.map((milestone, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        {milestone.projectName}
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">{milestone.milestone}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-purple-600 dark:text-purple-400">
                        <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                        {milestone.blockers > 0 && <span>{milestone.blockers} blocker(s)</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Projects List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Active Strategic Projects</h3>
            <button className="text-xs text-primary hover:underline flex items-center gap-1">
              View All
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {data.projects
                .filter((p) => p.status === "in_progress" || p.status === "planning")
                .slice(0, 10)
                .map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* Completed This Quarter */}
        {data.completedThisQuarter > 0 && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  {data.completedThisQuarter} Projects Completed This Quarter
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Strong execution momentum maintained
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
