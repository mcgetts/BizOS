import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Users,
  AlertTriangle,
  CheckCircle,
  Star,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Award,
  Zap
} from "lucide-react";
import { formatDuration, getPerformanceColor } from "@shared/supportAnalytics";

interface SupportAnalyticsProps {
  className?: string;
}

export default function SupportAnalytics({ className }: SupportAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Analytics data queries
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/support/analytics/dashboard", selectedPeriod],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: agentPerformance, isLoading: agentLoading } = useQuery({
    queryKey: ["/api/support/analytics/agent-performance", selectedPeriod],
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/support/analytics/trends", selectedPeriod],
  });

  const { data: volumeByCategory } = useQuery({
    queryKey: ["/api/support/analytics/volume-by-category", selectedPeriod],
  });

  const { data: responseMetrics } = useQuery({
    queryKey: ["/api/support/analytics/response-times", selectedPeriod],
  });

  const { data: slaCompliance } = useQuery({
    queryKey: ["/api/support/analytics/sla-compliance", selectedPeriod],
  });

  const kpis = dashboardData?.kpis;
  const predictions = dashboardData?.predictions;

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const getKPIColor = (metric: string, value: number, isGrowth: boolean = false) => {
    if (isGrowth) {
      return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
    }

    switch (metric) {
      case 'slaCompliance':
        return value >= 95 ? 'text-green-600' : value >= 85 ? 'text-yellow-600' : 'text-red-600';
      case 'satisfaction':
        return value >= 4.5 ? 'text-green-600' : value >= 3.5 ? 'text-yellow-600' : 'text-red-600';
      case 'escalation':
        return value <= 10 ? 'text-green-600' : value <= 20 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  if (dashboardLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Support Analytics</h2>
          <div className="animate-pulse h-10 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Support Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into support performance and trends
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glassmorphism">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{formatNumber(kpis?.totalTickets || 0)}</p>
                <div className="flex items-center mt-1">
                  {(kpis?.ticketVolumeGrowth || 0) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${getKPIColor('growth', kpis?.ticketVolumeGrowth || 0, true)}`}>
                    {kpis?.ticketVolumeGrowth ? formatPercentage(Math.abs(kpis.ticketVolumeGrowth)) : '0%'}
                  </span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {kpis?.avgFirstResponseTime ? formatDuration(kpis.avgFirstResponseTime) : 'N/A'}
                </p>
                <Badge
                  variant={getPerformanceColor('responseTime', kpis?.avgFirstResponseTime || 0) === 'green' ? 'default' : 'destructive'}
                  className="mt-2"
                >
                  {getPerformanceColor('responseTime', kpis?.avgFirstResponseTime || 0) === 'green' ? 'On Target' : 'Needs Improvement'}
                </Badge>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                <p className={`text-2xl font-bold ${getKPIColor('slaCompliance', kpis?.slaComplianceRate || 0)}`}>
                  {formatPercentage(kpis?.slaComplianceRate || 0)}
                </p>
                <Progress value={kpis?.slaComplianceRate || 0} className="mt-2 h-2" />
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Satisfaction</p>
                <p className={`text-2xl font-bold ${getKPIColor('satisfaction', kpis?.customerSatisfactionScore || 0)}`}>
                  {kpis?.customerSatisfactionScore ? kpis.customerSatisfactionScore.toFixed(1) : 'N/A'}
                </p>
                <div className="flex mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(kpis?.customerSatisfactionScore || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Insights */}
      {predictions && (
        <Card className="glassmorphism">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Next Week Forecast</h4>
                <p className="text-2xl font-bold text-blue-600">{predictions.nextWeekVolume} tickets</p>
                <p className="text-sm text-muted-foreground">Expected volume</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Potential Bottlenecks</h4>
                {predictions.potentialBottlenecks.length > 0 ? (
                  <ul className="space-y-1">
                    {predictions.potentialBottlenecks.map((bottleneck: string, index: number) => (
                      <li key={index} className="flex items-center text-sm">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                        {bottleneck}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    No bottlenecks detected
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recommended Actions</h4>
                {predictions.recommendedActions.length > 0 ? (
                  <ul className="space-y-1">
                    {predictions.recommendedActions.map((action: string, index: number) => (
                      <li key={index} className="text-sm text-blue-600">
                        • {action}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-600">No actions needed</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="w-5 h-5 mr-2" />
                  Tickets by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {volumeByCategory && volumeByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={volumeByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {volumeByCategory.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.priorityDistribution && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trends.priorityDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Metrics */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Response Time Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {responseMetrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average</p>
                        <p className="text-lg font-semibold">
                          {formatDuration(responseMetrics.avgResponseTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Median</p>
                        <p className="text-lg font-semibold">
                          {formatDuration(responseMetrics.medianResponseTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">90th Percentile</p>
                        <p className="text-lg font-semibold">
                          {formatDuration(responseMetrics.p90ResponseTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Response Rate</p>
                        <p className="text-lg font-semibold">
                          {formatPercentage(responseMetrics.responseRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SLA Compliance by Priority */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>SLA Compliance by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {slaCompliance?.byPriority && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={slaCompliance.byPriority}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="complianceRate" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Ticket Volume Trend */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Ticket Volume Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.ticketVolume && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trends.ticketVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Response & Resolution Time Trends */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Response & Resolution Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.responseTimeTrend && trends?.resolutionTimeTrend && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends.responseTimeTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgMinutes" stroke="#8884d8" name="Response Time (min)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Agent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentPerformance && agentPerformance.length > 0 ? (
                <div className="space-y-4">
                  {agentPerformance.map((agent: any) => (
                    <div key={agent.userId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{agent.userName}</h4>
                        <Badge
                          variant={
                            agent.efficiencyRating === 'excellent' ? 'default' :
                            agent.efficiencyRating === 'good' ? 'secondary' :
                            agent.efficiencyRating === 'average' ? 'outline' : 'destructive'
                          }
                        >
                          {agent.efficiencyRating}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tickets Assigned</p>
                          <p className="font-semibold">{agent.ticketsAssigned}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tickets Resolved</p>
                          <p className="font-semibold">{agent.ticketsResolved}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Response</p>
                          <p className="font-semibold">{formatDuration(agent.avgResponseTime)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Satisfaction</p>
                          <p className="font-semibold">
                            {agent.customerSatisfaction ? agent.customerSatisfaction.toFixed(1) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-1">Workload Score</p>
                        <Progress value={agent.workloadScore} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No agent performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}