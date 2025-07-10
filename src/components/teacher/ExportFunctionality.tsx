"use client";

import React, { useState, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils';

type ExportFormat = 'csv' | 'excel' | 'pdf';
type DataType = 'attendance' | 'compensation' | 'analytics' | 'students';

interface ExportOptions {
  format: ExportFormat;
  columns?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

interface ExportFunctionalityProps {
  data: any;
  dataType: DataType;
  filename: string;
  variant?: 'button' | 'dropdown' | 'icon';
  columns?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  allowBulkExport?: boolean;
  showPreview?: boolean;
  showSizeEstimate?: boolean;
  onExport?: (options: {
    format: string;
    data: any;
    filename: string;
  }) => Promise<void>;
  className?: string;
}

export function ExportFunctionality({
  data,
  dataType,
  filename,
  variant = 'button',
  columns,
  dateRange,
  allowBulkExport = false,
  showPreview = false,
  showSizeEstimate = false,
  onExport,
  className,
}: ExportFunctionalityProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isOpen, setIsOpen] = useState(false);

  const hasData = Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;

  const estimateFileSize = useCallback((format: ExportFormat) => {
    const dataString = JSON.stringify(data);
    const sizeInBytes = new Blob([dataString]).size;
    
    // Rough estimates based on format
    const multipliers = {
      csv: 0.5,
      excel: 0.8,
      pdf: 1.5,
    };
    
    const estimatedSize = sizeInBytes * multipliers[format];
    
    if (estimatedSize < 1024) {
      return `${Math.round(estimatedSize)} B`;
    } else if (estimatedSize < 1024 * 1024) {
      return `${Math.round(estimatedSize / 1024)} KB`;
    } else {
      return `${Math.round(estimatedSize / (1024 * 1024))} MB`;
    }
  }, [data]);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportStatus({ type: null, message: '' });

    try {
      const exportOptions: ExportOptions = {
        format,
        columns,
        dateRange,
      };

      if (onExport) {
        await onExport({ format, data, filename });
      } else {
        // Extract the array data based on dataType
        let exportData = data;
        if (dataType === 'attendance' && data.attendance) {
          exportData = data.attendance;
        } else if (dataType === 'compensation' && data.compensation) {
          exportData = data.compensation;
        } else if (dataType === 'analytics' && data.analytics) {
          exportData = data.analytics;
        } else if (dataType === 'students' && data.students) {
          exportData = data.students;
        }

        switch (format) {
          case 'csv':
            await exportToCSV(exportData, filename, exportOptions);
            break;
          case 'excel':
            await exportToExcel(exportData, filename, exportOptions);
            break;
          case 'pdf':
            await exportToPDF(exportData, filename, exportOptions);
            break;
        }
      }

      setExportStatus({
        type: 'success',
        message: 'Export successful',
      });
      setIsOpen(false);
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <FileCheck className="h-4 w-4" />;
    }
  };

  const formatLabels = {
    csv: 'CSV',
    excel: 'Excel',
    pdf: 'PDF',
  };

  const renderExportOptions = () => (
    <>
      {showPreview && (
        <>
          <DropdownMenuLabel>Preview</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            <AlertCircle className="h-4 w-4 mr-2" />
            Preview feature coming soon
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      
      <DropdownMenuLabel>Export Format</DropdownMenuLabel>
      {(['csv', 'excel', 'pdf'] as ExportFormat[]).map((format) => (
        <DropdownMenuItem
          key={format}
          onClick={() => handleExport(format)}
          disabled={isExporting}
        >
          {getFormatIcon(format)}
          <span className="ml-2">{formatLabels[format]}</span>
          {showSizeEstimate && (
            <span className="ml-auto text-xs text-muted-foreground">
              ~{estimateFileSize(format)}
            </span>
          )}
        </DropdownMenuItem>
      ))}
      
      {allowBulkExport && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Download className="h-4 w-4 mr-2" />
            Export all data
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  if (variant === 'icon') {
    return (
      <>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={!hasData || isExporting}
              className={className}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {renderExportOptions()}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {exportStatus.type && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert variant={exportStatus.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{exportStatus.message}</AlertDescription>
            </Alert>
          </div>
        )}
      </>
    );
  }

  if (variant === 'dropdown') {
    return (
      <>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={!hasData || isExporting}
              className={cn("w-40", className)}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {renderExportOptions()}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {exportStatus.type && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert variant={exportStatus.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{exportStatus.message}</AlertDescription>
            </Alert>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={!hasData || isExporting}
            className={className}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {renderExportOptions()}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {exportStatus.type && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert variant={exportStatus.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{exportStatus.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}