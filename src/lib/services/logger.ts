/**
 * Centralized Logging Service
 * Provides structured logging with different log levels, metadata support,
 * and environment-aware configuration
 */

// Generate simple correlation ID without external dependency
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Log level names for display
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

// ANSI color codes for terminal output
const LOG_COLORS = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.FATAL]: '\x1b[35m', // Magenta
  RESET: '\x1b[0m',
};

// Log entry structure
export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  error?: Error;
  stack?: string;
  performance?: {
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
}

// Logger configuration
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  enablePerformanceLogging: boolean;
  enableStructuredLogging: boolean;
  correlationIdHeader?: string;
  format: 'json' | 'pretty';
}

// Performance tracking
interface PerformanceTimer {
  startTime: number;
  label: string;
  metadata?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private correlationId: string | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private performanceTimers: Map<string, PerformanceTimer> = new Map();
  private logBuffer: LogEntry[] = [];
  private bufferSize = 100;
  private remoteLogQueue: LogEntry[] = [];
  private isFlushingRemote = false;

  private constructor() {
    this.sessionId = generateId();
    this.config = this.getEnvironmentConfig();
    
    // Set up periodic remote log flushing if enabled
    if (this.config.enableRemote) {
      setInterval(() => this.flushRemoteLogs(), 5000);
    }

    // Handle process termination
    if (typeof process !== 'undefined') {
      process.on('exit', () => this.flush());
      process.on('SIGINT', () => this.flush());
      process.on('SIGTERM', () => this.flush());
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getEnvironmentConfig(): LoggerConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      minLevel: isProduction 
        ? LogLevel.INFO 
        : isTest 
          ? LogLevel.ERROR 
          : LogLevel.DEBUG,
      enableConsole: !isTest,
      enableRemote: isProduction && !!process.env.NEXT_PUBLIC_LOG_ENDPOINT,
      remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
      enablePerformanceLogging: !isProduction,
      enableStructuredLogging: isProduction,
      correlationIdHeader: 'x-correlation-id',
      format: isDevelopment ? 'pretty' : 'json',
    };
  }

