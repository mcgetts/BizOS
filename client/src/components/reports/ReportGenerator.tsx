import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Users,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Target,
  Mail,
  Settings,
  Save,
  Play,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Project, Task, Client, User } from '@shared/schema';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Report configuration interfaces
interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  type: 'executive' | 'operational' | 'financial' | 'team' | 'client' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'html';
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm format
  };
  recipients?: string[];
  sections: ReportSection[];
  filters: ReportFilters;
  branding: {
    includeLogo: boolean;
    companyName: string;
    customColors: boolean;
    primaryColor?: string;
  };
  createdAt?: string;
  lastGenerated?: string;
}

interface ReportSection {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'text' | 'image';
  title: string;
  enabled: boolean;
  config: any;
  order: number;
}

interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
    preset?: 'last-week' | 'last-month' | 'last-quarter' | 'last-year' | 'custom';
  };
  projects?: string[];
  clients?: string[];
  users?: string[];
  status?: string[];
}

// Pre-defined report templates
const REPORT_TEMPLATES: Record<string, Omit<ReportConfig, 'id' | 'name'>> = {
  executive: {
    description: 'High-level executive summary with key metrics and insights',
    type: 'executive',
    format: 'pdf',
    sections: [
      {
        id: 'executive-kpis',
        type: 'kpi',
        title: 'Key Performance Indicators',
        enabled: true,
        config: { metrics: ['revenue', 'projects', 'team-utilization', 'client-satisfaction'] },
        order: 1
      },
      {
        id: 'revenue-chart',
        type: 'chart',
        title: 'Revenue Trends',
        enabled: true,
        config: { chartType: 'line', dataSource: 'revenue', period: 'monthly' },
        order: 2
      },
      {
        id: 'project-status',
        type: 'chart',
        title: 'Project Status Overview',
        enabled: true,
        config: { chartType: 'pie', dataSource: 'projects', groupBy: 'status' },
        order: 3
      },
      {
        id: 'executive-summary',
        type: 'text',
        title: 'Executive Summary',
        enabled: true,
        config: { autoGenerate: true, includeInsights: true },
        order: 4
      }
    ],
    filters: {
      dateRange: { start: '', end: '', preset: 'last-month' }
    },
    branding: {
      includeLogo: true,
      companyName: 'Your Company',
      customColors: true,
      primaryColor: '#3b82f6'
    }
  },
  operational: {
    description: 'Detailed operational metrics and team performance',
    type: 'operational',
    format: 'pdf',
    sections: [
      {
        id: 'team-performance',
        type: 'chart',
        title: 'Team Performance',
        enabled: true,
        config: { chartType: 'bar', dataSource: 'team', metric: 'productivity' },
        order: 1
      },
      {
        id: 'task-completion',
        type: 'table',
        title: 'Task Completion Summary',
        enabled: true,
        config: { dataSource: 'tasks', columns: ['project', 'status', 'assignee', 'due-date'] },
        order: 2
      },
      {
        id: 'project-progress',
        type: 'table',
        title: 'Project Progress',
        enabled: true,
        config: { dataSource: 'projects', columns: ['name', 'status', 'progress', 'deadline'] },
        order: 3
      }
    ],
    filters: {
      dateRange: { start: '', end: '', preset: 'last-week' }
    },
    branding: {
      includeLogo: false,
      companyName: 'Your Company',
      customColors: false
    }
  },
  financial: {
    description: 'Financial performance and revenue analysis',
    type: 'financial',
    format: 'excel',
    sections: [
      {
        id: 'revenue-breakdown',
        type: 'chart',
        title: 'Revenue Breakdown by Client',
        enabled: true,
        config: { chartType: 'pie', dataSource: 'revenue', groupBy: 'client' },
        order: 1
      },
      {
        id: 'financial-kpis',
        type: 'kpi',
        title: 'Financial KPIs',
        enabled: true,
        config: { metrics: ['revenue', 'profit-margin', 'cash-flow', 'billing-efficiency'] },
        order: 2
      },
      {
        id: 'invoice-summary',
        type: 'table',
        title: 'Invoice Summary',
        enabled: true,
        config: { dataSource: 'invoices', columns: ['client', 'amount', 'status', 'due-date'] },
        order: 3
      }
    ],
    filters: {
      dateRange: { start: '', end: '', preset: 'last-quarter' }
    },
    branding: {
      includeLogo: true,
      companyName: 'Your Company',
      customColors: true,
      primaryColor: '#10b981'
    }
  }
};

