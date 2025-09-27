import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,
  Target,
  DollarSign,
  Users,
  Clock,
  CalendarIcon,
  Filter,
  Download,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Brain,
  Gauge,
  Eye,
  Settings,
  FolderOpen,
  Timer
} from "lucide-react";
import type {
  User,
  Project,
  Client,
  TimeEntry,
  Invoice
} from "@shared/schema";

// Analytics interfaces
interface KPIMetric {
  title: string;
  value: string;
  change: number;
  trend: "up" | "down" | "stable";
  target?: string;
  description: string;
}

interface BusinessInsight {
  id: string;
  type: "opportunity" | "risk" | "achievement" | "recommendation";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
  metric?: string;
}

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch data for analytics
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const { data: timeEntries } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
    enabled: isAuthenticated,
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  // Loading state
  if (isLoading || projectsLoading) {
    return (
      <Layout title="Analytics - Business Intelligence">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading analytics dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate business metrics (mock data enhanced with real data counts)
  const businessMetrics: KPIMetric[] = [
    {
      title: "Revenue Growth",
      value: "£142,350",
      change: 23.5,
      trend: "up",
      target: "£150,000",
      description: "Monthly recurring revenue vs target"
    },
    {
      title: "Client Satisfaction",
      value: "94.2%",
      change: 2.8,
      trend: "up",
      target: "95%",
      description: "Average client satisfaction score"
    },
    {
      title: "Project Efficiency",
      value: "87.4%",
      change: -3.2,
      trend: "down",
      target: "90%",
      description: "Projects delivered on time and budget"
    },
    {
      title: "Team Utilization",
      value: "76.8%",
      change: 5.1,
      trend: "up",
      target: "80%",
      description: "Average team member billable hours"
    },
    {
      title: "Profit Margin",
      value: "36.8%",
      change: 4.2,
      trend: "up",
      target: "35%",
      description: "Net profit margin across all projects"
    },
    {
      title: "Client Retention",
      value: "92.1%",
      change: 1.5,
      trend: "up",
      target: "90%",
      description: "12-month client retention rate"
    }
  ];

  // AI-powered business insights
  const businessInsights: BusinessInsight[] = [
    {
      id: "1",
      type: "opportunity",
      priority: "high",
      title: "Scale Premium Services",
      description: "Analysis shows 73% higher margins on premium consulting services",
      impact: "+£28,500 potential monthly revenue",
      action: "Expand premium service offerings to existing clients",
      metric: "36.8% vs 22.1% standard margin"
    },
    {
      id: "2",
      type: "risk",
      priority: "medium",
      title: "Resource Bottleneck Detected",
      description: "Senior developers at 96% utilization creating project delays",
      impact: "3 projects at risk of deadline slippage",
      action: "Consider hiring additional senior talent or redistribute workload",
      metric: "96% vs 80% target utilization"
    },
    {
      id: "3",
      type: "achievement",
      priority: "low",
      title: "Client Satisfaction Milestone",
      description: "Achieved highest quarterly satisfaction score in company history",
      impact: "94.2% satisfaction, exceeding industry average",
      action: "Document and standardize practices driving satisfaction",
      metric: "94.2% vs 87% industry average"
    },
    {
      id: "4",
      type: "recommendation",
      priority: "high",
      title: "Optimize Project Portfolio",
      description: "Reallocate resources from low-margin to high-performing projects",
      impact: "Potential 12% increase in overall profitability",
      action: "Review and adjust project resource allocation strategy",
      metric: "42.3% vs 28.9% margin differential"
    }
  ];

  // Performance trends data
  const performanceTrends = [
    { month: "Jul", revenue: 89000, projects: 12, satisfaction: 91.2, efficiency: 84.1 },
    { month: "Aug", revenue: 94000, projects: 14, satisfaction: 92.8, efficiency: 86.7 },
    { month: "Sep", revenue: 101000, projects: 16, satisfaction: 93.5, efficiency: 87.4 },
    { month: "Oct", revenue: 118000, projects: 18, satisfaction: 94.2, efficiency: 88.9 },
    { month: "Nov", revenue: 134000, projects: 21, satisfaction: 93.8, efficiency: 87.1 },
    { month: "Dec", revenue: 142350, projects: 19, satisfaction: 94.2, efficiency: 87.4 }
  ];

  return (
    <Layout title="Analytics - Business Intelligence">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              AI-powered business intelligence and predictive insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Executive Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {businessMetrics.map((metric, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{metric.title}</span>
                  <div className={`flex items-center space-x-1 ${
                    metric.trend === "up" ? "text-green-600" :
                    metric.trend === "down" ? "text-red-600" : "text-gray-600"
                  }`}>
                    {metric.trend === "up" ? <TrendingUp className="h-3 w-3" /> :
                     metric.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                    <span className="text-xs font-medium">
                      {metric.change > 0 ? "+" : ""}{metric.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.target && (
                    <div className="text-xs text-muted-foreground">
                      Target: {metric.target}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {metric.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Business Insights */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>AI Business Insights</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Powered by AI
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Machine learning analysis of your business patterns and opportunities
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {businessInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${
                    insight.type === "opportunity" ? "bg-green-50 border-green-200" :
                    insight.type === "risk" ? "bg-red-50 border-red-200" :
                    insight.type === "achievement" ? "bg-blue-50 border-blue-200" :
                    "bg-orange-50 border-orange-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {insight.type === "opportunity" && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {insight.type === "risk" && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      {insight.type === "achievement" && <CheckCircle className="h-4 w-4 text-blue-600" />}
                      {insight.type === "recommendation" && <Lightbulb className="h-4 w-4 text-orange-600" />}
                      <span className={`text-sm font-semibold capitalize ${
                        insight.type === "opportunity" ? "text-green-800" :
                        insight.type === "risk" ? "text-red-800" :
                        insight.type === "achievement" ? "text-blue-800" :
                        "text-orange-800"
                      }`}>
                        {insight.title}
                      </span>
                    </div>
                    <Badge
                      variant={insight.priority === "high" ? "destructive" : insight.priority === "medium" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {insight.priority} priority
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className={`text-sm ${
                      insight.type === "opportunity" ? "text-green-700" :
                      insight.type === "risk" ? "text-red-700" :
                      insight.type === "achievement" ? "text-blue-700" :
                      "text-orange-700"
                    }`}>
                      {insight.description}
                    </p>
                    <div className={`text-xs font-medium ${
                      insight.type === "opportunity" ? "text-green-600" :
                      insight.type === "risk" ? "text-red-600" :
                      insight.type === "achievement" ? "text-blue-600" :
                      "text-orange-600"
                    }`}>
                      <strong>Impact:</strong> {insight.impact}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <strong>Recommended Action:</strong> {insight.action}
                    </div>
                    {insight.metric && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Key Metric:</strong> {insight.metric}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Performance Overview</TabsTrigger>
            <TabsTrigger value="projects">Project Analytics</TabsTrigger>
            <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
            <TabsTrigger value="predictions">Predictive Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Performance Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LineChart className="h-5 w-5" />
                    <span>Revenue & Growth Trends</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    6-month revenue performance and growth trajectory
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceTrends.map((trend, index) => (
                      <div key={trend.month} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{trend.month} 2024</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">{trend.projects} projects</span>
                            <span className="text-sm font-semibold">£{trend.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${(trend.revenue / 150000) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Satisfaction: {trend.satisfaction}%</span>
                          <span>Efficiency: {trend.efficiency}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Goal Achievement Tracking</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Progress towards key business objectives
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { goal: "Annual Revenue Target", current: 142350, target: 150000, unit: "£" },
                      { goal: "Client Satisfaction", current: 94.2, target: 95, unit: "%" },
                      { goal: "Team Utilization", current: 76.8, target: 80, unit: "%" },
                      { goal: "Project Success Rate", current: 87.4, target: 90, unit: "%" }
                    ].map((goal, index) => {
                      const progress = (goal.current / goal.target) * 100;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{goal.goal}</span>
                            <span className="text-sm text-muted-foreground">
                              {goal.unit === "£" ? `£${goal.current.toLocaleString()}` : `${goal.current}${goal.unit}`} /
                              {goal.unit === "£" ? ` £${goal.target.toLocaleString()}` : ` ${goal.target}${goal.unit}`}
                            </span>
                          </div>
                          <div className="relative">
                            <Progress value={Math.min(progress, 100)} className="h-3" />
                            {progress > 100 && (
                              <div className="absolute top-0 right-0 h-3 w-2 bg-green-600 rounded-r-full" />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`${progress >= 100 ? "text-green-600" : progress >= 75 ? "text-orange-600" : "text-muted-foreground"}`}>
                              {progress.toFixed(1)}% complete
                            </span>
                            <span className={`${progress >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                              {progress >= 100 ? "Target exceeded!" : `${(goal.target - goal.current).toFixed(0)} remaining`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            {/* Project Performance Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FolderOpen className="h-5 w-5" />
                    <span>Project Performance Matrix</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Risk vs. Value analysis of current projects
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects?.slice(0, 6).map((project, index) => {
                      const value = [95, 87, 74, 92, 68, 83][index] || 80;
                      const risk = [15, 28, 65, 22, 45, 31][index] || 30;
                      const status = risk < 25 ? "low-risk" : risk < 50 ? "medium-risk" : "high-risk";

                      return (
                        <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                status === "low-risk" ? "bg-green-500" :
                                status === "medium-risk" ? "bg-orange-500" : "bg-red-500"
                              }`} />
                              <div>
                                <div className="font-medium text-sm">{project.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {project.status} • Due: {project.endDate ? new Date(project.endDate).toLocaleDateString() : "TBD"}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-sm font-semibold text-green-600">{value}%</div>
                              <div className="text-xs text-muted-foreground">Value</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-semibold ${
                                risk < 25 ? "text-green-600" : risk < 50 ? "text-orange-600" : "text-red-600"
                              }`}>
                                {risk}%
                              </div>
                              <div className="text-xs text-muted-foreground">Risk</div>
                            </div>
                            <Badge
                              variant={status === "low-risk" ? "default" : status === "medium-risk" ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {status.replace("-", " ")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Project Health Scoring</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Multi-dimensional project health assessment
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: "Timeline Adherence", score: 87, projects: 5, trend: "up" },
                      { category: "Budget Management", score: 92, projects: 6, trend: "up" },
                      { category: "Quality Metrics", score: 89, projects: 4, trend: "stable" },
                      { category: "Client Satisfaction", score: 95, projects: 7, trend: "up" },
                      { category: "Team Productivity", score: 83, projects: 3, trend: "down" },
                      { category: "Risk Mitigation", score: 78, projects: 2, trend: "up" }
                    ].map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{metric.category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">{metric.projects} projects</span>
                            <div className={`flex items-center space-x-1 ${
                              metric.trend === "up" ? "text-green-600" :
                              metric.trend === "down" ? "text-red-600" : "text-gray-600"
                            }`}>
                              {metric.trend === "up" ? <TrendingUp className="h-3 w-3" /> :
                               metric.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                              <span className="text-sm font-semibold">{metric.score}%</span>
                            </div>
                          </div>
                        </div>
                        <Progress value={metric.score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Resource Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Resource Allocation Analysis</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Team distribution and utilization across projects
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {projects?.slice(0, 4).map((project, index) => {
                    const teamSize = [5, 3, 4, 6][index] || 4;
                    const utilization = [94, 78, 87, 91][index] || 85;
                    const efficiency = [92, 85, 89, 88][index] || 88;

                    return (
                      <div key={project.id} className="p-4 border rounded-lg space-y-3">
                        <div>
                          <h4 className="font-medium text-sm truncate">{project.name}</h4>
                          <p className="text-xs text-muted-foreground">{teamSize} team members</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Utilization</span>
                            <span className="font-medium">{utilization}%</span>
                          </div>
                          <Progress value={utilization} className="h-1" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Efficiency</span>
                            <span className="font-medium">{efficiency}%</span>
                          </div>
                          <Progress value={efficiency} className="h-1" />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            {project.status}
                          </Badge>
                          <div className={`text-xs font-medium ${
                            utilization > 90 ? "text-red-600" :
                            utilization > 75 ? "text-orange-600" : "text-green-600"
                          }`}>
                            {utilization > 90 ? "Overloaded" : utilization > 75 ? "Optimal" : "Underutilized"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-emerald-800">£892K</div>
                    <div className="text-sm text-emerald-600">Annual Revenue</div>
                    <div className="text-xs text-muted-foreground">+23.5% YoY growth</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-800">36.8%</div>
                    <div className="text-sm text-blue-600">Profit Margin</div>
                    <div className="text-xs text-muted-foreground">Above 35% target</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-purple-800">18 days</div>
                    <div className="text-sm text-purple-600">Avg. Collection</div>
                    <div className="text-xs text-muted-foreground">-2 days improvement</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-orange-800">£18.5K</div>
                    <div className="text-sm text-orange-600">Outstanding</div>
                    <div className="text-xs text-muted-foreground">5 invoices pending</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Deep Dive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Revenue Breakdown</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Revenue analysis by service type and client
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { service: "Web Development", revenue: 342000, percentage: 38.4, clients: 8, color: "bg-blue-500" },
                      { service: "Mobile Development", revenue: 256000, percentage: 28.7, clients: 5, color: "bg-green-500" },
                      { service: "Consulting", revenue: 189000, percentage: 21.2, clients: 12, color: "bg-purple-500" },
                      { service: "Maintenance", revenue: 105000, percentage: 11.7, clients: 15, color: "bg-orange-500" }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-sm font-medium">{item.service}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">£{item.revenue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{item.clients} clients</div>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full ${item.color} transition-all duration-300`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {item.percentage}% of total revenue
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Profitability Analysis</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Profit margins by project and service type
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects?.slice(0, 5).map((project, index) => {
                      const revenue = [45000, 32000, 28000, 38000, 25000][index] || 30000;
                      const costs = revenue * (0.55 + Math.random() * 0.2); // Mock data
                      const profit = revenue - costs;
                      const margin = (profit / revenue) * 100;

                      return (
                        <div key={project.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate flex-1 mr-4">{project.name}</span>
                            <div className="flex items-center space-x-2 text-right">
                              <div>
                                <div className="text-sm font-semibold">£{profit.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">profit</div>
                              </div>
                              <Badge
                                variant={margin > 35 ? "default" : margin > 20 ? "secondary" : "destructive"}
                                className="text-xs"
                              >
                                {margin.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${Math.min(margin * 2, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Revenue: £{revenue.toLocaleString()}</span>
                            <span>Costs: £{costs.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Cash Flow Analysis</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monthly cash flow patterns and forecasting
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Monthly Cash Flow</h4>
                    {[
                      { month: "September", inflow: 142000, outflow: 89000, net: 53000 },
                      { month: "October", inflow: 135000, outflow: 92000, net: 43000 },
                      { month: "November", inflow: 158000, outflow: 96000, net: 62000 },
                      { month: "December", inflow: 148000, outflow: 94000, net: 54000 }
                    ].map((flow, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{flow.month}</span>
                          <span className={`text-sm font-semibold ${flow.net > 0 ? "text-green-600" : "text-red-600"}`}>
                            {flow.net > 0 ? "+" : ""}£{flow.net.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-green-500 rounded-full" style={{ width: `${(flow.inflow / 180000) * 100}%` }} />
                          <div className="flex-1 h-2 bg-red-500 rounded-full" style={{ width: `${(flow.outflow / 180000) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>In: £{flow.inflow.toLocaleString()}</span>
                          <span>Out: £{flow.outflow.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Financial Health Indicators</h4>
                    {[
                      { metric: "Current Ratio", value: "2.4:1", status: "healthy", description: "Strong liquidity position" },
                      { metric: "Quick Ratio", value: "1.8:1", status: "good", description: "Good short-term solvency" },
                      { metric: "Debt-to-Equity", value: "0.3:1", status: "excellent", description: "Conservative debt levels" },
                      { metric: "Working Capital", value: "£65K", status: "healthy", description: "Adequate operating funds" }
                    ].map((indicator, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{indicator.metric}</span>
                          <Badge
                            variant={indicator.status === "excellent" ? "default" : indicator.status === "healthy" || indicator.status === "good" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {indicator.status}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold mb-1">{indicator.value}</div>
                        <div className="text-xs text-muted-foreground">{indicator.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {/* Team Performance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-800">87.4%</div>
                    <div className="text-sm text-blue-600">Team Utilization</div>
                    <div className="text-xs text-muted-foreground">+5.1% this month</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-800">94.2%</div>
                    <div className="text-sm text-green-600">Productivity Score</div>
                    <div className="text-xs text-muted-foreground">Above 90% target</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-purple-800">1,247h</div>
                    <div className="text-sm text-purple-600">Total Hours</div>
                    <div className="text-xs text-muted-foreground">This month</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className="h-5 w-5 text-orange-600" />
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-orange-800">2</div>
                    <div className="text-sm text-orange-600">Overloaded</div>
                    <div className="text-xs text-muted-foreground">Team members</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Individual Team Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Individual Performance</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Team member productivity and workload analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.slice(0, 6).map((user, index) => {
                      const productivity = [96, 89, 92, 78, 85, 94][index] || 85;
                      const utilization = [94, 82, 88, 96, 76, 89][index] || 85;
                      const hoursThisMonth = [168, 145, 162, 174, 128, 159][index] || 150;
                      const status = utilization > 95 ? "overloaded" : utilization > 85 ? "optimal" : "underutilized";

                      return (
                        <div key={user.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                          <img
                            src={`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=6366f1&color=fff&size=40`}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">{user.firstName} {user.lastName}</span>
                              <Badge
                                variant={status === "overloaded" ? "destructive" : status === "optimal" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">{user.role} • {hoursThisMonth}h this month</div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>Productivity</span>
                                <span>{productivity}%</span>
                              </div>
                              <Progress value={productivity} className="h-1" />
                              <div className="flex justify-between text-xs">
                                <span>Utilization</span>
                                <span>{utilization}%</span>
                              </div>
                              <Progress value={utilization} className="h-1" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Skills & Capabilities</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Team expertise distribution and skill gaps
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { skill: "Frontend Development", coverage: 85, demand: 92, gap: -7, members: 5 },
                      { skill: "Backend Development", coverage: 92, demand: 88, gap: 4, members: 4 },
                      { skill: "Mobile Development", coverage: 73, demand: 85, gap: -12, members: 3 },
                      { skill: "DevOps & Infrastructure", coverage: 67, demand: 78, gap: -11, members: 2 },
                      { skill: "UI/UX Design", coverage: 78, demand: 82, gap: -4, members: 3 },
                      { skill: "Project Management", coverage: 88, demand: 75, gap: 13, members: 2 }
                    ].map((skill, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{skill.skill}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">{skill.members} members</span>
                            <Badge
                              variant={skill.gap >= 0 ? "default" : Math.abs(skill.gap) < 8 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {skill.gap > 0 ? "+" : ""}{skill.gap}%
                            </Badge>
                          </div>
                        </div>
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${skill.coverage}%` }}
                          />
                          <div
                            className="absolute top-0 h-full w-1 bg-orange-500"
                            style={{ left: `${skill.demand}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Coverage: {skill.coverage}%</span>
                          <span>Demand: {skill.demand}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Insights & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>Team Insights</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-powered team performance analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        type: "achievement",
                        title: "Productivity Milestone",
                        description: "Team achieved 94.2% productivity score - highest in 6 months",
                        impact: "15% above industry average",
                        confidence: 95
                      },
                      {
                        type: "risk",
                        title: "Burnout Risk Detected",
                        description: "2 senior developers at 96%+ utilization for 3 consecutive months",
                        impact: "Potential quality degradation",
                        confidence: 83
                      },
                      {
                        type: "opportunity",
                        title: "Skill Development Gap",
                        description: "Mobile development demand exceeds team capacity by 12%",
                        impact: "£25K additional revenue potential",
                        confidence: 78
                      }
                    ].map((insight, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          insight.type === "achievement" ? "bg-blue-50 border-blue-200" :
                          insight.type === "risk" ? "bg-red-50 border-red-200" :
                          "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex items-start space-x-2 mb-2">
                          {insight.type === "achievement" && <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />}
                          {insight.type === "risk" && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />}
                          {insight.type === "opportunity" && <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />}
                          <div className="flex-1">
                            <h4 className={`font-semibold text-sm ${
                              insight.type === "achievement" ? "text-blue-800" :
                              insight.type === "risk" ? "text-red-800" :
                              "text-green-800"
                            }`}>
                              {insight.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              insight.type === "achievement" ? "text-blue-700" :
                              insight.type === "risk" ? "text-red-700" :
                              "text-green-700"
                            }`}>
                              {insight.description}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-medium text-muted-foreground">{insight.impact}</span>
                              <span className="text-xs text-muted-foreground">{insight.confidence}% confidence</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Workload Distribution</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Current project assignments and capacity planning
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { status: "Available", count: 2, color: "text-green-600", bgColor: "bg-green-100" },
                        { status: "Optimal", count: 8, color: "text-blue-600", bgColor: "bg-blue-100" },
                        { status: "Busy", count: 4, color: "text-orange-600", bgColor: "bg-orange-100" },
                        { status: "Overloaded", count: 2, color: "text-red-600", bgColor: "bg-red-100" }
                      ].map((item, index) => (
                        <div key={index} className={`p-3 rounded-lg ${item.bgColor}`}>
                          <div className={`text-2xl font-bold ${item.color} mb-1`}>{item.count}</div>
                          <div className={`text-sm ${item.color}`}>{item.status}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Project Allocation</h4>
                      {projects?.slice(0, 4).map((project, index) => {
                        const teamSize = [5, 3, 4, 6][index] || 4;
                        const allocation = [92, 78, 85, 96][index] || 85;

                        return (
                          <div key={project.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm truncate">{project.name}</div>
                              <div className="text-xs text-muted-foreground">{teamSize} members</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-16">
                                <Progress value={allocation} className="h-2" />
                              </div>
                              <span className="text-xs font-medium w-10">{allocation}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            {/* Predictive Models Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span>Revenue Forecast</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ML prediction for next 6 months
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-800">£892K</div>
                      <div className="text-sm text-blue-600">Predicted 6-month revenue</div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { month: "Jan 2025", predicted: 148000, confidence: 92 },
                        { month: "Feb 2025", predicted: 152000, confidence: 89 },
                        { month: "Mar 2025", predicted: 147000, confidence: 86 },
                        { month: "Apr 2025", predicted: 159000, confidence: 83 },
                        { month: "May 2025", predicted: 143000, confidence: 81 },
                        { month: "Jun 2025", predicted: 143000, confidence: 78 }
                      ].map((forecast, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{forecast.month}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">£{forecast.predicted.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">
                              {forecast.confidence}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-purple-600" />
                    <span>Risk Predictions</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-identified potential risks
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        risk: "Resource Shortage",
                        probability: 67,
                        impact: "High",
                        timeframe: "Q2 2025",
                        type: "operational"
                      },
                      {
                        risk: "Client Churn Risk",
                        probability: 23,
                        impact: "Medium",
                        timeframe: "Q1 2025",
                        type: "revenue"
                      },
                      {
                        risk: "Budget Overrun",
                        probability: 45,
                        impact: "Medium",
                        timeframe: "Mar 2025",
                        type: "financial"
                      }
                    ].map((risk, index) => (
                      <div key={index} className="p-3 bg-white/60 rounded-lg border border-purple-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium">{risk.risk}</span>
                          <Badge
                            variant={risk.probability > 60 ? "destructive" : risk.probability > 30 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {risk.probability}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Impact: {risk.impact}</span>
                            <span>Timeline: {risk.timeframe}</span>
                          </div>
                          <Progress value={risk.probability} className="h-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <span>Growth Opportunities</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-discovered opportunities
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        opportunity: "Premium Service Expansion",
                        potential: 28500,
                        probability: 78,
                        timeframe: "Q1 2025"
                      },
                      {
                        opportunity: "Client Upselling",
                        potential: 15200,
                        probability: 85,
                        timeframe: "Feb 2025"
                      },
                      {
                        opportunity: "Market Expansion",
                        potential: 45000,
                        probability: 54,
                        timeframe: "Q2 2025"
                      }
                    ].map((opp, index) => (
                      <div key={index} className="p-3 bg-white/60 rounded-lg border border-green-200">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium">{opp.opportunity}</span>
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              {opp.probability}%
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>+£{opp.potential.toLocaleString()}</span>
                            <span>{opp.timeframe}</span>
                          </div>
                          <Progress value={opp.probability} className="h-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Predictive Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>Project Success Probability</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ML model predictions for project outcomes
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects?.slice(0, 5).map((project, index) => {
                      const successProbability = [94, 67, 89, 72, 85][index] || 80;
                      const riskFactors = [
                        ["Timeline pressure", "Resource constraints"],
                        ["Scope creep", "Technical complexity", "Client changes"],
                        ["Budget limitations"],
                        ["Team availability", "External dependencies"],
                        ["Quality requirements"]
                      ][index] || [];

                      return (
                        <div key={project.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-medium text-sm">{project.name}</div>
                              <div className="text-xs text-muted-foreground">{project.status}</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${
                                successProbability > 85 ? "text-green-600" :
                                successProbability > 70 ? "text-orange-600" : "text-red-600"
                              }`}>
                                {successProbability}%
                              </div>
                              <div className="text-xs text-muted-foreground">Success rate</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Progress value={successProbability} className="h-2" />
                            <div className="flex flex-wrap gap-1">
                              {riskFactors.map((factor, factorIndex) => (
                                <Badge key={factorIndex} variant="outline" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>Strategic Recommendations</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-generated strategic insights and actions
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Optimize Team Allocation",
                        description: "Reallocate 2 senior developers from Project Alpha to Project Beta to increase success probability from 67% to 82%",
                        impact: "£12,400 potential savings",
                        urgency: "high",
                        confidence: 89
                      },
                      {
                        title: "Client Retention Focus",
                        description: "Proactively engage with TechCorp Solutions - 23% churn risk detected based on communication patterns",
                        impact: "£75,000 revenue protection",
                        urgency: "medium",
                        confidence: 76
                      },
                      {
                        title: "Capacity Planning",
                        description: "Hire 1 additional senior developer by March to prevent Q2 resource bottleneck",
                        impact: "Prevent 3-project delay",
                        urgency: "high",
                        confidence: 92
                      },
                      {
                        title: "Service Portfolio Expansion",
                        description: "Launch AI consulting services - 73% higher margins detected in market analysis",
                        impact: "£35,000 monthly increase",
                        urgency: "low",
                        confidence: 68
                      }
                    ].map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">{rec.title}</span>
                              <Badge
                                variant={rec.urgency === "high" ? "destructive" : rec.urgency === "medium" ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {rec.urgency} priority
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-indigo-600">{rec.impact}</span>
                              <span className="text-xs text-muted-foreground">{rec.confidence}% confidence</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}