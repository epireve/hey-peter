/**
 * Type-Safe API Endpoint Definitions
 * 
 * This file defines all available API endpoints with their corresponding
 * request and response types, providing compile-time type safety
 * and autocomplete support.
 */

import { ApiClient } from './client';
import type {
  // Authentication
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

  // User Management
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetUsersParams,
  GetUsersResponse,
  GetUserResponse,

  // Booking Management
  CreateBookingRequest,
  CreateBookingResponse,
  UpdateBookingRequest,
  UpdateBookingResponse,
  GetBookingsParams,
  GetBookingsResponse,
  GetBookingResponse,
  BookingAvailabilityParams,
  BookingAvailabilityResponse,

  // Lesson Management
  CreateLessonRequest,
  CreateLessonResponse,
  UpdateLessonRequest,
  UpdateLessonResponse,
  GetLessonsParams,
  GetLessonsResponse,
  GetLessonResponse,

  // Subject Management
  CreateSubjectRequest,
  CreateSubjectResponse,
  UpdateSubjectRequest,
  UpdateSubjectResponse,
  GetSubjectsParams,
  GetSubjectsResponse,
  GetSubjectResponse,

  // Progress & Analytics
  GetStudentProgressParams,
  GetStudentProgressResponse,
  GetTeacherAnalyticsParams,
  GetTeacherAnalyticsResponse,
  GetAdminDashboardResponse,

  // Availability Management
  CreateAvailabilityRequest,
  CreateAvailabilityResponse,
  UpdateAvailabilityRequest,
  UpdateAvailabilityResponse,
  GetAvailabilityParams,
  GetAvailabilityResponse,

  // File Management
  FileUploadRequest,
  FileUploadResponse,
  GetFileResponse,

  // Notifications
  CreateNotificationRequest,
  CreateNotificationResponse,
  GetNotificationsParams,
  GetNotificationsResponse,

  // Search
  GlobalSearchParams,
  GlobalSearchResponse,

  // Webhook
  WebhookEvent,
  WebhookResponse,

  // Generic
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// =============================================================================
// Endpoint Configuration Types
// =============================================================================

interface EndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  requiresAuth?: boolean;
  cache?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
}

interface TypedEndpoint<TRequest = any, TResponse = any> extends EndpointConfig {
  _requestType?: TRequest;
  _responseType?: TResponse;
}

// =============================================================================
// API Endpoints Definition
// =============================================================================

