import { ErrorInfo, ReactNode } from 'react';

export type ErrorLevel = 'global' | 'page' | 'section' | 'component';

export type ErrorType = 
  | 'network' 
  | 'chunk-load' 
  | 'permission' 
  | 'validation' 
  | 'timeout' 
  | 'component' 
  | 'unknown';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showErrorDetails?: boolean;
  isolate?: boolean; // Whether to isolate this boundary from parent boundaries
  resetKeys?: Array<string | number>; // Keys that will reset the error boundary when changed
  resetOnPropsChange?: boolean;
  level?: ErrorLevel;
  enableRecovery?: boolean;
  customActions?: ErrorAction[];
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  eventId: string | null;
  errorType: ErrorType;
  retryCount: number;
  isRecovering: boolean;
  maxRetriesReached?: boolean;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  resetError: () => void;
  retry?: () => void;
  errorId?: string | null;
  errorType?: ErrorType;
  retryCount?: number;
  maxRetries?: number;
  isRecovering?: boolean;
  maxRetriesReached?: boolean;
  showDetails?: boolean;
  level?: ErrorLevel;
  customActions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: () => void | Promise<void>;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
}

export interface ErrorRecoveryStrategy {
  type: ErrorType;
  canRecover: (error: Error) => boolean;
  recover: (error: Error) => Promise<boolean>;
  maxAttempts?: number;
}

export interface ErrorBoundaryContextValue {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  errorType: ErrorType;
  resetError: () => void;
  retry: () => void;
  retryCount: number;
  maxRetries: number;
  isRecovering: boolean;
  maxRetriesReached: boolean;
  showDetails: boolean;
  level: ErrorLevel;
}