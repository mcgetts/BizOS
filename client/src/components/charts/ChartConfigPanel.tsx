import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Settings,
  Palette,
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Save,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { ChartConfig } from './AdvancedCharts';

// Chart configuration interface
export interface ExtendedChartConfig extends ChartConfig {
  id?: string;
  animation?: boolean;
  animationDuration?: number;
  gridOpacity?: number;
  borderRadius?: number;
  fontSize?: number;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  colorPalette?: string;
  showDataLabels?: boolean;
  showAxis?: boolean;
  responsive?: boolean;
}

// Color palette definitions
const COLOR_PALETTES = {
  primary: {
    name: 'Primary Blue',
    colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
  },
  sunset: {
    name: 'Sunset',
    colors: ['#ff7849', '#ff9500', '#ffad00', '#ffcc02', '#ffe135', '#f6f192']
  },
  ocean: {
    name: 'Ocean',
    colors: ['#0077be', '#00a8cc', '#58c4dc', '#85d2e6', '#b3e0f0', '#e1eef6']
  },
  forest: {
    name: 'Forest',
    colors: ['#2d5016', '#3d691a', '#5d8f2a', '#7db83a', '#9dd84a', '#c4ea6b']
  },
  monochrome: {
    name: 'Monochrome',
    colors: ['#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6']
  },
  vibrant: {
    name: 'Vibrant',
    colors: ['#e11d48', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
  }
};

// Chart configuration panel component
export const ChartConfigPanel: React.FC<{
  config: ExtendedChartConfig;
  onConfigChange: (config: ExtendedChartConfig) => void;
  onSave?: (config: ExtendedChartConfig) => void;
  onReset?: () => void;
  className?: string;
}> = ({ config, onConfigChange, onSave, onReset, className }) => {
  const [previewMode, setPreviewMode] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<ExtendedChartConfig[]>([]);

  const updateConfig = (updates: Partial<ExtendedChartConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
    // Save to local storage for persistence
    const saved = [...savedConfigs, { ...config, id: Date.now().toString() }];
    setSavedConfigs(saved);
    localStorage.setItem('chartConfigs', JSON.stringify(saved));
  };

  const handleLoadConfig = (savedConfig: ExtendedChartConfig) => {
    onConfigChange(savedConfig);
  };

  const exportConfig = () => {
    const configData = JSON.stringify(config, null, 2);
    const blob = new Blob([configData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Chart Configuration</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportConfig}>
              <Download className="w-4 h-4" />
            </Button>
            {onSave && (
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4" />
              </Button>
            )}
            {onReset && (
              <Button variant="outline" size="sm" onClick={onReset}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="appearance">Style</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Configuration */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select value={config.type} onValueChange={(value) => updateConfig({ type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>Bar Chart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="line">
                      <div className="flex items-center space-x-2">
                        <LineChart className="w-4 h-4" />
                        <span>Line Chart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="pie">
                      <div className="flex items-center space-x-2">
                        <PieChart className="w-4 h-4" />
                        <span>Pie Chart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="scatter">Scatter Plot</SelectItem>
                    <SelectItem value="radial">Radial Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Chart Height</Label>
                <div className="px-3">
                  <Slider
                    value={[config.height || 400]}
                    onValueChange={([value]) => updateConfig({ height: value })}
                    max={800}
                    min={200}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>200px</span>
                    <span>{config.height || 400}px</span>
                    <span>800px</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Chart Title</Label>
                <Input
                  id="title"
                  value={config.title}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  placeholder="Enter chart title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={config.description || ''}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="Enter chart description"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="legend"
                  checked={config.showLegend}
                  onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
                />
                <Label htmlFor="legend">Show Legend</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="grid"
                  checked={config.showGrid}
                  onCheckedChange={(checked) => updateConfig({ showGrid: checked })}
                />
                <Label htmlFor="grid">Show Grid</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="drilldown"
                  checked={config.enableDrillDown}
                  onCheckedChange={(checked) => updateConfig({ enableDrillDown: checked })}
                />
                <Label htmlFor="drilldown">Enable Drill-down</Label>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Configuration */}
          <TabsContent value="appearance" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Color Palette</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                    <Button
                      key={key}
                      variant={config.colorPalette === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateConfig({ colorPalette: key, colors: palette.colors })}
                      className="justify-start"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {palette.colors.slice(0, 3).map((color, index) => (
                            <div
                              key={index}
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-xs">{palette.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Legend Position</Label>
                  <Select
                    value={config.legendPosition || 'bottom'}
                    onValueChange={(value) => updateConfig({ legendPosition: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <div className="px-3">
                    <Slider
                      value={[config.fontSize || 12]}
                      onValueChange={([value]) => updateConfig({ fontSize: value })}
                      max={20}
                      min={8}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {config.fontSize || 12}px
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grid Opacity</Label>
                  <div className="px-3">
                    <Slider
                      value={[config.gridOpacity || 30]}
                      onValueChange={([value]) => updateConfig({ gridOpacity: value })}
                      max={100}
                      min={0}
                      step={10}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {config.gridOpacity || 30}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Border Radius</Label>
                  <div className="px-3">
                    <Slider
                      value={[config.borderRadius || 4]}
                      onValueChange={([value]) => updateConfig({ borderRadius: value })}
                      max={20}
                      min={0}
                      step={2}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {config.borderRadius || 4}px
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="data-labels"
                    checked={config.showDataLabels}
                    onCheckedChange={(checked) => updateConfig({ showDataLabels: checked })}
                  />
                  <Label htmlFor="data-labels">Show Data Labels</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="axis"
                    checked={config.showAxis !== false}
                    onCheckedChange={(checked) => updateConfig({ showAxis: checked })}
                  />
                  <Label htmlFor="axis">Show Axis</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Configuration */}
          <TabsContent value="data" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="x-axis">X-Axis Key</Label>
                <Input
                  id="x-axis"
                  value={config.xAxisKey}
                  onChange={(e) => updateConfig({ xAxisKey: e.target.value })}
                  placeholder="X-axis data key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="y-axis">Y-Axis Key</Label>
                <Input
                  id="y-axis"
                  value={Array.isArray(config.yAxisKey) ? config.yAxisKey.join(',') : config.yAxisKey}
                  onChange={(e) => {
                    const keys = e.target.value.split(',').map(k => k.trim());
                    updateConfig({ yAxisKey: keys.length === 1 ? keys[0] : keys });
                  }}
                  placeholder="Y-axis data key(s)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data Sample</Label>
              <div className="p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                <pre className="text-xs">
                  {JSON.stringify(config.data?.slice(0, 3) || [], null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Configuration */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="animation"
                  checked={config.animation !== false}
                  onCheckedChange={(checked) => updateConfig({ animation: checked })}
                />
                <Label htmlFor="animation">Enable Animation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="responsive"
                  checked={config.responsive !== false}
                  onCheckedChange={(checked) => updateConfig({ responsive: checked })}
                />
                <Label htmlFor="responsive">Responsive</Label>
              </div>
            </div>

            {config.animation !== false && (
              <div className="space-y-2">
                <Label>Animation Duration</Label>
                <div className="px-3">
                  <Slider
                    value={[config.animationDuration || 1000]}
                    onValueChange={([value]) => updateConfig({ animationDuration: value })}
                    max={3000}
                    min={200}
                    step={100}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {config.animationDuration || 1000}ms
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Saved Configurations</Label>
              {savedConfigs.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {savedConfigs.map((savedConfig) => (
                    <div key={savedConfig.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{savedConfig.title}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadConfig(savedConfig)}
                      >
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No saved configurations</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};