export const API_ENDPOINTS = {
  // =============================================================================
  // Authentication Endpoints
  // =============================================================================
  auth: {
    login: {
      method: 'POST',
      path: '/auth/login',
      requiresAuth: false,
      cache: false,
    } as TypedEndpoint<LoginRequest, LoginResponse>,

    signup: {
      method: 'POST',
      path: '/auth/signup',
      requiresAuth: false,
      cache: false,
    } as TypedEndpoint<SignupRequest, SignupResponse>,

    logout: {
      method: 'POST',
      path: '/auth/logout',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,

    refresh: {
      method: 'POST',
      path: '/auth/refresh',
      requiresAuth: false,
      cache: false,
    } as TypedEndpoint<RefreshTokenRequest, RefreshTokenResponse>,

    resetPassword: {
      method: 'POST',
      path: '/auth/reset-password',
      requiresAuth: false,
      cache: false,
    } as TypedEndpoint<ResetPasswordRequest, ResetPasswordResponse>,

    changePassword: {
      method: 'POST',
      path: '/auth/change-password',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<ChangePasswordRequest, ChangePasswordResponse>,

    me: {
      method: 'GET',
      path: '/auth/me',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000, // 5 minutes
    } as TypedEndpoint<void, GetUserResponse>,
  },

  // =============================================================================
  // User Management Endpoints
  // =============================================================================
  users: {
    list: {
      method: 'GET',
      path: '/users',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<GetUsersParams, GetUsersResponse>,

    get: {
      method: 'GET',
      path: '/users/{id}',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<void, GetUserResponse>,

    create: {
      method: 'POST',
      path: '/users',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<CreateUserRequest, CreateUserResponse>,

    update: {
      method: 'PUT',
      path: '/users/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<UpdateUserRequest, UpdateUserResponse>,

    delete: {
      method: 'DELETE',
      path: '/users/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,
  },

  // =============================================================================
  // Booking Management Endpoints
  // =============================================================================
  bookings: {
    list: {
      method: 'GET',
      path: '/bookings',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 60000, // 1 minute
    } as TypedEndpoint<GetBookingsParams, GetBookingsResponse>,

    get: {
      method: 'GET',
      path: '/bookings/{id}',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 60000,
    } as TypedEndpoint<void, GetBookingResponse>,

    create: {
      method: 'POST',
      path: '/bookings',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<CreateBookingRequest, CreateBookingResponse>,

    update: {
      method: 'PUT',
      path: '/bookings/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<UpdateBookingRequest, UpdateBookingResponse>,

    cancel: {
      method: 'DELETE',
      path: '/bookings/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,

    availability: {
      method: 'GET',
      path: '/bookings/availability',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<BookingAvailabilityParams, BookingAvailabilityResponse>,
  },

  // =============================================================================
  // Lesson Management Endpoints
  // =============================================================================
  lessons: {
    list: {
      method: 'GET',
      path: '/lessons',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<GetLessonsParams, GetLessonsResponse>,

    get: {
      method: 'GET',
      path: '/lessons/{id}',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<void, GetLessonResponse>,

    create: {
      method: 'POST',
      path: '/lessons',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<CreateLessonRequest, CreateLessonResponse>,

    update: {
      method: 'PUT',
      path: '/lessons/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<UpdateLessonRequest, UpdateLessonResponse>,

    delete: {
      method: 'DELETE',
      path: '/lessons/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,
  },

  // =============================================================================
  // Subject Management Endpoints
  // =============================================================================
  subjects: {
    list: {
      method: 'GET',
      path: '/subjects',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 600000, // 10 minutes
    } as TypedEndpoint<GetSubjectsParams, GetSubjectsResponse>,

    get: {
      method: 'GET',
      path: '/subjects/{id}',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 600000,
    } as TypedEndpoint<void, GetSubjectResponse>,

    create: {
      method: 'POST',
      path: '/subjects',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<CreateSubjectRequest, CreateSubjectResponse>,

    update: {
      method: 'PUT',
      path: '/subjects/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<UpdateSubjectRequest, UpdateSubjectResponse>,

    delete: {
      method: 'DELETE',
      path: '/subjects/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,
  },

  // =============================================================================
  // Progress & Analytics Endpoints
  // =============================================================================
  analytics: {
    studentProgress: {
      method: 'GET',
      path: '/analytics/student-progress',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<GetStudentProgressParams, GetStudentProgressResponse>,

    teacherAnalytics: {
      method: 'GET',
      path: '/analytics/teacher',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<GetTeacherAnalyticsParams, GetTeacherAnalyticsResponse>,

    adminDashboard: {
      method: 'GET',
      path: '/analytics/admin-dashboard',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 60000,
    } as TypedEndpoint<void, GetAdminDashboardResponse>,
  },

  // =============================================================================
  // Availability Management Endpoints
  // =============================================================================
  availability: {
    get: {
      method: 'GET',
      path: '/availability',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<GetAvailabilityParams, GetAvailabilityResponse>,

    create: {
      method: 'POST',
      path: '/availability',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<CreateAvailabilityRequest, CreateAvailabilityResponse>,

    update: {
      method: 'PUT',
      path: '/availability/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<UpdateAvailabilityRequest, UpdateAvailabilityResponse>,

    delete: {
      method: 'DELETE',
      path: '/availability/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,
  },

  // =============================================================================
  // File Management Endpoints
  // =============================================================================
  files: {
    upload: {
      method: 'POST',
      path: '/files/upload',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<FileUploadRequest, FileUploadResponse>,

    get: {
      method: 'GET',
      path: '/files/{id}',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 3600000, // 1 hour
    } as TypedEndpoint<void, GetFileResponse>,

    delete: {
      method: 'DELETE',
      path: '/files/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,
  },

  // =============================================================================
  // Notification Endpoints
  // =============================================================================
  notifications: {
    list: {
      method: 'GET',
      path: '/notifications',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 60000,
    } as TypedEndpoint<GetNotificationsParams, GetNotificationsResponse>,

    create: {
      method: 'POST',
      path: '/notifications',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<CreateNotificationRequest, CreateNotificationResponse>,

    markAsRead: {
      method: 'PATCH',
      path: '/notifications/{id}/read',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,

    delete: {
      method: 'DELETE',
      path: '/notifications/{id}',
      requiresAuth: true,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<void>>,
  },

  // =============================================================================
  // Search Endpoints
  // =============================================================================
  search: {
    global: {
      method: 'GET',
      path: '/search',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 300000,
    } as TypedEndpoint<GlobalSearchParams, GlobalSearchResponse>,
  },

  // =============================================================================
  // Webhook Endpoints
  // =============================================================================
  webhooks: {
    handle: {
      method: 'POST',
      path: '/webhooks/{provider}',
      requiresAuth: false,
      cache: false,
    } as TypedEndpoint<WebhookEvent, WebhookResponse>,
  },

  // =============================================================================
  // Health Check Endpoint
  // =============================================================================
  health: {
    check: {
      method: 'GET',
      path: '/health',
      requiresAuth: false,
      cache: false,
    } as TypedEndpoint<void, ApiResponse<{ status: string; timestamp: string }>>,
  },

  // =============================================================================
  // Metrics Endpoint
  // =============================================================================
  metrics: {
    get: {
      method: 'GET',
      path: '/metrics',
      requiresAuth: true,
      cache: true,
      cacheTimeout: 60000,
    } as TypedEndpoint<void, ApiResponse<Record<string, any>>>,
  },
} as const;

// =============================================================================
// Helper Types for Endpoint Inference
// =============================================================================

// Extract request type from endpoint
export type EndpointRequest<T> = T extends TypedEndpoint<infer R, any> ? R : never;

// Extract response type from endpoint
export type EndpointResponse<T> = T extends TypedEndpoint<any, infer R> ? R : never;

// Get all endpoint paths
export type EndpointPaths = typeof API_ENDPOINTS;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Replace path parameters in endpoint URL
 */
export function replacePath(path: string, params: Record<string, string | number>): string {
  return path.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing required path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Get endpoint configuration by key path
 */
export function getEndpoint(path: string): EndpointConfig | undefined {
  const parts = path.split('.');
  let current: any = API_ENDPOINTS;
  
  for (const part of parts) {
    current = current[part];
    if (!current) {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Validate endpoint configuration
 */
export function validateEndpoint(config: EndpointConfig): boolean {
  return !!(
    config.method &&
    config.path &&
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)
  );
}

// =============================================================================
// Type Guards
// =============================================================================

export function isTypedEndpoint(obj: any): obj is TypedEndpoint {
  return (
    obj &&
    typeof obj === 'object' &&
    'method' in obj &&
    'path' in obj &&
    typeof obj.method === 'string' &&
    typeof obj.path === 'string'
  );
}

// =============================================================================
// Endpoint Categories
// =============================================================================

export const ENDPOINT_CATEGORIES = {
  AUTH: 'auth',
  USERS: 'users',
  BOOKINGS: 'bookings',
  LESSONS: 'lessons',
  SUBJECTS: 'subjects',
  ANALYTICS: 'analytics',
  AVAILABILITY: 'availability',
  FILES: 'files',
  NOTIFICATIONS: 'notifications',
  SEARCH: 'search',
  WEBHOOKS: 'webhooks',
  HEALTH: 'health',
  METRICS: 'metrics',
} as const;

export type EndpointCategory = typeof ENDPOINT_CATEGORIES[keyof typeof ENDPOINT_CATEGORIES];

/**
 * Get all endpoints for a specific category
 */
export function getEndpointsByCategory(category: EndpointCategory): Record<string, EndpointConfig> {
  return API_ENDPOINTS[category] || {};
}

/**
 * Get all endpoints that require authentication
 */
export function getAuthenticatedEndpoints(): EndpointConfig[] {
  const endpoints: EndpointConfig[] = [];
  
  Object.values(API_ENDPOINTS).forEach(categoryEndpoints => {
    Object.values(categoryEndpoints).forEach(endpoint => {
      if (endpoint.requiresAuth) {
        endpoints.push(endpoint);
      }
    });
  });
  
  return endpoints;
}

/**
 * Get all endpoints that support caching
 */
export function getCacheableEndpoints(): EndpointConfig[] {
  const endpoints: EndpointConfig[] = [];
  
  Object.values(API_ENDPOINTS).forEach(categoryEndpoints => {
    Object.values(categoryEndpoints).forEach(endpoint => {
      if (endpoint.cache) {
        endpoints.push(endpoint);
      }
    });
  });
  
  return endpoints;
}