import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Filter,
  Download,
  Settings,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Chart configuration interfaces
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radial' | 'combo';
  title: string;
  description?: string;
  data: ChartDataPoint[];
  xAxisKey: string;
  yAxisKey: string | string[];
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  enableZoom?: boolean;
  enableDrillDown?: boolean;
  drillDownHandler?: (data: ChartDataPoint) => void;
  customTooltip?: boolean;
  height?: number;
}

// Color palettes for charts
const CHART_COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
  secondary: ['#64748b', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
  success: ['#10b981', '#34d399', '#6ee7b7', '#9decdb', '#c6f6d5', '#d1fae5'],
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb'],
  danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2']
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg min-w-[200px]">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between text-sm mb-1">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name || entry.dataKey}</span>
          </div>
          <span className="font-medium text-foreground">
            {formatter ? formatter(entry.value) : entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// Chart type selector
const ChartTypeSelector = ({
  currentType,
  onTypeChange
}: {
  currentType: string;
  onTypeChange: (type: string) => void;
}) => {
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChartIcon },
    { value: 'area', label: 'Area Chart', icon: TrendingUp },
    { value: 'pie', label: 'Pie Chart', icon: PieChartIcon },
    { value: 'scatter', label: 'Scatter Plot', icon: BarChart3 },
    { value: 'radial', label: 'Radial Chart', icon: PieChartIcon },
  ];

  return (
    <Select value={currentType} onValueChange={onTypeChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select chart type" />
      </SelectTrigger>
      <SelectContent>
        {chartTypes.map((type) => {
          const Icon = type.icon;
          return (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <span>{type.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

// Main chart component
export const AdvancedChart: React.FC<ChartConfig & {
  className?: string;
  onExport?: () => void;
  onFullscreen?: () => void;
}> = ({
  type,
  title,
  description,
  data,
  xAxisKey,
  yAxisKey,
  colors = CHART_COLORS.primary,
  showLegend = true,
  showGrid = true,
  enableZoom = false,
  enableDrillDown = false,
  drillDownHandler,
  customTooltip = true,
  height = 400,
  className,
  onExport,
  onFullscreen
}) => {
  const [chartType, setChartType] = useState(type);
  const [selectedColor, setSelectedColor] = useState('primary');

  const currentColors = CHART_COLORS[selectedColor as keyof typeof CHART_COLORS] || colors;

  const handleDataPointClick = (data: any) => {
    if (enableDrillDown && drillDownHandler) {
      drillDownHandler(data);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const tooltipProps = customTooltip
      ? { content: <CustomTooltip /> }
      : {};

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis
              dataKey={xAxisKey}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            {Array.isArray(yAxisKey) ? (
              yAxisKey.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={currentColors[index % currentColors.length]}
                  radius={[4, 4, 0, 0]}
                  onClick={handleDataPointClick}
                  style={{ cursor: enableDrillDown ? 'pointer' : 'default' }}
                />
              ))
            ) : (
              <Bar
                dataKey={yAxisKey}
                fill={currentColors[0]}
                radius={[4, 4, 0, 0]}
                onClick={handleDataPointClick}
                style={{ cursor: enableDrillDown ? 'pointer' : 'default' }}
              />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            {Array.isArray(yAxisKey) ? (
              yAxisKey.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={currentColors[index % currentColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, onClick: handleDataPointClick }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke={currentColors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6, onClick: handleDataPointClick }}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            {Array.isArray(yAxisKey) ? (
              yAxisKey.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={currentColors[index % currentColors.length]}
                  fill={currentColors[index % currentColors.length]}
                  fillOpacity={0.6}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={yAxisKey}
                stroke={currentColors[0]}
                fill={currentColors[0]}
                fillOpacity={0.6}
              />
            )}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              fill="#8884d8"
              dataKey={yAxisKey as string}
              onClick={handleDataPointClick}
              style={{ cursor: enableDrillDown ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={currentColors[index % currentColors.length]}
                />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis dataKey={yAxisKey as string} className="text-xs" />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            <Scatter
              name="Data Points"
              data={data}
              fill={currentColors[0]}
              onClick={handleDataPointClick}
            />
          </ScatterChart>
        );

      case 'radial':
        return (
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="90%"
            data={data}
          >
            <RadialBar
              minAngle={15}
              dataKey={yAxisKey as string}
              cornerRadius={10}
              fill={currentColors[0]}
              onClick={handleDataPointClick}
            />
            <Legend />
            <Tooltip {...tooltipProps} />
          </RadialBarChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card className={cn("glassmorphism", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{title}</span>
              {enableDrillDown && (
                <Badge variant="secondary" className="text-xs">
                  Interactive
                </Badge>
              )}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <ChartTypeSelector
              currentType={chartType}
              onTypeChange={setChartType}
            />
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="danger">Danger</SelectItem>
              </SelectContent>
            </Select>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4" />
              </Button>
            )}
            {onFullscreen && (
              <Button variant="outline" size="sm" onClick={onFullscreen}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Pre-configured chart components for common use cases
export const RevenueChart: React.FC<{ data: ChartDataPoint[]; className?: string }> = ({
  data,
  className
}) => (
  <AdvancedChart
    type="bar"
    title="Revenue Trends"
    description="Monthly revenue performance"
    data={data}
    xAxisKey="month"
    yAxisKey="revenue"
    colors={CHART_COLORS.success}
    enableDrillDown={true}
    className={className}
  />
);

export const ProjectStatusChart: React.FC<{ data: ChartDataPoint[]; className?: string }> = ({
  data,
  className
}) => (
  <AdvancedChart
    type="pie"
    title="Project Status Distribution"
    description="Current project status breakdown"
    data={data}
    xAxisKey="status"
    yAxisKey="count"
    colors={CHART_COLORS.primary}
    enableDrillDown={true}
    className={className}
  />
);

export const TeamPerformanceChart: React.FC<{ data: ChartDataPoint[]; className?: string }> = ({
  data,
  className
}) => (
  <AdvancedChart
    type="line"
    title="Team Performance"
    description="Team productivity over time"
    data={data}
    xAxisKey="month"
    yAxisKey={["tasksCompleted", "efficiency"]}
    colors={CHART_COLORS.primary}
    enableDrillDown={true}
    className={className}
  />
);