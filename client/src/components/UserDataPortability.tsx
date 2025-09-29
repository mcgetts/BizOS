import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Upload,
  Trash2,
  Shield,
  Calendar,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includePersonalData: boolean;
  includeActivityData: boolean;
  includeAuditLogs: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  compressed: boolean;
}

interface ExportHistory {
  exportId: string;
  format: string;
  timestamp: string;
  id: string;
}

interface ExportResult {
  success: boolean;
  message: string;
  exportId?: string;
  fileSize?: number;
  recordCount?: number;
  downloadUrl?: string;
  timestamp?: string;
  error?: string;
}

export function UserDataPortability() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includePersonalData: true,
    includeActivityData: true,
    includeAuditLogs: false,
    compressed: false
  });

  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeletionRequested, setIsDeletionRequested] = useState(false);
  const [showDeletionForm, setShowDeletionForm] = useState(false);

  // Load export history on component mount
  useEffect(() => {
    loadExportHistory();
  }, []);

  const loadExportHistory = async () => {
    try {
      const response = await fetch('/api/user/export-history', {
        credentials: 'include'
      });

      if (response.ok) {
        const history = await response.json();
        setExportHistory(history);
      }
    } catch (error) {
      console.error('Failed to load export history:', error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const response = await fetch('/api/user/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(exportOptions)
      });

      const result = await response.json();
      setExportResult(result);

      if (result.success) {
        // Reload export history to show new export
        loadExportHistory();
      }
    } catch (error) {
      setExportResult({
        success: false,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExport = async (exportId: string) => {
    try {
      const response = await fetch(`/api/user/download-export/${exportId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-export-${exportId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed:', response.statusText);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleRequestDeletion = async () => {
    setIsDeletionRequested(true);

    try {
      const response = await fetch('/api/user/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason: deletionReason })
      });

      const result = await response.json();

      if (result.success) {
        setShowDeletionForm(false);
        setDeletionReason('');
        alert('Data deletion request submitted successfully. You will be contacted by an administrator to confirm this request.');
      } else {
        alert(`Failed to submit deletion request: ${result.error || result.message}`);
      }
    } catch (error) {
      alert('Failed to submit deletion request. Please try again.');
    } finally {
      setIsDeletionRequested(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'json': return 'bg-blue-100 text-blue-800';
      case 'csv': return 'bg-green-100 text-green-800';
      case 'xlsx': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Portability & Privacy</h1>
        <p className="text-gray-600">
          Manage your personal data exports and privacy settings in compliance with GDPR and privacy regulations.
        </p>
      </div>

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of your personal data in your preferred format. This includes your profile information,
            activity history, and other data associated with your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Format */}
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: 'json' | 'csv' | 'xlsx') =>
                  setExportOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                  <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                  <SelectItem value="xlsx">XLSX (Excel Workbook)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compression Option */}
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="compressed"
                checked={exportOptions.compressed}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, compressed: checked as boolean }))
                }
              />
              <Label htmlFor="compressed">Compress export file</Label>
            </div>
          </div>

          {/* Data Categories */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Data Categories to Include</Label>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personalData"
                  checked={exportOptions.includePersonalData}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includePersonalData: checked as boolean }))
                  }
                />
                <Label htmlFor="personalData" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Personal Information (Profile, Settings, Sessions)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activityData"
                  checked={exportOptions.includeActivityData}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeActivityData: checked as boolean }))
                  }
                />
                <Label htmlFor="activityData" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Activity Data (Projects, Tasks, Time Entries, Notifications)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auditLogs"
                  checked={exportOptions.includeAuditLogs}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeAuditLogs: checked as boolean }))
                  }
                />
                <Label htmlFor="auditLogs" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Audit Logs (Admin Only)
                </Label>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Date Range Filter (Optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={exportOptions.dateRange?.start || ''}
                  onChange={(e) =>
                    setExportOptions(prev => ({
                      ...prev,
                      dateRange: {
                        start: e.target.value,
                        end: prev.dateRange?.end || ''
                      }
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={exportOptions.dateRange?.end || ''}
                  onChange={(e) =>
                    setExportOptions(prev => ({
                      ...prev,
                      dateRange: {
                        start: prev.dateRange?.start || '',
                        end: e.target.value
                      }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <Label>Export Progress</Label>
              <Progress value={50} className="w-full" />
              <p className="text-sm text-gray-600">Preparing your data export...</p>
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <Alert className={exportResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {exportResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={exportResult.success ? 'text-green-800' : 'text-red-800'}>
                {exportResult.message}
                {exportResult.success && exportResult.fileSize && (
                  <div className="mt-2 space-y-1">
                    <p>Records: {exportResult.recordCount}</p>
                    <p>File Size: {formatFileSize(exportResult.fileSize)}</p>
                    {exportResult.downloadUrl && (
                      <Button
                        size="sm"
                        onClick={() => exportResult.exportId && handleDownloadExport(exportResult.exportId)}
                        className="mt-2"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Export
                      </Button>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExportData}
            disabled={isExporting || (!exportOptions.includePersonalData && !exportOptions.includeActivityData)}
            className="w-full md:w-auto"
          >
            {isExporting ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>
            View and download your previous data exports. Files are automatically deleted after 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exportHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No exports found. Create your first data export above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exportHistory.map((export_item) => (
                <div
                  key={export_item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getFormatBadgeColor(export_item.format)}>
                          {export_item.format.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {format(new Date(export_item.timestamp), 'MMM dd, yyyy at HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Export ID: {export_item.exportId}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadExport(export_item.exportId)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Data Deletion Section */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Request Data Deletion
          </CardTitle>
          <CardDescription>
            Request complete deletion of your account and all associated data. This action is irreversible
            and requires administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Data deletion is permanent and cannot be undone. We recommend
              exporting your data first if you want to keep a copy.
            </AlertDescription>
          </Alert>

          {!showDeletionForm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeletionForm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Request Data Deletion
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deletionReason">Reason for Deletion (Optional)</Label>
                <Input
                  id="deletionReason"
                  placeholder="Please let us know why you're deleting your data..."
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleRequestDeletion}
                  disabled={isDeletionRequested}
                >
                  {isDeletionRequested ? 'Submitting...' : 'Confirm Deletion Request'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeletionForm(false);
                    setDeletionReason('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Privacy Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Data Portability</h4>
              <p className="text-sm text-gray-600">
                You have the right to receive your personal data in a structured, commonly used format
                and transmit it to another service.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Right to be Forgotten</h4>
              <p className="text-sm text-gray-600">
                You can request deletion of your personal data. We will review and process legitimate
                requests within 30 days.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Security</h4>
              <p className="text-sm text-gray-600">
                Your data is encrypted and stored securely. Export files are automatically deleted
                after 24 hours for your security.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Contact Us</h4>
              <p className="text-sm text-gray-600">
                Have questions about your data? Contact our privacy team at privacy@company.com
                for assistance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}