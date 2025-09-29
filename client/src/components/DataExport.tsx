import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, FileText, Database, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ExportFormat = 'csv' | 'json' | 'xlsx';
type ExportEntity = 'users' | 'clients' | 'companies' | 'projects' | 'tasks' |
                   'timeEntries' | 'invoices' | 'expenses' | 'documents' |
                   'knowledgeArticles' | 'salesOpportunities' | 'supportTickets' |
                   'marketingCampaigns' | 'all';

interface ExportProgress {
  entity: string;
  processed: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  size?: number;
  recordCount?: number;
  timestamp: Date;
  error?: string;
  downloadUrl?: string;
}

interface ExportJob {
  id: string;
  format: ExportFormat;
  entities: ExportEntity[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: ExportProgress[];
  result?: ExportResult;
  startTime: Date;
  endTime?: Date;
}

const ENTITY_OPTIONS = [
  { value: 'users', label: 'Users', icon: '👥' },
  { value: 'clients', label: 'Clients', icon: '🏢' },
  { value: 'companies', label: 'Companies', icon: '🏪' },
  { value: 'projects', label: 'Projects', icon: '📋' },
  { value: 'tasks', label: 'Tasks', icon: '✅' },
  { value: 'timeEntries', label: 'Time Entries', icon: '⏱️' },
  { value: 'invoices', label: 'Invoices', icon: '💰' },
  { value: 'expenses', label: 'Expenses', icon: '💳' },
  { value: 'documents', label: 'Documents', icon: '📄' },
  { value: 'knowledgeArticles', label: 'Knowledge Articles', icon: '📚' },
  { value: 'salesOpportunities', label: 'Sales Opportunities', icon: '🎯' },
  { value: 'supportTickets', label: 'Support Tickets', icon: '🎫' },
  { value: 'marketingCampaigns', label: 'Marketing Campaigns', icon: '📢' },
  { value: 'all', label: 'All Data', icon: '📦' }
];

export function DataExport() {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [selectedEntities, setSelectedEntities] = useState<ExportEntity[]>(['all']);
  const [dateRange, setDateRange] = useState<{start?: Date; end?: Date}>({});
  const [compressed, setCompressed] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);

  const handleEntityToggle = (entity: ExportEntity) => {
    if (entity === 'all') {
      setSelectedEntities(['all']);
    } else {
      setSelectedEntities(prev => {
        const newEntities = prev.includes(entity)
          ? prev.filter(e => e !== entity && e !== 'all')
          : [...prev.filter(e => e !== 'all'), entity];
        return newEntities.length === 0 ? ['all'] : newEntities;
      });
    }
  };

  const startExport = useCallback(async () => {
    try {
      const exportOptions = {
        format,
        entities: selectedEntities,
        dateRange: dateRange.start && dateRange.end ? {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        } : undefined,
        compressed,
        includeDeleted
      };

      const jobId = `export_${Date.now()}`;
      const newJob: ExportJob = {
        id: jobId,
        format,
        entities: selectedEntities,
        status: 'queued',
        progress: selectedEntities.map(entity => ({
          entity,
          processed: 0,
          total: 0,
          status: 'pending'
        })),
        startTime: new Date()
      };

      setCurrentJob(newJob);
      setExportHistory(prev => [newJob, ...prev]);

      // Start the export
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(exportOptions)
      });

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const result = await response.json();

      // Update job with result
      const completedJob: ExportJob = {
        ...newJob,
        status: result.success ? 'completed' : 'failed',
        result: result,
        endTime: new Date()
      };

      setCurrentJob(completedJob);
      setExportHistory(prev => prev.map(job =>
        job.id === jobId ? completedJob : job
      ));

      if (result.success) {
        toast({
          title: "Export Completed",
          description: `Successfully exported ${result.recordCount || 'unknown'} records`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Export error:', error);

      if (currentJob) {
        const failedJob = {
          ...currentJob,
          status: 'failed' as const,
          endTime: new Date()
        };
        setCurrentJob(failedJob);
        setExportHistory(prev => prev.map(job =>
          job.id === currentJob.id ? failedJob : job
        ));
      }

      toast({
        title: "Export Error",
        description: "Failed to start export process",
        variant: "destructive",
      });
    }
  }, [format, selectedEntities, dateRange, compressed, includeDeleted, currentJob, toast]);

  const downloadExport = useCallback(async (fileName: string) => {
    try {
      const response = await fetch(`/api/exports/download/${fileName}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${fileName}`,
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download export file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Export Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON - JavaScript Object Notation</SelectItem>
                <SelectItem value="csv">CSV - Comma Separated Values</SelectItem>
                <SelectItem value="xlsx">XLSX - Excel Spreadsheet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Data to Export</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ENTITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={selectedEntities.includes(option.value as ExportEntity)}
                    onCheckedChange={() => handleEntityToggle(option.value as ExportEntity)}
                  />
                  <label
                    htmlFor={option.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Date Range (Optional)</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.start ? format(dateRange.start, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.end ? format(dateRange.end, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Export Options</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compressed"
                  checked={compressed}
                  onCheckedChange={setCompressed}
                />
                <label htmlFor="compressed" className="text-sm">
                  Compress export file (reduces file size)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDeleted"
                  checked={includeDeleted}
                  onCheckedChange={setIncludeDeleted}
                />
                <label htmlFor="includeDeleted" className="text-sm">
                  Include deleted records
                </label>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={startExport}
            disabled={currentJob?.status === 'processing' || currentJob?.status === 'queued'}
            className="w-full"
          >
            {currentJob?.status === 'processing' || currentJob?.status === 'queued' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Start Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Export Progress */}
      {currentJob && (currentJob.status === 'processing' || currentJob.status === 'queued') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Export in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{formatDuration(currentJob.startTime)}</span>
              </div>
              <Progress value={75} className="w-full" />
            </div>

            <div className="space-y-2">
              {currentJob.progress.map((item) => (
                <div key={item.entity} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.status === 'completed' ? 'bg-green-500' :
                      item.status === 'processing' ? 'bg-blue-500' :
                      item.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                    )} />
                    <span className="text-sm capitalize">{item.entity}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.total > 0 ? `${item.processed} / ${item.total}` : 'Preparing...'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exportHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No exports yet. Start your first export above.
            </div>
          ) : (
            <div className="space-y-3">
              {exportHistory.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : job.status === 'failed' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      <Badge variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'failed' ? 'destructive' : 'secondary'
                      }>
                        {job.status}
                      </Badge>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium">
                        {job.format.toUpperCase()} - {job.entities.join(', ')}
                      </div>
                      <div className="text-gray-500">
                        {format(job.startTime, 'PPP p')} • {formatDuration(job.startTime, job.endTime)}
                        {job.result?.recordCount && ` • ${job.result.recordCount} records`}
                        {job.result?.size && ` • ${formatFileSize(job.result.size)}`}
                      </div>
                    </div>
                  </div>

                  {job.status === 'completed' && job.result?.fileName && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadExport(job.result!.fileName!)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Data Privacy:</strong> Exported files contain sensitive business data.
          Please handle them securely and delete them when no longer needed.
          Exports are automatically cleaned up after 24 hours.
        </AlertDescription>
      </Alert>
    </div>
  );
}