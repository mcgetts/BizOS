import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  TrendingUpIcon,
  Wallet,
  Users,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveKPI {
  id: string;
  title: string;
  value: string;
  change: number;
  trend: "up" | "down" | "stable";
  target?: string;
  subtitle: string;
  status: "excellent" | "good" | "warning" | "critical";
  icon: "revenue" | "growth" | "ebitda" | "cash" | "cac" | "efficiency";
}

interface ExecutiveKPIsData {
  kpis: ExecutiveKPI[];
  lastUpdated: string;
}

const iconMap = {
  revenue: DollarSign,
  growth: TrendingUpIcon,
  ebitda: Wallet,
  cash: Activity,
  cac: Users,
  efficiency: Target,
};

const statusColors = {
  excellent: {
    bg: "bg-green-500/10 dark:bg-green-500/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  good: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  warning: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  critical: {
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

function ExecutiveKPICard({ kpi }: { kpi: ExecutiveKPI }) {
  const Icon = iconMap[kpi.icon];
  const colors = statusColors[kpi.status];
  const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    kpi.trend === "up"
      ? "text-green-600 dark:text-green-400"
      : kpi.trend === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-400";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2",
        colors.border
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-xl", colors.bg)}>
            <Icon className={cn("w-6 h-6", colors.text)} />
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon className={cn("w-4 h-4", trendColor)} />
            <span className={cn("text-sm font-semibold", trendColor)}>
              {kpi.change > 0 ? "+" : ""}
              {kpi.change}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {kpi.title}
          </h3>
          <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
          <p className="text-sm text-muted-foreground">{kpi.subtitle}</p>
          {kpi.target && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">Target: {kpi.target}</span>
              <Badge variant="outline" className={cn("text-xs", colors.badge)}>
                {kpi.status.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutiveKPIGrid() {
  const { data, isLoading, error } = useQuery<ExecutiveKPIsData>({
    queryKey: ["/api/executive/kpis"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Failed to load executive KPIs</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please refresh the page or contact support
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Strategic Performance Metrics</h2>
        <span className="text-sm text-muted-foreground">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.kpis.map((kpi) => (
          <ExecutiveKPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}
