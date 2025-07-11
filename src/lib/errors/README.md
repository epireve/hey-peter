# Centralized Error Handling System

A comprehensive error handling system for Phase 1 of the HeyPeter Academy application. This system provides type-safe error handling, user-friendly messages, automatic recovery strategies, and comprehensive logging.

## Features

- **Custom Error Classes**: Type-safe error classes with proper inheritance
- **Error Utilities**: Serialization, logging, and parsing utilities
- **Global Error Handler**: Captures unhandled errors and promise rejections
- **React Error Context**: Provides error handling throughout the component tree
- **Error Boundaries**: Component-level error handling with different layouts
- **API Error Responses**: Consistent error responses for API routes
- **Error Recovery**: Automatic retry mechanisms and fallback strategies
- **User-Friendly Messages**: Context-aware error messages for users
- **Development vs Production**: Different error displays for different environments

## Quick Start

### 1. Initialize Error Handling

```typescript
import { initializeErrorHandling } from '@/lib/errors';

// Initialize in your app
initializeErrorHandling({
  enableGlobalHandler: true,
  globalHandlerOptions: {
    enableLogging: true,
    enableTracking: true
  }
});
```

### 2. Wrap Your App with Error Provider

```tsx
import { ErrorProvider } from '@/lib/errors';

function App() {
  return (
    <ErrorProvider>
      <YourAppContent />
    </ErrorProvider>
  );
}
```

### 3. Use Error Boundaries

```tsx
import { ErrorBoundary, DashboardErrorBoundary } from '@/lib/errors';

function MyPage() {
  return (
    <ErrorBoundary level="page" context="dashboard">
      <DashboardErrorBoundary>
        <DashboardContent />
      </DashboardErrorBoundary>
    </ErrorBoundary>
  );
}
```

## Error Classes

### Creating Custom Errors

```typescript
import { createError, AppError } from '@/lib/errors';

// Using factory functions (recommended)
const validationError = createError.validation('Invalid email', {
  email: ['Must be a valid email address']
});

const authError = createError.auth('Session expired');
const networkError = createError.network('Connection failed');

// Using classes directly
const customError = new AppError('Custom error message', {
  code: ErrorCode.BUSINESS_RULE_VIOLATION,
  statusCode: 422,
  severity: ErrorSeverity.HIGH
});
```

### Error Types

- **AuthError**: Authentication failures
- **ValidationError**: Input validation errors
- **APIError**: API request failures
- **NetworkError**: Network connectivity issues
- **DatabaseError**: Database operation failures
- **BusinessRuleError**: Business logic violations
- **NotFoundError**: Resource not found
- **RateLimitError**: Rate limiting violations

## React Integration

### Using Error Context

```tsx
import { useError, useErrorHandler } from '@/lib/errors';

function MyComponent() {
  const { captureError } = useError();
  const { handleAsyncOperation } = useErrorHandler();

  const handleSubmit = async (data: FormData) => {
    const result = await handleAsyncOperation(
      async () => {
        const response = await fetch('/api/submit', {
          method: 'POST',
          body: data
        });
        
        if (!response.ok) {
          throw new Error('Submission failed');
        }
        
        return response.json();
      },
      { 
        notify: true, 
        context: { form: 'submission' } 
      }
    );
    
    if (result) {
      // Handle success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
}
```

### Form Error Handling

```tsx
import { useFormErrorHandler } from '@/lib/errors';

function ContactForm() {
  const { handleFormError } = useFormErrorHandler('contact');

  const onSubmit = async (data: FormData) => {
    try {
      await submitForm(data);
    } catch (error) {
      handleFormError(error, {
        email: ['Invalid email format'],
        phone: ['Phone number is required']
      });
    }
  };
}
```

### API Error Handling

```tsx
import { useAPIErrorHandler } from '@/lib/errors';

function useStudentData() {
  const { handleAPIError } = useAPIErrorHandler();

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      return response.json();
    } catch (error) {
      handleAPIError(error, '/api/students', 'GET');
      throw error;
    }
  };

  return { fetchStudents };
}
```

## API Routes

### Basic Error Response

```typescript
import { errorResponse, successResponse } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Your logic here
    const result = await processData(data);
    
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
```

### Type-Safe API Route

```typescript
import { createAPIRoute } from '@/lib/errors';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string(),
  email: z.string().email()
});

const querySchema = z.object({
  page: z.coerce.number().default(1)
});

export const POST = createAPIRoute({
  bodySchema,
  querySchema,
  handler: async ({ body, query }) => {
    // body and query are fully typed
    const user = await createUser(body);
    return { user, pagination: { page: query.page } };
  }
});
```

### Enhanced Middleware

```typescript
import { withErrorHandler } from '@/lib/middleware/enhanced-error-handler';

const handler = withErrorHandler(async (req, context) => {
  // Your route logic
  return NextResponse.json({ success: true });
}, {
  enableLogging: true,
  enableTracking: true,
  trackPerformanceMetrics: true
});

export { handler as GET, handler as POST };
```

## Error Recovery

### Retry with Backoff

```typescript
import { retryWithBackoff } from '@/lib/errors';

const result = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential'
  }
);
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@/lib/errors';

const circuitBreaker = new CircuitBreaker({
  threshold: 5,
  timeout: 60000,
  resetTimeout: 30000
});

const result = await circuitBreaker.execute(async () => {
  return await fetchDataFromAPI();
});
```

