import React, { useState, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
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
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Grid3X3,
  Plus,
  Settings,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  GripVertical,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  DollarSign,
  Calendar,
  Activity,
  Bell,
  FileText
} from 'lucide-react';
import { DashboardKPIs } from '@/components/DashboardKPIs';
import { InteractiveRevenueChart, InteractiveProjectChart, InteractiveTeamChart } from '@/components/charts/InteractiveCharts';
import { AdvancedChart } from '@/components/charts/AdvancedCharts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget type definitions
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  description?: string;
  config?: any;
  size: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

// Available widget types
const WIDGET_TYPES = {
  kpis: {
    name: 'KPI Cards',
    icon: BarChart3,
    component: DashboardKPIs,
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 6, h: 2 },
    category: 'metrics'
  },
  revenue_chart: {
    name: 'Revenue Chart',
    icon: LineChart,
    component: InteractiveRevenueChart,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    category: 'charts'
  },
  project_chart: {
    name: 'Project Chart',
    icon: PieChart,
    component: InteractiveProjectChart,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    category: 'charts'
  },
  team_chart: {
    name: 'Team Performance',
    icon: Users,
    component: InteractiveTeamChart,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    category: 'charts'
  },
  activity_feed: {
    name: 'Activity Feed',
    icon: Activity,
    component: ActivityFeedWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
    category: 'data'
  },
  calendar: {
    name: 'Calendar Events',
    icon: Calendar,
    component: CalendarWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    category: 'data'
  },
  notifications: {
    name: 'Notifications',
    icon: Bell,
    component: NotificationWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    category: 'alerts'
  },
  quick_stats: {
    name: 'Quick Stats',
    icon: FileText,
    component: QuickStatsWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    category: 'metrics'
  }
};

// Widget wrapper component
const WidgetWrapper: React.FC<{
  widget: DashboardWidget;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onConfigure: (id: string) => void;
}> = ({ widget, isEditing, onRemove, onConfigure }) => {
  const WidgetComponent = WIDGET_TYPES[widget.type as keyof typeof WIDGET_TYPES]?.component;

  if (!WidgetComponent) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-lg mb-2">⚠️</div>
          <div>Unknown widget type: {widget.type}</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full relative overflow-hidden", isEditing && "ring-2 ring-primary/20")}>
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigure(widget.id)}
            className="h-6 w-6 p-0"
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(widget.id)}
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      {isEditing && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-xs">
            {widget.title}
          </Badge>
        </div>
      )}

      <div className={cn("h-full", isEditing && "pt-8")}>
        <WidgetComponent {...widget.config} userRole="admin" />
      </div>
    </Card>
  );
};

