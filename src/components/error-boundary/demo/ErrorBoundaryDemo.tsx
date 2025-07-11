'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PageErrorBoundary, 
  SectionErrorBoundary, 
  ComponentErrorBoundary,
  useErrorHandler,
  useAsyncErrorBoundary
} from '../index';

// Component that throws different types of errors
const ErrorGenerator = ({ errorType, onError }: { 
  errorType: string;
  onError?: () => void;
}) => {
  const throwError = () => {
    if (onError) onError();
    
    switch (errorType) {
      case 'network':
        throw new Error('Failed to fetch data from server');
      case 'chunk':
        throw new Error('Loading chunk 1 failed');
      case 'permission':
        throw new Error('Permission denied: unauthorized access');
      case 'validation':
        throw new Error('Validation failed: invalid input');
      case 'timeout':
        throw new Error('Request timeout exceeded');
      case 'component':
        throw new Error('Component render failed');
      default:
        throw new Error('Unknown error occurred');
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-2">Error Generator</h4>
      <p className="text-sm text-muted-foreground mb-3">
        Error Type: <Badge variant="outline">{errorType}</Badge>
      </p>
      <Button onClick={throwError} variant="destructive" size="sm">
        Throw {errorType} Error
      </Button>
    </div>
  );
};

// Component that uses error handler hook
const ErrorHandlerExample = () => {
  const { handleError, handleAsyncError, isError, error, resetError } = useErrorHandler();
  const [result, setResult] = useState<string | null>(null);

  const handleSyncError = () => {
    try {
      throw new Error('Synchronous error from hook');
    } catch (err) {
      handleError(err, {
        showToast: true,
        toastMessage: 'Sync error handled!',
        context: { source: 'demo' }
      });
    }
  };

  const handleAsyncErrorExample = async () => {
    const result = await handleAsyncError(
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Async error from hook')), 1000);
      }),
      {
        showToast: true,
        toastMessage: 'Async error handled!',
        context: { source: 'demo', async: true }
      }
    );
    setResult(result ? 'Success' : 'Error handled');
  };

  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-2">Error Handler Hook Example</h4>
      {isError && (
        <Alert className="mb-3">
          <AlertDescription>
            Error caught: {error?.message}
            <Button onClick={resetError} size="sm" variant="outline" className="ml-2">
              Reset
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Button onClick={handleSyncError} size="sm">
          Handle Sync Error
        </Button>
        <Button onClick={handleAsyncErrorExample} size="sm">
          Handle Async Error
        </Button>
        {result && (
          <p className="text-sm text-muted-foreground">Result: {result}</p>
        )}
      </div>
    </div>
  );
};

// Component that uses async error boundary
const AsyncErrorBoundaryExample = () => {
  const { runAsync, throwError } = useAsyncErrorBoundary();
  const [status, setStatus] = useState<string>('idle');

  const handleAsyncOperation = async () => {
    setStatus('loading');
    const result = await runAsync(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      throw new Error('Async operation failed');
    });
    setStatus(result ? 'success' : 'error');
  };

  const handleDirectThrow = () => {
    throwError(new Error('Direct async error'));
  };

  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-2">Async Error Boundary Example</h4>
      <p className="text-sm text-muted-foreground mb-3">
        Status: <Badge variant="outline">{status}</Badge>
      </p>
      <div className="space-y-2">
        <Button onClick={handleAsyncOperation} size="sm">
          Run Async Operation
        </Button>
        <Button onClick={handleDirectThrow} size="sm" variant="destructive">
          Throw Direct Error
        </Button>
      </div>
    </div>
  );
};

export default function ErrorBoundaryDemo() {
  const [pageError, setPageError] = useState(false);
  const [sectionError, setSectionError] = useState(false);
  const [componentError, setComponentError] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Boundary System Demo</h1>
        <p className="text-muted-foreground">
          Test different error scenarios and recovery mechanisms
        </p>
      </div>

      <div className="grid gap-6">
        {/* Page Level Error Boundary */}
        <Card>
          <CardHeader>
            <CardTitle>Page Level Error Boundary</CardTitle>
            <CardDescription>
              Catches errors at the page level with full page fallback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PageErrorBoundary>
              {pageError ? (
                <ErrorGenerator errorType="network" />
              ) : (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800">Page content loaded successfully</p>
                  <Button 
                    onClick={() => setPageError(true)} 
                    className="mt-2"
                    variant="destructive"
                  >
                    Trigger Page Error
                  </Button>
                </div>
              )}
            </PageErrorBoundary>
          </CardContent>
        </Card>

        {/* Section Level Error Boundary */}
        <Card>
          <CardHeader>
            <CardTitle>Section Level Error Boundary</CardTitle>
            <CardDescription>
              Catches errors at the section level with inline fallback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <SectionErrorBoundary>
                {sectionError ? (
                  <ErrorGenerator errorType="chunk" />
                ) : (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800">Section 1 loaded successfully</p>
                    <Button 
                      onClick={() => setSectionError(true)} 
                      className="mt-2"
                      variant="destructive"
                      size="sm"
                    >
                      Trigger Section Error
                    </Button>
                  </div>
                )}
              </SectionErrorBoundary>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">Section 2 (no error)</p>
                <p className="text-sm text-green-600">
                  This section continues to work even if section 1 fails
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Level Error Boundary */}
        <Card>
          <CardHeader>
            <CardTitle>Component Level Error Boundary</CardTitle>
            <CardDescription>
              Catches errors at the component level with minimal fallback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <ComponentErrorBoundary>
                {componentError ? (
                  <ErrorGenerator errorType="component" />
                ) : (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-purple-800 text-sm">Component 1</p>
                    <Button 
                      onClick={() => setComponentError(true)} 
                      className="mt-2"
                      variant="destructive"
                      size="sm"
                    >
                      Break Component
                    </Button>
                  </div>
                )}
              </ComponentErrorBoundary>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 text-sm">Component 2 (working)</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 text-sm">Component 3 (working)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Types Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Error Types Demo</CardTitle>
            <CardDescription>
              Test different error types and their specific fallbacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['network', 'chunk', 'permission', 'validation', 'timeout', 'component'].map(type => (
                <SectionErrorBoundary key={type}>
                  <ErrorGenerator errorType={type} />
                </SectionErrorBoundary>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hook Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Error Handler Hooks</CardTitle>
            <CardDescription>
              Examples of using error handling hooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <ErrorHandlerExample />
              <ComponentErrorBoundary>
                <AsyncErrorBoundaryExample />
              </ComponentErrorBoundary>
            </div>
          </CardContent>
        </Card>

        {/* Reset Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Reset Functionality</CardTitle>
            <CardDescription>
              Demonstrates how error boundaries can be reset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={() => setPageError(false)} 
                variant="outline"
              >
                Reset Page Error
              </Button>
              <Button 
                onClick={() => setSectionError(false)} 
                variant="outline"
              >
                Reset Section Error
              </Button>
              <Button 
                onClick={() => setComponentError(false)} 
                variant="outline"
              >
                Reset Component Error
              </Button>
              <Button 
                onClick={() => {
                  setPageError(false);
                  setSectionError(false);
                  setComponentError(false);
                }} 
                variant="outline"
              >
                Reset All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}