import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, PoundSterling, Users, FolderOpen, Ticket, ExternalLink, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardKPIs {
  revenue: { current: number; target: number; growth: number };
  pipeline: { current: number; target: number; growth: number };
  projects: { current: number; target: number; growth: number };
  tickets: { current: number; target: number; growth: number };
}

interface KPICardProps {
  title: string;
  current: number;
  target: number;
  growth: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "success" | "primary" | "warning" | "accent";
  formatter?: (value: number) => string;
  analyticsLink?: string;
  description?: string;
}

function KPICard({ title, current, target, growth, icon: Icon, color, formatter = (v) => v.toString(), analyticsLink, description }: KPICardProps) {
  const progress = Math.min((current / target) * 100, 100);

  const colorClasses = {
    success: {
      bg: "bg-success/10",
      text: "text-success",
      progress: "bg-success",
      hover: "hover:bg-success/20",
    },
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      progress: "bg-primary",
      hover: "hover:bg-primary/20",
    },
    warning: {
      bg: "bg-warning/10",
      text: "text-warning",
      progress: "bg-warning",
      hover: "hover:bg-warning/20",
    },
    accent: {
      bg: "bg-accent/10",
      text: "text-accent-foreground",
      progress: "bg-accent-foreground",
      hover: "hover:bg-accent/20",
    },
  };

  const classes = colorClasses[color];
  const TrendIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;
  const trendColor = growth > 0 ? "text-success" : growth < 0 ? "text-destructive" : "text-warning";

  const handleAnalyticsClick = () => {
    if (analyticsLink) {
      window.location.href = analyticsLink;
    }
  };

  return (
    <Card
      className={cn(
        "glassmorphism animate-slide-up transition-all duration-200 relative group",
        analyticsLink && "cursor-pointer hover:shadow-lg border-2 hover:border-primary/20"
      )}
      data-testid={`card-kpi-${title.toLowerCase().replace(' ', '-')}`}
      onClick={analyticsLink ? handleAnalyticsClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg transition-colors", classes.bg, analyticsLink && classes.hover)}>
            <Icon className={cn("w-6 h-6", classes.text)} />
          </div>
          <div className="flex items-center space-x-2">
            <div className={cn("flex items-center space-x-1 text-sm", trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span data-testid={`text-growth-${title.toLowerCase().replace(' ', '-')}`}>
                {growth > 0 ? '+' : ''}{growth}%
              </span>
            </div>
            {analyticsLink && (
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          </div>
          <div
            className="text-2xl font-bold text-foreground"
            data-testid={`text-current-${title.toLowerCase().replace(' ', '-')}`}
          >
            {formatter(current)}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Target: <span data-testid={`text-target-${title.toLowerCase().replace(' ', '-')}`}>{formatter(target)}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {progress.toFixed(0)}% of target
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            data-testid={`progress-${title.toLowerCase().replace(' ', '-')}`}
          />
          {analyticsLink && (
            <div className="flex items-center justify-between pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground">Click for detailed analysis</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardKPIsProps {
  userRole?: 'admin' | 'manager' | 'employee';
}

export function DashboardKPIs({ userRole = 'employee' }: DashboardKPIsProps) {
  const { data: kpis, isLoading, error } = useQuery<DashboardKPIs>({
    queryKey: ["/api/dashboard/kpis"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glassmorphism animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="glassmorphism">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Failed to load KPIs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => `£${value.toLocaleString()}`;

  // Role-based KPI selection
  const getKPIsForRole = () => {
    const baseKPIs = [
      {
        title: "Monthly Revenue",
        current: kpis.revenue.current,
        target: kpis.revenue.target,
        growth: kpis.revenue.growth,
        icon: PoundSterling,
        color: "success" as const,
        formatter: formatCurrency,
        analyticsLink: "/analytics?tab=financial",
        description: "Current month revenue vs target",
        roles: ['admin', 'manager']
      },
      {
        title: "Pipeline Value",
        current: kpis.pipeline.current,
        target: kpis.pipeline.target,
        growth: kpis.pipeline.growth,
        icon: TrendingUp,
        color: "primary" as const,
        formatter: formatCurrency,
        analyticsLink: "/analytics?tab=financial",
        description: "Pending opportunities in sales pipeline",
        roles: ['admin', 'manager']
      },
      {
        title: "Active Projects",
        current: kpis.projects.current,
        target: kpis.projects.target,
        growth: kpis.projects.growth,
        icon: FolderOpen,
        color: "warning" as const,
        analyticsLink: "/analytics?tab=projects",
        description: "Projects in progress and planning",
        roles: ['admin', 'manager', 'employee']
      },
      {
        title: "Team Utilization",
        current: Math.round((kpis.tickets.current / kpis.tickets.target) * 100),
        target: 100,
        growth: kpis.tickets.growth,
        icon: Users,
        color: "accent" as const,
        formatter: (v: number) => `${v}%`,
        analyticsLink: "/analytics?tab=team",
        description: "Average team capacity utilization",
        roles: ['admin', 'manager']
      },
      {
        title: "My Tasks",
        current: kpis.tickets.current, // In a real app, this would be user-specific
        target: kpis.tickets.target,
        growth: kpis.tickets.growth,
        icon: Ticket,
        color: "primary" as const,
        analyticsLink: "/tasks",
        description: "Your assigned tasks and progress",
        roles: ['employee']
      }
    ];

    // Filter KPIs based on user role
    const roleKPIs = baseKPIs.filter(kpi => kpi.roles.includes(userRole));

    // Ensure we always show 4 KPIs, add most relevant ones if needed
    if (roleKPIs.length < 4) {
      const additionalKPIs = baseKPIs.filter(kpi => !roleKPIs.includes(kpi));
      roleKPIs.push(...additionalKPIs.slice(0, 4 - roleKPIs.length));
    }

    return roleKPIs.slice(0, 4);
  };

  const displayKPIs = getKPIsForRole();

  return (
    <div className="space-y-4">
      {/* Role-based header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {userRole === 'admin' ? 'Executive Overview' :
             userRole === 'manager' ? 'Management Dashboard' :
             'My Dashboard'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {userRole === 'admin' ? 'Key business metrics and performance indicators' :
             userRole === 'manager' ? 'Team performance and project metrics' :
             'Your tasks and project assignments'}
          </p>
        </div>
        {userRole !== 'employee' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/analytics'}
            className="text-xs"
          >
            View Analytics
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" data-testid="dashboard-kpis">
        {displayKPIs.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            current={kpi.current}
            target={kpi.target}
            growth={kpi.growth}
            icon={kpi.icon}
            color={kpi.color}
            formatter={kpi.formatter}
            analyticsLink={kpi.analyticsLink}
            description={kpi.description}
          />
        ))}
      </div>
    </div>
  );
}
