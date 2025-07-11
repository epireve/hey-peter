/**
 * Type-Safe API Service Layer
 * 
 * This file provides high-level service methods for all API endpoints
 * with full type safety and consistent error handling.
 */

import { ApiClient, apiClient } from './client';
import { API_ENDPOINTS, replacePath, EndpointRequest, EndpointResponse } from './endpoints';
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
} from '@/types/api';

// =============================================================================
// Authentication Service
// =============================================================================

export class AuthService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse['data']>(
      API_ENDPOINTS.auth.login.path,
      credentials
    );

    if (response.success && response.data) {
      // Store auth tokens
      this.client.setAuthToken(
        response.data.session.access_token,
        response.data.session.refresh_token
      );
    }

    return response as LoginResponse;
  }

  /**
   * Sign up a new user
   */
  async signup(userData: SignupRequest): Promise<SignupResponse> {
    return this.client.post<SignupResponse['data']>(
      API_ENDPOINTS.auth.signup.path,
      userData
    ) as Promise<SignupResponse>;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await this.client.post<void>(API_ENDPOINTS.auth.logout.path);
    
    if (response.success) {
      this.client.clearAuthToken();
    }
    
    return response;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return this.client.post<RefreshTokenResponse['data']>(
      API_ENDPOINTS.auth.refresh.path,
      { refresh_token: refreshToken }
    ) as Promise<RefreshTokenResponse>;
  }

  /**
   * Reset password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.client.post<ResetPasswordResponse['data']>(
      API_ENDPOINTS.auth.resetPassword.path,
      request
    ) as Promise<ResetPasswordResponse>;
  }

  /**
   * Change password
   */
  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return this.client.post<ChangePasswordResponse['data']>(
      API_ENDPOINTS.auth.changePassword.path,
      request
    ) as Promise<ChangePasswordResponse>;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<GetUserResponse> {
    return this.client.get<GetUserResponse['data']>(
      API_ENDPOINTS.auth.me.path
    ) as Promise<GetUserResponse>;
  }
}

// =============================================================================
// User Management Service
// =============================================================================

export class UserService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get list of users with filtering and pagination
   */
  async getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
    return this.client.get<GetUsersResponse['data']>(
      API_ENDPOINTS.users.list.path,
      params
    ) as Promise<GetUsersResponse>;
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<GetUserResponse> {
    return this.client.get<GetUserResponse['data']>(
      replacePath(API_ENDPOINTS.users.get.path, { id })
    ) as Promise<GetUserResponse>;
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    return this.client.post<CreateUserResponse['data']>(
      API_ENDPOINTS.users.create.path,
      userData
    ) as Promise<CreateUserResponse>;
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.client.put<UpdateUserResponse['data']>(
      replacePath(API_ENDPOINTS.users.update.path, { id }),
      userData
    ) as Promise<UpdateUserResponse>;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.users.delete.path, { id })
    );
  }
}

// =============================================================================
// Booking Management Service
// =============================================================================

export class BookingService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get list of bookings with filtering and pagination
   */
  async getBookings(params?: GetBookingsParams): Promise<GetBookingsResponse> {
    return this.client.get<GetBookingsResponse['data']>(
      API_ENDPOINTS.bookings.list.path,
      params
    ) as Promise<GetBookingsResponse>;
  }

  /**
   * Get booking by ID
   */
  async getBooking(id: string): Promise<GetBookingResponse> {
    return this.client.get<GetBookingResponse['data']>(
      replacePath(API_ENDPOINTS.bookings.get.path, { id })
    ) as Promise<GetBookingResponse>;
  }

  /**
   * Create new booking
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<CreateBookingResponse> {
    return this.client.post<CreateBookingResponse['data']>(
      API_ENDPOINTS.bookings.create.path,
      bookingData
    ) as Promise<CreateBookingResponse>;
  }

  /**
   * Update booking
   */
  async updateBooking(id: string, bookingData: UpdateBookingRequest): Promise<UpdateBookingResponse> {
    return this.client.put<UpdateBookingResponse['data']>(
      replacePath(API_ENDPOINTS.bookings.update.path, { id }),
      bookingData
    ) as Promise<UpdateBookingResponse>;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.bookings.cancel.path, { id })
    );
  }

  /**
   * Check booking availability
   */
  async checkAvailability(params: BookingAvailabilityParams): Promise<BookingAvailabilityResponse> {
    return this.client.get<BookingAvailabilityResponse['data']>(
      API_ENDPOINTS.bookings.availability.path,
      params
    ) as Promise<BookingAvailabilityResponse>;
  }
}

// =============================================================================
// Lesson Management Service
// =============================================================================