  // Configuration methods
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setCorrelationId(correlationId: string | null): void {
    this.correlationId = correlationId;
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  // Core logging methods
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error | Record<string, any>, metadata?: Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, { ...metadata, error: error.message, stack: error.stack });
    } else {
      this.log(LogLevel.ERROR, message, { ...metadata, ...error });
    }
  }

  fatal(message: string, error?: Error | Record<string, any>, metadata?: Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.FATAL, message, { ...metadata, error: error.message, stack: error.stack });
    } else {
      this.log(LogLevel.FATAL, message, { ...metadata, ...error });
    }
    // Fatal errors should trigger immediate flush
    this.flush();
  }

  // Performance logging
  startTimer(label: string, metadata?: Record<string, any>): void {
    if (!this.config.enablePerformanceLogging) return;
    
    this.performanceTimers.set(label, {
      startTime: performance.now(),
      label,
      metadata,
    });
  }

  endTimer(label: string, metadata?: Record<string, any>): void {
    if (!this.config.enablePerformanceLogging) return;
    
    const timer = this.performanceTimers.get(label);
    if (!timer) {
      this.warn(`Timer '${label}' not found`);
      return;
    }

    const duration = performance.now() - timer.startTime;
    this.performanceTimers.delete(label);

    this.info(`Performance: ${label}`, {
      ...timer.metadata,
      ...metadata,
      duration: `${duration.toFixed(2)}ms`,
      performance: {
        duration,
        memoryUsage: typeof process !== 'undefined' ? process.memoryUsage() : undefined,
      },
    });
  }

  // Request/Response logging
  logRequest(method: string, url: string, metadata?: Record<string, any>): void {
    this.info(`${method} ${url}`, {
      type: 'request',
      method,
      url,
      ...metadata,
    });
  }

  logResponse(method: string, url: string, status: number, duration: number, metadata?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `${method} ${url} - ${status}`, {
      type: 'response',
      method,
      url,
      status,
      duration: `${duration.toFixed(2)}ms`,
      ...metadata,
    });
  }

  // Database query logging
  logQuery(query: string, params?: any[], duration?: number): void {
    this.debug('Database Query', {
      type: 'database',
      query: query.substring(0, 1000), // Truncate long queries
      params: params?.length ? `${params.length} parameters` : undefined,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
    });
  }

  // Private logging implementation
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      correlationId: this.correlationId || undefined,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      metadata,
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Remote logging
    if (this.config.enableRemote && level >= LogLevel.WARN) {
      this.remoteLogQueue.push(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (this.config.format === 'json' || this.config.enableStructuredLogging) {
      console.log(JSON.stringify(entry));
    } else {
      const color = LOG_COLORS[entry.level];
      const reset = LOG_COLORS.RESET;
      const levelName = LOG_LEVEL_NAMES[entry.level].padEnd(5);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      
      let output = `${color}[${timestamp}] ${levelName}${reset} ${entry.message}`;
      
      if (entry.correlationId) {
        output += ` ${color}[${entry.correlationId}]${reset}`;
      }
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        output += '\n' + JSON.stringify(entry.metadata, null, 2);
      }
      
      // Use appropriate console method
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(output);
          break;
        case LogLevel.INFO:
          console.info(output);
          break;
        case LogLevel.WARN:
          console.warn(output);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(output);
          break;
      }
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (this.isFlushingRemote || this.remoteLogQueue.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    this.isFlushingRemote = true;
    const logsToSend = [...this.remoteLogQueue];
    this.remoteLogQueue = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          environment: process.env.NODE_ENV,
          service: 'hey-peter-lms',
        }),
      });
    } catch (error) {
      // Put logs back in queue if send failed
      this.remoteLogQueue = [...logsToSend, ...this.remoteLogQueue];
      // Log locally but don't create infinite loop
      if (this.config.enableConsole) {
        console.error('Failed to send logs to remote endpoint:', error);
      }
    } finally {
      this.isFlushingRemote = false;
    }
  }

  // Utility methods
  flush(): void {
    if (this.config.enableRemote) {
      this.flushRemoteLogs();
    }
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  clearLogs(): void {
    this.logBuffer = [];
  }

  // Create child logger with additional context
  child(metadata: Record<string, any>): ChildLogger {
    return new ChildLogger(this, metadata);
  }
}

// Child logger for scoped logging
class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultMetadata: Record<string, any>
  ) {}

  private mergeMetadata(metadata?: Record<string, any>): Record<string, any> {
    return { ...this.defaultMetadata, ...metadata };
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.parent.debug(message, this.mergeMetadata(metadata));
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.parent.info(message, this.mergeMetadata(metadata));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.parent.warn(message, this.mergeMetadata(metadata));
  }

  error(message: string, error?: Error | Record<string, any>, metadata?: Record<string, any>): void {
    this.parent.error(message, error, this.mergeMetadata(metadata));
  }

  fatal(message: string, error?: Error | Record<string, any>, metadata?: Record<string, any>): void {
    this.parent.fatal(message, error, this.mergeMetadata(metadata));
  }

  startTimer(label: string, metadata?: Record<string, any>): void {
    this.parent.startTimer(label, this.mergeMetadata(metadata));
  }

  endTimer(label: string, metadata?: Record<string, any>): void {
    this.parent.endTimer(label, this.mergeMetadata(metadata));
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience methods
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const fatal = logger.fatal.bind(logger);
export const startTimer = logger.startTimer.bind(logger);
export const endTimer = logger.endTimer.bind(logger);

// Middleware for Next.js API routes
export function withLogging(handler: Function) {
  return async (req: any, res: any) => {
    const correlationId = req.headers['x-correlation-id'] || generateId();
    logger.setCorrelationId(correlationId);
    
    const startTime = performance.now();
    logger.logRequest(req.method, req.url, {
      headers: req.headers,
      query: req.query,
    });

    // Intercept response
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = performance.now() - startTime;
      logger.logResponse(req.method, req.url, res.statusCode, duration);
      res.setHeader('x-correlation-id', correlationId);
      return originalSend.call(this, data);
    };

    try {
      return await handler(req, res);
    } catch (error) {
      logger.error('Unhandled API error', error as Error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}

// React hook for component logging
export function useLogger(componentName: string) {
  return logger.child({ component: componentName });
}