"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileImage, 
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Package,
  Clock,
  X
} from "lucide-react";
import { analyticsExportService, ExportFormat, ExportOptions, BatchExportRequest } from '@/lib/services/analytics-export-service';
import { format } from 'date-fns';

interface BatchExportItem {
  id: string;
  name: string;
  type: string;
  data: any[];
  format: ExportFormat;
  fileName: string;
  selected: boolean;
}

interface BatchExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableExports: {
    id: string;
    name: string;
    type: string;
    data: any[];
    description?: string;
  }[];
  onExportComplete?: (success: boolean, message?: string) => void;
}

const formatIcons = {
  csv: FileText,
  excel: FileSpreadsheet,
  json: FileJson,
  pdf: FileImage
};

export function BatchExportDialog({ 
  isOpen, 
  onClose, 
  availableExports,
  onExportComplete
}: BatchExportDialogProps) {
  const [exportItems, setExportItems] = useState<BatchExportItem[]>(() =>
    availableExports.map(exp => ({
      id: exp.id,
      name: exp.name,
      type: exp.type,
      data: exp.data,
      format: 'excel' as ExportFormat,
      fileName: `${exp.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`,
      selected: false
    }))
  );

  const [batchOptions, setBatchOptions] = useState({
    combinedFile: true,
    includeTimestamp: true,
    compression: false
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<{ [key: string]: 'pending' | 'processing' | 'completed' | 'failed' }>({});

  const handleItemToggle = (id: string) => {
    setExportItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = () => {
    setExportItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const handleDeselectAll = () => {
    setExportItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const handleFormatChange = (id: string, format: ExportFormat) => {
    setExportItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, format } : item
      )
    );
  };

  const handleFileNameChange = (id: string, fileName: string) => {
    setExportItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, fileName } : item
      )
    );
  };

  const handleBatchExport = async () => {
    const selectedItems = exportItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      onExportComplete?.(false, 'No items selected for export');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      // Initialize status
      const initialStatus: { [key: string]: 'pending' | 'processing' | 'completed' | 'failed' } = {};
      selectedItems.forEach(item => {
        initialStatus[item.id] = 'pending';
      });
      setExportStatus(initialStatus);

      // Prepare batch request
      const batchRequest: BatchExportRequest = {
        exports: selectedItems.map(item => ({
          type: item.type,
          data: item.data,
          options: {
            format: item.format,
            fileName: item.fileName,
            includeHeaders: true,
            includeMetadata: true
          }
        })),
        batchOptions
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
          }
          return newProgress;
        });
      }, 200);

      // Update status as items are processed
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setExportStatus(prev => ({ ...prev, [item.id]: 'processing' }));
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setExportStatus(prev => ({ ...prev, [item.id]: 'completed' }));
      }

      // Execute batch export
      await analyticsExportService.exportBatch(batchRequest);

      clearInterval(progressInterval);
      setExportProgress(100);

      setTimeout(() => {
        onExportComplete?.(true, `Successfully exported ${selectedItems.length} reports`);
        onClose();
      }, 500);

    } catch (error) {
      console.error('Batch export failed:', error);
      
      // Mark failed items
      const failedStatus: { [key: string]: 'pending' | 'processing' | 'completed' | 'failed' } = {};
      selectedItems.forEach(item => {
        failedStatus[item.id] = 'failed';
      });
      setExportStatus(failedStatus);
      
      onExportComplete?.(false, 'Batch export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const selectedCount = exportItems.filter(item => item.selected).length;
  const totalRecords = exportItems.filter(item => item.selected).reduce((sum, item) => sum + item.data.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Batch Export
          </DialogTitle>
          <DialogDescription>
            Select multiple reports to export together. Choose individual formats or combine into a single file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Batch Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch Options</CardTitle>
              <CardDescription>Configure how multiple exports should be handled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="combinedFile"
                    checked={batchOptions.combinedFile}
                    onCheckedChange={(checked) => 
                      setBatchOptions(prev => ({ ...prev, combinedFile: checked as boolean }))
                    }
                  />
                  <Label htmlFor="combinedFile">Combined file</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTimestamp"
                    checked={batchOptions.includeTimestamp}
                    onCheckedChange={(checked) => 
                      setBatchOptions(prev => ({ ...prev, includeTimestamp: checked as boolean }))
                    }
                  />
                  <Label htmlFor="includeTimestamp">Include timestamp</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compression"
                    checked={batchOptions.compression}
                    onCheckedChange={(checked) => 
                      setBatchOptions(prev => ({ ...prev, compression: checked as boolean }))
                    }
                  />
                  <Label htmlFor="compression">Compress files</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Reports</CardTitle>
              <CardDescription>Select reports to include in the batch export</CardDescription>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedCount} of {exportItems.length} reports selected
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exportItems.map(item => {
                  const Icon = formatIcons[item.format];
                  const status = exportStatus[item.id];
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        item.selected ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => handleItemToggle(item.id)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{item.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.data.length} records
                            </Badge>
                            {status && (
                              <Badge variant={
                                status === 'completed' ? 'default' :
                                status === 'failed' ? 'destructive' :
                                status === 'processing' ? 'secondary' : 'outline'
                              }>
                                {status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                                {status}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Format</Label>
                              <Select
                                value={item.format}
                                onValueChange={(value) => handleFormatChange(item.id, value as ExportFormat)}
                                disabled={!item.selected}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(formatIcons).map(([format, FormatIcon]) => (
                                    <SelectItem key={format} value={format}>
                                      <div className="flex items-center gap-2">
                                        <FormatIcon className="h-4 w-4" />
                                        {format.toUpperCase()}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-xs">File Name</Label>
                              <Input
                                value={item.fileName}
                                onChange={(e) => handleFileNameChange(item.id, e.target.value)}
                                disabled={!item.selected}
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Export Summary */}
          {selectedCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{selectedCount}</div>
                    <div className="text-sm text-muted-foreground">Reports</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{totalRecords}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {exportItems.filter(item => item.selected).reduce((acc, item) => {
                        acc[item.format] = (acc[item.format] || 0) + 1;
                        return acc;
                      }, {} as any).excel || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Excel Files</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {batchOptions.combinedFile ? 1 : selectedCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Output Files</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {isExporting && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedCount} reports selected • {totalRecords} total records
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleBatchExport} 
              disabled={isExporting || selectedCount === 0}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedCount} Report{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}