export class LessonService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get list of lessons with filtering and pagination
   */
  async getLessons(params?: GetLessonsParams): Promise<GetLessonsResponse> {
    return this.client.get<GetLessonsResponse['data']>(
      API_ENDPOINTS.lessons.list.path,
      params
    ) as Promise<GetLessonsResponse>;
  }

  /**
   * Get lesson by ID
   */
  async getLesson(id: string): Promise<GetLessonResponse> {
    return this.client.get<GetLessonResponse['data']>(
      replacePath(API_ENDPOINTS.lessons.get.path, { id })
    ) as Promise<GetLessonResponse>;
  }

  /**
   * Create new lesson
   */
  async createLesson(lessonData: CreateLessonRequest): Promise<CreateLessonResponse> {
    return this.client.post<CreateLessonResponse['data']>(
      API_ENDPOINTS.lessons.create.path,
      lessonData
    ) as Promise<CreateLessonResponse>;
  }

  /**
   * Update lesson
   */
  async updateLesson(id: string, lessonData: UpdateLessonRequest): Promise<UpdateLessonResponse> {
    return this.client.put<UpdateLessonResponse['data']>(
      replacePath(API_ENDPOINTS.lessons.update.path, { id }),
      lessonData
    ) as Promise<UpdateLessonResponse>;
  }

  /**
   * Delete lesson
   */
  async deleteLesson(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.lessons.delete.path, { id })
    );
  }
}

// =============================================================================
// Subject Management Service
// =============================================================================

export class SubjectService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get list of subjects with filtering and pagination
   */
  async getSubjects(params?: GetSubjectsParams): Promise<GetSubjectsResponse> {
    return this.client.get<GetSubjectsResponse['data']>(
      API_ENDPOINTS.subjects.list.path,
      params
    ) as Promise<GetSubjectsResponse>;
  }

  /**
   * Get subject by ID
   */
  async getSubject(id: string): Promise<GetSubjectResponse> {
    return this.client.get<GetSubjectResponse['data']>(
      replacePath(API_ENDPOINTS.subjects.get.path, { id })
    ) as Promise<GetSubjectResponse>;
  }

  /**
   * Create new subject
   */
  async createSubject(subjectData: CreateSubjectRequest): Promise<CreateSubjectResponse> {
    return this.client.post<CreateSubjectResponse['data']>(
      API_ENDPOINTS.subjects.create.path,
      subjectData
    ) as Promise<CreateSubjectResponse>;
  }

  /**
   * Update subject
   */
  async updateSubject(id: string, subjectData: UpdateSubjectRequest): Promise<UpdateSubjectResponse> {
    return this.client.put<UpdateSubjectResponse['data']>(
      replacePath(API_ENDPOINTS.subjects.update.path, { id }),
      subjectData
    ) as Promise<UpdateSubjectResponse>;
  }

  /**
   * Delete subject
   */
  async deleteSubject(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.subjects.delete.path, { id })
    );
  }
}

// =============================================================================
// Analytics Service
// =============================================================================

export class AnalyticsService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get student progress analytics
   */
  async getStudentProgress(params: GetStudentProgressParams): Promise<GetStudentProgressResponse> {
    return this.client.get<GetStudentProgressResponse['data']>(
      API_ENDPOINTS.analytics.studentProgress.path,
      params
    ) as Promise<GetStudentProgressResponse>;
  }

  /**
   * Get teacher analytics
   */
  async getTeacherAnalytics(params: GetTeacherAnalyticsParams): Promise<GetTeacherAnalyticsResponse> {
    return this.client.get<GetTeacherAnalyticsResponse['data']>(
      API_ENDPOINTS.analytics.teacherAnalytics.path,
      params
    ) as Promise<GetTeacherAnalyticsResponse>;
  }

  /**
   * Get admin dashboard analytics
   */
  async getAdminDashboard(): Promise<GetAdminDashboardResponse> {
    return this.client.get<GetAdminDashboardResponse['data']>(
      API_ENDPOINTS.analytics.adminDashboard.path
    ) as Promise<GetAdminDashboardResponse>;
  }
}

// =============================================================================
// Availability Service
// =============================================================================

export class AvailabilityService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get availability schedule
   */
  async getAvailability(params: GetAvailabilityParams): Promise<GetAvailabilityResponse> {
    return this.client.get<GetAvailabilityResponse['data']>(
      API_ENDPOINTS.availability.get.path,
      params
    ) as Promise<GetAvailabilityResponse>;
  }

  /**
   * Create availability slot
   */
  async createAvailability(availabilityData: CreateAvailabilityRequest): Promise<CreateAvailabilityResponse> {
    return this.client.post<CreateAvailabilityResponse['data']>(
      API_ENDPOINTS.availability.create.path,
      availabilityData
    ) as Promise<CreateAvailabilityResponse>;
  }

  /**
   * Update availability slot
   */
  async updateAvailability(id: string, availabilityData: UpdateAvailabilityRequest): Promise<UpdateAvailabilityResponse> {
    return this.client.put<UpdateAvailabilityResponse['data']>(
      replacePath(API_ENDPOINTS.availability.update.path, { id }),
      availabilityData
    ) as Promise<UpdateAvailabilityResponse>;
  }

  /**
   * Delete availability slot
   */
  async deleteAvailability(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.availability.delete.path, { id })
    );
  }
}

