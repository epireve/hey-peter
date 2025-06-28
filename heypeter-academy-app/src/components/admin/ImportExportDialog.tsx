'use client';

import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImportExportService, type ImportResult } from '@/lib/utils/import-export';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'students' | 'teachers' | 'courses';
  onImport: (data: any[]) => Promise<void>;
  onExport: () => Promise<any[]>;
  columns: Array<{
    key: string;
    header: string;
    required?: boolean;
    transform?: (value: any) => any;
  }>;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  entityType,
  onImport,
  onExport,
  columns,
}: ImportExportDialogProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<any> | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setProgress(0);

    try {
      let result: ImportResult<any>;

      if (format === 'csv') {
        const content = await selectedFile.text();
        result = await ImportExportService.parseCSV(content, {
          columns: columns.map(col => col.key),
          validator: (row) => {
            const errors: string[] = [];
            columns.forEach(col => {
              if (col.required && !row[col.key]) {
                errors.push(`${col.header} is required`);
              }
            });
            return { valid: errors.length === 0, errors };
          },
        });
      } else {
        const buffer = await selectedFile.arrayBuffer();
        result = await ImportExportService.parseExcel(buffer, {
          validator: (row) => {
            const errors: string[] = [];
            columns.forEach(col => {
              if (col.required && !row[col.header]) {
                errors.push(`${col.header} is required`);
              }
            });
            return { valid: errors.length === 0, errors };
          },
        });
      }

      setImportResult(result);

      if (result.successCount > 0) {
        await ImportExportService.batchImport(result.data, {
          batchSize: 50,
          processor: async (batch) => {
            await onImport(batch);
          },
          onProgress: (processed, total) => {
            setProgress((processed / total) * 100);
          },
        });
      }
    } catch (error) {
      setImportResult({
        data: [],
        errors: [{
          row: 0,
          message: error instanceof Error ? error.message : 'Import failed',
        }],
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const data = await onExport();
      const filename = `${entityType}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        const csv = ImportExportService.exportToCSV(data, {
          format: 'csv',
          filename: `${filename}.csv`,
          columns,
        });
        ImportExportService.downloadFile(csv, `${filename}.csv`, 'text/csv');
      } else {
        const buffer = ImportExportService.exportToExcel(data, {
          format: 'xlsx',
          filename: `${filename}.xlsx`,
          columns,
        });
        ImportExportService.downloadFile(
          buffer,
          `${filename}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const getTemplateUrl = () => {
    const baseUrl = '/templates';
    return `${baseUrl}/${entityType}_template.${format}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import/Export {entityType}</DialogTitle>
          <DialogDescription>
            Import or export {entityType} data using CSV or Excel format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={mode} onValueChange={(value: any) => setMode(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="import" id="import" />
              <Label htmlFor="import" className="flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Import Data
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="export" id="export" />
              <Label htmlFor="export" className="flex items-center gap-2 cursor-pointer">
                <Download className="h-4 w-4" />
                Export Data
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-4">
            <div>
              <Label htmlFor="format">File Format</Label>
              <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (.csv)
                    </div>
                  </SelectItem>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'import' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="file">Select File</Label>
                  <input
                    id="file"
                    type="file"
                    accept={format === 'csv' ? '.csv' : '.xlsx,.xls'}
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-sm text-muted-foreground">
                    <a
                      href={getTemplateUrl()}
                      download
                      className="text-primary hover:underline"
                    >
                      Download template
                    </a>{' '}
                    to see the required format
                  </p>
                </div>

                {selectedFile && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                {importing && (
                  <div className="space-y-2">
                    <Label>Import Progress</Label>
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground">
                      Processing... {progress.toFixed(0)}%
                    </p>
                  </div>
                )}

                {importResult && (
                  <Alert variant={importResult.errorCount > 0 ? 'destructive' : 'default'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>
                          Total rows: {importResult.totalRows} | Success: {importResult.successCount} | 
                          Errors: {importResult.errorCount}
                        </p>
                        {importResult.errors.length > 0 && (
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            <p className="font-semibold">Errors:</p>
                            {importResult.errors.slice(0, 5).map((error, index) => (
                              <p key={index} className="text-sm">
                                Row {error.row}: {error.message}
                              </p>
                            ))}
                            {importResult.errors.length > 5 && (
                              <p className="text-sm">
                                ... and {importResult.errors.length - 5} more errors
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === 'import' ? (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          ) : (
            <Button onClick={handleExport} disabled={exporting} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}