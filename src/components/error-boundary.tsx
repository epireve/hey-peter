'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTrackingService } from '@/lib/services/error-tracking-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  isolate?: boolean; // Whether to isolate this boundary from parent boundaries
  resetKeys?: Array<string | number>; // Keys that will reset the error boundary when changed
  resetOnPropsChange?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  eventId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture the error with full context
    const errorId = errorTrackingService.captureException(error, {
      tags: ['react-error-boundary'],
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: this.props.level || 'component',
        isolate: this.props.isolate,
        resetKeys: this.props.resetKeys
      }
    });

    this.setState({
      errorInfo,
      errorId,
      eventId: errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Add breadcrumb for error boundary trigger
    errorTrackingService.addBreadcrumb(
      'Error Boundary',
      'React error boundary caught an error',
      {
        errorId,
        level: this.props.level,
        componentStack: errorInfo.componentStack
      },
      'error'
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some((key, index) => 
          prevProps.resetKeys?.[index] !== key
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      eventId: null
    });

    errorTrackingService.addBreadcrumb(
      'Error Boundary',
      'Error boundary was reset',
      {
        level: this.props.level,
        method: 'manual'
      }
    );
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    if (this.state.errorId) {
      // Open a modal or navigate to error reporting page
      const subject = encodeURIComponent(`Error Report - ${this.state.errorId}`);
      const body = encodeURIComponent(
        `Error ID: ${this.state.errorId}\n` +
        `Error: ${this.state.error?.message}\n` +
        `URL: ${window.location.href}\n` +
        `User Agent: ${navigator.userAgent}\n\n` +
        `Please describe what you were doing when this error occurred:`
      );
      window.open(`mailto:support@heypeter.com?subject=${subject}&body=${body}`);
    }
  };

  private getErrorTitle(): string {
    const level = this.props.level || 'component';
    switch (level) {
      case 'page':
        return 'Page Error';
      case 'section':
        return 'Section Error';
      case 'component':
        return 'Component Error';
      default:
        return 'Application Error';
    }
  }

  private getErrorDescription(): string {
    const level = this.props.level || 'component';
    switch (level) {
      case 'page':
        return 'This page encountered an error and could not be displayed.';
      case 'section':
        return 'This section encountered an error and could not be displayed.';
      case 'component':
        return 'A component on this page encountered an error.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  private renderErrorFallback(): ReactNode {
    const { error, errorInfo, errorId } = this.state;
    const { showErrorDetails = false, level = 'component' } = this.props;

    return (
      <div className="min-h-[200px] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-destructive">
              {this.getErrorTitle()}
            </CardTitle>
            <CardDescription>
              {this.getErrorDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorId && (
              <div className="text-xs text-muted-foreground text-center">
                Error ID: {errorId}
              </div>
            )}

            {showErrorDetails && error && (
              <details className="bg-muted p-3 rounded-md">
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  Error Details
                </summary>
                <div className="text-xs space-y-2">
                  <div>
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              {level === 'page' && (
                <>
                  <Button variant="outline" onClick={this.handleReload} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </>
              )}
              
              <Button variant="ghost" onClick={this.handleReportError} className="w-full">
                <Bug className="mr-2 h-4 w-4" />
                Report This Error
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    const errorId = errorTrackingService.captureException(error, {
      tags: ['react-hook'],
      extra: errorInfo
    });
    
    return errorId;
  }, []);

  return handleError;
}

// Specific error boundary components for different levels
export function PageErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundary level="page" showErrorDetails={process.env.NODE_ENV === 'development'} {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundary level="section" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundary level="component" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;