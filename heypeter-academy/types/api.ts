// API Response Types for HeyPeter Academy LMS
// Comprehensive TypeScript definitions for API responses and request/response patterns

import {
  Tables
} from './database'
import { UserRole, AuthUser } from './auth'

// =============================================================================
// Generic API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  field?: string
  statusCode: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchParams extends PaginationParams {
  q?: string
  filters?: Record<string, unknown>
}

// =============================================================================
// Authentication API Types
// =============================================================================

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

/** Successful login response with user profile and session tokens */
export type LoginResponse = ApiResponse<{
  user: AuthUser
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
  }
  profile: Tables<'users'>
}>

export interface SignupRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  timezone?: string
}

/** User signup response with profile data and verification status */
export type SignupResponse = ApiResponse<{
  user: AuthUser
  requiresVerification: boolean
}>

export interface RefreshTokenRequest {
  refresh_token: string
}

/** Token refresh response with new access and refresh tokens */
export type RefreshTokenResponse = ApiResponse<{
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
}>

export interface ResetPasswordRequest {
  email: string
}

/** Password reset request response with message and reset status */
export type ResetPasswordResponse = ApiResponse<{
  message: string
  resetRequired: boolean
}>

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/** Password change response with message and reauth requirement */
export type ChangePasswordResponse = ApiResponse<{
  message: string
  requiresReauth: boolean
}>

// =============================================================================
// User Management API Types
// =============================================================================

export interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  timezone?: string
  sendInvite?: boolean
}

/** User creation response with profile data and invitation status */
export type CreateUserResponse = ApiResponse<{
  user: AuthUser
  profile: Tables<'users'>
  inviteSent: boolean
}>

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  phone?: string
  timezone?: string
  avatar?: string
  preferences?: Record<string, unknown>
}

/** User update response with updated profile information */
export type UpdateUserResponse = ApiResponse<{
  user: AuthUser
  profile: Tables<'users'>
}>

export interface GetUsersParams extends SearchParams {
  role?: UserRole
  status?: 'active' | 'inactive' | 'pending'
  createdAfter?: string
  createdBefore?: string
}

/** Paginated response containing list of user profiles */
export type GetUsersResponse = PaginatedResponse<Tables<'users'>>

/** Single user details response with profile and optional statistics */
export type GetUserResponse = ApiResponse<{
  user: AuthUser
  profile: Tables<'users'>
  stats?: UserStats
}>

export interface UserStats {
  totalBookings: number
  completedLessons: number
  cancelledBookings: number
  averageRating?: number
  hoursTeached?: number
  studentsCount?: number
  upcomingLessons: number
  lastActivity: string
}

// =============================================================================
// Booking API Types
// =============================================================================

export interface CreateBookingRequest {
  studentId: string
  teacherId: string
  subjectId: string
  timeSlotId: string
  date: string
  duration: number
  type: 'individual' | 'group'
  notes?: string
  isRecurring?: boolean
  recurringPattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly'
    endDate?: string
    maxOccurrences?: number
  }
}

/** Booking creation response with confirmation code and optional recurring bookings */
export type CreateBookingResponse = ApiResponse<{
  booking: Tables<'bookings'>
  confirmationCode: string
  recurringBookings?: Tables<'bookings'>[]
}>

export interface UpdateBookingRequest {
  date?: string
  timeSlotId?: string
  duration?: number
  notes?: string
  status?: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
  cancelReason?: string
  rescheduleReason?: string
}

/** Booking update response with notification delivery status */
export type UpdateBookingResponse = ApiResponse<{
  booking: Tables<'bookings'>
  notificationsSent: string[]
}>

export interface GetBookingsParams extends SearchParams {
  studentId?: string
  teacherId?: string
  subjectId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  type?: 'individual' | 'group'
}

/** Paginated response containing list of bookings */
export type GetBookingsResponse = PaginatedResponse<Tables<'bookings'>>

/** Single booking details response with complete related entity data */
export type GetBookingResponse = ApiResponse<{
  booking: Tables<'bookings'>
  student: Tables<'users'>
  teacher: Tables<'users'>
  subject: Tables<'classes'> // Assuming subjects are stored in classes table
  lesson?: Tables<'classes'> // Lesson details from classes table
}>

export interface BookingAvailabilityParams {
  teacherId: string
  subjectId: string
  date: string
  duration: number
  excludeBookingId?: string
}

