# Global Error Boundary System

A comprehensive error boundary system for React applications with intelligent error classification, recovery mechanisms, and multiple fallback strategies.

## Features

### 🛡️ Multi-Level Error Boundaries
- **Global**: Application-wide error handling
- **Page**: Page-level error containment
- **Section**: Section-level error isolation
- **Component**: Component-level error boundaries

### 🔍 Smart Error Classification
- **Network Errors**: Connection issues, API failures
- **Chunk Load Errors**: Module loading failures (common in SSR/SPA)
- **Permission Errors**: Access denied, authorization issues
- **Validation Errors**: Input validation failures
- **Timeout Errors**: Request timeouts
- **Component Errors**: React component rendering issues

### 🔄 Recovery Mechanisms
- **Automatic Retry**: Configurable retry attempts with exponential backoff
- **Manual Recovery**: User-triggered recovery actions
- **Error Storm Prevention**: Prevents cascading failures
- **Cache Clearing**: Automatic cache clearing for chunk load errors

### 📊 Error Tracking & Analytics
- **Error Deduplication**: Groups similar errors by fingerprint
- **Breadcrumb Tracking**: Detailed error context
- **Performance Monitoring**: Error impact on performance
- **User Session Tracking**: Error correlation with user actions

### 🎨 Adaptive Fallback UI
- **Context-Aware**: Different fallbacks for different error types
- **Development Mode**: Detailed error information for debugging
- **Production Mode**: User-friendly error messages
- **Progressive Enhancement**: Graceful degradation of features

## Installation

The error boundary system is already integrated into the application. Import components as needed:

```typescript
import {
  GlobalErrorBoundary,
  AppErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
  useErrorHandler,
  useAsyncErrorBoundary
} from '@/components/error-boundary';
```

## Usage

### Basic Error Boundary

```tsx
import { ComponentErrorBoundary } from '@/components/error-boundary';

function MyComponent() {
  return (
    <ComponentErrorBoundary>
      <SomeComponentThatMightFail />
    </ComponentErrorBoundary>
  );
}
```

### Error Handler Hook

```tsx
import { useErrorHandler } from '@/components/error-boundary';

function MyComponent() {
  const { handleError, handleAsyncError, isError, error, resetError } = useErrorHandler();

  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (err) {
      handleError(err, {
        showToast: true,
        toastMessage: 'Operation failed',
        context: { operation: 'user-action' }
      });
    }
  };

  const handleAsyncClick = async () => {
    const result = await handleAsyncError(
      riskyAsyncOperation(),
      {
        showToast: true,
        fallbackAction: () => console.log('Fallback executed')
      }
    );
    // result will be null if error occurred
  };

  return (
    <div>
      {isError && (
        <div>
          Error: {error?.message}
          <button onClick={resetError}>Clear Error</button>
        </div>
      )}
      <button onClick={handleClick}>Risky Operation</button>
      <button onClick={handleAsyncClick}>Async Operation</button>
    </div>
  );
}
```

### Async Error Boundary

```tsx
import { useAsyncErrorBoundary } from '@/components/error-boundary';

function AsyncComponent() {
  const { runAsync, throwError } = useAsyncErrorBoundary();

  const handleAsyncOperation = async () => {
    const result = await runAsync(async () => {
      const data = await fetchData();
      return data;
    });
    // If error occurs, it will be caught by the nearest error boundary
  };

  const handleDirectThrow = () => {
    // Throw error that will be caught by error boundary
    throwError(new Error('Something went wrong'));
  };

  return (
    <div>
      <button onClick={handleAsyncOperation}>Fetch Data</button>
      <button onClick={handleDirectThrow}>Throw Error</button>
    </div>
  );
}
```

### Custom Error Boundary

```tsx
import { GlobalErrorBoundary } from '@/components/error-boundary';

function CustomErrorBoundary({ children }) {
  return (
    <GlobalErrorBoundary
      level="section"
      onError={(error, errorInfo) => {
        // Custom error handling logic
        console.error('Section error:', error);
      }}
      onReset={() => {
        // Custom reset logic
        console.log('Section reset');
      }}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      enableRecovery={true}
    >
      {children}
    </GlobalErrorBoundary>
  );
}
```

### HOC Pattern

```tsx
import { withErrorBoundary } from '@/components/error-boundary';

const MyComponent = () => {
  return <div>Component content</div>;
};

export default withErrorBoundary(MyComponent, {
  level: 'component',
  fallback: ({ error, resetError }) => (
    <div>
      Error: {error.message}
      <button onClick={resetError}>Retry</button>
    </div>
  )
});
```

## Error Types & Fallbacks

### Network Errors
- **Detection**: "fetch", "network", "failed to fetch" in error message
- **Fallback**: Network-specific UI with connection status and retry options
- **Recovery**: Automatic retry with exponential backoff, connection checking

### Chunk Load Errors
- **Detection**: "chunk", "loading css chunk", "loading chunk" in error message
- **Fallback**: Update notification with cache clearing options
- **Recovery**: Automatic page reload, cache clearing, service worker reset

