/**
 * API Client Library Index
 * 
 * Main entry point for the type-safe API client library
 */

// =============================================================================
// Core Exports
// =============================================================================

export { 
  ApiClient, 
  apiClient,
  type ApiClientConfig,
  type RequestConfig,
  type CacheEntry,
  type RequestInterceptor,
  type ResponseInterceptor,
} from './client';

export {
  API_ENDPOINTS,
  replacePath,
  getEndpoint,
  validateEndpoint,
  isTypedEndpoint,
  getEndpointsByCategory,
  getAuthenticatedEndpoints,
  getCacheableEndpoints,
  ENDPOINT_CATEGORIES,
  type EndpointRequest,
  type EndpointResponse,
  type EndpointPaths,
  type EndpointCategory,
} from './endpoints';

export {
  ApiService,
  apiService,
  AuthService,
  UserService,
  BookingService,
  LessonService,
  SubjectService,
  AnalyticsService,
  AvailabilityService,
  FileService,
  NotificationService,
  SearchService,
  SystemService,
  createApiService,
  useApiService,
  type UseApiServiceOptions,
  // Named service exports
  auth,
  users,
  bookings,
  lessons,
  subjects,
  analytics,
  availability,
  files,
  notifications,
  search,
  system,
} from './services';

export {
  getApiConfiguration,
  getApiConfig,
  getFeatureFlags,
  getRateLimitConfig,
  getCacheConfig,
  getSecurityConfig,
  getMonitoringConfig,
  validateConfiguration,
  getCurrentEnvironment,
  ENV,
  type Environment,
  type FeatureFlags,
  type RateLimitConfig,
  type CacheConfig,
  type SecurityConfig,
  type MonitoringConfig,
  type ApiConfiguration,
} from './config';

// =============================================================================
// Convenience Exports
// =============================================================================

export { requestInterceptors, responseInterceptors } from './client';

// =============================================================================
// Type Re-exports from API Types
// =============================================================================

export type {
  // Generic API Types
  ApiResponse,
  ApiError,
  PaginationParams,
  PaginatedResponse,
  SearchParams,

  // Authentication Types
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,

  // User Management Types
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetUsersParams,
  GetUsersResponse,
  GetUserResponse,
  UserStats,

  // Booking Management Types
  CreateBookingRequest,
  CreateBookingResponse,
  UpdateBookingRequest,
  UpdateBookingResponse,
  GetBookingsParams,
  GetBookingsResponse,
  GetBookingResponse,
  BookingAvailabilityParams,
  BookingAvailabilityResponse,

  // Lesson Management Types
  CreateLessonRequest,
  CreateLessonResponse,
  UpdateLessonRequest,
  UpdateLessonResponse,
  GetLessonsParams,
  GetLessonsResponse,
  GetLessonResponse,

  // Subject Management Types
  CreateSubjectRequest,
  CreateSubjectResponse,
  UpdateSubjectRequest,
  UpdateSubjectResponse,
  GetSubjectsParams,
  GetSubjectsResponse,
  GetSubjectResponse,

  // Progress & Analytics Types
  GetStudentProgressParams,
  GetStudentProgressResponse,
  GetTeacherAnalyticsParams,
  GetTeacherAnalyticsResponse,
  GetAdminDashboardResponse,

  // Availability Management Types
  CreateAvailabilityRequest,
  CreateAvailabilityResponse,
  UpdateAvailabilityRequest,
  UpdateAvailabilityResponse,
  GetAvailabilityParams,
  GetAvailabilityResponse,

  // File Management Types
  FileUploadRequest,
  FileUploadResponse,
  GetFileResponse,

  // Notification Types
  CreateNotificationRequest,
  CreateNotificationResponse,
  GetNotificationsParams,
  GetNotificationsResponse,

  // Search Types
  GlobalSearchParams,
  GlobalSearchResponse,

  // Webhook Types
  WebhookEvent,
  WebhookResponse,
} from '@/types/api';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a configured API client instance
 */
export function createConfiguredApiClient(environment?: Environment): ApiClient {
  const config = getApiConfiguration(environment);
  return new ApiClient(config.client);
}

/**
 * Create API service with custom configuration
 */
export function createConfiguredApiService(environment?: Environment): ApiService {
  const client = createConfiguredApiClient(environment);
  return new ApiService(client);
}

/**
 * Initialize API client with environment-specific configuration
 */
export function initializeApiClient(environment?: Environment): void {
  const config = getApiConfiguration(environment);
  
  // Validate configuration
  if (!validateConfiguration(config)) {
    throw new Error('Invalid API configuration');
  }

  // Apply configuration to default client
  apiClient.setConfig(config.client);
  
  // Setup interceptors based on feature flags
  if (config.features.enableRequestInterception) {
    apiClient.setConfig({
      interceptors: {
        request: [
          requestInterceptors.addCorrelationId(),
          requestInterceptors.addTimestamp(),
          requestInterceptors.addClientInfo(),
        ],
        response: [
          responseInterceptors.logResponseTime(),
          responseInterceptors.transformErrors(),
        ],
      },
    });
  }
}

// =============================================================================
// Default Initialization
// =============================================================================