### Fallback Strategies

```typescript
import { withFallback } from '@/lib/errors';

const data = await withFallback(
  async () => await fetchFromPrimaryAPI(),
  async () => await fetchFromSecondaryAPI(),
  {
    shouldFallback: (error) => error.code === 'NETWORK_ERROR'
  }
);
```

## Error Boundaries

### Page-Level Error Boundary

```tsx
import { ErrorBoundary } from '@/lib/errors';

function MyPage() {
  return (
    <ErrorBoundary level="page" context="dashboard">
      <PageContent />
    </ErrorBoundary>
  );
}
```

### Section-Level Error Boundary

```tsx
import { ErrorBoundary } from '@/lib/errors';

function Dashboard() {
  return (
    <div>
      <ErrorBoundary level="section" context="analytics">
        <AnalyticsSection />
      </ErrorBoundary>
      
      <ErrorBoundary level="section" context="student-list">
        <StudentListSection />
      </ErrorBoundary>
    </div>
  );
}
```

### Custom Error Fallback

```tsx
import { ErrorBoundary } from '@/lib/errors';

function CustomErrorFallback({ error, resetError }) {
  return (
    <div className="error-fallback">
      <h2>Oops! Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>Try again</button>
    </div>
  );
}

function MyComponent() {
  return (
    <ErrorBoundary fallback={CustomErrorFallback}>
      <Content />
    </ErrorBoundary>
  );
}
```

## User-Friendly Messages

### Context-Aware Messages

```typescript
import { getUserErrorMessage } from '@/lib/errors';

const error = createError.insufficientHours(5, 2);
const message = getUserErrorMessage(error, 'booking');
// Returns: "You need more hours to book this lesson. Purchase a package to continue."
```

### Detailed Error Information

```typescript
import { getDetailedErrorInfo } from '@/lib/errors';

const errorInfo = getDetailedErrorInfo(error);
console.log(errorInfo.message.title); // "Not Enough Hours"
console.log(errorInfo.recovery.suggestion); // "Purchase more hours or choose a shorter session."
```

## Development vs Production

### Development Features

- Detailed error stack traces
- Component stack traces
- Error details in API responses
- Debug information in console

### Production Features

- User-friendly error messages
- Sanitized error responses
- Automatic error reporting
- Performance monitoring

## Configuration

### Environment Variables

```env
# Error handling configuration
NODE_ENV=development|production
NEXT_PUBLIC_APP_VERSION=1.0.0

# Error tracking (if using external service)
SENTRY_DSN=your-sentry-dsn
```

### Global Configuration

```typescript
import { initializeErrorHandling } from '@/lib/errors';

initializeErrorHandling({
  enableGlobalHandler: true,
  globalHandlerOptions: {
    enableLogging: true,
    enableTracking: true,
    enableConsoleOverride: process.env.NODE_ENV === 'production',
    excludePatterns: [
      /ResizeObserver loop limit exceeded/,
      /chrome-extension:/
    ]
  }
});
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// Good
throw createError.validation('Email is required', {
  email: ['This field is required']
});

// Avoid
throw new Error('Validation failed');
```

### 2. Provide Context

```typescript
// Good
captureError(error, {
  context: {
    userId: user.id,
    action: 'booking_creation',
    classId: class.id
  }
});

// Avoid
captureError(error);
```

### 3. Handle Errors at the Right Level

```typescript
// Component-level for UI errors
<ErrorBoundary level="component">
  <StudentForm />
</ErrorBoundary>

// Page-level for critical errors
<ErrorBoundary level="page">
  <Dashboard />
</ErrorBoundary>
```

### 4. Use Recovery Strategies

```typescript
// Automatic retry for transient errors
const result = await retryWithBackoff(operation, {
  shouldRetry: (error) => error.code === 'NETWORK_ERROR'
});

// Fallback for service unavailability
const data = await withFallback(
  primaryOperation,
  fallbackOperation
);
```

## Testing

### Testing Error Scenarios

```typescript
import { devHelpers } from '@/lib/errors';

// In development, test different error types
if (process.env.NODE_ENV === 'development') {
  // Test validation error
  devHelpers.throwTestError('validation');
  
  // Test network error
  devHelpers.throwTestError('network');
  
  // Log error information
  devHelpers.logErrorInfo(error);
}
```

### Testing Error Boundaries

```tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/lib/errors';

function ThrowError() {
  throw new Error('Test error');
}

test('error boundary catches and displays error', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

## Migration Guide

### From Existing Error Handling

1. **Replace existing error classes**:
   ```typescript
   // Old
   throw new Error('Validation failed');
   
   // New
   throw createError.validation('Validation failed', errors);
   ```

2. **Update API routes**:
   ```typescript
   // Old
   return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
   
   // New
   return errorResponse(error);
   ```

3. **Add error boundaries**:
   ```tsx
   // Old
   <ComponentWithoutErrorHandling />
   
   // New
   <ErrorBoundary level="component">
     <ComponentWithErrorHandling />
   </ErrorBoundary>
   ```

This centralized error handling system provides a robust foundation for handling errors throughout the application, with proper typing, user-friendly messages, and automatic recovery strategies.