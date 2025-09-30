import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FinancialMetric {
  label: string;
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down";
  format: "currency" | "percentage";
}

interface FinancialAlert {
  type: "warning" | "critical" | "info";
  message: string;
  action?: string;
}

interface FinancialPerformanceData {
  period: string;
  metrics: {
    revenue: FinancialMetric;
    expenses: FinancialMetric;
    profit: FinancialMetric;
    pipeline: FinancialMetric;
  };
  trend: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  alerts: FinancialAlert[];
  profitMargin: number;
  conversionRate: number;
}

export function FinancialPerformance() {
  const [showDetails, setShowDetails] = useState(false);
  const { data, isLoading, error } = useQuery<FinancialPerformanceData>({
    queryKey: ["/api/executive/financial-summary"],
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Financial Data Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load financial performance data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number, format: "currency" | "percentage") => {
    if (format === "currency") {
      return `£${(value / 1000).toFixed(1)}K`;
    }
    return `${value.toFixed(1)}%`;
  };

  const MetricRow = ({ metric }: { metric: FinancialMetric }) => {
    const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;
    const trendColor =
      metric.trend === "up"
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

    return (
      <div className="flex items-center justify-between py-3 border-b last:border-0">
        <span className="text-sm font-medium text-muted-foreground">{metric.label}:</span>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-foreground">
            {formatValue(metric.current, metric.format)}
          </span>
          <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span>{metric.change > 0 ? "+" : ""}{formatValue(metric.change, "percentage")}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            vs {formatValue(metric.previous, metric.format)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Performance
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{data.period}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            <FileText className="w-4 h-4 mr-2" />
            {showDetails ? "Hide" : "Show"} Details
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="space-y-1">
          <MetricRow metric={data.metrics.revenue} />
          <MetricRow metric={data.metrics.expenses} />
          <MetricRow metric={data.metrics.profit} />
          <MetricRow metric={data.metrics.pipeline} />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Profit Margin</p>
            <p className="text-2xl font-bold text-foreground">{data.profitMargin.toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold text-foreground">{data.conversionRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Trend Chart */}
        {showDetails && data.trend.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-4">6-Month Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  name="Expenses"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Financial Alerts
            </h4>
            {data.alerts.map((alert, idx) => {
              const alertConfig = {
                warning: {
                  bg: "bg-yellow-50 dark:bg-yellow-950",
                  border: "border-yellow-200 dark:border-yellow-800",
                  text: "text-yellow-800 dark:text-yellow-200",
                },
                critical: {
                  bg: "bg-red-50 dark:bg-red-950",
                  border: "border-red-200 dark:border-red-800",
                  text: "text-red-800 dark:text-red-200",
                },
                info: {
                  bg: "bg-blue-50 dark:bg-blue-950",
                  border: "border-blue-200 dark:border-blue-800",
                  text: "text-blue-800 dark:text-blue-200",
                },
              };

              const config = alertConfig[alert.type];

              return (
                <div
                  key={idx}
                  className={cn("p-3 rounded-lg border flex items-start justify-between", config.bg, config.border)}
                >
                  <p className={cn("text-sm flex-1", config.text)}>{alert.message}</p>
                  {alert.action && (
                    <Button variant="ghost" size="sm" className={cn("ml-2", config.text)}>
                      {alert.action}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