// Initialize API client with current environment configuration
if (typeof window !== 'undefined' || process.env.NODE_ENV !== 'test') {
  try {
    initializeApiClient();
  } catch (error) {
    console.error('Failed to initialize API client:', error);
  }
}

// =============================================================================
// Development Utilities
// =============================================================================

export const devUtils = {
  /**
   * Get current API client configuration
   */
  getClientConfig: () => apiClient.getConfig(),

  /**
   * Get cache statistics
   */
  getCacheStats: () => apiClient.getCacheStats(),

  /**
   * Clear API cache
   */
  clearCache: () => apiClient.clearCache(),

  /**
   * Cancel all pending requests
   */
  cancelAllRequests: () => apiClient.cancelAllRequests(),

  /**
   * Get all available endpoints
   */
  getAvailableEndpoints: () => API_ENDPOINTS,

  /**
   * Validate endpoint configuration
   */
  validateEndpointConfig: (endpoint: any) => validateEndpoint(endpoint),

  /**
   * Get feature flags for current environment
   */
  getFeatureFlags: () => getFeatureFlags(),

  /**
   * Test API connectivity
   */
  testConnectivity: async () => {
    try {
      await system.healthCheck();
      return { status: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'disconnected', error: error.message, timestamp: new Date().toISOString() };
    }
  },
};

// =============================================================================
// React Integration Utilities
// =============================================================================

/**
 * Create a React hook for API service with error boundaries
 */
export function createApiHook<T extends keyof ApiService>(
  serviceName: T
): () => ApiService[T] {
  return function useApiServiceHook(): ApiService[T] {
    return apiService[serviceName];
  };
}

// Pre-created hooks for common services
export const useAuth = createApiHook('auth');
export const useUsers = createApiHook('users');
export const useBookings = createApiHook('bookings');
export const useLessons = createApiHook('lessons');
export const useSubjects = createApiHook('subjects');
export const useAnalytics = createApiHook('analytics');
export const useAvailability = createApiHook('availability');
export const useFiles = createApiHook('files');
export const useNotifications = createApiHook('notifications');
export const useSearch = createApiHook('search');
export const useSystem = createApiHook('system');

// =============================================================================
// Error Handling Utilities
// =============================================================================

/**
 * Check if error is from API client
 */
export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'code' in error && 'statusCode' in error;
}

/**
 * Extract error message from API response
 */
export function getErrorMessage(error: any): string {
  if (isApiError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!isApiError(error)) {
    return false;
  }
  
  // Retry on server errors and rate limits
  return error.statusCode >= 500 || error.statusCode === 429;
}

// =============================================================================
// Migration Utilities
// =============================================================================

/**
 * Helper to migrate from Supabase direct calls to API service
 */
export const migrationUtils = {
  /**
   * Replace Supabase auth with API auth
   */
  auth: {
    signIn: (email: string, password: string) => 
      auth.login({ email, password }),
    
    signUp: (email: string, password: string, firstName: string, lastName: string) =>
      auth.signup({ email, password, firstName, lastName, role: 'student' }),
    
    signOut: () => auth.logout(),
    
    getUser: () => auth.getCurrentUser(),
  },

  /**
   * Replace Supabase queries with API service calls
   */
  data: {
    select: (table: string, params?: any) => {
      // Map table names to API service methods
      const serviceMap: Record<string, any> = {
        users: users.getUsers,
        bookings: bookings.getBookings,
        lessons: lessons.getLessons,
        subjects: subjects.getSubjects,
      };
      
      const service = serviceMap[table];
      return service ? service(params) : null;
    },
    
    insert: (table: string, data: any) => {
      const serviceMap: Record<string, any> = {
        users: users.createUser,
        bookings: bookings.createBooking,
        lessons: lessons.createLesson,
        subjects: subjects.createSubject,
      };
      
      const service = serviceMap[table];
      return service ? service(data) : null;
    },
    
    update: (table: string, id: string, data: any) => {
      const serviceMap: Record<string, any> = {
        users: users.updateUser,
        bookings: bookings.updateBooking,
        lessons: lessons.updateLesson,
        subjects: subjects.updateSubject,
      };
      
      const service = serviceMap[table];
      return service ? service(id, data) : null;
    },
    
    delete: (table: string, id: string) => {
      const serviceMap: Record<string, any> = {
        users: users.deleteUser,
        bookings: bookings.cancelBooking,
        lessons: lessons.deleteLesson,
        subjects: subjects.deleteSubject,
      };
      
      const service = serviceMap[table];
      return service ? service(id) : null;
    },
  },
};

// =============================================================================
// Performance Monitoring
// =============================================================================

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Measure API call performance
   */
  measureApiCall: async <T>(
    apiCall: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      
      console.log(`API Operation "${operationName}" took ${duration.toFixed(2)}ms`);
      
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`API Operation "${operationName}" failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  /**
   * Track API usage metrics
   */
  trackUsage: (endpoint: string, method: string, duration: number, success: boolean) => {
    // This could be extended to send metrics to an analytics service
    console.log('API Usage:', {
      endpoint,
      method,
      duration,
      success,
      timestamp: new Date().toISOString(),
    });
  },
};