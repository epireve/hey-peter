"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, X } from "lucide-react";

export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  status: "idle" | "running" | "completed" | "error";
  currentItem?: string;
  errors?: string[];
}

export interface BulkProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  progress: BulkOperationProgress;
  operation: string;
  onCancel?: () => void;
  className?: string;
}

export function BulkProgressDialog({
  isOpen,
  onClose,
  progress,
  operation,
  onCancel,
  className
}: BulkProgressDialogProps) {
  if (!isOpen) return null;

  const { total, completed, failed, status, currentItem, errors = [] } = progress;
  const successCount = completed - failed;
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const hasErrors = status === "error" || failed > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {operation}
              </CardTitle>
              <CardDescription>
                {isRunning && "Processing items..."}
                {isCompleted && "Operation completed"}
                {status === "error" && "Operation failed"}
              </CardDescription>
            </div>
            {!isRunning && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            {isRunning && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>
                  {completed} of {total} processed
                  {currentItem && ` • ${currentItem}`}
                </span>
              </>
            )}
            
            {isCompleted && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>
                  {successCount} successful, {failed} failed
                </span>
              </>
            )}
            
            {status === "error" && (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Operation failed</span>
              </>
            )}
          </div>

          {/* Success/Error Counts */}
          {completed > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Success: {successCount}</span>
              </div>
              {failed > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span>Failed: {failed}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600">Errors:</h4>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {isRunning && onCancel && (
              <Button variant="outline" onClick={onCancel} size="sm">
                Cancel
              </Button>
            )}
            {isCompleted && (
              <Button onClick={onClose} size="sm">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing bulk operation progress
export function useBulkProgress() {
  const [progress, setProgress] = React.useState<BulkOperationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    status: "idle",
    errors: [],
  });

  const startOperation = React.useCallback((total: number) => {
    setProgress({
      total,
      completed: 0,
      failed: 0,
      status: "running",
      errors: [],
    });
  }, []);

  const updateProgress = React.useCallback((completed: number, failed: number, currentItem?: string) => {
    setProgress(prev => ({
      ...prev,
      completed,
      failed,
      currentItem,
    }));
  }, []);

  const addError = React.useCallback((error: string) => {
    setProgress(prev => ({
      ...prev,
      errors: [...(prev.errors || []), error],
    }));
  }, []);

  const completeOperation = React.useCallback(() => {
    setProgress(prev => ({
      ...prev,
      status: prev.failed > 0 ? "error" : "completed",
      currentItem: undefined,
    }));
  }, []);

  const resetProgress = React.useCallback(() => {
    setProgress({
      total: 0,
      completed: 0,
      failed: 0,
      status: "idle",
      errors: [],
    });
  }, []);

  return {
    progress,
    startOperation,
    updateProgress,
    addError,
    completeOperation,
    resetProgress,
  };
}