// Widget selection dialog
const WidgetSelector: React.FC<{
  onAddWidget: (type: string) => void;
  children: React.ReactNode;
}> = ({ onAddWidget, children }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'metrics', 'charts', 'data', 'alerts'];

  const filteredWidgets = Object.entries(WIDGET_TYPES).filter(([_, widget]) =>
    selectedCategory === 'all' || widget.category === selectedCategory
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="metrics">Metrics</SelectItem>
                <SelectItem value="charts">Charts</SelectItem>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="alerts">Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {filteredWidgets.map(([type, widget]) => {
              const Icon = widget.icon;
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => onAddWidget(type)}
                >
                  <Icon className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-medium">{widget.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {widget.category}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main customizable dashboard component
export const CustomizableDashboard: React.FC<{
  userRole?: 'admin' | 'manager' | 'employee';
  className?: string;
}> = ({ userRole = 'admin', className }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'kpis-1',
      type: 'kpis',
      title: 'Key Performance Indicators',
      size: { w: 12, h: 3 },
      config: { userRole }
    },
    {
      id: 'revenue-1',
      type: 'revenue_chart',
      title: 'Revenue Trends',
      size: { w: 8, h: 4 },
    },
    {
      id: 'projects-1',
      type: 'project_chart',
      title: 'Project Status',
      size: { w: 4, h: 4 },
    }
  ]);

  const [layouts, setLayouts] = useState<Layouts>({});

  // Generate layout from widgets
  const generateLayout = useCallback((): Layout[] => {
    let yOffset = 0;
    return widgets.map((widget, index) => {
      const layout = {
        i: widget.id,
        x: (index * widget.size.w) % 12,
        y: yOffset,
        w: widget.size.w,
        h: widget.size.h,
        minW: widget.minSize?.w || WIDGET_TYPES[widget.type as keyof typeof WIDGET_TYPES]?.minSize?.w || 2,
        minH: widget.minSize?.h || WIDGET_TYPES[widget.type as keyof typeof WIDGET_TYPES]?.minSize?.h || 2,
        maxW: widget.maxSize?.w,
        maxH: widget.maxSize?.h
      };

      if (layout.x + layout.w > 12) {
        yOffset += 4;
        layout.x = 0;
        layout.y = yOffset;
      }

      return layout;
    });
  }, [widgets]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layout: Layout[], layouts: Layouts) => {
    setLayouts(layouts);
    // Save to localStorage
    localStorage.setItem(`dashboard-layout-${user?.id}`, JSON.stringify(layouts));
  }, [user?.id]);

  // Add new widget
  const handleAddWidget = useCallback((type: string) => {
    const widgetConfig = WIDGET_TYPES[type as keyof typeof WIDGET_TYPES];
    if (!widgetConfig) return;

    const newWidget: DashboardWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title: widgetConfig.name,
      size: widgetConfig.defaultSize,
      minSize: widgetConfig.minSize,
      config: type === 'kpis' ? { userRole } : {}
    };

    setWidgets(prev => [...prev, newWidget]);
  }, [userRole]);

  // Remove widget
  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  // Configure widget
  const handleConfigureWidget = useCallback((id: string) => {
    // TODO: Open widget configuration modal
    console.log('Configure widget:', id);
  }, []);

  // Save dashboard configuration
  const handleSaveDashboard = useCallback(() => {
    const dashboardConfig = {
      widgets,
      layouts,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(`dashboard-config-${user?.id}`, JSON.stringify(dashboardConfig));
    setIsEditing(false);
  }, [widgets, layouts, user?.id]);

  // Reset dashboard to default
  const handleResetDashboard = useCallback(() => {
    setWidgets([
      {
        id: 'kpis-1',
        type: 'kpis',
        title: 'Key Performance Indicators',
        size: { w: 12, h: 3 },
        config: { userRole }
      },
      {
        id: 'revenue-1',
        type: 'revenue_chart',
        title: 'Revenue Trends',
        size: { w: 8, h: 4 },
      },
      {
        id: 'projects-1',
        type: 'project_chart',
        title: 'Project Status',
        size: { w: 4, h: 4 },
      }
    ]);
    setLayouts({});
    localStorage.removeItem(`dashboard-config-${user?.id}`);
    localStorage.removeItem(`dashboard-layout-${user?.id}`);
  }, [userRole, user?.id]);

  // Export dashboard configuration
  const handleExportDashboard = useCallback(() => {
    const config = {
      widgets,
      layouts,
      userRole,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [widgets, layouts, userRole]);

  // Load saved dashboard configuration on mount
  React.useEffect(() => {
    const savedConfig = localStorage.getItem(`dashboard-config-${user?.id}`);
    const savedLayouts = localStorage.getItem(`dashboard-layout-${user?.id}`);

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setWidgets(config.widgets);
      } catch (e) {
        console.error('Failed to load dashboard config:', e);
      }
    }

    if (savedLayouts) {
      try {
        const layouts = JSON.parse(savedLayouts);
        setLayouts(layouts);
      } catch (e) {
        console.error('Failed to load dashboard layouts:', e);
      }
    }
  }, [user?.id]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dashboard controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Customize Dashboard' : 'My Dashboard'}
          </h2>
          {isEditing && (
            <Badge variant="secondary">
              <GripVertical className="w-3 h-3 mr-1" />
              Editing Mode
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isEditing && (
            <WidgetSelector onAddWidget={handleAddWidget}>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Widget
              </Button>
            </WidgetSelector>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full justify-start"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  {isEditing ? 'Exit Edit Mode' : 'Customize Layout'}
                </Button>

                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveDashboard}
                    className="w-full justify-start"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Layout
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportDashboard}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Config
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDashboard}
                  className="w-full justify-start text-destructive"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className={cn(isEditing && "ring-2 ring-dashed ring-primary/30 rounded-lg p-4")}>
        <ResponsiveGridLayout
          className="layout"
          layouts={Object.keys(layouts).length > 0 ? layouts : { lg: generateLayout() }}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditing}
          isResizable={isEditing}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          rowHeight={100}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          useCSSTransforms={true}
        >
          {widgets.map(widget => (
            <div key={widget.id} className="widget-container">
              <WidgetWrapper
                widget={widget}
                isEditing={isEditing}
                onRemove={handleRemoveWidget}
                onConfigure={handleConfigureWidget}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {isEditing && widgets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
          <p className="mb-4">Add widgets to customize your dashboard</p>
          <WidgetSelector onAddWidget={handleAddWidget}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Widget
            </Button>
          </WidgetSelector>
        </div>
      )}
    </div>
  );
};

// Placeholder widget components (these would be implemented separately)
const ActivityFeedWidget: React.FC = () => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Recent Activity</CardTitle>
    </CardHeader>
    <CardContent className="text-xs space-y-2">
      <div>Task completed: Website redesign</div>
      <div>New client: TechCorp</div>
      <div>Project started: Mobile app</div>
    </CardContent>
  </Card>
);

const CalendarWidget: React.FC = () => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Upcoming Events</CardTitle>
    </CardHeader>
    <CardContent className="text-xs space-y-2">
      <div>Team meeting - 2pm</div>
      <div>Client call - 4pm</div>
      <div>Project deadline - Tomorrow</div>
    </CardContent>
  </Card>
);

const NotificationWidget: React.FC = () => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Notifications</CardTitle>
    </CardHeader>
    <CardContent className="text-xs space-y-2">
      <div className="text-destructive">3 overdue tasks</div>
      <div className="text-warning">Budget alert</div>
      <div className="text-success">5 tasks completed</div>
    </CardContent>
  </Card>
);

const QuickStatsWidget: React.FC = () => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Quick Stats</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between text-xs">
        <span>Projects</span>
        <span className="font-medium">24</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Tasks</span>
        <span className="font-medium">156</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Clients</span>
        <span className="font-medium">12</span>
      </div>
    </CardContent>
  </Card>
);