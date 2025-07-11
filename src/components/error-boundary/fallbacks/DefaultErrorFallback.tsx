'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { ErrorFallbackProps } from '../types';

export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retry,
  errorId,
  errorType = 'unknown',
  retryCount = 0,
  maxRetries = 3,
  isRecovering = false,
  maxRetriesReached = false,
  showDetails = false,
  level = 'global'
}) => {
  const handleCopyError = () => {
    const errorDetails = `
Error ID: ${errorId || 'N/A'}
Error Type: ${errorType}
Message: ${error.message}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Time: ${new Date().toISOString()}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      toast.success('Error details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy error details');
    });
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(`Error Report - ${errorId || 'Unknown'}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId || 'N/A'}\n` +
      `Error Type: ${errorType}\n` +
      `Error: ${error.message}\n` +
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `Please describe what you were doing when this error occurred:\n\n`
    );
    window.open(`mailto:support@heypeter.com?subject=${subject}&body=${body}`);
  };

  const canRetry = retry && retryCount < maxRetries && !maxRetriesReached;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl text-destructive">
            Application Error
          </CardTitle>
          <CardDescription className="text-base">
            We're sorry, but something went wrong. The error has been logged and our team has been notified.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {errorId && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Error Reference: <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{errorId}</code>
              </p>
            </div>
          )}

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p><strong>Type:</strong> {errorType}</p>
                <p><strong>Message:</strong> {error.message}</p>
                {canRetry && (
                  <p><strong>Retry Attempts:</strong> {retryCount} of {maxRetries}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {isRecovering && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertTitle>Recovery in Progress</AlertTitle>
              <AlertDescription>
                Attempting to recover from the error. Please wait...
              </AlertDescription>
            </Alert>
          )}

          {maxRetriesReached && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Maximum Retries Reached</AlertTitle>
              <AlertDescription>
                We've tried multiple times but couldn't recover from this error. Please try refreshing the page or contact support.
              </AlertDescription>
            </Alert>
          )}

          {showDetails && (
            <details className="border rounded-lg p-4 bg-muted/50">
              <summary className="cursor-pointer font-medium text-sm mb-2">
                Technical Details (Development Only)
              </summary>
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <strong className="text-muted-foreground">Error Type:</strong>
                  <pre className="mt-1 p-2 bg-background rounded overflow-auto">{errorType}</pre>
                </div>
                
                <div>
                  <strong className="text-muted-foreground">Message:</strong>
                  <pre className="mt-1 p-2 bg-background rounded overflow-auto">{error.message}</pre>
                </div>
                
                {error.stack && (
                  <div>
                    <strong className="text-muted-foreground">Stack Trace:</strong>
                    <pre className="mt-1 p-2 bg-background rounded overflow-auto max-h-48">
                      {error.stack}
                    </pre>
                  </div>
                )}
                
                {errorInfo?.componentStack && (
                  <div>
                    <strong className="text-muted-foreground">Component Stack:</strong>
                    <pre className="mt-1 p-2 bg-background rounded overflow-auto max-h-48">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col gap-3">
            {canRetry && (
              <Button onClick={retry} disabled={isRecovering} className="w-full">
                <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
                {isRecovering ? 'Recovering...' : `Try Again (${retryCount}/${maxRetries})`}
              </Button>
            )}
            
            <Button onClick={resetError} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Application
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleCopyError}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Error Details
              </Button>
              
              <Button
                onClick={handleEmailSupport}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Support
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>If this problem persists, please contact our support team.</p>
            <p className="mt-1">
              <a href="/help" className="underline hover:no-underline">
                Visit Help Center
              </a>
              {' or '}
              <a href="mailto:support@heypeter.com" className="underline hover:no-underline">
                Email Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};