// =============================================================================
// File Service
// =============================================================================

export class FileService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Upload file
   */
  async uploadFile(fileData: FileUploadRequest): Promise<FileUploadResponse> {
    // For file uploads, we need to use FormData
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('userId', fileData.userId);
    formData.append('type', fileData.type);
    if (fileData.relatedId) {
      formData.append('relatedId', fileData.relatedId);
    }

    return this.client.post<FileUploadResponse['data']>(
      API_ENDPOINTS.files.upload.path,
      formData,
      {
        headers: {
          // Remove Content-Type header to let browser set it with boundary
          'Content-Type': undefined,
        },
      }
    ) as Promise<FileUploadResponse>;
  }

  /**
   * Get file information
   */
  async getFile(id: string): Promise<GetFileResponse> {
    return this.client.get<GetFileResponse['data']>(
      replacePath(API_ENDPOINTS.files.get.path, { id })
    ) as Promise<GetFileResponse>;
  }

  /**
   * Delete file
   */
  async deleteFile(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.files.delete.path, { id })
    );
  }
}

// =============================================================================
// Notification Service
// =============================================================================

export class NotificationService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get notifications with filtering and pagination
   */
  async getNotifications(params: GetNotificationsParams): Promise<GetNotificationsResponse> {
    return this.client.get<GetNotificationsResponse['data']>(
      API_ENDPOINTS.notifications.list.path,
      params
    ) as Promise<GetNotificationsResponse>;
  }

  /**
   * Create notification
   */
  async createNotification(notificationData: CreateNotificationRequest): Promise<CreateNotificationResponse> {
    return this.client.post<CreateNotificationResponse['data']>(
      API_ENDPOINTS.notifications.create.path,
      notificationData
    ) as Promise<CreateNotificationResponse>;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<ApiResponse<void>> {
    return this.client.patch<void>(
      replacePath(API_ENDPOINTS.notifications.markAsRead.path, { id })
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      replacePath(API_ENDPOINTS.notifications.delete.path, { id })
    );
  }
}

// =============================================================================
// Search Service
// =============================================================================

export class SearchService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Perform global search
   */
  async search(params: GlobalSearchParams): Promise<GlobalSearchResponse> {
    return this.client.get<GlobalSearchResponse['data']>(
      API_ENDPOINTS.search.global.path,
      params
    ) as Promise<GlobalSearchResponse>;
  }
}

// =============================================================================
// System Service
// =============================================================================

export class SystemService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.client.get<{ status: string; timestamp: string }>(
      API_ENDPOINTS.health.check.path
    );
  }

  /**
   * Get system metrics
   */
  async getMetrics(): Promise<ApiResponse<Record<string, any>>> {
    return this.client.get<Record<string, any>>(
      API_ENDPOINTS.metrics.get.path
    );
  }

  /**
   * Handle webhook
   */
  async handleWebhook(provider: string, event: WebhookEvent): Promise<WebhookResponse> {
    return this.client.post<WebhookResponse['data']>(
      replacePath(API_ENDPOINTS.webhooks.handle.path, { provider }),
      event
    ) as Promise<WebhookResponse>;
  }
}

// =============================================================================
// Combined API Service
// =============================================================================

export class ApiService {
  public auth: AuthService;
  public users: UserService;
  public bookings: BookingService;
  public lessons: LessonService;
  public subjects: SubjectService;
  public analytics: AnalyticsService;
  public availability: AvailabilityService;
  public files: FileService;
  public notifications: NotificationService;
  public search: SearchService;
  public system: SystemService;

  constructor(client: ApiClient = apiClient) {
    this.auth = new AuthService(client);
    this.users = new UserService(client);
    this.bookings = new BookingService(client);
    this.lessons = new LessonService(client);
    this.subjects = new SubjectService(client);
    this.analytics = new AnalyticsService(client);
    this.availability = new AvailabilityService(client);
    this.files = new FileService(client);
    this.notifications = new NotificationService(client);
    this.search = new SearchService(client);
    this.system = new SystemService(client);
  }
}

// =============================================================================
// Default Service Instance
// =============================================================================

export const apiService = new ApiService();

// =============================================================================
// Convenience Exports
// =============================================================================

export const {
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
} = apiService;

// =============================================================================
// Service Factory
// =============================================================================

export function createApiService(client?: ApiClient): ApiService {
  return new ApiService(client);
}

// =============================================================================
// Hook Integration for React
// =============================================================================

export interface UseApiServiceOptions {
  client?: ApiClient;
}

export function useApiService(options?: UseApiServiceOptions): ApiService {
  const client = options?.client || apiClient;
  return createApiService(client);
}