/** Teacher availability check response with available time slots */
export type BookingAvailabilityResponse = ApiResponse<{
  availableSlots: Array<{
    timeSlotId: string
    startTime: string
    endTime: string
    isPreferred: boolean
  }>
  teacherAvailability: Tables<'teacher_availability'>
}>

// =============================================================================
// Lesson API Types
// =============================================================================

export interface CreateLessonRequest {
  bookingId: string
  lessonPlanId?: string
  objectives: string[]
  materials?: string[]
  homework?: string
  notes?: string
}

/** Lesson creation response linking class entity to booking */
export type CreateLessonResponse = ApiResponse<{
  lesson: Tables<'classes'>
  booking: Tables<'bookings'>
}>

export interface UpdateLessonRequest {
  objectives?: string[]
  materials?: string[]
  homework?: string
  notes?: string
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  actualStartTime?: string
  actualEndTime?: string
  rating?: number
  feedback?: string
}

/** Lesson update response indicating if student progress was updated */
export type UpdateLessonResponse = ApiResponse<{
  lesson: Tables<'classes'>
  progressUpdated: boolean
}>

export interface GetLessonsParams extends SearchParams {
  studentId?: string
  teacherId?: string
  subjectId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

/** Paginated response containing list of lesson/class records */
export type GetLessonsResponse = PaginatedResponse<Tables<'classes'>>

/** Single lesson details response with comprehensive related entity data */
export type GetLessonResponse = ApiResponse<{
  lesson: Tables<'classes'>
  booking: Tables<'bookings'>
  student: Tables<'users'>
  teacher: Tables<'users'>
  subject: Tables<'classes'> // Subject info from classes table
  lessonPlan?: Record<string, unknown> // TODO: Define lesson plan structure
}>

// =============================================================================
// Subject API Types
// =============================================================================

export interface CreateSubjectRequest {
  name: string
  description: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  price: number
  isActive?: boolean
  requirements?: string[]
  objectives?: string[]
}

/** Subject creation response using classes table entity */
export type CreateSubjectResponse = ApiResponse<{
  subject: Tables<'classes'>
}>

export interface UpdateSubjectRequest {
  name?: string
  description?: string
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  duration?: number
  price?: number
  isActive?: boolean
  requirements?: string[]
  objectives?: string[]
}

export interface UpdateSubjectResponse extends ApiResponse<{
  subject: Tables<'classes'>
  affectedBookings: number
}> {
  /** Subject update response with count of affected bookings */
}

export interface GetSubjectsParams extends SearchParams {
  category?: string
  level?: string
  teacherId?: string
  isActive?: boolean
  priceMin?: number
  priceMax?: number
}

export interface GetSubjectsResponse extends PaginatedResponse<Tables<'classes'>> {
  /** Paginated response containing list of subject/class records */
}

export interface GetSubjectResponse extends ApiResponse<{
  subject: Tables<'classes'>
  teachers: Tables<'users'>[]
  stats: {
    totalBookings: number
    totalStudents: number
    averageRating: number
    completionRate: number
  }
}> {
  /** Single subject details response with associated teachers and performance statistics */
}

// =============================================================================
// Progress & Analytics API Types
// =============================================================================

export interface GetStudentProgressParams {
  studentId: string
  subjectId?: string
  dateFrom?: string
  dateTo?: string
}

export interface GetStudentProgressResponse extends ApiResponse<{
  progress: Array<{
    id: string
    studentId: string
    classId: string
    skillRatings: Record<string, number>
    notes: string
    createdAt: string
    updatedAt: string
  }>
  summary: {
    totalLessons: number
    completedLessons: number
    averageRating: number
    skillLevels: Record<string, number>
    improvementAreas: string[]
    achievements: string[]
  }
}> {
  /** Student progress report response with detailed metrics and summary statistics */
}

export interface GetTeacherAnalyticsParams {
  teacherId: string
  dateFrom?: string
  dateTo?: string
}

export interface GetTeacherAnalyticsResponse extends ApiResponse<{
  stats: {
    totalLessons: number
    totalStudents: number
    averageRating: number
    totalEarnings: number
    hoursTeached: number
    subjectBreakdown: Array<{
      subjectId: string
      subjectName: string
      lessonCount: number
      studentCount: number
      earnings: number
    }>
  }
  trends: {
    dailyLessons: Array<{ date: string; count: number }>
    monthlyEarnings: Array<{ month: string; amount: number }>
    ratingTrend: Array<{ date: string; rating: number }>
  }
}> {
  // Teacher analytics response
}

export interface GetAdminDashboardResponse extends ApiResponse<{
  summary: {
    totalUsers: number
    totalBookings: number
    totalLessons: number
    totalRevenue: number
    activeTeachers: number
    activeStudents: number
  }
  recentActivity: Array<{
    id: string
    type: 'booking' | 'lesson' | 'user' | 'payment'
    description: string
    timestamp: string
    userId?: string
    userName?: string
  }>
  trends: {
    userGrowth: Array<{ month: string; users: number }>
    bookingTrends: Array<{ date: string; bookings: number }>
    revenueTrends: Array<{ month: string; revenue: number }>
  }
}> {
  // Admin dashboard data response
}

// =============================================================================
// Availability API Types
// =============================================================================

export interface CreateAvailabilityRequest {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isRecurring: boolean
  validFrom?: string
  validTo?: string
  timeZone?: string
}

export interface CreateAvailabilityResponse extends ApiResponse<{
  availability: Tables<'teacher_availability'>
  timeSlots: Tables<'availability_blocks'>[]
}> {
  /** Availability creation response with created time slot blocks */
}

export interface UpdateAvailabilityRequest {
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  isRecurring?: boolean
  validFrom?: string
  validTo?: string
  isActive?: boolean
}

export interface UpdateAvailabilityResponse extends ApiResponse<{
  availability: Tables<'teacher_availability'>
  affectedBookings: number
}> {
  /** Availability update response with count of impacted existing bookings */
}

export interface GetAvailabilityParams {
  teacherId: string
  dateFrom?: string
  dateTo?: string
  dayOfWeek?: number
}

export interface GetAvailabilityResponse extends ApiResponse<{
  availability: Tables<'teacher_availability'>[]
  timeSlots: Tables<'availability_blocks'>[]
  exceptions: Array<{
    date: string
    reason: string
    isBlocked: boolean
  }>
}> {
  /** Teacher availability response with time slots and scheduling exceptions */
}

// =============================================================================
// File Upload API Types
// =============================================================================

export interface FileUploadRequest {
  file: File | Buffer
  fileName: string
  fileType: string
  category: 'avatar' | 'lesson_material' | 'assignment' | 'document'
  isPublic?: boolean
  metadata?: Record<string, unknown>
}

export interface FileUploadResponse extends ApiResponse<{
  fileId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}> {
  /** File upload response with file metadata and access URL */
}

export interface GetFileResponse extends ApiResponse<{
  fileId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  isPublic: boolean
  metadata?: Record<string, unknown>
}> {
  /** File details response with complete metadata and access information */
}

// =============================================================================
// Notification API Types
// =============================================================================

export interface CreateNotificationRequest {
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'booking' | 'lesson' | 'payment' | 'system'
  actionUrl?: string
  expiresAt?: string
}

export interface CreateNotificationResponse extends ApiResponse<{
  notificationId: string
  sent: boolean
  deliveryMethods: string[]
}> {
  /** Notification creation response with delivery status and methods used */
}

export interface GetNotificationsParams extends PaginationParams {
  userId: string
  isRead?: boolean
  category?: string
  type?: string
}

export interface GetNotificationsResponse extends PaginatedResponse<{
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
  expiresAt?: string
}> {
  /** Paginated response containing user notifications with read status and metadata */
}

// =============================================================================
// Search API Types
// =============================================================================

export interface GlobalSearchParams {
  query: string
  types?: Array<'users' | 'bookings' | 'lessons' | 'subjects'>
  limit?: number
  userId?: string
}

export interface GlobalSearchResponse extends ApiResponse<{
  results: {
    users?: Tables<'users'>[]
    bookings?: Tables<'bookings'>[]
    lessons?: Tables<'classes'>[]
    subjects?: Tables<'classes'>[]
  }
  totalResults: number
  searchTime: number
}> {
  /** Global search results response with categorized results and performance metrics */
}

// =============================================================================
// Webhook API Types
// =============================================================================

export interface WebhookEvent {
  id: string
  event: string
  data: Record<string, unknown>
  timestamp: string
  signature: string
}

export interface WebhookResponse {
  received: boolean
  processed: boolean
  error?: string
}

// =============================================================================
// Type Guards and Utilities
// =============================================================================

export function isApiError(response: ApiResponse<unknown>): response is ApiResponse<never> & { error: ApiError } {
  return !response.success && !!response.error
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && !!response.data
}

export function isPaginatedResponse<T>(response: ApiResponse<unknown>): response is PaginatedResponse<T> {
  return response.success && 'pagination' in response
}

// Default API configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]
