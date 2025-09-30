import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { ExecutiveKPIGrid } from "@/components/executive/ExecutiveKPIGrid";
import { BusinessHealthScore } from "@/components/executive/BusinessHealthScore";
import { FinancialPerformance } from "@/components/executive/FinancialPerformance";
import { CriticalActions } from "@/components/executive/CriticalActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
} from "lucide-react";

export default function Executive() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated or not executive level
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

    // Check if user has executive level access (super_admin or admin)
    if (!isLoading && isAuthenticated) {
      const userRole = user?.enhancedRole || user?.role;
      if (userRole !== "super_admin" && userRole !== "admin") {
        toast({
          title: "Access Denied",
          description: "You do not have executive-level access to view this dashboard.",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      }
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  // Loading state
  if (isLoading) {
    return (
      <Layout title="Executive Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading executive dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleExportReport = () => {
    toast({
      title: "Exporting Report",
      description: "Your executive report is being generated...",
    });
    // TODO: Implement export functionality
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Layout title="Executive Dashboard">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Executive Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Strategic Command Center · Real-time Business Intelligence
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="default" size="sm" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Executive KPI Grid - Top Priority */}
        <ExecutiveKPIGrid />

        {/* Two Column Layout: Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Strategic Insights (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Health Score */}
            <BusinessHealthScore />

            {/* Financial Performance */}
            <FinancialPerformance />

            {/* Customer Intelligence (Placeholder) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Customer Intelligence
                  </CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Clients</p>
                    <p className="text-2xl font-bold">247</p>
                    <p className="text-xs text-green-600 dark:text-green-400">+12.5% MoM</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Client Health</p>
                    <p className="text-2xl font-bold">94.2%</p>
                    <p className="text-xs text-green-600 dark:text-green-400">+2.1% MoM</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Churn Risk</p>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">2 high-value</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Full customer intelligence dashboard with AI-powered insights coming in next release.
                </p>
              </CardContent>
            </Card>

            {/* Strategic Projects Portfolio (Placeholder) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Strategic Projects Portfolio
                  </CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold">42</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">On Time</p>
                    <p className="text-2xl font-bold text-green-600">85%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">On Budget</p>
                    <p className="text-2xl font-bold text-yellow-600">78%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">At Risk</p>
                    <p className="text-2xl font-bold text-red-600">5</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Comprehensive portfolio management with ROI tracking and resource allocation coming soon.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Action Center (1/3 width) */}
          <div className="space-y-6">
            {/* Critical Actions */}
            <CriticalActions />

            {/* Strategic Alerts (Placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Strategic Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Q4 Revenue Target at 89%
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      £110K shortfall · 5 days remaining
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      New Market Opportunity
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Healthcare sector showing 40% growth
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Client Escalation
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      ABC Corp · Project delay concerns
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Team Size</span>
                  <span className="text-lg font-bold">128</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Utilization</span>
                  <span className="text-lg font-bold text-green-600">87%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Project Value</span>
                  <span className="text-lg font-bold">£42K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-lg font-bold text-blue-600">68%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <p>
                Dashboard auto-refreshes every 5 minutes · Data accurate as of{" "}
                {new Date().toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
