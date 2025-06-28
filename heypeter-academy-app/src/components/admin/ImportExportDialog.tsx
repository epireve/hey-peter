'use client';

import { useState, useCallback } from 'react';
import { Upload, Download, FileUp, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  parseImportFile,
  exportToCSV,
  exportToExcel,
  type ImportResult,
  type ImportOptions,
  type ExportOptions,
  type ColumnMapping
} from '@/lib/utils/import-export';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  columns: ColumnMapping[];
  onImport: (data: any[]) => Promise<void>;
  onExport: () => Promise<any[]>;
  templateUrl?: string;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  onImport,
  onExport,
  templateUrl
}: ImportExportDialogProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const options: ImportOptions = {
        columnMappings: columns,
        onProgress: setProgress,
        batchSize: 50
      };

      const importResult = await parseImportFile(file, options);
      setResult(importResult);

      if (importResult.success && importResult.data) {
        await onImport(importResult.data);
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const data = await onExport();
      
      const options: ExportOptions = {
        filename: `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`,
        columns,
        format
      };

      if (format === 'csv') {
        exportToCSV(data, options);
      } else {
        exportToExcel(data, options);
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'import' | 'export')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="import" id="import" />
              <Label htmlFor="import" className="flex items-center cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="export" id="export" />
              <Label htmlFor="export" className="flex items-center cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Label>
            </div>
          </RadioGroup>

          {mode === 'import' ? (
            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25",
                  file && "border-primary"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileUp className="w-10 h-10 mx-auto text-primary" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-muted-foreground"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop your file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: CSV, Excel (.xlsx, .xls)
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              {templateUrl && (
                <div className="text-center">
                  <a
                    href={templateUrl}
                    download
                    className="text-sm text-primary hover:underline"
                  >
                    Download template file
                  </a>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {result && !result.success && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>Import failed with {result.errorCount} errors:</p>
                      <ul className="text-xs list-disc list-inside max-h-32 overflow-auto">
                        {result.errors?.slice(0, 5).map((error, i) => (
                          <li key={i}>
                            Row {error.row}: {error.message}
                          </li>
                        ))}
                        {result.errors && result.errors.length > 5 && (
                          <li>... and {result.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {result && result.success && (
                <Alert>
                  <AlertDescription>
                    Successfully imported {result.successCount} records
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'csv' | 'excel')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">CSV Format</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel">Excel Format (.xlsx)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            {mode === 'import' ? (
              <Button
                onClick={handleImport}
                disabled={!file || isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={isProcessing}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}