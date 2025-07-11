'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTrackingService } from '@/lib/services/error-tracking-service';
import { DefaultErrorFallback } from './fallbacks/DefaultErrorFallback';
import { PageErrorFallback } from './fallbacks/PageErrorFallback';
import { SectionErrorFallback } from './fallbacks/SectionErrorFallback';
import { ComponentErrorFallback } from './fallbacks/ComponentErrorFallback';
import { NetworkErrorFallback } from './fallbacks/NetworkErrorFallback';
import { ChunkLoadErrorFallback } from './fallbacks/ChunkLoadErrorFallback';
import { ErrorRecoveryProvider } from './ErrorRecoveryProvider';
import { ErrorBoundaryContext } from './ErrorBoundaryContext';
import type { ErrorBoundaryProps, ErrorBoundaryState, ErrorLevel, ErrorType } from './types';

export class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private errorHistory: Array<{ error: Error; timestamp: Date }> = [];
  private mounted = false;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      eventId: null,
      errorType: 'unknown',
      retryCount: 0,
      isRecovering: false
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.setupErrorListeners();
  }

  componentWillUnmount() {
    this.mounted = false;
    this.cleanupErrorListeners();
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private setupErrorListeners() {
    if (typeof window !== 'undefined') {
      // Listen for custom error events
      window.addEventListener('error-boundary:reset', this.handleResetEvent);
      window.addEventListener('error-boundary:retry', this.handleRetryEvent);
    }
  }

  private cleanupErrorListeners() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error-boundary:reset', this.handleResetEvent);
      window.removeEventListener('error-boundary:retry', this.handleRetryEvent);
    }
  }

  private handleResetEvent = () => {
    this.resetErrorBoundary();
  };

  private handleRetryEvent = () => {
    this.handleRetry();
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorType = GlobalErrorBoundary.classifyError(error);
    return {
      hasError: true,
      error,
      errorType
    };
  }

  private static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
      return 'network';
    }

    // Chunk loading errors (common in Next.js)
    if (message.includes('chunk') || message.includes('loading css chunk') || message.includes('loading chunk')) {
      return 'chunk-load';
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'permission';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return 'timeout';
    }

    // React-specific errors
    if (stack.includes('react') || message.includes('component')) {
      return 'component';
    }

    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track error occurrence
    this.errorHistory.push({ error, timestamp: new Date() });
    
    // Clean up old error history (keep last 10)
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }

    // Check for error storms (too many errors in short time)
    const recentErrors = this.errorHistory.filter(
      e => new Date().getTime() - e.timestamp.getTime() < 60000 // Last minute
    );
    
    const isErrorStorm = recentErrors.length > 5;

    // Capture the error with full context
    const errorId = errorTrackingService.captureException(error, {
      tags: ['react-error-boundary', 'global'],
      level: this.getErrorLevel(),
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: this.props.level || 'global',
        errorType: this.state.errorType,
        retryCount: this.retryCount,
        isErrorStorm,
        isolate: this.props.isolate,
        resetKeys: this.props.resetKeys,
        errorHistory: this.errorHistory.slice(-3).map(e => ({
          message: e.error.message,
          timestamp: e.timestamp.toISOString()
        }))
      }
    });

    if (this.mounted) {
      this.setState({
        errorInfo,
        errorId,
        eventId: errorId,
        retryCount: this.retryCount
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Add breadcrumb for error boundary trigger
    errorTrackingService.addBreadcrumb(
      'Error Boundary',
      `Global error boundary caught ${this.state.errorType} error`,
      {
        errorId,
        level: this.props.level || 'global',
        componentStack: errorInfo.componentStack,
        errorType: this.state.errorType,
        isErrorStorm
      },
      'error'
    );

    // If this is an error storm, don't allow retries
    if (isErrorStorm && this.mounted) {
      this.setState({ maxRetriesReached: true });
    }
  }

  private getErrorLevel(): 'fatal' | 'error' | 'warning' {
    const { level = 'global' } = this.props;
    const { errorType } = this.state;

    if (level === 'global' || errorType === 'chunk-load') {
      return 'fatal';
    }
    
    if (level === 'page' || errorType === 'network') {
      return 'error';
    }

    return 'warning';
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
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
    this.retryCount = 0;
    
    if (this.mounted) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        eventId: null,
        errorType: 'unknown',
        retryCount: 0,
        isRecovering: false,
        maxRetriesReached: false
      });
    }

    errorTrackingService.addBreadcrumb(
      'Error Boundary',
      'Global error boundary was reset',
      {
        level: this.props.level || 'global',
        method: 'manual'
      }
    );

    // Call onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleRetry = async () => {
    if (this.retryCount >= this.maxRetries || this.state.maxRetriesReached) {
      return;
    }

    this.retryCount++;
    
    if (this.mounted) {
      this.setState({ isRecovering: true, retryCount: this.retryCount });
    }

    // Add recovery breadcrumb
    errorTrackingService.addBreadcrumb(
      'Error Recovery',
      `Attempting recovery (attempt ${this.retryCount}/${this.maxRetries})`,
      {
        errorType: this.state.errorType,
        errorId: this.state.errorId
      }
    );

    // Implement exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
    
    await new Promise(resolve => {
      this.resetTimeoutId = window.setTimeout(resolve, delay);
    });

    // Special handling for chunk load errors
    if (this.state.errorType === 'chunk-load' && typeof window !== 'undefined') {
      // Try to reload the page to fetch new chunks
      window.location.reload();
      return;
    }

    this.resetErrorBoundary();
  };

  private selectFallbackComponent(): React.ComponentType<any> {
    const { fallback: CustomFallback, level = 'global' } = this.props;
    const { errorType } = this.state;

    if (CustomFallback) {
      return CustomFallback;
    }

    // Select fallback based on error type
    switch (errorType) {
      case 'network':
        return NetworkErrorFallback;
      case 'chunk-load':
        return ChunkLoadErrorFallback;
      case 'component':
        return level === 'component' ? ComponentErrorFallback : DefaultErrorFallback;
      default:
        // Select fallback based on level
        switch (level) {
          case 'page':
            return PageErrorFallback;
          case 'section':
            return SectionErrorFallback;
          case 'component':
            return ComponentErrorFallback;
          default:
            return DefaultErrorFallback;
        }
    }
  }

  render() {
    const { hasError, error, errorInfo, errorId, errorType, retryCount, isRecovering, maxRetriesReached } = this.state;
    const { children, showErrorDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError && error) {
      const FallbackComponent = this.selectFallbackComponent();
      
      return (
        <ErrorBoundaryContext.Provider
          value={{
            error,
            errorInfo,
            errorId,
            errorType,
            resetError: this.resetErrorBoundary,
            retry: this.handleRetry,
            retryCount,
            maxRetries: this.maxRetries,
            isRecovering,
            maxRetriesReached: maxRetriesReached || false,
            showDetails: showErrorDetails,
            level: this.props.level || 'global'
          }}
        >
          <ErrorRecoveryProvider>
            <FallbackComponent
              error={error}
              errorInfo={errorInfo}
              resetError={this.resetErrorBoundary}
              retry={this.handleRetry}
              errorId={errorId}
              errorType={errorType}
              retryCount={retryCount}
              maxRetries={this.maxRetries}
              isRecovering={isRecovering}
              maxRetriesReached={maxRetriesReached || false}
              showDetails={showErrorDetails}
              level={this.props.level || 'global'}
            />
          </ErrorRecoveryProvider>
        </ErrorBoundaryContext.Provider>
      );
    }

    return children;
  }
}

// Export convenience components for different levels
export function AppErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <GlobalErrorBoundary level="global" showErrorDetails={process.env.NODE_ENV === 'development'} {...props}>
      {children}
    </GlobalErrorBoundary>
  );
}

export function PageErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <GlobalErrorBoundary level="page" {...props}>
      {children}
    </GlobalErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <GlobalErrorBoundary level="section" {...props}>
      {children}
    </GlobalErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <GlobalErrorBoundary level="component" {...props}>
      {children}
    </GlobalErrorBoundary>
  );
}

export default GlobalErrorBoundary;