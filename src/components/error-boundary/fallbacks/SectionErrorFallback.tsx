'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ErrorFallbackProps } from '../types';

export const SectionErrorFallback: React.FC<ErrorFallbackProps> = ({
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
    <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Section Error</AlertTitle>
        <AlertDescription>
          <div className="mt-2">
            <p>This section encountered an error and could not be displayed.</p>
            {showDetails && (
              <p className="mt-1 text-xs">{error.message}</p>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {isRecovering && (
        <div className="mt-3 flex items-center text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Attempting to recover...
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {canRetry && (
          <Button
            onClick={retry}
            size="sm"
            disabled={isRecovering}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        )}
        
        <Button
          onClick={resetError}
          size="sm"
          variant="outline"
        >
          Reset Section
        </Button>
      </div>

      {showDetails && error.stack && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            View error details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};