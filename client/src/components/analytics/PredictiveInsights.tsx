import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Zap,
  Activity,
  BarChart3,
  LineChart
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import type { Project, Task, Client, User } from '@shared/schema';
import { cn } from '@/lib/utils';

// Predictive insight interfaces
interface PredictiveInsight {
  id: string;
  type: 'forecast' | 'trend' | 'risk' | 'opportunity' | 'recommendation';
  category: 'revenue' | 'projects' | 'team' | 'clients' | 'operations';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  prediction: {
    current: number;
    predicted: number;
    change: number;
    changePercent: number;
  };
  factors: string[];
  recommendations: string[];
  metadata?: Record<string, any>;
}

interface ForecastData {
  period: string;
  actual?: number;
  predicted: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

// Machine learning simulation for predictions
class PredictiveAnalytics {
  static generateRevenueForecast(historicalData: any[]): ForecastData[] {
    const periods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    return periods.map((period, index) => {
      const isHistorical = index <= currentMonth;
      const baseValue = 50000 + (index * 2000) + (Math.random() * 10000);
      const trend = 1 + (index * 0.02); // 2% growth per month
      const seasonality = 1 + Math.sin((index / 12) * 2 * Math.PI) * 0.1; // 10% seasonal variation

      const predicted = baseValue * trend * seasonality;
      const confidence = isHistorical ? 100 : Math.max(60, 95 - (index - currentMonth) * 5);
      const variance = predicted * 0.15; // 15% variance

      return {
        period,
        actual: isHistorical ? predicted + (Math.random() - 0.5) * variance : undefined,
        predicted: Math.round(predicted),
        confidence: Math.round(confidence),
        lowerBound: Math.round(predicted - variance),
        upperBound: Math.round(predicted + variance)
      };
    });
  }

  static generateProjectDeliveryForecast(projects: Project[]): ForecastData[] {
    const months = ['This Month', 'Next Month', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];

    return months.map((period, index) => {
      const baseCompletions = 3 + Math.floor(Math.random() * 4);
      const trend = Math.max(0, baseCompletions + index * 0.5);
      const confidence = Math.max(50, 90 - index * 8);

      return {
        period,
        predicted: Math.round(trend),
        confidence: Math.round(confidence),
        lowerBound: Math.max(0, Math.round(trend - 2)),
        upperBound: Math.round(trend + 2)
      };
    });
  }

  static generateTeamCapacityForecast(users: User[], tasks: Task[]): ForecastData[] {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

    return weeks.map((period, index) => {
      const baseCapacity = 75 + Math.random() * 20; // 75-95% utilization
      const predicted = Math.max(50, baseCapacity - index * 2); // Slight decline over time
      const confidence = Math.max(60, 95 - index * 5);

      return {
        period,
        predicted: Math.round(predicted),
        confidence: Math.round(confidence),
        lowerBound: Math.max(40, Math.round(predicted - 15)),
        upperBound: Math.min(100, Math.round(predicted + 10))
      };
    });
  }

  static generateRiskAssessment(projects: Project[], tasks: Task[]): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Project delivery risk
    const atRiskProjects = projects?.filter(p =>
      p.status === 'in_progress' && p.endDate &&
      new Date(p.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ) || [];

    if (atRiskProjects.length > 0) {
      insights.push({
        id: 'project-delivery-risk',
        type: 'risk',
        category: 'projects',
        title: 'Project Delivery Risk',
        description: `${atRiskProjects.length} projects at risk of missing deadlines`,
        confidence: 85,
        impact: 'high',
        timeframe: 'Next 30 days',
        prediction: {
          current: atRiskProjects.length,
          predicted: Math.round(atRiskProjects.length * 1.3),
          change: Math.round(atRiskProjects.length * 0.3),
          changePercent: 30
        },
        factors: [
          'Resource constraints',
          'Scope creep',
          'Dependencies',
          'Technical complexity'
        ],
        recommendations: [
          'Reallocate senior developers',
          'Consider scope reduction',
          'Implement daily standups',
          'Review resource allocation'
        ]
      });
    }

    // Team burnout risk
    const overUtilizedTeam = Math.random() > 0.7; // Simulate detection
    if (overUtilizedTeam) {
      insights.push({
        id: 'team-burnout-risk',
        type: 'risk',
        category: 'team',
        title: 'Team Burnout Risk',
        description: 'High workload detected across multiple team members',
        confidence: 78,
        impact: 'medium',
        timeframe: 'Next 2 weeks',
        prediction: {
          current: 85,
          predicted: 95,
          change: 10,
          changePercent: 12
        },
        factors: [
          'High task velocity',
          'Overtime hours',
          'Multiple concurrent projects',
          'Limited team capacity'
        ],
        recommendations: [
          'Redistribute workload',
          'Consider temporary staffing',
          'Implement mandatory breaks',
          'Review sprint planning'
        ]
      });
    }

    return insights;
  }

