import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, FolderOpen, Ticket } from "lucide-react";
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
}

function KPICard({ title, current, target, growth, icon: Icon, color, formatter = (v) => v.toString() }: KPICardProps) {
  const progress = Math.min((current / target) * 100, 100);
  
  const colorClasses = {
    success: {
      bg: "bg-success/10",
      text: "text-success",
      progress: "bg-success",
    },
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      progress: "bg-primary",
    },
    warning: {
      bg: "bg-warning/10",
      text: "text-warning",
      progress: "bg-warning",
    },
    accent: {
      bg: "bg-accent/10",
      text: "text-accent-foreground",
      progress: "bg-accent-foreground",
    },
  };

  const classes = colorClasses[color];
  const TrendIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;
  const trendColor = growth > 0 ? "text-success" : growth < 0 ? "text-destructive" : "text-warning";

  return (
    <Card className="glassmorphism animate-slide-up" data-testid={`card-kpi-${title.toLowerCase().replace(' ', '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg", classes.bg)}>
            <Icon className={cn("w-6 h-6", classes.text)} />
          </div>
          <div className={cn("flex items-center space-x-1 text-sm", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span data-testid={`text-growth-${title.toLowerCase().replace(' ', '-')}`}>
              {growth > 0 ? '+' : ''}{growth}%
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div 
            className="text-2xl font-bold text-foreground" 
            data-testid={`text-current-${title.toLowerCase().replace(' ', '-')}`}
          >
            {formatter(current)}
          </div>
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
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardKPIs() {
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

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" data-testid="dashboard-kpis">
      <KPICard
        title="Total Revenue"
        current={kpis.revenue.current}
        target={kpis.revenue.target}
        growth={kpis.revenue.growth}
        icon={DollarSign}
        color="success"
        formatter={formatCurrency}
      />
      <KPICard
        title="Pipeline Value"
        current={kpis.pipeline.current}
        target={kpis.pipeline.target}
        growth={kpis.pipeline.growth}
        icon={TrendingUp}
        color="primary"
        formatter={formatCurrency}
      />
      <KPICard
        title="Active Projects"
        current={kpis.projects.current}
        target={kpis.projects.target}
        growth={kpis.projects.growth}
        icon={FolderOpen}
        color="warning"
      />
      <KPICard
        title="Open Tickets"
        current={kpis.tickets.current}
        target={kpis.tickets.target}
        growth={kpis.tickets.growth}
        icon={Ticket}
        color="accent"
      />
    </div>
  );
}