// Report builder component
const ReportBuilder: React.FC<{
  config: ReportConfig;
  onChange: (config: ReportConfig) => void;
}> = ({ config, onChange }) => {
  const updateConfig = (updates: Partial<ReportConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    const updatedSections = config.sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    updateConfig({ sections: updatedSections });
  };

  const addSection = (type: ReportSection['type']) => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type,
      title: `New ${type} Section`,
      enabled: true,
      config: {},
      order: config.sections.length + 1
    };
    updateConfig({ sections: [...config.sections, newSection] });
  };

  const removeSection = (sectionId: string) => {
    const updatedSections = config.sections.filter(s => s.id !== sectionId);
    updateConfig({ sections: updatedSections });
  };

  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="Enter report name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={config.type} onValueChange={(value) => updateConfig({ type: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">Executive Summary</SelectItem>
                  <SelectItem value="operational">Operational Report</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="team">Team Performance</SelectItem>
                  <SelectItem value="client">Client Report</SelectItem>
                  <SelectItem value="custom">Custom Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description">Description</Label>
            <Textarea
              id="report-description"
              value={config.description || ''}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Brief description of the report"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-format">Format</Label>
              <Select value={config.format} onValueChange={(value) => updateConfig({ format: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select
                value={config.filters.dateRange.preset || 'custom'}
                onValueChange={(value) => updateConfig({
                  filters: {
                    ...config.filters,
                    dateRange: { ...config.filters.dateRange, preset: value as any }
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report Sections</CardTitle>
            <div className="flex items-center space-x-2">
              <Select onValueChange={(value) => addSection(value as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Add section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kpi">KPI Metrics</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="table">Data Table</SelectItem>
                  <SelectItem value="text">Text/Summary</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {config.sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={section.enabled}
                    onCheckedChange={(checked) => updateSection(section.id, { enabled: !!checked })}
                  />
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-sm text-muted-foreground capitalize">{section.type} section</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTitle = prompt('Enter section title:', section.title);
                      if (newTitle) updateSection(section.id, { title: newTitle });
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {config.sections.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No sections added</h3>
                <p>Add sections to build your report</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduling & Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={config.schedule?.enabled || false}
              onCheckedChange={(checked) => updateConfig({
                schedule: { ...config.schedule, enabled: !!checked, frequency: 'weekly', time: '09:00' }
              })}
            />
            <Label>Enable automatic generation</Label>
          </div>

          {config.schedule?.enabled && (
            <div className="grid grid-cols-3 gap-4 pl-6">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={config.schedule.frequency}
                  onValueChange={(value) => updateConfig({
                    schedule: { ...config.schedule, frequency: value as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={config.schedule.time}
                  onChange={(e) => updateConfig({
                    schedule: { ...config.schedule, time: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Recipients</Label>
                <Input
                  placeholder="email1@company.com, email2@company.com"
                  value={config.recipients?.join(', ') || ''}
                  onChange={(e) => updateConfig({
                    recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Report preview component
const ReportPreview: React.FC<{ config: ReportConfig }> = ({ config }) => {
  const { data: projects } = useQuery<Project[]>({ queryKey: ['/api/projects'] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ['/api/tasks'] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ['/api/clients'] });
  const { data: users } = useQuery<User[]>({ queryKey: ['/api/users'] });

  const generateSampleData = (section: ReportSection) => {
    switch (section.type) {
      case 'kpi':
        return {
          revenue: '£125,000',
          projects: '15 Active',
          'team-utilization': '87%',
          'client-satisfaction': '4.8/5'
        };
      case 'chart':
        return Array.from({ length: 6 }, (_, i) => ({
          name: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 100) + 20
        }));
      case 'table':
        return Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `Sample Row ${i + 1}`,
          status: ['Active', 'Pending', 'Complete'][i % 3],
          value: Math.floor(Math.random() * 1000) + 100
        }));
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 bg-white p-8 rounded-lg border">
      {/* Report Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{config.name}</h1>
            {config.description && (
              <p className="text-muted-foreground">{config.description}</p>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>Generated: {format(new Date(), 'MMM d, yyyy')}</div>
            <div>Period: {config.filters.dateRange.preset || 'Custom range'}</div>
          </div>
        </div>
      </div>

      {/* Report Sections */}
      {config.sections
        .filter(section => section.enabled)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>

            {section.type === 'kpi' && (
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(generateSampleData(section) as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-sm text-muted-foreground capitalize">{key.replace('-', ' ')}</div>
                  </div>
                ))}
              </div>
            )}

            {section.type === 'chart' && (
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <div>Chart Preview</div>
                  <div className="text-sm">({section.config?.chartType || 'bar'} chart)</div>
                </div>
              </div>
            )}

            {section.type === 'table' && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(generateSampleData(section) as any[]).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{row.name}</td>
                        <td className="p-3">
                          <Badge variant="secondary">{row.status}</Badge>
                        </td>
                        <td className="p-3">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.type === 'text' && (
              <div className="prose max-w-none">
                <p className="text-muted-foreground">
                  This section will contain generated text content, insights, and analysis based on your data.
                  The actual report will include real metrics, trends, and recommendations.
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

// Main report generator component
export const ReportGenerator: React.FC<{ className?: string }> = ({ className }) => {
  const [currentConfig, setCurrentConfig] = useState<ReportConfig>({
    name: 'New Report',
    type: 'executive',
    format: 'pdf',
    sections: [],
    filters: {
      dateRange: { start: '', end: '', preset: 'last-month' }
    },
    branding: {
      includeLogo: true,
      companyName: 'Your Company',
      customColors: false
    }
  });

  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Load template
  const loadTemplate = (templateKey: string) => {
    const template = REPORT_TEMPLATES[templateKey];
    if (template) {
      setCurrentConfig({
        ...template,
        name: `${templateKey.charAt(0).toUpperCase() + templateKey.slice(1)} Report`,
        id: undefined
      });
    }
  };

  // Save report configuration
  const saveReport = () => {
    const reportWithId = {
      ...currentConfig,
      id: currentConfig.id || `report-${Date.now()}`,
      createdAt: currentConfig.createdAt || new Date().toISOString()
    };

    const updated = savedReports.filter(r => r.id !== reportWithId.id);
    updated.push(reportWithId);
    setSavedReports(updated);
    setCurrentConfig(reportWithId);

    // Save to localStorage
    localStorage.setItem('saved-reports', JSON.stringify(updated));
  };

  // Generate report
  const generateReport = async () => {
    setIsGenerating(true);

    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update last generated timestamp
      const updatedConfig = {
        ...currentConfig,
        lastGenerated: new Date().toISOString()
      };
      setCurrentConfig(updatedConfig);

      // In a real implementation, this would call the backend API
      // const response = await fetch('/api/reports/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(currentConfig)
      // });

      // For demo, create a download
      const content = `Report: ${currentConfig.name}\nGenerated: ${new Date().toISOString()}\n\nThis is a sample report file.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentConfig.name.replace(/\s+/g, '-').toLowerCase()}.${currentConfig.format}`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load saved reports on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('saved-reports');
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved reports:', e);
      }
    }
  }, []);

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center space-x-2">
              <FileText className="w-6 h-6" />
              <span>Report Generator</span>
            </h2>
            <p className="text-muted-foreground">Create and schedule automated reports</p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>

            <Button variant="outline" onClick={saveReport}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="relative"
            >
              {isGenerating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="builder" className="w-full">
          <TabsList>
            <TabsTrigger value="builder">Report Builder</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="saved">Saved Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            {previewMode ? (
              <ReportPreview config={currentConfig} />
            ) : (
              <ReportBuilder config={currentConfig} onChange={setCurrentConfig} />
            )}
          </TabsContent>

          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(REPORT_TEMPLATES).map(([key, template]) => (
                <Card key={key} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="capitalize">{key} Report</CardTitle>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Sections:</span>
                        <Badge variant="secondary">{template.sections.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Format:</span>
                        <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => loadTemplate(key)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="space-y-4">
              {savedReports.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {savedReports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{report.name}</h3>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>Type: {report.type}</span>
                              <span>Format: {report.format}</span>
                              {report.lastGenerated && (
                                <span>Last generated: {format(new Date(report.lastGenerated), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentConfig(report)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCurrentConfig(report);
                                generateReport();
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No saved reports</h3>
                  <p>Create and save reports to see them here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scheduled">
            <div className="space-y-4">
              {savedReports.filter(r => r.schedule?.enabled).length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {savedReports
                    .filter(r => r.schedule?.enabled)
                    .map((report) => (
                      <Card key={report.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{report.name}</h3>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                                <span>Frequency: {report.schedule?.frequency}</span>
                                <span>Time: {report.schedule?.time}</span>
                                <span>Recipients: {report.recipients?.length || 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">Active</Badge>
                              <Button variant="outline" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No scheduled reports</h3>
                  <p>Enable scheduling on your reports to automate delivery</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};