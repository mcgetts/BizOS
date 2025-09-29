import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  Play,
  Pause,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Workflow,
  Target,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface WorkflowTrigger {
  id: string;
  name: string;
  description: string;
  eventType: string;
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: any[];
  actions: any[];
  isActive: boolean;
  priority: number;
  executionCount: number;
  errorCount: number;
  lastExecuted?: string;
}

interface AutomationMetrics {
  totalTriggers: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  topTriggers: Array<{ event: string; count: number }>;
  recentActivity: Array<{ timestamp: string; event: string; result: string }>;
}

interface WorkflowData {
  triggers: WorkflowTrigger[];
  metrics: AutomationMetrics;
  businessRulesStats: {
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    totalErrors: number;
    queueLength: number;
    isProcessing: boolean;
  };
}

export function WorkflowAutomation() {
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadWorkflowData();
    loadBusinessRules();
  }, []);

  const loadWorkflowData = async () => {
    try {
      const response = await fetch('/api/automation/workflows', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflowData(data);
      }
    } catch (error) {
      console.error('Failed to load workflow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessRules = async () => {
    try {
      const response = await fetch('/api/automation/business-rules', {
        credentials: 'include'
      });

      if (response.ok) {
        const rules = await response.json();
        setBusinessRules(rules);
      }
    } catch (error) {
      console.error('Failed to load business rules:', error);
    }
  };

  const toggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/automation/triggers/${triggerId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        await loadWorkflowData();
      } else {
        console.error('Failed to toggle trigger');
      }
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 9) return <Badge className="bg-red-100 text-red-800">High</Badge>;
    if (priority >= 7) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
  };

  const getResultBadge = (result: string) => {
    return result === 'success' ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading workflow automation data...</p>
        </div>
      </div>
    );
  }

  if (!workflowData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load workflow automation data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Workflow className="h-8 w-8" />
          Workflow Automation
        </h1>
        <p className="text-gray-600">
          Manage automated workflows, business rules, and process triggers for enhanced productivity.
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="rules">Business Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Triggers</p>
                    <p className="text-2xl font-bold text-gray-900">{workflowData.businessRulesStats.activeRules}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Executions</p>
                    <p className="text-2xl font-bold text-gray-900">{workflowData.businessRulesStats.totalExecutions}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{workflowData.metrics.successRate.toFixed(1)}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Processing Status</p>
                    <p className="text-sm font-medium text-gray-900">
                      {workflowData.businessRulesStats.isProcessing ? 'Active' : 'Idle'}
                    </p>
                  </div>
                  {workflowData.businessRulesStats.isProcessing ? (
                    <RefreshCw className="h-8 w-8 text-orange-500 animate-spin" />
                  ) : (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest workflow executions and automation events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflowData.metrics.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent automation activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflowData.metrics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium">{activity.event.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(activity.timestamp), 'MMM dd, yyyy at HH:mm')}
                          </p>
                        </div>
                      </div>
                      {getResultBadge(activity.result)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Triggers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Most Active Triggers
              </CardTitle>
              <CardDescription>
                Workflow triggers with the highest execution frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflowData.metrics.topTriggers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trigger activity data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflowData.metrics.topTriggers.map((trigger, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{trigger.event.replace(/_/g, ' ').toUpperCase()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress
                            value={(trigger.count / Math.max(...workflowData.metrics.topTriggers.map(t => t.count))) * 100}
                            className="flex-1 h-2"
                          />
                          <span className="text-sm text-gray-600">{trigger.count} executions</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Workflow Triggers
              </CardTitle>
              <CardDescription>
                Manage automated triggers that respond to system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowData.triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={trigger.isActive}
                        onCheckedChange={(checked) => toggleTrigger(trigger.id, checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{trigger.name}</h3>
                          {getStatusBadge(trigger.isActive)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{trigger.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Event: {trigger.eventType.replace(/_/g, ' ')}</span>
                          <span>Executions: {trigger.triggerCount}</span>
                          {trigger.lastTriggered && (
                            <span>Last: {format(new Date(trigger.lastTriggered), 'MMM dd, HH:mm')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Business Rules
              </CardTitle>
              <CardDescription>
                Configure automated business logic and workflow actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businessRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          {getStatusBadge(rule.isActive)}
                          {getPriorityBadge(rule.priority)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">Trigger</p>
                            <p className="text-gray-600">{rule.trigger.replace(/_/g, ' ')}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Conditions</p>
                            <p className="text-gray-600">{rule.conditions.length} condition(s)</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Actions</p>
                            <p className="text-gray-600">{rule.actions.length} action(s)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>Executions: {rule.executionCount}</span>
                          <span>Errors: {rule.errorCount}</span>
                          {rule.lastExecuted && (
                            <span>Last executed: {format(new Date(rule.lastExecuted), 'MMM dd, yyyy HH:mm')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4 mr-2" />
                        Test Rule
                      </Button>
                    </div>
                  </div>
                ))}

                {businessRules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No business rules configured</p>
                    <Button className="mt-4">
                      Create First Rule
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Rules</span>
                    <span className="font-medium">{workflowData.businessRulesStats.totalRules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Rules</span>
                    <span className="font-medium">{workflowData.businessRulesStats.activeRules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Executions</span>
                    <span className="font-medium">{workflowData.businessRulesStats.totalExecutions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queue Length</span>
                    <span className="font-medium">{workflowData.businessRulesStats.queueLength}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-medium">{workflowData.metrics.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Errors</span>
                    <span className="font-medium text-red-600">{workflowData.businessRulesStats.totalErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Status</span>
                    <span className={`font-medium ${workflowData.businessRulesStats.isProcessing ? 'text-orange-600' : 'text-green-600'}`}>
                      {workflowData.businessRulesStats.isProcessing ? 'Active' : 'Idle'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          onClick={() => {
            loadWorkflowData();
            loadBusinessRules();
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}