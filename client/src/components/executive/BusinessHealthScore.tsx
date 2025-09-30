import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthMetric {
  category: string;
  score: number;
  weight: number;
  status: "excellent" | "good" | "fair" | "poor";
  trend: "up" | "down" | "stable";
  indicators: string[];
}

interface BusinessHealthData {
  overallScore: number;
  status: "excellent" | "good" | "fair" | "poor";
  metrics: HealthMetric[];
  lastUpdated: string;
  recommendations: string[];
}

const statusConfig = {
  excellent: {
    label: "Excellent",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500",
    badgeBg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    min: 80,
  },
  good: {
    label: "Good",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    min: 60,
  },
  fair: {
    label: "Fair",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500",
    badgeBg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    min: 40,
  },
  poor: {
    label: "Poor",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500",
    badgeBg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    min: 0,
  },
};

function HealthGauge({ score, status }: { score: number; status: "excellent" | "good" | "fair" | "poor" }) {
  const config = statusConfig[status];
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-48 h-24 mx-auto">
      {/* Gauge background */}
      <svg className="w-full h-full" viewBox="0 0 200 100">
        <path
          d="M 10 90 A 90 90 0 0 1 190 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted opacity-20"
        />
        <path
          d="M 10 90 A 90 90 0 0 1 190 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeDasharray={`${(score / 100) * 283} 283`}
          className={cn(config.color)}
        />
      </svg>

      {/* Center score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn("text-5xl font-bold", config.color)}>{score}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">/ 100</div>
      </div>
    </div>
  );
}

export function BusinessHealthScore() {
  const { data, isLoading, error } = useQuery<BusinessHealthData>({
    queryKey: ["/api/executive/business-health"],
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Business Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded"></div>
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
            Health Score Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to calculate business health score at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[data.status];

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Business Health Score
          </CardTitle>
          <Badge className={config.badgeBg}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Gauge */}
        <div className="text-center">
          <HealthGauge score={data.overallScore} status={data.status} />
          <p className="text-sm text-muted-foreground mt-4">
            Overall business health across all key metrics
          </p>
        </div>

        {/* Metric Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Health Components</h4>
          {data.metrics.map((metric, idx) => {
            const metricConfig = statusConfig[metric.status];
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{metric.category}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold", metricConfig.color)}>
                      {metric.score}
                    </span>
                    <span className="text-muted-foreground">({metric.weight}%)</span>
                  </div>
                </div>
                <Progress value={metric.score} className={cn("h-2", metricConfig.bg)} />
                {metric.indicators.length > 0 && (
                  <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                    {metric.indicators.map((indicator, i) => (
                      <li key={i} className="list-disc">
                        {indicator}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Key Recommendations
            </h4>
            <ul className="space-y-2">
              {data.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4 border-t">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
