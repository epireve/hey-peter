'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ErrorFallbackProps } from '../types';

export const ComponentErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retry,
  retryCount = 0,
  maxRetries = 3,
  isRecovering = false,
  maxRetriesReached = false,
  showDetails = false
}) => {
  const canRetry = retry && retryCount < maxRetries && !maxRetriesReached;

  return (
    <div className="flex items-center justify-center p-4 border border-destructive/20 rounded-md bg-destructive/5">
      <div className="text-center">
        <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium mb-1">
          Component Error
        </p>
        {showDetails && (
          <p className="text-xs text-muted-foreground mb-3">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          {canRetry && (
            <Button
              onClick={retry}
              size="sm"
              variant="outline"
              disabled={isRecovering}
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Recovering...
                </>
              ) : (
                'Retry'
              )}
            </Button>
          )}
          <Button
            onClick={resetError}
            size="sm"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
};