  static generateOpportunities(clients: Client[], projects: Project[]): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Client expansion opportunity
    const loyalClients = clients?.filter(c =>
      c.status === 'client' &&
      projects?.filter(p => p.clientId === c.id).length >= 2
    ) || [];

    if (loyalClients.length > 0) {
      insights.push({
        id: 'client-expansion',
        type: 'opportunity',
        category: 'revenue',
        title: 'Client Expansion Opportunity',
        description: `${loyalClients.length} clients ready for service expansion`,
        confidence: 72,
        impact: 'high',
        timeframe: 'Next quarter',
        prediction: {
          current: loyalClients.length * 25000,
          predicted: loyalClients.length * 35000,
          change: loyalClients.length * 10000,
          changePercent: 40
        },
        factors: [
          'Strong client relationships',
          'Successful project delivery',
          'Growing client needs',
          'Market expansion'
        ],
        recommendations: [
          'Schedule strategic reviews',
          'Propose additional services',
          'Create expansion proposals',
          'Leverage success stories'
        ]
      });
    }

    return insights;
  }
}

// Prediction confidence indicator
const ConfidenceIndicator: React.FC<{ confidence: number; className?: string }> = ({ confidence, className }) => {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'text-success';
    if (conf >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getLabel = (conf: number) => {
    if (conf >= 80) return 'High';
    if (conf >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-1">
        <Brain className={cn("w-4 h-4", getColor(confidence))} />
        <span className={cn("text-sm font-medium", getColor(confidence))}>
          {getLabel(confidence)}
        </span>
      </div>
      <Progress value={confidence} className="w-16 h-2" />
      <span className="text-xs text-muted-foreground">{confidence}%</span>
    </div>
  );
};

// Insight card component
const InsightCard: React.FC<{ insight: PredictiveInsight; onClick?: () => void }> = ({ insight, onClick }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'forecast': return TrendingUp;
      case 'risk': return AlertTriangle;
      case 'opportunity': return Target;
      case 'recommendation': return Zap;
      default: return Activity;
    }
  };

  const getColor = () => {
    switch (insight.type) {
      case 'forecast': return 'text-blue-500';
      case 'risk': return 'text-red-500';
      case 'opportunity': return 'text-green-500';
      case 'recommendation': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  const Icon = getIcon();

  return (
    <Card className={cn("cursor-pointer transition-all hover:shadow-lg", onClick && "hover:ring-2 hover:ring-primary/20")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={cn("w-5 h-5", getColor())} />
            <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'secondary' : 'outline'}>
              {insight.impact} impact
            </Badge>
          </div>
          <ConfidenceIndicator confidence={insight.confidence} />
        </div>
        <CardTitle className="text-lg">{insight.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{insight.description}</p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Prediction details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Current</div>
              <div className="text-lg font-semibold">
                {insight.category === 'revenue' ? `£${insight.prediction.current.toLocaleString()}` : insight.prediction.current}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Predicted</div>
              <div className="text-lg font-semibold">
                {insight.category === 'revenue' ? `£${insight.prediction.predicted.toLocaleString()}` : insight.prediction.predicted}
              </div>
            </div>
          </div>

          {/* Change indicator */}
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span className="text-sm">Expected change</span>
            <div className="flex items-center space-x-1">
              {insight.prediction.change > 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={cn("font-medium", insight.prediction.change > 0 ? "text-success" : "text-destructive")}>
                {insight.prediction.changePercent > 0 ? '+' : ''}{insight.prediction.changePercent}%
              </span>
            </div>
          </div>

          {/* Timeframe */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{insight.timeframe}</span>
          </div>

          {/* Top recommendations */}
          {insight.recommendations.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Key Recommendations:</div>
              <ul className="text-sm space-y-1">
                {insight.recommendations.slice(0, 2).map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Forecast chart component
const ForecastChart: React.FC<{ data: ForecastData[]; title: string; yAxisKey: string }> = ({ data, title, yAxisKey }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <LineChart className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{label}</p>
                      {data.actual && (
                        <p className="text-sm text-blue-600">
                          Actual: {yAxisKey === 'revenue' ? `£${data.actual.toLocaleString()}` : data.actual}
                        </p>
                      )}
                      <p className="text-sm text-purple-600">
                        Predicted: {yAxisKey === 'revenue' ? `£${data.predicted.toLocaleString()}` : data.predicted}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {data.confidence}%
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="upperBound"
                stackId="1"
                stroke="none"
                fill="#8b5cf6"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stackId="1"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Main predictive insights component
export const PredictiveInsights: React.FC<{ className?: string }> = ({ className }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('3months');

  // Fetch data
  const { data: projects } = useQuery<Project[]>({ queryKey: ['/api/projects'] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ['/api/tasks'] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ['/api/clients'] });
  const { data: users } = useQuery<User[]>({ queryKey: ['/api/users'] });

  // Generate insights
  const insights = useMemo(() => {
    if (!projects || !tasks || !clients || !users) return [];

    const riskInsights = PredictiveAnalytics.generateRiskAssessment(projects, tasks);
    const opportunityInsights = PredictiveAnalytics.generateOpportunities(clients, projects);

    return [...riskInsights, ...opportunityInsights];
  }, [projects, tasks, clients, users]);

  // Generate forecasts
  const revenueForecast = useMemo(() =>
    PredictiveAnalytics.generateRevenueForecast([]), []
  );

  const projectForecast = useMemo(() =>
    PredictiveAnalytics.generateProjectDeliveryForecast(projects || []), [projects]
  );

  const teamForecast = useMemo(() =>
    PredictiveAnalytics.generateTeamCapacityForecast(users || [], tasks || []), [users, tasks]
  );

  // Filter insights by category
  const filteredInsights = insights.filter(insight =>
    selectedCategory === 'all' || insight.category === selectedCategory
  );

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center space-x-2">
              <Brain className="w-6 h-6 text-purple-500" />
              <span>Predictive Analytics</span>
            </h2>
            <p className="text-muted-foreground">AI-powered insights and forecasting</p>
          </div>

          <div className="flex items-center space-x-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="clients">Clients</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">1 Month</SelectItem>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="insights" className="w-full">
          <TabsList>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6">
            {/* Key insights summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{insights.filter(i => i.type === 'risk').length}</div>
                      <div className="text-sm text-muted-foreground">Active Risks</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{insights.filter(i => i.type === 'opportunity').length}</div>
                      <div className="text-sm text-muted-foreground">Opportunities</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length) || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredInsights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>

            {filteredInsights.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No insights found</h3>
                <p>Try adjusting the category filter or check back later for new predictions.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="forecasts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ForecastChart
                data={revenueForecast}
                title="Revenue Forecast"
                yAxisKey="revenue"
              />
              <ForecastChart
                data={projectForecast}
                title="Project Delivery Forecast"
                yAxisKey="projects"
              />
            </div>
            <ForecastChart
              data={teamForecast}
              title="Team Capacity Forecast"
              yAxisKey="capacity"
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Trend Analysis</h3>
              <p>Advanced trend analysis features coming soon.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};