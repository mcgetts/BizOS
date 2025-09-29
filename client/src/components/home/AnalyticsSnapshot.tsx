import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, subMonths } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DollarSign,
  Users,
  CheckSquare,
  FolderOpen,
  Target,
  Clock,
} from "lucide-react";

interface AnalyticsSnapshotProps {
  className?: string;
}

interface DashboardKPIs {
  revenue: { current: number; target: number; growth: number };
  clients: { current: number; target: number; growth: number };
  projects: { current: number; target: number; growth: number };
  team: { current: number; target: number; growth: number };
}

export function AnalyticsSnapshot({ className }: AnalyticsSnapshotProps) {
  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: ["/api/dashboard/kpis"],
  });

  const { data: revenueTrends } = useQuery<Array<{
    month: string;
    year: number;
    revenue: number;
    invoiceCount: number;
  }>>({
    queryKey: ["/api/dashboard/revenue-trends", { months: 6 }],
  });

  // Mock project status data - in a real app, this would come from an API
  const projectStatusData = [
    { name: 'In Progress', value: 8, color: '#3b82f6' },
    { name: 'Completed', value: 12, color: '#10b981' },
    { name: 'Planning', value: 3, color: '#f59e0b' },
    { name: 'On Hold', value: 2, color: '#ef4444' },
  ];

  // Mock productivity trend data
  const productivityData = [
    { day: 'Mon', tasks: 8, hours: 7.5 },
    { day: 'Tue', tasks: 12, hours: 8.2 },
    { day: 'Wed', tasks: 10, hours: 7.8 },
    { day: 'Thu', tasks: 15, hours: 8.5 },
    { day: 'Fri', tasks: 9, hours: 6.5 },
  ];

  // Get quick metrics
  const getQuickMetrics = () => {
    const totalProjects = projectStatusData.reduce((sum, item) => sum + item.value, 0);
    const completedProjects = projectStatusData.find(item => item.name === 'Completed')?.value || 0;
    const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    const totalTasks = productivityData.reduce((sum, item) => sum + item.tasks, 0);
    const totalHours = productivityData.reduce((sum, item) => sum + item.hours, 0);
    const avgProductivity = totalHours > 0 ? Math.round((totalTasks / totalHours) * 10) / 10 : 0;

    return {
      completionRate,
      avgProductivity,
      totalProjects,
      weeklyTasks: totalTasks,
    };
  };

  const metrics = getQuickMetrics();

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? TrendingUp : TrendingDown;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={`glassmorphism ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Analytics Snapshot
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/analytics"}
          >
            Full Analytics
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <div className="text-xl font-bold text-primary">{metrics.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Project Success</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-xl font-bold text-green-600">{metrics.avgProductivity}</div>
            <div className="text-xs text-muted-foreground">Tasks/Hour</div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        {kpis && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground mb-2">Key Metrics</div>
            <div className="grid grid-cols-1 gap-3">
              {/* Revenue */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Revenue</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(kpis.revenue.current)} / {formatCurrency(kpis.revenue.target)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const GrowthIcon = getGrowthIcon(kpis.revenue.growth);
                    return (
                      <>
                        <GrowthIcon className={`w-4 h-4 ${getGrowthColor(kpis.revenue.growth)}`} />
                        <span className={`text-sm font-medium ${getGrowthColor(kpis.revenue.growth)}`}>
                          {Math.abs(kpis.revenue.growth)}%
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Projects */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <FolderOpen className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Projects</div>
                    <div className="text-xs text-muted-foreground">
                      {kpis.projects.current} active projects
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const GrowthIcon = getGrowthIcon(kpis.projects.growth);
                    return (
                      <>
                        <GrowthIcon className={`w-4 h-4 ${getGrowthColor(kpis.projects.growth)}`} />
                        <span className={`text-sm font-medium ${getGrowthColor(kpis.projects.growth)}`}>
                          {Math.abs(kpis.projects.growth)}%
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mini Charts */}
        <div className="space-y-4">
          {/* Revenue Trend */}
          {revenueTrends && revenueTrends.length > 0 && (
            <div>
              <div className="text-sm font-medium text-foreground mb-2">Revenue Trend</div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrends.slice(-4)}>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis hide />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Project Status Distribution */}
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Project Status</div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={12}
                      outerRadius={30}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {projectStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Productivity */}
          <div>
            <div className="text-sm font-medium text-foreground mb-2">This Week</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productivityData}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Bar
                    dataKey="tasks"
                    fill="#10b981"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-1">
              Tasks completed this week: {metrics.weeklyTasks}
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="pt-3 border-t border-border">
          <div className="text-sm font-medium text-foreground mb-2">Quick Insights</div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <Target className="w-3 h-3 text-green-600" />
              <span className="text-muted-foreground">
                {metrics.completionRate >= 70 ? 'Strong' : metrics.completionRate >= 50 ? 'Good' : 'Needs attention'} project completion rate
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <Clock className="w-3 h-3 text-blue-600" />
              <span className="text-muted-foreground">
                {metrics.avgProductivity >= 1.5 ? 'High' : metrics.avgProductivity >= 1.0 ? 'Moderate' : 'Low'} productivity this week
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}