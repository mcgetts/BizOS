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
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Zap,
  Activity,
  TrendingUp,
  Users,
  MessageSquare,
  Github,
  Slack,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface IntegrationConfig {
  type: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isConfigured: boolean;
  healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
  lastSync?: string;
  lastError?: string;
  supportedFeatures: string[];
  apiEndpoints: string[];
  metadata: {
    version: string;
    lastHealthCheck: string;
  };
}

interface IntegrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  errorRate: number;
  dailyUsage: Array<{ date: string; requests: number; errors: number }>;
}

interface SystemStatus {
  totalIntegrations: number;
  enabledIntegrations: number;
  healthyIntegrations: number;
  errorIntegrations: number;
  totalRequests: number;
  systemUptime: number;
}

export function IntegrationManagement() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [integrationDetails, setIntegrationDetails] = useState<{
    configuration: IntegrationConfig;
    metrics: IntegrationMetrics;
    events: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations);
        setSystemStatus(data.systemStatus);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntegrationDetails = async (type: string) => {
    try {
      const response = await fetch(`/api/integrations/${type}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrationDetails(data);
        setSelectedIntegration(type);
      }
    } catch (error) {
      console.error('Failed to load integration details:', error);
    }
  };

  const toggleIntegration = async (type: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/integrations/${type}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        await loadIntegrations();
        if (selectedIntegration === type) {
          await loadIntegrationDetails(type);
        }
      } else {
        console.error('Failed to toggle integration');
      }
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const testIntegration = async (type: string) => {
    try {
      const response = await fetch(`/api/integrations/${type}/test`, {
        method: 'POST',
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        alert('Integration test successful!');
      } else {
        alert(`Integration test failed: ${result.error || result.message}`);
      }

      await loadIntegrations();
      if (selectedIntegration === type) {
        await loadIntegrationDetails(type);
      }
    } catch (error) {
      console.error('Failed to test integration:', error);
      alert('Failed to test integration');
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack': return <Slack className="h-6 w-6" />;
      case 'teams': return <MessageSquare className="h-6 w-6" />;
      case 'github': return <Github className="h-6 w-6" />;
      case 'jira': return <Settings className="h-6 w-6" />;
      case 'salesforce': return <Users className="h-6 w-6" />;
      default: return <Globe className="h-6 w-6" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading integration management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Zap className="h-8 w-8" />
          Integration Management
        </h1>
        <p className="text-gray-600">
          Monitor and manage all third-party integrations from a central dashboard.
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Overview */}
          {systemStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Integrations</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStatus.totalIntegrations}</p>
                    </div>
                    <Settings className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Enabled</p>
                      <p className="text-2xl font-bold text-green-600">{systemStatus.enabledIntegrations}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">System Uptime</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStatus.systemUptime.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Integration Health Status
              </CardTitle>
              <CardDescription>
                Real-time health monitoring for all configured integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getIntegrationIcon(integration.type)}
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(integration.healthStatus)}
                      {integration.isEnabled ? (
                        <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.type} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getIntegrationIcon(integration.type)}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription>{integration.description}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={integration.isEnabled}
                      onCheckedChange={(checked) => toggleIntegration(integration.type, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      {getStatusBadge(integration.healthStatus)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Configuration</span>
                      {integration.isConfigured ? (
                        <Badge className="bg-green-100 text-green-800">Configured</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Needs Setup</Badge>
                      )}
                    </div>

                    {integration.lastSync && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Last Sync</span>
                        <span className="text-sm text-gray-600">
                          {format(new Date(integration.lastSync), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    )}

                    {integration.lastError && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {integration.lastError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadIntegrationDetails(integration.type)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testIntegration(integration.type)}
                        disabled={!integration.isConfigured}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {!selectedIntegration ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Select an integration from the Integrations tab to view detailed information.</p>
              </CardContent>
            </Card>
          ) : integrationDetails ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {getIntegrationIcon(integrationDetails.configuration.type)}
                    <div>
                      <CardTitle>{integrationDetails.configuration.name}</CardTitle>
                      <CardDescription>{integrationDetails.configuration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Version:</span>
                          <span>{integrationDetails.configuration.metadata.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Health Check:</span>
                          <span>{format(new Date(integrationDetails.configuration.metadata.lastHealthCheck), 'MMM dd, HH:mm')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>API Endpoints:</span>
                          <span>{integrationDetails.configuration.apiEndpoints.length}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Performance Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Requests:</span>
                          <span>{integrationDetails.metrics.totalRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span>{((integrationDetails.metrics.successfulRequests / integrationDetails.metrics.totalRequests) * 100 || 0).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Response Time:</span>
                          <span>{integrationDetails.metrics.averageResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uptime:</span>
                          <span>{integrationDetails.metrics.uptime.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supported Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {integrationDetails.configuration.supportedFeatures.map((feature, index) => (
                      <Badge key={index} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {integrationDetails.events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {integrationDetails.events.slice(0, 10).map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{event.eventType.replace(/_/g, ' ').toUpperCase()}</p>
                            <p className="text-sm text-gray-600">{event.message}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={event.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {event.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading integration details...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="text-center">
        <Button onClick={loadIntegrations} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}