"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileImage, 
  Settings, 
  Mail, 
  Clock, 
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react";
import { analyticsExportService, ExportFormat, ExportOptions, ExportTemplate } from '@/lib/services/analytics-export-service';
import { format } from 'date-fns';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  defaultTitle?: string;
  defaultFileName?: string;
  availableColumns?: string[];
  onExportComplete?: (success: boolean, message?: string) => void;
}

const formatIcons = {
  csv: FileText,
  excel: FileSpreadsheet,
  json: FileJson,
  pdf: FileImage
};

const formatDescriptions = {
  csv: 'Comma-separated values file suitable for spreadsheet applications',
  excel: 'Microsoft Excel workbook with formatting and multiple sheets',
  json: 'JavaScript Object Notation file for data exchange',
  pdf: 'Portable Document Format file for sharing and printing'
};

export function ExportDialog({ 
  isOpen, 
  onClose, 
  data, 
  defaultTitle = 'Analytics Export',
  defaultFileName,
  availableColumns = [],
  onExportComplete
}: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [fileName, setFileName] = useState(defaultFileName || '');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(availableColumns);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);

  React.useEffect(() => {
    // Load available templates
    const availableTemplates = analyticsExportService.getAllTemplates();
    setTemplates(availableTemplates);
  }, []);

  React.useEffect(() => {
    if (!fileName && defaultTitle) {
      setFileName(`${defaultTitle.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`);
    }
  }, [defaultTitle, fileName]);

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns);
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleEmailRecipientAdd = (email: string) => {
    if (email && !emailRecipients.includes(email)) {
      setEmailRecipients(prev => [...prev, email]);
    }
  };

  const handleEmailRecipientRemove = (email: string) => {
    setEmailRecipients(prev => prev.filter(e => e !== email));
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setExportFormat(template.format);
      setSelectedColumns(template.columns);
      setFileName(`${template.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      // Prepare export options
      const exportOptions: ExportOptions = {
        format: exportFormat,
        fileName: fileName || `export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`,
        includeHeaders,
        includeMetadata,
        dateFormat: 'yyyy-MM-dd HH:mm:ss',
        emailDelivery: emailEnabled ? {
          enabled: true,
          recipients: emailRecipients,
          subject: emailSubject || `${defaultTitle} Export`,
          message: emailMessage || 'Please find the attached export file.'
        } : undefined
      };

      // Filter data based on selected columns
      let exportData = data;
      if (selectedColumns.length > 0) {
        exportData = analyticsExportService.prepareDataForExport(data, selectedColumns);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
          }
          return newProgress;
        });
      }, 200);

      // Export data
      if (selectedTemplate) {
        await analyticsExportService.exportWithTemplate(exportData, selectedTemplate, exportOptions);
      } else {
        await analyticsExportService.exportData(exportData, exportOptions, {
          title: defaultTitle,
          description: `Export generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
          generatedBy: 'Hey Peter Analytics'
        });
      }

      // Handle email delivery
      if (emailEnabled && emailRecipients.length > 0) {
        await analyticsExportService.sendExportByEmail(
          exportData,
          exportOptions,
          emailRecipients,
          emailSubject || `${defaultTitle} Export`,
          emailMessage || 'Please find the attached export file.'
        );
      }

      setExportProgress(100);
      setTimeout(() => {
        onExportComplete?.(true, 'Export completed successfully');
        onClose();
      }, 500);

    } catch (error) {
      console.error('Export failed:', error);
      onExportComplete?.(false, 'Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {defaultTitle}
          </DialogTitle>
          <DialogDescription>
            Configure your export options and download your data in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Format</CardTitle>
                <CardDescription>Choose the format for your exported data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formatIcons).map(([format, Icon]) => (
                    <div
                      key={format}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        exportFormat === format ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setExportFormat(format as ExportFormat)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-8 w-8 text-primary" />
                        <div>
                          <div className="font-medium capitalize">{format}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDescriptions[format as keyof typeof formatDescriptions]}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">File Settings</CardTitle>
                <CardDescription>Configure your export file name and options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fileName">File Name</Label>
                    <Input
                      id="fileName"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter file name"
                    />
                  </div>
                  <div>
                    <Label>Records to Export</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {data.length} records selected
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeHeaders"
                      checked={includeHeaders}
                      onCheckedChange={setIncludeHeaders}
                    />
                    <Label htmlFor="includeHeaders">Include headers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeMetadata"
                      checked={includeMetadata}
                      onCheckedChange={setIncludeMetadata}
                    />
                    <Label htmlFor="includeMetadata">Include metadata</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Column Selection</CardTitle>
                <CardDescription>Choose which columns to include in your export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-muted-foreground">
                    {selectedColumns.length} of {availableColumns.length} columns selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAllColumns}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAllColumns}>
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {availableColumns.map(column => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={column} className="text-sm font-normal capitalize">
                        {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Options</CardTitle>
                <CardDescription>Additional formatting and processing options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Date Format</Label>
                    <Select defaultValue="yyyy-MM-dd HH:mm:ss">
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yyyy-MM-dd HH:mm:ss">2024-01-15 14:30:00</SelectItem>
                        <SelectItem value="yyyy-MM-dd">2024-01-15</SelectItem>
                        <SelectItem value="MM/dd/yyyy">01/15/2024</SelectItem>
                        <SelectItem value="dd/MM/yyyy">15/01/2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Templates</CardTitle>
                <CardDescription>Use predefined templates for consistent formatting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate === template.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.format.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.columns.length} columns
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Delivery</CardTitle>
                <CardDescription>Send the export directly to email addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailEnabled"
                    checked={emailEnabled}
                    onCheckedChange={setEmailEnabled}
                  />
                  <Label htmlFor="emailEnabled">Enable email delivery</Label>
                </div>

                {emailEnabled && (
                  <div className="space-y-4 pl-6">
                    <div>
                      <Label>Recipients</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {emailRecipients.map(email => (
                          <Badge key={email} variant="secondary" className="flex items-center gap-1">
                            {email}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleEmailRecipientRemove(email)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Enter email address"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEmailRecipientAdd(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input?.value) {
                              handleEmailRecipientAdd(input.value);
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="emailSubject">Subject</Label>
                      <Input
                        id="emailSubject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Email subject"
                      />
                    </div>

                    <div>
                      <Label htmlFor="emailMessage">Message</Label>
                      <textarea
                        id="emailMessage"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Email message"
                        className="w-full min-h-[100px] p-3 border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {data.length} records • {selectedColumns.length} columns • {exportFormat.toUpperCase()} format
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>

        {isExporting && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-medium">Export Progress</div>
              <div className="text-sm text-muted-foreground">{exportProgress}%</div>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}