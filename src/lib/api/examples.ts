/**
 * API Client Usage Examples
 * 
 * This file provides comprehensive examples of how to use the API client
 * in different scenarios and environments.
 */

import { 
  apiClient, 
  apiService, 
  auth, 
  users, 
  bookings, 
  createApiService,
  createConfiguredApiClient,
  initializeApiClient,
  ENV,
  devUtils,
  performanceUtils,
  migrationUtils,
  useAuth,
  useUsers,
} from './index';

// =============================================================================
// Basic Usage Examples
// =============================================================================

/**
 * Example 1: Basic Authentication
 */
async function basicAuthExample() {
  try {
    // Login
    const loginResult = await auth.login({
      email: 'user@example.com',
      password: 'password123'
    });

    if (loginResult.success) {
      console.log('Login successful:', loginResult.data?.user);
      
      // Get current user profile
      const userProfile = await auth.getCurrentUser();
      console.log('User profile:', userProfile.data?.profile);
    }
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

/**
 * Example 2: User Management
 */
async function userManagementExample() {
  try {
    // Get users with pagination
    const usersResult = await users.getUsers({
      page: 1,
      limit: 10,
      role: 'student',
      status: 'active'
    });

    if (usersResult.success) {
      console.log('Users:', usersResult.data);
      console.log('Pagination:', usersResult.pagination);
    }

    // Create a new user
    const newUser = await users.createUser({
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      role: 'student',
      sendInvite: true
    });

    if (newUser.success) {
      console.log('New user created:', newUser.data?.user);
    }

    // Update user
    const updatedUser = await users.updateUser('user-id', {
      firstName: 'Updated',
      preferences: {
        theme: 'dark',
        language: 'en'
      }
    });

    console.log('User updated:', updatedUser.data?.profile);

  } catch (error) {
    console.error('User management error:', error);
  }
}

/**
 * Example 3: Booking Management
 */
async function bookingManagementExample() {
  try {
    // Check availability first
    const availability = await bookings.checkAvailability({
      teacherId: 'teacher-id',
      subjectId: 'subject-id',
      date: '2023-12-01',
      duration: 60
    });

    if (availability.success && availability.data?.availableSlots.length > 0) {
      const slot = availability.data.availableSlots[0];
      
      // Create booking
      const booking = await bookings.createBooking({
        studentId: 'student-id',
        teacherId: 'teacher-id',
        subjectId: 'subject-id',
        timeSlotId: slot.timeSlotId,
        date: '2023-12-01',
        duration: 60,
        type: 'individual',
        notes: 'First lesson'
      });

      if (booking.success) {
        console.log('Booking created:', booking.data?.booking);
        console.log('Confirmation code:', booking.data?.confirmationCode);
      }
    }

    // Get user's bookings
    const userBookings = await bookings.getBookings({
      studentId: 'student-id',
      dateFrom: '2023-12-01',
      dateTo: '2023-12-31'
    });

    console.log('User bookings:', userBookings.data);

  } catch (error) {
    console.error('Booking management error:', error);
  }
}

// =============================================================================
// Advanced Usage Examples
// =============================================================================

/**
 * Example 4: Custom API Client Configuration
 */
async function customClientExample() {
  // Create a custom client for a specific environment
  const customClient = createConfiguredApiClient(ENV.STAGING);
  const customService = createApiService(customClient);

  try {
    const result = await customService.system.healthCheck();
    console.log('Health check:', result.data);
  } catch (error) {
    console.error('Custom client error:', error);
  }
}

/**
 * Example 5: Request Interceptors
 */
async function requestInterceptorExample() {
  // Add custom request interceptor
  apiClient.setConfig({
    interceptors: {
      request: [
        (config) => {
          // Add custom header to all requests
          return {
            ...config,
            headers: {
              ...config.headers,
              'X-Custom-Header': 'my-custom-value'
            }
          };
        }
      ]
    }
  });

  // Make request with custom header
  const result = await users.getUsers({ page: 1, limit: 5 });
  console.log('Request with custom header:', result.data);
}

/**
 * Example 6: Error Handling
 */
async function errorHandlingExample() {
  try {
    await auth.login({
      email: 'invalid@example.com',
      password: 'wrong-password'
    });
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') {
      console.log('Invalid credentials');
    } else if (error.code === 'VALIDATION_ERROR') {
      console.log('Validation errors:', error.details.validationErrors);
    } else {
      console.log('Unexpected error:', error.message);
    }
  }
}

/**
 * Example 7: File Upload
 */
async function fileUploadExample() {
  try {
    // Assuming we have a file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (file) {
      const uploadResult = await apiService.files.uploadFile({
        file,
        userId: 'user-id',
        type: 'avatar'
      });

      if (uploadResult.success) {
        console.log('File uploaded:', uploadResult.data?.fileUrl);
      }
    }
  } catch (error) {
    console.error('File upload error:', error);
  }
}

