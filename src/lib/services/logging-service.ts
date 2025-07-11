import { createClient } from '@/lib/supabase';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogCategory {
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  API = 'api',
  UI = 'ui',
  SCHEDULING = 'scheduling',
  HOURS = 'hours',
  ANALYTICS = 'analytics',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  INTEGRATION = 'integration',
  USER_ACTION = 'user_action',
  SYSTEM = 'system'
}

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  request_id?: string;
  source: 'client' | 'server';
  stack_trace?: string;
  fingerprint?: string; // For error deduplication
  tags?: string[];
  environment: string;
}

export interface LogFilter {
  level?: LogLevel[];
  category?: LogCategory[];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  source?: 'client' | 'server';
  search?: string;
  tags?: string[];
}

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
  categoriesBreakdown: Record<LogCategory, number>;
  hourlyDistribution: Array<{
    hour: string;
    count: number;
  }>;
}

class LoggingService {
  private supabase = createClient();
  private logBuffer: LogEntry[] = [];
  private bufferSize = 50;
  private flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startBufferFlush();
    
    // Only add client-side event listeners on the client
    if (typeof window !== 'undefined') {
      // Flush logs before page unload
      window.addEventListener('beforeunload', () => {
        this.flushBuffer();
      });

      // Flush logs when page becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushBuffer();
        }
      });
    }
  }

  private startBufferFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  private generateFingerprint(level: LogLevel, message: string, stackTrace?: string): string {
    const content = stackTrace ? `${message}:${stackTrace.split('\n')[0]}` : message;
    // Simple hash function for fingerprinting
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${level}:${Math.abs(hash).toString(36)}`;
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const source = typeof window !== 'undefined' ? 'client' : 'server';
    const environment = process.env.NODE_ENV || 'development';
    const fingerprint = this.generateFingerprint(level, message, stackTrace);

    // Extract user and session info from context or browser
    let userId: string | undefined;
    let sessionId: string | undefined;
    let requestId: string | undefined;

    if (context) {
      userId = context.userId || context.user_id;
      sessionId = context.sessionId || context.session_id;
      requestId = context.requestId || context.request_id;
    }

    // Try to get session info from localStorage on client
    if (typeof window !== 'undefined' && !sessionId) {
      try {
        const sessionData = localStorage.getItem('supabase.auth.token');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          sessionId = parsed?.access_token?.substring(0, 8) || 'unknown';
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    return {
      timestamp,
      level,
      category,
      message,
      context,
      user_id: userId,
      session_id: sessionId,
      request_id: requestId,
      source,
      stack_trace: stackTrace,
      fingerprint,
      environment,
      tags: context?.tags
    };
  }

  // Core logging methods
  debug(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  info(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  warn(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  error(category: LogCategory, message: string, context?: Record<string, any>, error?: Error): void {
    const stackTrace = error?.stack || new Error().stack;
    this.log(LogLevel.ERROR, category, message, context, stackTrace);
  }

  fatal(category: LogCategory, message: string, context?: Record<string, any>, error?: Error): void {
    const stackTrace = error?.stack || new Error().stack;
    this.log(LogLevel.FATAL, category, message, context, stackTrace);
  }

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string
  ): void {
    const logEntry = this.createLogEntry(level, category, message, context, stackTrace);

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === LogLevel.ERROR || level === LogLevel.FATAL ? 'error' :
                           level === LogLevel.WARN ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] [${category}] ${message}`, context || '');
      if (stackTrace) {
        console.error(stackTrace);
      }
    }

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry);

    // Force flush for fatal errors
    if (level === LogLevel.FATAL) {
      this.flushBuffer();
    }

    // Force flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await this.supabase
        .from('system_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush logs to database:', error);
        // Re-add logs to buffer if insert failed
        this.logBuffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
      // Re-add logs to buffer if insert failed
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  // Querying and analytics methods
  async getLogs(filter: LogFilter = {}, limit: number = 100, offset: number = 0): Promise<LogEntry[]> {
    try {
      let query = this.supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filter.level && filter.level.length > 0) {
        query = query.in('level', filter.level);
      }

      if (filter.category && filter.category.length > 0) {
        query = query.in('category', filter.category);
      }

      if (filter.startDate) {
        query = query.gte('timestamp', filter.startDate.toISOString());
      }

      if (filter.endDate) {
        query = query.lte('timestamp', filter.endDate.toISOString());
      }

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.sessionId) {
        query = query.eq('session_id', filter.sessionId);
      }

      if (filter.source) {
        query = query.eq('source', filter.source);
      }

      if (filter.search) {
        query = query.ilike('message', `%${filter.search}%`);
      }

      const { data, error } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  }

  async getLogMetrics(filter: LogFilter = {}): Promise<LogMetrics> {
    try {
      const logs = await this.getLogs(filter, 10000); // Get larger sample for metrics

      const totalLogs = logs.length;
      const errorCount = logs.filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.FATAL).length;
      const warnCount = logs.filter(log => log.level === LogLevel.WARN).length;

      // Calculate top errors by fingerprint
      const errorGroups = new Map<string, { message: string; count: number; lastOccurrence: string }>();
      logs
        .filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.FATAL)
        .forEach(log => {
          const key = log.fingerprint || log.message;
          const existing = errorGroups.get(key);
          if (existing) {
            existing.count++;
            if (log.timestamp > existing.lastOccurrence) {
              existing.lastOccurrence = log.timestamp;
            }
          } else {
            errorGroups.set(key, {
              message: log.message,
              count: 1,
              lastOccurrence: log.timestamp
            });
          }
        });

      const topErrors = Array.from(errorGroups.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Categories breakdown
      const categoriesBreakdown: Record<LogCategory, number> = {} as Record<LogCategory, number>;
      Object.values(LogCategory).forEach(category => {
        categoriesBreakdown[category] = logs.filter(log => log.category === category).length;
      });

      // Hourly distribution for last 24 hours
      const now = new Date();
      const hourlyDistribution: Array<{ hour: string; count: number }> = [];
      
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStart = new Date(hour);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        const count = logs.filter(log => {
          const logTime = new Date(log.timestamp);
          return logTime >= hourStart && logTime < hourEnd;
        }).length;

        hourlyDistribution.push({
          hour: hourStart.toISOString(),
          count
        });
      }

      return {
        totalLogs,
        errorCount,
        warnCount,
        topErrors,
        categoriesBreakdown,
        hourlyDistribution
      };
    } catch (error) {
      console.error('Error calculating log metrics:', error);
      throw error;
    }
  }

  async clearOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await this.supabase
        .from('system_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) throw error;

      this.info(LogCategory.SYSTEM, `Cleared logs older than ${daysToKeep} days`, {
        cutoffDate: cutoffDate.toISOString()
      });
    } catch (error) {
      this.error(LogCategory.SYSTEM, 'Failed to clear old logs', { error: error.message }, error as Error);
      throw error;
    }
  }

  // Utility methods for structured logging
  logUserAction(action: string, context?: Record<string, any>): void {
    this.info(LogCategory.USER_ACTION, action, context);
  }

  logAPICall(method: string, endpoint: string, statusCode?: number, duration?: number, context?: Record<string, any>): void {
    const level = statusCode && statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `${method} ${endpoint} - ${statusCode || 'Unknown'}`;
    
    this.log(level, LogCategory.API, message, {
      method,
      endpoint,
      statusCode,
      duration,
      ...context
    });
  }

  logDatabaseQuery(query: string, duration?: number, error?: Error, context?: Record<string, any>): void {
    const level = error ? LogLevel.ERROR : LogLevel.DEBUG;
    const message = error ? `Database query failed: ${query}` : `Database query executed: ${query}`;
    
    this.log(level, LogCategory.DATABASE, message, {
      query,
      duration,
      error: error?.message,
      ...context
    }, error?.stack);
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context?: Record<string, any>): void {
    this.info(LogCategory.PERFORMANCE, `Performance metric: ${metric}`, {
      metric,
      value,
      unit,
      ...context
    });
  }

  // Cleanup on service destruction
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer();
  }
}

// Export singleton instance
export const loggingService = new LoggingService();
export default loggingService;