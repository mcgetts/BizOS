import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface BusinessInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend' | 'prediction';
  category: 'revenue' | 'productivity' | 'client_satisfaction' | 'cost_management' | 'resource_allocation' | 'project_delivery';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  dataPoints: Record<string, any>;
  generatedAt: Date;
}

interface PerformanceMetrics {
  revenue: {
    current: number;
    predicted: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    growth_rate: number;
  };
  productivity: {
    tasksCompleted: number;
    averageCompletionTime: number;
    efficiencyScore: number;
    bottlenecks: string[];
  };
  clientSatisfaction: {
    score: number;
    trend: 'improving' | 'declining' | 'stable';
    riskClients: string[];
    satisfactionDrivers: string[];
  };
  resourceUtilization: {
    overall: number;
    byDepartment: Record<string, number>;
    overallocatedUsers: string[];
    underutilizedUsers: string[];
  };
}

export function BusinessInsights() {
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const [insightsResponse, metricsResponse] = await Promise.all([
        fetch('/api/insights', { credentials: 'include' }),
        fetch('/api/insights/performance-metrics', { credentials: 'include' })
      ]);

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.map((insight: any) => ({
          ...insight,
          generatedAt: new Date(insight.generatedAt)
        })));
      }

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to fetch business insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    try {
      const response = await fetch('/api/insights/analyze', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh insights after analysis
        setTimeout(() => {
          fetchInsights();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getInsightIcon = (type: BusinessInsight['type']) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'optimization': return <Lightbulb className="h-4 w-4 text-yellow-600" />;
      case 'trend': return <BarChart3 className="h-4 w-4 text-blue-600" />;
      case 'prediction': return <Brain className="h-4 w-4 text-purple-600" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: BusinessInsight['impact']) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: BusinessInsight['category']) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Business Intelligence
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={fetchInsights}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={triggerAnalysis}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Analyze
            </Button>
          </div>
        </div>
        <CardDescription>
          AI-powered insights and performance metrics for strategic decision making
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            {insights.length === 0 ? (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  No insights available yet. Click "Analyze" to generate AI-powered business insights.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {insights.slice(0, 5).map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getInsightIcon(insight.type)}
                          <h4 className="font-semibold">{insight.title}</h4>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getImpactColor(insight.impact)}>
                            {insight.impact} impact
                          </Badge>
                          <Badge variant="outline">
                            {insight.confidence}% confidence
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>

                      <div className="flex items-center gap-4 mb-3">
                        <Badge variant="secondary">{getCategoryName(insight.category)}</Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(insight.generatedAt, 'MMM dd, HH:mm')}
                        </span>
                      </div>

                      {insight.recommendations.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-1">Recommendations:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {insight.recommendations.slice(0, 2).map((rec, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {metrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Revenue Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current:</span>
                        <span className="font-medium">${metrics.revenue.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Predicted:</span>
                        <span className="font-medium">${metrics.revenue.predicted.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Growth Rate:</span>
                        <span className={`font-medium ${metrics.revenue.growth_rate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.revenue.growth_rate > 0 ? '+' : ''}{metrics.revenue.growth_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Productivity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tasks Completed:</span>
                        <span className="font-medium">{metrics.productivity.tasksCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Efficiency Score:</span>
                        <span className="font-medium">{metrics.productivity.efficiencyScore.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg. Completion:</span>
                        <span className="font-medium">{metrics.productivity.averageCompletionTime.toFixed(1)} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Client Satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Score:</span>
                        <span className="font-medium">{metrics.clientSatisfaction.score.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Trend:</span>
                        <Badge variant={metrics.clientSatisfaction.trend === 'improving' ? 'default' :
                                     metrics.clientSatisfaction.trend === 'declining' ? 'destructive' : 'secondary'}>
                          {metrics.clientSatisfaction.trend}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Resource Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Overall:</span>
                        <span className="font-medium">{metrics.resourceUtilization.overall.toFixed(1)}%</span>
                      </div>
                      {Object.entries(metrics.resourceUtilization.byDepartment).slice(0, 2).map(([dept, util]) => (
                        <div key={dept} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">{dept}:</span>
                          <span className="font-medium">{util}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Performance metrics are being calculated. Please check back in a few moments.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}