/**
 * Example 8: Search
 */
async function searchExample() {
  try {
    const searchResults = await apiService.search.search({
      query: 'mathematics',
      limit: 10,
      scope: ['users', 'classes']
    });

    if (searchResults.success) {
      console.log('Search results:', searchResults.data?.results);
    }
  } catch (error) {
    console.error('Search error:', error);
  }
}

/**
 * Example 9: Analytics
 */
async function analyticsExample() {
  try {
    // Get student progress
    const studentProgress = await apiService.analytics.getStudentProgress({
      studentId: 'student-id',
      dateFrom: '2023-01-01',
      dateTo: '2023-12-31'
    });

    if (studentProgress.success) {
      console.log('Student progress:', studentProgress.data?.summary);
    }

    // Get teacher analytics
    const teacherAnalytics = await apiService.analytics.getTeacherAnalytics({
      teacherId: 'teacher-id',
      dateFrom: '2023-01-01',
      dateTo: '2023-12-31'
    });

    if (teacherAnalytics.success) {
      console.log('Teacher stats:', teacherAnalytics.data?.stats);
    }

    // Get admin dashboard
    const adminDashboard = await apiService.analytics.getAdminDashboard();
    if (adminDashboard.success) {
      console.log('Admin dashboard:', adminDashboard.data?.summary);
    }

  } catch (error) {
    console.error('Analytics error:', error);
  }
}

// =============================================================================
// React Integration Examples
// =============================================================================

/**
 * Example 10: React Component with API Hooks
 */
