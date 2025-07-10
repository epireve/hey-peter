"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileImage, 
  Settings, 
  ChevronDown,
  Loader2
} from "lucide-react";
import { ExportDialog } from './ExportDialog';
import { analyticsExportService, ExportFormat } from '@/lib/services/analytics-export-service';

interface ExportButtonProps {
  data: any[];
  title?: string;
  fileName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showDropdown?: boolean;
  availableColumns?: string[];
  onExportComplete?: (success: boolean, message?: string) => void;
}

const formatOptions = [
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'pdf', label: 'PDF', icon: FileImage }
];

export function ExportButton({ 
  data, 
  title = 'Export Data',
  fileName,
  variant = 'outline',
  size = 'sm',
  showDropdown = true,
  availableColumns = [],
  onExportComplete
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleQuickExport = async (format: ExportFormat) => {
    if (data.length === 0) {
      onExportComplete?.(false, 'No data available to export');
      return;
    }

    try {
      setIsExporting(true);
      
      await analyticsExportService.exportData(data, {
        format,
        fileName: fileName || `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`,
        includeHeaders: true,
        includeMetadata: true
      }, {
        title,
        description: `Export generated on ${new Date().toLocaleString()}`,
        generatedBy: 'Hey Peter Analytics'
      });

      onExportComplete?.(true, `Successfully exported ${data.length} records as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      onExportComplete?.(false, 'Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomExport = () => {
    setExportDialogOpen(true);
  };

  if (!showDropdown) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={() => handleQuickExport('excel')}
          disabled={isExporting || data.length === 0}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
        <ExportDialog
          isOpen={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          data={data}
          defaultTitle={title}
          defaultFileName={fileName}
          availableColumns={availableColumns}
          onExportComplete={onExportComplete}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isExporting || data.length === 0}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {formatOptions.map(option => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleQuickExport(option.value as ExportFormat)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {option.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCustomExport}>
            <Settings className="h-4 w-4 mr-2" />
            Custom Export...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        data={data}
        defaultTitle={title}
        defaultFileName={fileName}
        availableColumns={availableColumns}
        onExportComplete={onExportComplete}
      />
    </>
  );
}