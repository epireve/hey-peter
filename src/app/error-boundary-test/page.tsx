'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PageErrorBoundary, 
  SectionErrorBoundary, 
  ComponentErrorBoundary,
  useErrorHandler
} from '@/components/error-boundary';

// Component that can throw errors
const ErrorThrower = ({ errorType, shouldThrow }: { errorType: string; shouldThrow: boolean }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Failed to fetch data from server');
      case 'chunk':
        throw new Error('Loading chunk 1 failed');
      case 'component':
        throw new Error('Component render failed');
      default:
        throw new Error('Unknown error occurred');
    }
  }
  return <div className="p-4 bg-green-100 rounded">Component loaded successfully</div>;
};

// Component using error handler hook
const ErrorHandlerExample = () => {
  const { handleError, isError, error, resetError } = useErrorHandler();

  const triggerError = () => {
    handleError(new Error('Hook error example'), {
      showToast: true,
      toastMessage: 'Error handled by hook!'
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Error Handler Hook Example</h3>
      {isError && (
        <div className="p-4 bg-red-100 border border-red-400 rounded">
          <p className="text-red-800">Error: {error?.message}</p>
          <Button onClick={resetError} variant="outline" size="sm" className="mt-2">
            Clear Error
          </Button>
        </div>
      )}
      <Button onClick={triggerError}>Trigger Hook Error</Button>
    </div>
  );
};

export default function ErrorBoundaryTestPage() {
  const [pageError, setPageError] = useState(false);
  const [sectionError, setSectionError] = useState(false);
  const [componentError, setComponentError] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Error Boundary Test Page</h1>
      
      {/* Page Level Error Boundary */}
      <Card>
        <CardHeader>
          <CardTitle>Page Level Error Boundary</CardTitle>
          <CardDescription>
            Test page-level error handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PageErrorBoundary>
            <ErrorThrower errorType="network" shouldThrow={pageError} />
            <div className="mt-4">
              <Button 
                onClick={() => setPageError(!pageError)} 
                variant={pageError ? 'default' : 'destructive'}
              >
                {pageError ? 'Reset Page Error' : 'Trigger Page Error'}
              </Button>
            </div>
          </PageErrorBoundary>
        </CardContent>
      </Card>

      {/* Section Level Error Boundary */}
      <Card>
        <CardHeader>
          <CardTitle>Section Level Error Boundary</CardTitle>
          <CardDescription>
            Test section-level error handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <SectionErrorBoundary>
              <ErrorThrower errorType="component" shouldThrow={sectionError} />
              <div className="mt-4">
                <Button 
                  onClick={() => setSectionError(!sectionError)} 
                  variant={sectionError ? 'default' : 'destructive'}
                  size="sm"
                >
                  {sectionError ? 'Reset Section Error' : 'Trigger Section Error'}
                </Button>
              </div>
            </SectionErrorBoundary>
            <div className="p-4 bg-blue-100 rounded">
              <p className="text-blue-800">Section 2 (always working)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Level Error Boundary */}
      <Card>
        <CardHeader>
          <CardTitle>Component Level Error Boundary</CardTitle>
          <CardDescription>
            Test component-level error handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <ComponentErrorBoundary>
              <ErrorThrower errorType="component" shouldThrow={componentError} />
              <div className="mt-2">
                <Button 
                  onClick={() => setComponentError(!componentError)} 
                  variant={componentError ? 'default' : 'destructive'}
                  size="sm"
                >
                  {componentError ? 'Reset' : 'Break'}
                </Button>
              </div>
            </ComponentErrorBoundary>
            <div className="p-4 bg-green-100 rounded">
              <p className="text-green-800">Component 2 (working)</p>
            </div>
            <div className="p-4 bg-green-100 rounded">
              <p className="text-green-800">Component 3 (working)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Handler Hook */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handler Hook</CardTitle>
          <CardDescription>
            Test programmatic error handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorHandlerExample />
        </CardContent>
      </Card>
    </div>
  );
}