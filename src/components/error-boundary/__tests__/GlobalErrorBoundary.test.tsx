import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the error tracking service first
jest.mock('@/lib/services/error-tracking-service', () => ({
  errorTrackingService: {
    captureException: jest.fn().mockReturnValue('test-error-id'),
    addBreadcrumb: jest.fn()
  }
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the services index to prevent circular dependencies
jest.mock('@/lib/services/index', () => ({}));

// Import after mocking
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import { ErrorRecoveryProvider } from '../ErrorRecoveryProvider';

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = true, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Test component that can be reset
const ResettableComponent = ({ reset }: { reset: boolean }) => {
  return <ErrorThrowingComponent shouldThrow={!reset} />;
};

const renderWithErrorBoundary = (
  children: React.ReactNode,
  props: any = {}
) => {
  return render(
    <ErrorRecoveryProvider>
      <GlobalErrorBoundary {...props}>
        {children}
      </GlobalErrorBoundary>
    </ErrorRecoveryProvider>
  );
};

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there are no errors', () => {
    renderWithErrorBoundary(<div>Test content</div>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches errors and displays fallback UI', () => {
    renderWithErrorBoundary(<ErrorThrowingComponent />);
    
    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something went wrong/)).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="Development error" />,
      { showErrorDetails: true }
    );

    expect(screen.getByText('Technical Details (Development Only)')).toBeInTheDocument();
    expect(screen.getByText('Development error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    renderWithErrorBoundary(
      <ErrorThrowingComponent />,
      { onError }
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('resets error boundary when reset button is clicked', () => {
    const { rerender } = renderWithErrorBoundary(<ResettableComponent reset={false} />);
    
    // Error should be caught
    expect(screen.getByText('Application Error')).toBeInTheDocument();
    
    // Click reset button
    fireEvent.click(screen.getByText('Reset Application'));
    
    // Rerender with reset prop
    rerender(
      <ErrorRecoveryProvider>
        <GlobalErrorBoundary>
          <ResettableComponent reset={true} />
        </GlobalErrorBoundary>
      </ErrorRecoveryProvider>
    );
    
    // Should show the non-error content
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('shows retry functionality', async () => {
    const { rerender } = renderWithErrorBoundary(
      <ResettableComponent reset={false} />,
      { enableRecovery: true }
    );
    
    // Error should be caught
    expect(screen.getByText('Application Error')).toBeInTheDocument();
    
    // Should show retry button
    expect(screen.getByText(/Try Again/)).toBeInTheDocument();
    
    // Click retry
    fireEvent.click(screen.getByText(/Try Again/));
    
    // Wait for retry process
    await waitFor(() => {
      expect(screen.getByText(/Recovering/)).toBeInTheDocument();
    });
  });

  it('handles network errors appropriately', () => {
    const networkError = new Error('Failed to fetch');
    
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="Failed to fetch" />
    );
    
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to our servers/)).toBeInTheDocument();
  });

  it('handles chunk load errors appropriately', () => {
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="Loading chunk 1 failed" />
    );
    
    expect(screen.getByText('Application Update Required')).toBeInTheDocument();
    expect(screen.getByText(/has been updated/)).toBeInTheDocument();
  });

  it('tracks errors with different levels', () => {
    const { errorTrackingService } = require('@/lib/services/error-tracking-service');
    
    renderWithErrorBoundary(
      <ErrorThrowingComponent />,
      { level: 'page' }
    );
    
    expect(errorTrackingService.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: ['react-error-boundary', 'global'],
        level: 'error',
        extra: expect.objectContaining({
          errorBoundaryLevel: 'page'
        })
      })
    );
  });

  it('shows custom fallback component when provided', () => {
    const CustomFallback = ({ error }: { error: Error }) => (
      <div>Custom error: {error.message}</div>
    );
    
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="Custom error message" />,
      { fallback: CustomFallback }
    );
    
    expect(screen.getByText('Custom error: Custom error message')).toBeInTheDocument();
  });

  it('resets on prop changes when resetOnPropsChange is true', () => {
    const { rerender } = renderWithErrorBoundary(
      <ResettableComponent reset={false} />,
      { resetOnPropsChange: true }
    );
    
    // Error should be caught
    expect(screen.getByText('Application Error')).toBeInTheDocument();
    
    // Rerender with different children
    rerender(
      <ErrorRecoveryProvider>
        <GlobalErrorBoundary resetOnPropsChange={true}>
          <ResettableComponent reset={true} />
        </GlobalErrorBoundary>
      </ErrorRecoveryProvider>
    );
    
    // Should show the non-error content
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('prevents too many retries', async () => {
    renderWithErrorBoundary(
      <ErrorThrowingComponent />,
      { enableRecovery: true }
    );
    
    // Error should be caught
    expect(screen.getByText('Application Error')).toBeInTheDocument();
    
    // Click retry multiple times
    const retryButton = screen.getByText(/Try Again/);
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText(/1\/3/)).toBeInTheDocument();
    });
  });

  it('shows error storm prevention', () => {
    // Mock multiple errors in short succession
    const errorBoundary = new GlobalErrorBoundary({
      children: <div>test</div>
    });
    
    // Simulate multiple errors
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'test stack' };
    
    // Add multiple errors to history
    for (let i = 0; i < 6; i++) {
      errorBoundary.componentDidCatch(error, errorInfo);
    }
    
    expect(errorBoundary.state.maxRetriesReached).toBe(true);
  });
});

describe('Error Classification', () => {
  it('classifies network errors correctly', () => {
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="fetch failed" />
    );
    
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('classifies chunk load errors correctly', () => {
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="Loading CSS chunk failed" />
    );
    
    expect(screen.getByText('Application Update Required')).toBeInTheDocument();
  });

  it('classifies permission errors correctly', () => {
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="permission denied" />
    );
    
    expect(screen.getByText('Application Error')).toBeInTheDocument();
  });

  it('classifies timeout errors correctly', () => {
    renderWithErrorBoundary(
      <ErrorThrowingComponent errorMessage="request timeout" />
    );
    
    expect(screen.getByText('Application Error')).toBeInTheDocument();
  });
});