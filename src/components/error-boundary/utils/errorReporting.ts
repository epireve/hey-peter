import { errorTrackingService } from '@/lib/services/error-tracking-service';
import { error } from '@/lib/services';
import type { ErrorType } from '../types';

export interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  errorType: ErrorType;
  context?: Record<string, any>;
}

export function generateErrorReport(
  error: Error,
  errorType: ErrorType,
  context?: Record<string, any>
): ErrorReport {
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    errorId,
    message: error.message,
    stack: error.stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    errorType,
    context
  };
}

export function formatErrorForEmail(report: ErrorReport): string {
  return `
Error Report - ${report.errorId}

Time: ${report.timestamp}
Type: ${report.errorType}
URL: ${report.url}
User Agent: ${report.userAgent}

Error Details:
${report.message}

Stack Trace:
${report.stack || 'No stack trace available'}

${report.context ? `Context: ${JSON.stringify(report.context, null, 2)}` : ''}

Please describe what you were doing when this error occurred:
  `.trim();
}

export function formatErrorForClipboard(report: ErrorReport): string {
  return `
Error ID: ${report.errorId}
Time: ${report.timestamp}
Type: ${report.errorType}
URL: ${report.url}
Message: ${report.message}

Stack Trace:
${report.stack || 'No stack trace available'}

User Agent: ${report.userAgent}
${report.context ? `Context: ${JSON.stringify(report.context, null, 2)}` : ''}
  `.trim();
}

export async function sendErrorReport(report: ErrorReport): Promise<boolean> {
  try {
    // Track the error through our error tracking service
    errorTrackingService.captureException(new Error(report.message), {
      tags: ['error-report'],
      extra: {
        errorId: report.errorId,
        errorType: report.errorType,
        context: report.context,
        reportedBy: 'user'
      }
    });

    // You could also send to an external service here
    // await fetch('/api/error-report', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(report)
    // });

    return true;
  } catch (err) {
    error('Failed to send error report:', { error: err });
    return false;
  }
}

export function downloadErrorReport(report: ErrorReport): void {
  const content = formatErrorForClipboard(report);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `error-report-${report.errorId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyErrorToClipboard(report: ErrorReport): Promise<void> {
  const content = formatErrorForClipboard(report);
  return navigator.clipboard.writeText(content);
}

export function emailErrorReport(report: ErrorReport): void {
  const subject = encodeURIComponent(`Error Report - ${report.errorId}`);
  const body = encodeURIComponent(formatErrorForEmail(report));
  window.open(`mailto:support@heypeter.com?subject=${subject}&body=${body}`);
}