### Permission Errors
- **Detection**: "permission", "unauthorized", "forbidden" in error message
- **Fallback**: Permission-specific messaging with login/contact options
- **Recovery**: Redirect to login, contact support

### Component Errors
- **Detection**: React component stack traces
- **Fallback**: Minimal inline error display
- **Recovery**: Component-level reset, props-based recovery

## Configuration

### Global Setup

The error boundary system is automatically configured in the root layout:

```tsx
// app/layout.tsx
import { AppErrorBoundary, ErrorRecoveryProvider } from '@/components/error-boundary';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorRecoveryProvider>
          <AppErrorBoundary>
            {children}
          </AppErrorBoundary>
        </ErrorRecoveryProvider>
      </body>
    </html>
  );
}
```

### Environment Variables

```env
# Development mode enables detailed error information
NODE_ENV=development

# App version for error tracking
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Error Recovery Strategies

### Network Recovery
- Automatic retry with exponential backoff
- Connection status monitoring
- Manual retry options

### Chunk Load Recovery
- Page reload for fresh chunks
- Cache clearing for corrupted caches
- Service worker reset

### Component Recovery
- Props-based reset triggers
- State reset mechanisms
- Parent component notifications

## Integration with Error Tracking

The system integrates with the existing error tracking service:

```typescript
// Automatic error tracking
errorTrackingService.captureException(error, {
  tags: ['react-error-boundary'],
  level: 'error',
  extra: {
    componentStack: errorInfo.componentStack,
    errorType: 'network',
    userAgent: navigator.userAgent
  }
});

// Performance monitoring
errorTrackingService.capturePerformanceIssue(
  'error-boundary-recovery',
  recoveryTime,
  1000 // threshold
);
```

## Testing

### Unit Tests
- Error boundary component behavior
- Error classification logic
- Recovery mechanism testing
- Hook functionality validation

### Integration Tests
- Multi-level error boundary interaction
- Error tracking integration
- Recovery strategy execution
- Fallback UI rendering

### Demo Component
Use the `ErrorBoundaryDemo` component to test different error scenarios:

```tsx
import ErrorBoundaryDemo from '@/components/error-boundary/demo/ErrorBoundaryDemo';

// In your development environment
<ErrorBoundaryDemo />
```

## Best Practices

### 1. Error Boundary Placement
- Place at strategic component boundaries
- Use different levels for different use cases
- Avoid over-nesting error boundaries

### 2. Error Classification
- Customize error detection patterns
- Implement domain-specific error types
- Use context for better error grouping

### 3. Recovery Strategies
- Implement graceful degradation
- Provide meaningful user actions
- Track recovery success rates

### 4. Performance Considerations
- Avoid catching too many errors
- Implement error storm prevention
- Monitor error boundary performance impact

### 5. User Experience
- Show helpful error messages
- Provide clear recovery actions
- Maintain application state when possible

## Development Tools

### Error Boundary Inspector
```tsx
import { useErrorBoundaryContext } from '@/components/error-boundary';

function ErrorBoundaryInspector() {
  const context = useErrorBoundaryContext();
  
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="error-boundary-inspector">
        <h3>Error Boundary State</h3>
        <pre>{JSON.stringify(context, null, 2)}</pre>
      </div>
    );
  }
  
  return null;
}
```

### Error Simulation
```tsx
// For testing purposes
function ErrorSimulator() {
  const { handleError } = useErrorHandler();
  
  const simulateError = (type: string) => {
    const errors = {
      network: new Error('Failed to fetch'),
      chunk: new Error('Loading chunk 1 failed'),
      permission: new Error('Permission denied'),
      timeout: new Error('Request timeout')
    };
    
    handleError(errors[type] || new Error('Unknown error'));
  };
  
  return (
    <div>
      {['network', 'chunk', 'permission', 'timeout'].map(type => (
        <button key={type} onClick={() => simulateError(type)}>
          Simulate {type} error
        </button>
      ))}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Error Boundary Not Catching Errors**
   - Ensure error is thrown during render
   - Check for async errors (use `useAsyncErrorBoundary`)
   - Verify error boundary placement

2. **Infinite Error Loops**
   - Check for errors in error boundary itself
   - Implement error storm prevention
   - Review error boundary nesting

3. **Performance Issues**
   - Monitor error boundary overhead
   - Implement error deduplication
   - Use appropriate error boundary levels

### Debug Mode
```tsx
// Enable debug mode for detailed logging
<GlobalErrorBoundary debug={process.env.NODE_ENV === 'development'}>
  {children}
</GlobalErrorBoundary>
```

## Contributing

When adding new error types or recovery strategies:

1. Update error classification logic
2. Add corresponding fallback component
3. Implement recovery strategy
4. Add tests for new functionality
5. Update documentation

## Migration Guide

### From Legacy Error Handling
1. Replace try-catch blocks with error boundaries where appropriate
2. Use error handler hooks for programmatic error handling
3. Implement proper error classification
4. Add recovery mechanisms

### Version Updates
- Check for breaking changes in error boundary API
- Update error tracking integration
- Review custom error handling code
- Test error boundary behavior after updates