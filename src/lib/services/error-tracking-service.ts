import { loggingService, LogCategory, LogLevel } from './logging-service';

import { logger } from '@/lib/services';
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  breadcrumbs?: ErrorBreadcrumb[];
  tags?: string[];
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  fingerprint?: string;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  release?: string;
  environment?: string;
}

export interface ErrorBreadcrumb {
  timestamp: string;
  message: string;
  category: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  type: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  fingerprint: string;
  context: ErrorContext;
  timestamp: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
  resolved: boolean;
  assignee?: string;
  tags: string[];
}

export interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  resolvedErrors: number;
  errorsByType: Record<string, number>;
  errorsByLevel: Record<string, number>;
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastSeen: string;
  }>;
  errorTrends: Array<{
    date: string;
    count: number;
  }>;
}

class ErrorTrackingService {
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private maxBreadcrumbs = 100;
  private context: Partial<ErrorContext> = {};

  constructor() {
    this.initializeContext();
    this.setupGlobalErrorHandlers();
  }

  private initializeContext(): void {
    if (typeof window !== 'undefined') {
      this.context = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      };

      // Track navigation changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        errorTrackingService.addBreadcrumb('Navigation', 'User navigated to new page', {
          url: window.location.href
        });
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        errorTrackingService.addBreadcrumb('Navigation', 'Page state replaced', {
          url: window.location.href
        });
      };

      window.addEventListener('popstate', () => {
        this.addBreadcrumb('Navigation', 'User navigated back/forward', {
          url: window.location.href
        });
      });
    }
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Handle uncaught JavaScript errors
      window.addEventListener('error', (event) => {
        this.captureException(event.error || new Error(event.message), {
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            source: 'window.error'
          }
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
          extra: {
            reason: event.reason,
            source: 'unhandledrejection'
          }
        });
      });

      // Handle React error boundaries (if not caught)
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // Check if this looks like a React error
        const message = args[0];
        if (typeof message === 'string' && message.includes('React')) {
          this.captureException(new Error(message), {
            extra: {
              args: args.slice(1),
              source: 'console.error'
            }
          });
        }
        originalConsoleError.apply(console, args);
      };
    }
  }

  // Set user context
  setUser(user: { id?: string; email?: string; username?: string }): void {
    this.context.user = user;
    this.context.userId = user.id;
  }

  // Set tags for grouping and filtering
  setTags(tags: string[]): void {
    this.context.tags = tags;
  }

  // Set extra context
  setExtra(key: string, value: any): void {
    if (!this.context.extra) {
      this.context.extra = {};
    }
    this.context.extra[key] = value;
  }

  // Set fingerprint for custom grouping
  setFingerprint(fingerprint: string): void {
    this.context.fingerprint = fingerprint;
  }

  // Add breadcrumb for debugging context
  addBreadcrumb(category: string, message: string, data?: Record<string, any>, level: ErrorBreadcrumb['level'] = 'info'): void {
    const breadcrumb: ErrorBreadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      category,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  // Capture an exception with full context
  captureException(error: Error, context?: Partial<ErrorContext>): string {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    const errorContext: ErrorContext = {
      ...this.context,
      ...context,
      timestamp,
      breadcrumbs: [...this.breadcrumbs]
    };

    // Generate fingerprint for grouping similar errors
    const fingerprint = context?.fingerprint || this.generateFingerprint(error);

    // Extract meaningful information from the error
    const errorInfo = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
      fingerprint,
      context: errorContext
    };

    // Log to our logging service
    loggingService.error(
      LogCategory.SYSTEM,
      `Captured exception: ${error.message}`,
      {
        errorId,
        fingerprint,
        errorType: error.constructor.name,
        ...errorContext.extra
      },
      error
    );

    // Store error details for analysis
    this.storeErrorReport(errorInfo);

    // Add breadcrumb for this error
    this.addBreadcrumb('Error', `Exception captured: ${error.message}`, {
      errorId,
      fingerprint
    }, 'error');

    return errorId;
  }

  // Capture a message with context
  captureMessage(message: string, level: ErrorContext['level'] = 'info', context?: Partial<ErrorContext>): string {
    const messageId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    const messageContext: ErrorContext = {
      ...this.context,
      ...context,
      timestamp,
      level,
      breadcrumbs: [...this.breadcrumbs]
    };

    const logLevel = this.mapLevelToLogLevel(level);
    const logCategory = context?.tags?.includes('api') ? LogCategory.API : LogCategory.SYSTEM;

    loggingService.log(logLevel, logCategory, message, {
      messageId,
      level,
      ...messageContext.extra
    });

    this.addBreadcrumb('Message', message, { messageId, level }, level);

    return messageId;
  }

  private mapLevelToLogLevel(level: ErrorContext['level']): LogLevel {
    switch (level) {
      case 'fatal': return LogLevel.FATAL;
      case 'error': return LogLevel.ERROR;
      case 'warning': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: Error): string {
    // Create a fingerprint based on error type and first few lines of stack trace
    const stackLines = error.stack?.split('\n').slice(0, 3).join('\n') || '';
    const content = `${error.constructor.name}:${error.message}:${stackLines}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async storeErrorReport(errorInfo: any): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      // Check if we've seen this error before
      const { data: existingError } = await supabase
        .from('error_reports')
        .select('id, count, first_seen')
        .eq('fingerprint', errorInfo.fingerprint)
        .single();

      if (existingError) {
        // Update existing error
        await supabase
          .from('error_reports')
          .update({
            count: existingError.count + 1,
            last_seen: errorInfo.context.timestamp,
            context: errorInfo.context
          })
          .eq('fingerprint', errorInfo.fingerprint);
      } else {
        // Create new error report
        await supabase
          .from('error_reports')
          .insert({
            id: errorInfo.id,
            message: errorInfo.message,
            stack: errorInfo.stack,
            type: errorInfo.type,
            level: errorInfo.context.level || 'error',
            fingerprint: errorInfo.fingerprint,
            context: errorInfo.context,
            first_seen: errorInfo.context.timestamp,
            last_seen: errorInfo.context.timestamp,
            count: 1,
            resolved: false,
            tags: errorInfo.context.tags || []
          });
      }
    } catch (error) {
      logger.error('Failed to store error report:', error);
    }
  }

  // Performance monitoring integration
  capturePerformanceIssue(metric: string, value: number, threshold: number, context?: Record<string, any>): void {
    if (value > threshold) {
      this.captureMessage(
        `Performance issue detected: ${metric} (${value}ms) exceeded threshold (${threshold}ms)`,
        'warning',
        {
          tags: ['performance'],
          extra: {
            metric,
            value,
            threshold,
            ...context
          }
        }
      );

      this.addBreadcrumb('Performance', `Slow ${metric}`, {
        value,
        threshold,
        metric
      }, 'warning');
    }
  }

  // API call tracking
  captureAPICall(method: string, url: string, statusCode: number, duration: number, context?: Record<string, any>): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info';
    
    this.addBreadcrumb('API', `${method} ${url}`, {
      method,
      url,
      statusCode,
      duration,
      ...context
    }, level);

    if (statusCode >= 400) {
      this.captureMessage(
        `API call failed: ${method} ${url} - ${statusCode}`,
        level,
        {
          tags: ['api', 'http'],
          extra: {
            method,
            url,
            statusCode,
            duration,
            ...context
          }
        }
      );
    }
  }

  // Clear breadcrumbs
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  // Get current breadcrumbs
  getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  // Error reporting utilities
  async getErrorStats(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<ErrorStats> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const now = new Date();
      const startTime = new Date();
      
      switch (timeframe) {
        case 'hour':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case 'day':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case 'week':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case 'month':
          startTime.setMonth(startTime.getMonth() - 1);
          break;
      }

      const { data: errors } = await supabase
        .from('error_reports')
        .select('*')
        .gte('last_seen', startTime.toISOString());

      if (!errors) return this.getEmptyStats();

      const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);
      const uniqueErrors = errors.length;
      const resolvedErrors = errors.filter(error => error.resolved).length;

      const errorsByType: Record<string, number> = {};
      const errorsByLevel: Record<string, number> = {};

      errors.forEach(error => {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + error.count;
        errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + error.count;
      });

      const topErrors = errors
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(error => ({
          fingerprint: error.fingerprint,
          message: error.message,
          count: error.count,
          lastSeen: error.last_seen
        }));

      // Generate error trends (simplified)
      const errorTrends = this.generateErrorTrends(errors, timeframe);

      return {
        totalErrors,
        uniqueErrors,
        resolvedErrors,
        errorsByType,
        errorsByLevel,
        topErrors,
        errorTrends
      };
    } catch (error) {
      logger.error('Failed to get error stats:', error);
      return this.getEmptyStats();
    }
  }

  private getEmptyStats(): ErrorStats {
    return {
      totalErrors: 0,
      uniqueErrors: 0,
      resolvedErrors: 0,
      errorsByType: {},
      errorsByLevel: {},
      topErrors: [],
      errorTrends: []
    };
  }

  private generateErrorTrends(errors: any[], timeframe: string): Array<{ date: string; count: number }> {
    // This is a simplified implementation
    // In a real scenario, you'd want to group by time intervals
    const trends = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dayErrors = errors.filter(error => {
        const errorDate = new Date(error.last_seen);
        return errorDate.toDateString() === date.toDateString();
      });
      
      const count = dayErrors.reduce((sum, error) => sum + error.count, 0);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    
    return trends;
  }

  // Mark error as resolved
  async resolveError(fingerprint: string): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      await supabase
        .from('error_reports')
        .update({ resolved: true })
        .eq('fingerprint', fingerprint);

      this.addBreadcrumb('ErrorManagement', 'Error marked as resolved', {
        fingerprint
      });
    } catch (error) {
      logger.error('Failed to resolve error:', error);
    }
  }
}

// Export singleton instance
export const errorTrackingService = new ErrorTrackingService();
export default errorTrackingService;