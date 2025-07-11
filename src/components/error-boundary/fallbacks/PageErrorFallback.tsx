'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ErrorFallbackProps } from '../types';

export const PageErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retry,
  errorId,
  errorType = 'unknown',
  retryCount = 0,
  maxRetries = 3,
  isRecovering = false,
  maxRetriesReached = false,
  showDetails = false
}) => {
  const canRetry = retry && retryCount < maxRetries && !maxRetriesReached;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Page Error
          </CardTitle>
          <CardDescription>
            This page encountered an error and cannot be displayed properly.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {errorId && (
            <div className="text-xs text-muted-foreground text-center">
              Error ID: {errorId}
            </div>
          )}

          <Alert variant="destructive">
            <AlertDescription>
              <strong>Error:</strong> {error.message}
            </AlertDescription>
          </Alert>

          {isRecovering && (
            <Alert>
              <AlertDescription className="flex items-center">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Attempting to recover...
              </AlertDescription>
            </Alert>
          )}

          {showDetails && error.stack && (
            <details className="bg-muted p-3 rounded-md">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Error Details
              </summary>
              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-32">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button onClick={retry} disabled={isRecovering} className="w-full">
                <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
                {isRecovering ? 'Recovering...' : 'Try Again'}
              </Button>
            )}
            
            <Button onClick={resetError} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
            
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="ghost"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};