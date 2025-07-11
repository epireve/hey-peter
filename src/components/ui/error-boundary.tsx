'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  errorInfo?: React.ErrorInfo;
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  errorInfo,
}) => (
  <Card className="p-6 m-4 border-destructive">
    <div className="flex items-center space-x-2 mb-4">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <h2 className="text-lg font-semibold text-destructive">
        Something went wrong
      </h2>
    </div>
    
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {error?.message || 'An unexpected error occurred while loading this component.'}
      </AlertDescription>
    </Alert>

    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        onClick={resetError}
        variant="outline"
        className="flex items-center space-x-2"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Try Again</span>
      </Button>
      
      <Button
        onClick={() => window.location.href = '/'}
        variant="ghost"
        className="flex items-center space-x-2"
      >
        <Home className="h-4 w-4" />
        <span>Go Home</span>
      </Button>
    </div>

    {process.env.NODE_ENV === 'development' && error && (
      <details className="mt-4 p-4 bg-muted rounded-md">
        <summary className="cursor-pointer font-medium">
          Error Details (Development Only)
        </summary>
        <pre className="mt-2 text-sm overflow-auto">
          {error.stack}
        </pre>
        {errorInfo && (
          <pre className="mt-2 text-sm overflow-auto text-muted-foreground">
            {errorInfo.componentStack}
          </pre>
        )}
      </details>
    )}
  </Card>
);

// Minimal error fallback for inline components
const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => (
  <div className="flex items-center justify-center p-4 border border-destructive/20 rounded-md bg-destructive/5">
    <div className="text-center">
      <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
      <p className="text-sm text-destructive mb-2">
        {error?.message || 'Failed to load component'}
      </p>
      <Button
        onClick={resetError}
        size="sm"
        variant="outline"
      >
        Retry
      </Button>
    </div>
  </div>
);

// Compact error fallback for cards
const CompactErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription className="flex items-center justify-between">
      <span>{error?.message || 'Failed to load'}</span>
      <Button
        onClick={resetError}
        size="sm"
        variant="ghost"
        className="h-6 px-2"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </AlertDescription>
  </Alert>
);

// Main ErrorBoundary class component
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }


    // In production, you might want to log to an error reporting service
    // logErrorToService(error, errorInfo);
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

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: FallbackComponent = DefaultErrorFallback } = this.props;

    if (hasError) {
      return (
        <FallbackComponent
          error={error}
          resetError={this.resetError}
          errorInfo={errorInfo}
        />
      );
    }

    return children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError, error };
};

// Higher-order component for wrapping components with error boundary
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

// Specialized error boundaries for different contexts
export const DashboardErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={DefaultErrorFallback}
    onError={(error, errorInfo) => {
      // Dashboard error handler
    }}
  >
    {children}
  </ErrorBoundary>
);

export const AnalyticsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={CompactErrorFallback}
    onError={(error, errorInfo) => {
      // Analytics error handler
    }}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={MinimalErrorFallback}
    resetOnPropsChange={true}
    onError={(error, errorInfo) => {
      // Form error handler
    }}
  >
    {children}
  </ErrorBoundary>
);

export const TableErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={CompactErrorFallback}
    onError={(error, errorInfo) => {
      // Table error handler
    }}
  >
    {children}
  </ErrorBoundary>
);

// Export fallback components for direct use
export {
  DefaultErrorFallback,
  MinimalErrorFallback,
  CompactErrorFallback,
};

export default ErrorBoundary;