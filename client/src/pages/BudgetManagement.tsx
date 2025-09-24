import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  BarChart3,
  PieChart,
  Calculator,
  CreditCard,
  Receipt,
  Download,
  Filter,
  RefreshCw,
  Plus,
  FileText,
  Calendar,
  Users,
  FolderOpen,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  Settings
} from "lucide-react";
import type {
  User,
  Project,
  Invoice,
  Expense,
  TimeEntry
} from "@shared/schema";

// Budget interfaces based on existing schema
interface ProjectBudget {
  id: string;
  projectId: string;
  categoryId: string;
  budgetedAmount: string;
  spentAmount: string;
  committedAmount: string;
  forecastAmount: string;
  category?: {
    name: string;
    categoryType: string;
  };
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  profitMargin: number;
  activeProjects: number;
  overBudgetProjects: number;
}

export default function BudgetManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
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

  // Fetch projects for budget tracking
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Fetch invoices for revenue calculation
  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  // Fetch expenses for cost analysis
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    enabled: isAuthenticated,
  });

  // Loading state
  if (isLoading || projectsLoading) {
    return (
      <Layout title="Budget Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading budget management dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate budget summary (mock data for demo)
  const budgetSummary: BudgetSummary = {
    totalBudget: 125000,
    totalSpent: 89650,
    totalRevenue: 142000,
    profitMargin: 36.8,
    activeProjects: projects?.length || 0,
    overBudgetProjects: 2
  };

  const budgetUtilization = (budgetSummary.totalSpent / budgetSummary.totalBudget) * 100;

  return (
    <Layout title="Budget Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Budget Management</h1>
            <p className="text-muted-foreground">
              Track project budgets, analyze costs, and monitor profitability
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Budget
            </Button>
          </div>
        </div>

        {/* Budget Alerts System */}
        <div className="space-y-4">
          {/* Critical Alert Banner */}
          {budgetSummary.overBudgetProjects > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                    <div>
                      <h3 className="font-semibold text-red-800">Critical Budget Alert</h3>
                      <p className="text-sm text-red-700">
                        {budgetSummary.overBudgetProjects} projects have exceeded their budget allocation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-100">
                      View Details
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      Take Action
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget Variance Alert */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-800 text-sm">High Variance Alert</h4>
                      <p className="text-xs text-orange-700">
                        3 projects showing {'>'} 20% budget variance
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Total variance: £8,450 over budget
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    High Priority
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Alert */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800 text-sm">Cash Flow Warning</h4>
                      <p className="text-xs text-yellow-700">
                        Projected shortfall in Q4 2025
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Expected gap: £15,200 by December
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-yellow-300 text-yellow-800">
                    Medium Priority
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Notification */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-800 text-sm">Performance Update</h4>
                    <p className="text-xs text-green-700">
                      5 projects completed under budget this month (+£12,350 saved)
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Good News
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{budgetSummary.totalBudget.toLocaleString()}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>{budgetUtilization.toFixed(1)}% utilized</span>
              </div>
              <Progress value={budgetUtilization} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">£{budgetSummary.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>+12.5% vs budget</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{budgetSummary.profitMargin}%</div>
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>Above target (30%)</span>
              </div>
            </CardContent>
          </Card>

          <Card className={budgetSummary.overBudgetProjects > 0 ? "border-orange-200" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${budgetSummary.overBudgetProjects > 0 ? "text-orange-600 animate-pulse" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${budgetSummary.overBudgetProjects > 0 ? "text-orange-600" : ""}`}>
                {budgetSummary.overBudgetProjects}
              </div>
              <div className={`flex items-center space-x-1 text-xs ${budgetSummary.overBudgetProjects > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                <AlertTriangle className="h-3 w-3" />
                <span>{budgetSummary.overBudgetProjects > 0 ? "Projects over budget" : "All on track"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Budget Overview</TabsTrigger>
            <TabsTrigger value="analytics">Cost Analytics</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Budget Variance Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Budget Variance Analysis</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed variance reporting across all active projects
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Variance Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 mb-1">-£8,450</div>
                        <div className="text-sm text-red-700 mb-2">Over Budget</div>
                        <div className="text-xs text-red-600">6.8% variance</div>
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">+£12,350</div>
                        <div className="text-sm text-green-700 mb-2">Under Budget</div>
                        <div className="text-xs text-green-600">9.9% savings</div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">87%</div>
                        <div className="text-sm text-blue-700 mb-2">Forecast Accuracy</div>
                        <div className="text-xs text-blue-600">vs 85% target</div>
                      </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">£3,900</div>
                        <div className="text-sm text-purple-700 mb-2">Net Variance</div>
                        <div className="text-xs text-purple-600">net positive</div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Variance Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-3 border-b">
                      <h4 className="font-semibold text-sm">Project Variance Breakdown</h4>
                    </div>
                    <div className="divide-y">
                      {[
                        { project: "E-commerce Platform", budget: 75000, actual: 68500, variance: -6500, percentage: -8.7, status: "under" },
                        { project: "Mobile App Redesign", budget: 45000, actual: 52800, variance: 7800, percentage: 17.3, status: "over" },
                        { project: "CRM Integration", budget: 30000, actual: 28200, variance: -1800, percentage: -6.0, status: "under" },
                        { project: "Data Migration", budget: 60000, actual: 59100, variance: -900, percentage: -1.5, status: "under" },
                        { project: "API Development", budget: 40000, actual: 41200, variance: 1200, percentage: 3.0, status: "over" },
                        { project: "UI/UX Overhaul", budget: 25000, actual: 26800, variance: 1800, percentage: 7.2, status: "over" }
                      ].map((item, index) => (
                        <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.project}</div>
                            <div className="text-xs text-muted-foreground">
                              Budget: £{item.budget.toLocaleString()} | Actual: £{item.actual.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className={`font-semibold text-sm ${item.status === "under" ? "text-green-600" : "text-red-600"}`}>
                                {item.variance > 0 ? "+" : ""}£{item.variance.toLocaleString()}
                              </div>
                              <div className={`text-xs ${item.status === "under" ? "text-green-600" : "text-red-600"}`}>
                                {item.percentage > 0 ? "+" : ""}{item.percentage.toFixed(1)}%
                              </div>
                            </div>
                            <div className="w-20">
                              <div className="flex h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`${item.status === "under" ? "bg-green-500" : "bg-red-500"} transition-all duration-300`}
                                  style={{ width: `${Math.min(Math.abs(item.percentage) * 5, 100)}%` }}
                                />
                              </div>
                            </div>
                            <Badge
                              variant={item.status === "under" ? "default" : "destructive"}
                              className="text-xs w-16 justify-center"
                            >
                              {Math.abs(item.percentage) > 10 ? "High" : Math.abs(item.percentage) > 5 ? "Medium" : "Low"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variance Trend Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Variance Trends (Last 6 Months)</span>
                      </h4>
                      <div className="space-y-3">
                        {["July", "August", "September", "October", "November", "December"].map((month, index) => {
                          const variance = [-2.1, 1.8, -3.4, 2.7, -1.2, 0.8][index];
                          const isPositive = variance < 0; // Negative variance is good (under budget)

                          return (
                            <div key={month} className="flex items-center space-x-4">
                              <div className="w-16 text-xs text-muted-foreground">{month}</div>
                              <div className="flex-1 flex items-center space-x-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${isPositive ? "bg-green-500" : "bg-red-500"} transition-all duration-300`}
                                    style={{ width: `${Math.min(Math.abs(variance) * 20, 100)}%` }}
                                  />
                                </div>
                                <div className={`text-xs font-medium w-12 text-right ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                  {variance > 0 ? "+" : ""}{variance}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm flex items-center space-x-2">
                        <Target className="h-4 w-4" />
                        <span>Variance Action Items</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-800 text-sm">High Priority</span>
                          </div>
                          <div className="text-xs text-red-700 mb-2">
                            Mobile App Redesign: 17.3% over budget (+£7,800)
                          </div>
                          <div className="text-xs text-red-600">
                            <strong>Action:</strong> Review scope with client, consider change order
                          </div>
                        </div>

                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-orange-800 text-sm">Medium Priority</span>
                          </div>
                          <div className="text-xs text-orange-700 mb-2">
                            UI/UX Overhaul: 7.2% over budget (+£1,800)
                          </div>
                          <div className="text-xs text-orange-600">
                            <strong>Action:</strong> Monitor closely, optimize resource allocation
                          </div>
                        </div>

                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-800 text-sm">Performing Well</span>
                          </div>
                          <div className="text-xs text-green-700 mb-2">
                            E-commerce Platform: 8.7% under budget (-£6,500)
                          </div>
                          <div className="text-xs text-green-600">
                            <strong>Action:</strong> Document best practices, apply to other projects
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Budget Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5" />
                  <span>Project Budget Overview</span>
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projects?.slice(0, 6).map((project, index) => {
                    const budget = [75000, 45000, 30000, 60000, 40000, 25000][index] || 50000;
                    const spent = budget * (0.6 + Math.random() * 0.5); // Mock data
                    const revenue = budget * (1.1 + Math.random() * 0.4); // Mock data
                    const percentage = (spent / budget) * 100;
                    const profit = revenue - spent;
                    const profitMargin = ((profit / revenue) * 100);

                    return (
                      <Card key={project.id} className={`${percentage > 100 ? "border-red-200 bg-red-50/50" : percentage > 85 ? "border-orange-200 bg-orange-50/50" : ""}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {project.status} • Due: {new Date().toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant={percentage > 100 ? "destructive" : percentage > 85 ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Budget Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Budget: £{budget.toLocaleString()}</span>
                              <span>Spent: £{spent.toLocaleString()}</span>
                            </div>
                            <div className="relative">
                              <Progress value={Math.min(percentage, 100)} className="h-3" />
                              {percentage > 100 && (
                                <div className="absolute top-0 right-0 h-3 w-2 bg-red-600 rounded-r-full" />
                              )}
                            </div>
                          </div>

                          {/* Financial Summary */}
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground">Revenue</div>
                              <div className="font-semibold text-green-600">£{revenue.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Profit Margin</div>
                              <div className={`font-semibold ${profitMargin > 20 ? "text-green-600" : profitMargin > 10 ? "text-orange-600" : "text-red-600"}`}>
                                {profitMargin.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Calculator className="h-3 w-3 mr-1" />
                              Adjust
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Cost Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£67,200</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>75% of total costs</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£15,800</div>
                  <div className="flex items-center space-x-1 text-xs text-orange-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+8% vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overhead</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£6,650</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>-2% vs budget</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cost Per Hour</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£89</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>blended rate</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Cost Distribution</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Breakdown of costs by category
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: "Labor", amount: 67200, percentage: 75, color: "bg-blue-500" },
                      { category: "Materials", amount: 15800, percentage: 17.6, color: "bg-green-500" },
                      { category: "Overhead", amount: 6650, percentage: 7.4, color: "bg-purple-500" }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.category}</span>
                          <span className="text-sm text-muted-foreground">£{item.amount.toLocaleString()} ({item.percentage}%)</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full ${item.color} transition-all duration-300`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Cost Trends</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Monthly cost trends by category
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["January", "February", "March", "April"].map((month, index) => {
                      const totalCost = 20000 + (index * 2500) + Math.random() * 3000;
                      const laborCost = totalCost * 0.75;
                      const materialCost = totalCost * 0.18;
                      const overheadCost = totalCost * 0.07;

                      return (
                        <div key={month} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{month}</span>
                            <span className="text-sm text-muted-foreground">£{totalCost.toFixed(0)}</span>
                          </div>
                          <div className="flex h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500"
                              style={{ width: `75%` }}
                            />
                            <div
                              className="bg-green-500"
                              style={{ width: `18%` }}
                            />
                            <div
                              className="bg-purple-500"
                              style={{ width: `7%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Efficiency Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Cost Efficiency Metrics</span>
                </CardTitle>
                <p className="text-sm text-muted-foregreen">
                  Performance indicators for cost management
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { metric: "Cost Variance", value: "-3.2%", description: "Under budget", trend: "positive" },
                    { metric: "Resource Utilization", value: "87.4%", description: "Above target (80%)", trend: "positive" },
                    { metric: "Cost per Deliverable", value: "£1,247", description: "vs £1,350 target", trend: "positive" }
                  ].map((item, index) => (
                    <div key={index} className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-bold mb-1 ${item.trend === "positive" ? "text-green-600" : "text-red-600"}`}>
                        {item.value}
                      </div>
                      <div className="text-sm font-medium mb-1">{item.metric}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profitability" className="space-y-6">
            {/* Profitability Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">£52,350</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+15.2% vs last quarter</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit Margin</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">36.8%</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>Above target (30%)</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue per Employee</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£142,000</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+8.5% improvement</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Client Lifetime Value</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£89,500</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>average per client</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Profitability Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Project Profitability</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Profit margins by project
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects?.slice(0, 5).map((project, index) => {
                      const revenue = [45000, 32000, 28000, 38000, 25000][index] || 30000;
                      const cost = revenue * (0.5 + Math.random() * 0.3); // Mock data
                      const profit = revenue - cost;
                      const margin = (profit / revenue) * 100;

                      return (
                        <div key={project.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate flex-1 mr-4">{project.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">£{profit.toLocaleString()}</span>
                              <Badge
                                variant={margin > 35 ? "default" : margin > 20 ? "secondary" : "destructive"}
                                className="text-xs"
                              >
                                {margin.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 flex h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="bg-green-500"
                                style={{ width: `${Math.min(margin * 2, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-16">
                              £{revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Client Profitability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Client Profitability</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Revenue and profit by client
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "TechCorp Solutions", revenue: 85000, projects: 3, margin: 42.3 },
                      { name: "Digital Innovations Ltd", revenue: 62000, projects: 2, margin: 38.7 },
                      { name: "StartupXYZ", revenue: 45000, projects: 4, margin: 35.2 },
                      { name: "Enterprise Group", revenue: 38000, projects: 1, margin: 28.9 },
                      { name: "Local Business Co", revenue: 25000, projects: 2, margin: 31.5 }
                    ].map((client, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium truncate">{client.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.projects} projects • £{client.revenue.toLocaleString()}
                            </div>
                          </div>
                          <Badge
                            variant={client.margin > 35 ? "default" : client.margin > 25 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {client.margin}%
                          </Badge>
                        </div>
                        <Progress value={client.margin * 2} className="h-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profitability Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Profitability Insights & Recommendations</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI-powered insights to improve profitability
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-green-800 mb-3">🎯 Top Opportunities</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm font-medium text-green-800 mb-1">
                          Increase TechCorp rates by 15%
                        </div>
                        <div className="text-xs text-green-700">
                          Client shows high satisfaction and budget flexibility
                        </div>
                        <div className="text-xs text-green-600 mt-2">
                          <strong>Potential impact: +£12,750 annual revenue</strong>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 mb-1">
                          Optimize resource allocation
                        </div>
                        <div className="text-xs text-blue-700">
                          Move senior developers to higher-value projects
                        </div>
                        <div className="text-xs text-blue-600 mt-2">
                          <strong>Potential impact: +8.5% margin improvement</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-orange-800 mb-3">⚠️ Areas for Improvement</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="text-sm font-medium text-orange-800 mb-1">
                          Enterprise Group profitability
                        </div>
                        <div className="text-xs text-orange-700">
                          Below target margin (28.9% vs 30% target)
                        </div>
                        <div className="text-xs text-orange-600 mt-2">
                          <strong>Action: Review scope and pricing</strong>
                        </div>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-sm font-medium text-red-800 mb-1">
                          Material costs trending up
                        </div>
                        <div className="text-xs text-red-700">
                          8% increase in material costs this month
                        </div>
                        <div className="text-xs text-red-600 mt-2">
                          <strong>Action: Negotiate better supplier rates</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoicing" className="space-y-6">
            {/* Invoice Generation Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Automated Invoice Generation</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generate invoices from tracked time and expenses
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <Label>Select Project</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Billable Projects</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <Label>Invoice Period</Label>
                    <Select defaultValue="month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <Label>&nbsp;</Label>
                    <Button className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Pending Invoices</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ready to be generated from time entries
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { client: "TechCorp Solutions", project: "E-commerce Platform", hours: 42.5, amount: 3612.50, period: "Sep 2025" },
                      { client: "Digital Innovations Ltd", project: "Mobile App Redesign", hours: 28.0, amount: 2660.00, period: "Sep 2025" },
                      { client: "StartupXYZ", project: "API Integration", hours: 18.5, amount: 1665.00, period: "Sep 2025" },
                      { client: "Enterprise Group", project: "Database Migration", hours: 35.0, amount: 2975.00, period: "Sep 2025" }
                    ].map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{invoice.client}</div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.project} • {invoice.period}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.hours}h tracked
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-semibold">£{invoice.amount.toLocaleString()}</div>
                          <Button variant="outline" size="sm">
                            <FileText className="h-3 w-3 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Recent Invoices</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Latest invoices and payment status
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { number: "INV-2025-001", client: "TechCorp Solutions", amount: 4250.00, status: "paid", date: "2025-09-15" },
                      { number: "INV-2025-002", client: "Digital Innovations Ltd", amount: 3200.00, status: "sent", date: "2025-09-18" },
                      { number: "INV-2025-003", client: "StartupXYZ", amount: 1800.00, status: "paid", date: "2025-09-20" },
                      { number: "INV-2025-004", client: "Enterprise Group", amount: 2900.00, status: "overdue", date: "2025-09-10" }
                    ].map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{invoice.number}</div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.client} • {invoice.date}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-semibold">£{invoice.amount.toLocaleString()}</div>
                          <Badge
                            variant={
                              invoice.status === "paid" ? "default" :
                              invoice.status === "sent" ? "secondary" :
                              "destructive"
                            }
                            className="text-xs"
                          >
                            {invoice.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {invoice.status === "overdue" && <XCircle className="h-3 w-3 mr-1" />}
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">£18,450</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>5 pending invoices</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">£2,900</div>
                  <div className="flex items-center space-x-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>1 overdue invoice</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">94.2%</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>Above target (90%)</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Payment Time</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18 days</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>-2 days improvement</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing Automation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Billing Automation</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure automatic invoice generation and reminders
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <Calendar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Schedule Invoices</div>
                      <div className="text-xs text-muted-foreground">Monthly auto-generation</div>
                    </div>
                  </Button>

                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <AlertTriangle className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Payment Reminders</div>
                      <div className="text-xs text-muted-foreground">Automated follow-ups</div>
                    </div>
                  </Button>

                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <FileText className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Template Settings</div>
                      <div className="text-xs text-muted-foreground">Customize invoice format</div>
                    </div>
                  </Button>

                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <Download className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Export Reports</div>
                      <div className="text-xs text-muted-foreground">Accounting integration</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}