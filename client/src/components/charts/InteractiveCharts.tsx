import React, { useState, useCallback } from 'react';
import { AdvancedChart, ChartDataPoint } from './AdvancedCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Project, Task, Client, User } from '@shared/schema';

// Drill-down context interface
interface DrillDownContext {
  level: number;
  parentData?: ChartDataPoint;
  filters: Record<string, any>;
  breadcrumbs: Array<{ label: string; data?: ChartDataPoint }>;
}

// Interactive chart component with drill-down capabilities
export const InteractiveBusinessChart: React.FC<{
  initialChartType?: 'revenue' | 'projects' | 'team' | 'clients';
  className?: string;
}> = ({ initialChartType = 'revenue', className }) => {
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext>({
    level: 0,
    filters: {},
    breadcrumbs: [{ label: 'Overview' }]
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch data for charts
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Generate chart data based on context and filters
  const generateChartData = useCallback((type: string, context: DrillDownContext) => {
    if (!projects || !tasks || !clients || !users) return [];

    switch (type) {
      case 'revenue':
        return generateRevenueData(context);
      case 'projects':
        return generateProjectData(context);
      case 'team':
        return generateTeamData(context);
      case 'clients':
        return generateClientData(context);
      default:
        return [];
    }
  }, [projects, tasks, clients, users]);

  // Revenue data generation with drill-down levels
  const generateRevenueData = (context: DrillDownContext): ChartDataPoint[] => {
    if (context.level === 0) {
      // Top level: Monthly revenue overview
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month, index) => ({
        name: month,
        revenue: 50000 + Math.random() * 30000,
        value: 50000 + Math.random() * 30000,
        invoices: 12 + Math.floor(Math.random() * 8),
        clients: 8 + Math.floor(Math.random() * 5),
        drillDown: 'month'
      }));
    } else if (context.level === 1) {
      // Second level: Client breakdown for selected month
      return clients?.slice(0, 6).map((client, index) => ({
        name: client.name,
        revenue: 5000 + Math.random() * 15000,
        value: 5000 + Math.random() * 15000,
        projects: Math.floor(Math.random() * 5) + 1,
        status: client.status,
        drillDown: 'client'
      })) || [];
    } else {
      // Third level: Project breakdown for selected client
      const clientProjects = projects?.filter(p => p.clientId === context.parentData?.id) || [];
      return clientProjects.map(project => ({
        name: project.name,
        revenue: 10000 + Math.random() * 20000,
        value: 10000 + Math.random() * 20000,
        status: project.status,
        progress: Math.floor(Math.random() * 100),
        drillDown: 'project'
      }));
    }
  };

  // Project data generation with drill-down levels
  const generateProjectData = (context: DrillDownContext): ChartDataPoint[] => {
    if (context.level === 0) {
      // Top level: Project status overview
      const statuses = [
        { name: 'In Progress', value: projects?.filter(p => p.status === 'in_progress').length || 0, color: '#3b82f6' },
        { name: 'Planning', value: projects?.filter(p => p.status === 'planning').length || 0, color: '#f59e0b' },
        { name: 'Completed', value: projects?.filter(p => p.status === 'completed').length || 0, color: '#10b981' },
        { name: 'On Hold', value: projects?.filter(p => p.status === 'on_hold').length || 0, color: '#ef4444' }
      ];
      return statuses.map(status => ({
        ...status,
        drillDown: 'status'
      }));
    } else if (context.level === 1) {
      // Second level: Projects by selected status
      const selectedStatus = context.parentData?.name.toLowerCase().replace(' ', '_');
      const filteredProjects = projects?.filter(p => p.status === selectedStatus) || [];
      return filteredProjects.map(project => ({
        name: project.name,
        value: Math.floor(Math.random() * 100),
        progress: Math.floor(Math.random() * 100),
        tasksTotal: Math.floor(Math.random() * 20) + 5,
        tasksCompleted: Math.floor(Math.random() * 15),
        drillDown: 'project'
      }));
    } else {
      // Third level: Tasks for selected project
      const projectTasks = tasks?.filter(t => t.projectId === context.parentData?.id) || [];
      return projectTasks.map(task => ({
        name: task.title,
        value: task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1,
        status: task.status,
        priority: task.priority,
        assignee: users?.find(u => u.id === task.assignedTo)?.firstName || 'Unassigned'
      }));
    }
  };

  // Team data generation with drill-down levels
  const generateTeamData = (context: DrillDownContext): ChartDataPoint[] => {
    if (context.level === 0) {
      // Top level: Team performance overview
      return users?.filter(u => u.role !== 'admin').map(user => ({
        name: `${user.firstName} ${user.lastName}`,
        value: Math.floor(Math.random() * 100) + 20,
        tasksCompleted: Math.floor(Math.random() * 50) + 10,
        efficiency: Math.floor(Math.random() * 40) + 60,
        role: user.role,
        drillDown: 'user'
      })) || [];
    } else {
      // Second level: Individual user task breakdown
      const userTasks = tasks?.filter(t => t.assignedTo === context.parentData?.id) || [];
      const tasksByStatus = {
        completed: userTasks.filter(t => t.status === 'completed').length,
        'in_progress': userTasks.filter(t => t.status === 'in_progress').length,
        pending: userTasks.filter(t => t.status === 'pending').length,
        blocked: userTasks.filter(t => t.status === 'blocked').length
      };

      return Object.entries(tasksByStatus).map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count,
        percentage: userTasks.length > 0 ? (count / userTasks.length) * 100 : 0
      }));
    }
  };

  // Client data generation with drill-down levels
  const generateClientData = (context: DrillDownContext): ChartDataPoint[] => {
    if (context.level === 0) {
      // Top level: Client status distribution
      const clientsByStatus = {
        active: clients?.filter(c => c.status === 'client').length || 0,
        leads: clients?.filter(c => c.status === 'lead').length || 0,
        prospects: clients?.filter(c => c.status === 'prospect').length || 0
      };

      return Object.entries(clientsByStatus).map(([status, count]) => ({
        name: status.toUpperCase(),
        value: count,
        drillDown: 'status'
      }));
    } else {
      // Second level: Individual clients by status
      const selectedStatus = context.parentData?.name.toLowerCase();
      const statusMap: Record<string, string> = {
        'active': 'client',
        'leads': 'lead',
        'prospects': 'prospect'
      };

      const filteredClients = clients?.filter(c => c.status === statusMap[selectedStatus]) || [];
      return filteredClients.map(client => ({
        name: client.name,
        value: Math.floor(Math.random() * 100000) + 10000,
        projects: projects?.filter(p => p.clientId === client.id).length || 0,
        lastContact: client.lastContactDate,
        status: client.status,
        drillDown: 'client'
      }));
    }
  };

  // Handle drill-down navigation
  const handleDrillDown = (data: ChartDataPoint) => {
    if (!data.drillDown) return;

    setDrillDownContext(prev => ({
      level: prev.level + 1,
      parentData: data,
      filters: { ...prev.filters, [data.drillDown]: data.name },
      breadcrumbs: [...prev.breadcrumbs, { label: data.name, data }]
    }));
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = drillDownContext.breadcrumbs.slice(0, index + 1);
    setDrillDownContext({
      level: index,
      parentData: newBreadcrumbs[index]?.data,
      filters: {},
      breadcrumbs: newBreadcrumbs
    });
  };

  // Export chart data
  const handleExport = () => {
    const data = generateChartData(initialChartType, drillDownContext);
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initialChartType}-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = generateChartData(initialChartType, drillDownContext);

  const getChartConfig = () => {
    const baseConfig = {
      data: chartData,
      enableDrillDown: drillDownContext.level < 2,
      drillDownHandler: handleDrillDown,
      customTooltip: true,
      height: isFullscreen ? 600 : 400
    };

    switch (initialChartType) {
      case 'revenue':
        return {
          ...baseConfig,
          type: drillDownContext.level === 0 ? 'bar' : 'pie',
          title: drillDownContext.level === 0 ? 'Revenue Overview' :
                 drillDownContext.level === 1 ? 'Revenue by Client' : 'Revenue by Project',
          xAxisKey: 'name',
          yAxisKey: 'revenue',
          colors: ['#10b981', '#34d399', '#6ee7b7']
        };
      case 'projects':
        return {
          ...baseConfig,
          type: drillDownContext.level === 0 ? 'pie' : 'bar',
          title: drillDownContext.level === 0 ? 'Project Status' :
                 drillDownContext.level === 1 ? 'Projects Detail' : 'Project Tasks',
          xAxisKey: 'name',
          yAxisKey: 'value',
          colors: ['#3b82f6', '#8b5cf6', '#06b6d4']
        };
      case 'team':
        return {
          ...baseConfig,
          type: drillDownContext.level === 0 ? 'bar' : 'pie',
          title: drillDownContext.level === 0 ? 'Team Performance' : 'Task Distribution',
          xAxisKey: 'name',
          yAxisKey: drillDownContext.level === 0 ? ['tasksCompleted', 'efficiency'] : 'value',
          colors: ['#f59e0b', '#fbbf24', '#fcd34d']
        };
      case 'clients':
        return {
          ...baseConfig,
          type: drillDownContext.level === 0 ? 'pie' : 'bar',
          title: drillDownContext.level === 0 ? 'Client Distribution' : 'Client Details',
          xAxisKey: 'name',
          yAxisKey: 'value',
          colors: ['#ef4444', '#f87171', '#fca5a5']
        };
      default:
        return baseConfig;
    }
  };

  const chartConfig = getChartConfig();

  const FullscreenChart = () => (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{chartConfig.title} - Fullscreen</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <AdvancedChart
            {...chartConfig}
            className="border-0 shadow-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={className}>
      {/* Breadcrumb navigation */}
      {drillDownContext.breadcrumbs.length > 1 && (
        <div className="flex items-center space-x-2 mb-4 p-3 bg-muted/50 rounded-lg">
          {drillDownContext.breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-muted-foreground">/</span>}
              <Button
                variant={index === drillDownContext.breadcrumbs.length - 1 ? "default" : "ghost"}
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className="h-auto py-1 px-2"
              >
                {crumb.label}
              </Button>
            </React.Fragment>
          ))}
          {drillDownContext.level > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBreadcrumbClick(0)}
              className="ml-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Overview
            </Button>
          )}
        </div>
      )}

      {/* Main chart */}
      <AdvancedChart
        {...chartConfig}
        onExport={handleExport}
        onFullscreen={() => setIsFullscreen(true)}
        className="transition-all duration-200 hover:shadow-lg"
      />

      {/* Drill-down indicators */}
      {chartConfig.enableDrillDown && (
        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-primary">
            <Filter className="w-4 h-4" />
            <span>Click on chart elements to drill down for more details</span>
          </div>
        </div>
      )}

      <FullscreenChart />
    </div>
  );
};

// Pre-configured interactive charts for dashboard
export const InteractiveRevenueChart = (props: any) => (
  <InteractiveBusinessChart initialChartType="revenue" {...props} />
);

export const InteractiveProjectChart = (props: any) => (
  <InteractiveBusinessChart initialChartType="projects" {...props} />
);

export const InteractiveTeamChart = (props: any) => (
  <InteractiveBusinessChart initialChartType="team" {...props} />
);

export const InteractiveClientChart = (props: any) => (
  <InteractiveBusinessChart initialChartType="clients" {...props} />
);

// Main export
export const InteractiveCharts = InteractiveBusinessChart;