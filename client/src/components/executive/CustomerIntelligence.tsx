import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Target,
  ArrowRight,
  Star,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientData {
  id: number;
  name: string;
  revenue: number;
  healthScore: number;
  status: "healthy" | "warning" | "at-risk";
  lastActivity: string;
  activeProjects: number;
  npsScore: number | null;
}

interface CustomerIntelligenceData {
  totalClients: number;
  activeClients: number;
  monthOverMonthGrowth: number;
  churnRate: number;
  averageHealthScore: number;
  averageNPS: number;
  totalRevenue: number;
  averageRevenuePerClient: number;
  topClients: ClientData[];
  atRiskClients: ClientData[];
  upsellOpportunities: {
    clientName: string;
    estimatedValue: number;
    confidence: number;
    reasoning: string;
  }[];
}

function ClientHealthBadge({ status }: { status: "healthy" | "warning" | "at-risk" }) {
  const config = {
    healthy: {
      icon: CheckCircle,
      label: "Healthy",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    warning: {
      icon: AlertTriangle,
      label: "Warning",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    },
    "at-risk": {
      icon: AlertCircle,
      label: "At Risk",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function ClientRow({ client }: { client: ClientData }) {
  return (
    <div className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">{client.name}</h4>
            <ClientHealthBadge status={client.status} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Health Score</span>
              <span className="font-medium">{client.healthScore}%</span>
            </div>
            <Progress value={client.healthScore} className="h-1.5" />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              £{client.revenue.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {client.activeProjects} project{client.activeProjects !== 1 ? "s" : ""}
            </span>
            {client.npsScore !== null && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                NPS {client.npsScore}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerIntelligence() {
  const { data, isLoading, error } = useQuery<CustomerIntelligenceData>({
    queryKey: ["/api/executive/customer-intelligence"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Intelligence
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
            Customer Intelligence Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load customer intelligence data at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const growthTrend = data.monthOverMonthGrowth >= 0 ? "up" : "down";
  const GrowthIcon = growthTrend === "up" ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Intelligence
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Clients</p>
            <p className="text-2xl font-bold">{data.totalClients}</p>
            <div className="flex items-center gap-1 text-xs">
              <GrowthIcon className={cn("w-3 h-3", growthTrend === "up" ? "text-green-600" : "text-red-600")} />
              <span className={cn(growthTrend === "up" ? "text-green-600" : "text-red-600")}>
                {Math.abs(data.monthOverMonthGrowth).toFixed(1)}% MoM
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Health</p>
            <p className="text-2xl font-bold">{data.averageHealthScore.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {data.activeClients} active
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Churn Risk</p>
            <p className="text-2xl font-bold text-yellow-600">{data.atRiskClients.length}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {data.churnRate.toFixed(1)}% rate
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Revenue</p>
            <p className="text-2xl font-bold">£{Math.round(data.averageRevenuePerClient / 1000)}K</p>
            <p className="text-xs text-muted-foreground">
              NPS {data.averageNPS.toFixed(0)}
            </p>
          </div>
        </div>

        {/* At Risk Clients Alert */}
        {data.atRiskClients.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                  {data.atRiskClients.length} Client{data.atRiskClients.length !== 1 ? "s" : ""} at Risk
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Immediate attention required · Estimated revenue at risk: £
                  {data.atRiskClients.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Clients by Revenue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Top Clients by Revenue</h3>
            <button className="text-xs text-primary hover:underline flex items-center gap-1">
              View All
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {data.topClients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Upsell Opportunities */}
        {data.upsellOpportunities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-foreground">AI-Identified Opportunities</h3>
            </div>
            <div className="space-y-2">
              {data.upsellOpportunities.slice(0, 3).map((opp, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {opp.clientName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {opp.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    {opp.reasoning}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                      Est. Value: £{opp.estimatedValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
