'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { AppError, isAppError } from './app-error';
import { formatErrorForDisplay } from './user-messages';
import { errorUtils } from './error-utils';
import { useError } from './ErrorContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | AppError;
  errorInfo?: ErrorInfo;
  errorId?: string;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  level?: 'page' | 'section' | 'component';
  context?: string;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error | AppError, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface ErrorFallbackProps {
  error?: Error | AppError;
  errorInfo?: ErrorInfo;
  resetError?: () => void;
  context?: string;
  level?: 'page' | 'section' | 'component';
}

/**
 * Enhanced Error Boundary with different layouts for different contexts
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.captureError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Reset on prop changes if enabled
      if (resetOnPropsChange && prevProps.children !== this.props.children) {
        this.resetError();
      }

      // Reset on key changes
      if (resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys![index]
        );
        if (hasResetKeyChanged) {
          this.resetError();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private captureError(error: Error, errorInfo: ErrorInfo): string {
    const context = errorUtils.createErrorContext();
    const errorId = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log error with context
    errorUtils.log(error, {
      ...context,
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: this.props.level,
      errorBoundaryContext: this.props.context,
      errorId
    });

    return errorId;
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      showDetails: false
    });
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback: FallbackComponent, level = 'component', context } = this.props;

    if (hasError && error) {
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            context={context}
            level={level}
          />
        );
      }

      // Use default fallback based on level
      return this.renderDefaultFallback(error, errorInfo, level, context);
    }

    return children;
  }

  private renderDefaultFallback(
    error: Error | AppError,
    errorInfo?: ErrorInfo,
    level: string = 'component',
    context?: string
  ) {
    const errorDisplay = formatErrorForDisplay(error, context, this.props.showErrorDetails);
    const { showDetails } = this.state;

    switch (level) {
      case 'page':
        return <PageErrorFallback 
          error={error} 
          errorInfo={errorInfo} 
          resetError={this.resetError}
          errorDisplay={errorDisplay}
          showDetails={showDetails}
          toggleDetails={this.toggleDetails}
        />;
      
      case 'section':
        return <SectionErrorFallback 
          error={error} 
          errorInfo={errorInfo} 
          resetError={this.resetError}
          errorDisplay={errorDisplay}
          showDetails={showDetails}
          toggleDetails={this.toggleDetails}
        />;
      
      default:
        return <ComponentErrorFallback 
          error={error} 
          errorInfo={errorInfo} 
          resetError={this.resetError}
          errorDisplay={errorDisplay}
        />;
    }
  }
}

/**
 * Page-level error fallback
 */
function PageErrorFallback({ 
  error, 
  errorInfo, 
  resetError, 
  errorDisplay, 
  showDetails, 
  toggleDetails 
}: {
  error: Error | AppError;
  errorInfo?: ErrorInfo;
  resetError: () => void;
  errorDisplay: any;
  showDetails: boolean;
  toggleDetails: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {errorDisplay.title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {errorDisplay.message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              {errorDisplay.action || 'Try Again'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <Collapsible open={showDetails} onOpenChange={toggleDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full">
                  <span>Error Details</span>
                  {showDetails ? 
                    <ChevronUp className="h-4 w-4 ml-2" /> : 
                    <ChevronDown className="h-4 w-4 ml-2" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                  {errorInfo && (
                    <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap text-gray-600">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Section-level error fallback
 */
function SectionErrorFallback({ 
  error, 
  errorInfo, 
  resetError, 
  errorDisplay, 
  showDetails, 
  toggleDetails 
}: {
  error: Error | AppError;
  errorInfo?: ErrorInfo;
  resetError: () => void;
  errorDisplay: any;
  showDetails: boolean;
  toggleDetails: () => void;
}) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">
            {errorDisplay.title}
          </h3>
          <p className="text-red-700 text-sm mb-4">
            {errorDisplay.message}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={resetError} variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              {errorDisplay.action || 'Retry'}
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button size="sm" variant="ghost" onClick={toggleDetails}>
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            )}
          </div>

          {showDetails && process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-white rounded border text-xs">
              <pre className="overflow-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component-level error fallback
 */
function ComponentErrorFallback({ 
  error, 
  errorInfo, 
  resetError, 
  errorDisplay 
}: {
  error: Error | AppError;
  errorInfo?: ErrorInfo;
  resetError: () => void;
  errorDisplay: any;
}) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{errorDisplay.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p>{errorDisplay.message}</p>
          <Button 
            size="sm" 
            onClick={resetError}
            variant="outline"
            className="bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {errorDisplay.action || 'Try Again'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

/**
 * Hook for functional components to handle errors
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

/**
 * Specialized error boundaries for different contexts
 */
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="section"
    context="dashboard"
    onError={(error, errorInfo) => {
      // Dashboard-specific error handling
      console.error('Dashboard error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    context="form"
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

export const ApiErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    context="api"
    onError={(error, errorInfo) => {
      // API-specific error handling
      if (isAppError(error) && error.statusCode >= 500) {
        // Log server errors
        console.error('Server error in component:', error, errorInfo);
      }
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    context="chart"
    fallback={({ resetError }) => (
      <div className="flex items-center justify-center h-64 border border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-2">Chart failed to load</p>
          <Button size="sm" onClick={resetError} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;