function ReactComponentExample() {
  // Note: This is TypeScript/pseudo-code for demonstration
  const authService = useAuth();
  const userService = useUsers();

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await authService.login({ email, password });
      if (result.success) {
        // Handle successful login
        console.log('Login successful');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleGetUsers = async () => {
    try {
      const result = await userService.getUsers({ page: 1, limit: 10 });
      if (result.success) {
        // Handle users data
        console.log('Users:', result.data);
      }
    } catch (error) {
      console.error('Failed to get users:', error);
    }
  };

  return {
    handleLogin,
    handleGetUsers
  };
}

// =============================================================================
// Performance Monitoring Examples
// =============================================================================

/**
 * Example 11: Performance Monitoring
 */
async function performanceExample() {
  // Measure API call performance
  const { result, duration } = await performanceUtils.measureApiCall(
    () => users.getUsers({ page: 1, limit: 100 }),
    'getUsers'
  );

  console.log(`API call took ${duration}ms`);
  console.log('Result:', result.data);

  // Track usage metrics
  performanceUtils.trackUsage('/users', 'GET', duration, true);
}

/**
 * Example 12: Development Utilities
 */
async function developmentUtilitiesExample() {
  // Get client configuration
  const config = devUtils.getClientConfig();
  console.log('Client config:', config);

  // Get cache statistics
  const cacheStats = devUtils.getCacheStats();
  console.log('Cache stats:', cacheStats);

  // Clear cache
  devUtils.clearCache();

  // Test connectivity
  const connectivity = await devUtils.testConnectivity();
  console.log('Connectivity test:', connectivity);

  // Get feature flags
  const features = devUtils.getFeatureFlags();
  console.log('Feature flags:', features);
}

// =============================================================================
// Migration Examples
// =============================================================================

/**
 * Example 13: Migrating from Supabase
 */
async function supabaseMigrationExample() {
  // Old Supabase way
  // const { data, error } = await supabase.auth.signInWithPassword({
  //   email: 'user@example.com',
  //   password: 'password'
  // });

  // New API service way
  const result = await migrationUtils.auth.signIn('user@example.com', 'password');
  if (result.success) {
    console.log('Migration successful:', result.data);
  }

  // Old Supabase data query
  // const { data: users } = await supabase.from('users').select('*');

  // New API service way
  const usersResult = await migrationUtils.data.select('users');
  if (usersResult?.success) {
    console.log('Users data:', usersResult.data);
  }
}

// =============================================================================
// Environment-Specific Examples
// =============================================================================

/**
 * Example 14: Environment Configuration
 */
async function environmentExample() {
  // Initialize for development
  initializeApiClient(ENV.DEVELOPMENT);

  // Test in development mode
  const devResult = await apiService.system.healthCheck();
  console.log('Development health check:', devResult.data);

  // Initialize for production
  initializeApiClient(ENV.PRODUCTION);

  // Test in production mode
  const prodResult = await apiService.system.healthCheck();
  console.log('Production health check:', prodResult.data);
}

/**
 * Example 15: Caching Examples
 */
async function cachingExample() {
  // First request - will hit the server
  const firstResult = await users.getUsers({ page: 1, limit: 10 });
  console.log('First request:', firstResult.data);

  // Second request - will be served from cache
  const secondResult = await users.getUsers({ page: 1, limit: 10 });
  console.log('Second request (cached):', secondResult.data);

  // Force bypass cache
  const freshResult = await apiClient.get('/users', { page: 1, limit: 10 }, { enableCache: false });
  console.log('Fresh request:', freshResult.data);

  // Clear cache
  apiClient.clearCache();
}

/**
 * Example 16: Request Cancellation
 */
async function requestCancellationExample() {
  // Create abort controller
  const abortController = new AbortController();

  // Start a request
  const requestPromise = apiClient.get('/users', {}, { signal: abortController.signal });

  // Cancel the request after 1 second
  setTimeout(() => {
    abortController.abort();
  }, 1000);

  try {
    const result = await requestPromise;
    console.log('Request completed:', result.data);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request was cancelled');
    } else {
      console.error('Request failed:', error);
    }
  }
}

// =============================================================================
// Export Examples for Testing
// =============================================================================

export const examples = {
  basicAuthExample,
  userManagementExample,
  bookingManagementExample,
  customClientExample,
  requestInterceptorExample,
  errorHandlingExample,
  fileUploadExample,
  searchExample,
  analyticsExample,
  ReactComponentExample,
  performanceExample,
  developmentUtilitiesExample,
  supabaseMigrationExample,
  environmentExample,
  cachingExample,
  requestCancellationExample,
};

// =============================================================================
// Common Patterns and Best Practices
// =============================================================================

/**
 * Best Practice: Always handle errors appropriately
 */
export const bestPractices = {
  errorHandling: async () => {
    try {
      const result = await users.getUsers();
      if (result.success) {
        // Handle success
        return result.data;
      } else {
        // Handle API-level errors
        console.error('API Error:', result.error);
        return null;
      }
    } catch (error) {
      // Handle network/system errors
      console.error('System Error:', error);
      return null;
    }
  },

  pagination: async (page: number = 1, limit: number = 10) => {
    const result = await users.getUsers({ page, limit });
    return {
      data: result.data || [],
      pagination: result.pagination,
      hasMore: result.pagination?.hasNext || false
    };
  },

  formValidation: async (userData: any) => {
    try {
      const result = await users.createUser(userData);
      return { success: true, data: result.data };
    } catch (error: any) {
      if (error.code === 'VALIDATION_ERROR') {
        return { 
          success: false, 
          errors: error.details.validationErrors 
        };
      }
      throw error;
    }
  },

  optimisticUpdates: async (userId: string, updates: any) => {
    // Optimistically update UI first
    console.log('Optimistically updating user:', userId, updates);
    
    try {
      const result = await users.updateUser(userId, updates);
      if (result.success) {
        console.log('Server confirmed update');
        return result.data;
      } else {
        // Revert optimistic update
        console.log('Reverting optimistic update');
        throw new Error('Update failed');
      }
    } catch (error) {
      // Revert optimistic update
      console.log('Reverting optimistic update due to error');
      throw error;
    }
  }
};