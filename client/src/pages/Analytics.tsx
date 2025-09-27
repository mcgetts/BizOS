import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import our enhanced components
import { AdvancedCharts } from "@/components/charts/AdvancedCharts";
import { InteractiveCharts, InteractiveBusinessChart } from "@/components/charts/InteractiveCharts";
import { ChartConfigPanel } from "@/components/charts/ChartConfigPanel";
import { CustomizableDashboard } from "@/components/dashboard/CustomizableDashboard";
import { PredictiveInsights } from "@/components/analytics/PredictiveInsights";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

import {
  BarChart3,
  TrendingUp,
  LineChart,
  PieChart,
  Settings,
  Download,
  Brain,
  Gauge,
  Activity,
  Zap,
  Eye,
  RefreshCw,
  Users
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import type { Project, Task, Client, User, TimeEntry } from "@shared/schema";

export default function Analytics() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Data queries
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: isAuthenticated,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: isAuthenticated,
  });

  const { data: teamMembers } = useQuery<User[]>({
    queryKey: ['/api/team-members'],
    enabled: isAuthenticated,
  });

  const { data: timeEntries } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries'],
    enabled: isAuthenticated,
  });

  // Sample data for charts
  const revenueData = [
    { name: 'Jan', value: 45000, clients: 12, projects: 8 },
    { name: 'Feb', value: 52000, clients: 15, projects: 10 },
    { name: 'Mar', value: 48000, clients: 13, projects: 9 },
    { name: 'Apr', value: 61000, clients: 18, projects: 12 },
    { name: 'May', value: 58000, clients: 16, projects: 11 },
    { name: 'Jun', value: 67000, clients: 20, projects: 14 }
  ];

  const teamData = [
    { name: 'Development', value: 8, utilization: 85 },
    { name: 'Design', value: 4, utilization: 92 },
    { name: 'Marketing', value: 3, utilization: 78 },
    { name: 'Sales', value: 5, utilization: 88 }
  ];

  const projectData = [
    { name: 'Active', value: projects?.filter(p => p.status === 'in_progress').length || 12 },
    { name: 'Planning', value: projects?.filter(p => p.status === 'planning').length || 5 },
    { name: 'On Hold', value: projects?.filter(p => p.status === 'on_hold').length || 2 },
    { name: 'Completed', value: projects?.filter(p => p.status === 'completed').length || 18 }
  ];

  // Loading state
  if (projectsLoading || tasksLoading || clientsLoading) {
    return (
      <Layout title="Analytics Dashboard" breadcrumbs={["Analytics"]}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading analytics data...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Analytics Dashboard" breadcrumbs={["Analytics"]}>
      <div className="space-y-6">
        {/* Header with Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{projects?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Projects</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{tasks?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Team Members</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{clients?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Clients</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="interactive" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Interactive
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Predictive
            </TabsTrigger>
            <TabsTrigger value="customizable" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Customizable
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Advanced Charts */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <AdvancedCharts
                      type="line"
                      data={revenueData}
                      title="Monthly Revenue"
                      subtitle="Revenue performance over time"
                      xAxisKey="name"
                      yAxisKey="value"
                      colorPalette="blues"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Project Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Project Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <AdvancedCharts
                      type="pie"
                      data={projectData}
                      title="Project Status"
                      subtitle="Current project distribution"
                      colorPalette="viridis"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Team Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Team Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <AdvancedCharts
                      type="bar"
                      data={teamData}
                      title="Team Utilization"
                      subtitle="Current team performance metrics"
                      xAxisKey="name"
                      yAxisKey="utilization"
                      colorPalette="greens"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Chart Configuration Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Chart Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartConfigPanel />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Interactive Tab - Drill-down Charts */}
          <TabsContent value="interactive" className="space-y-6">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Click on chart elements to drill down into detailed data. Use breadcrumbs to navigate back.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Interactive Revenue Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveBusinessChart initialChartType="revenue" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interactive Project Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveBusinessChart initialChartType="projects" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interactive Team Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveBusinessChart initialChartType="team" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interactive Client Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveBusinessChart initialChartType="clients" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictive Tab - AI Insights */}
          <TabsContent value="predictive" className="space-y-6">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                AI-powered predictive analytics with forecasting and trend analysis based on historical data.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Predictive Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PredictiveInsights />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customizable Tab - Dashboard Builder */}
          <TabsContent value="customizable" className="space-y-6">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Drag and drop widgets to customize your analytics dashboard. Changes are saved automatically.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Customizable Analytics Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomizableDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab - Report Generation */}
          <TabsContent value="reports" className="space-y-6">
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                Generate comprehensive reports with various export options and scheduling capabilities.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Report Generator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportGenerator />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}