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
}> {
  /** Availability creation response */
}

export interface UpdateAvailabilityRequest {
  startTime?: string
  endTime?: string
  isAvailable?: boolean
  validFrom?: string
  validTo?: string
}

export interface UpdateAvailabilityResponse extends ApiResponse<{
  availability: Tables<'teacher_availability'>
  affectedBookings: number
}> {
  /** Availability update response with count of affected bookings */
}

export interface GetAvailabilityParams {
  teacherId: string
  dateFrom: string
  dateTo: string
  timeZone?: string
}

export interface GetAvailabilityResponse extends ApiResponse<{
  schedule: Array<{
    date: string
    slots: Array<{
      startTime: string
      endTime: string
      isAvailable: boolean
      bookingId?: string
    }>
  }>
}> {
  /** Teacher availability schedule response */
}

// =============================================================================
// File Upload API Types
// =============================================================================

export interface FileUploadRequest {
  file: File
  userId: string
  type: 'avatar' | 'lesson_material' | 'homework_submission'
  relatedId?: string // e.g., lessonId or bookingId
}

export interface FileUploadResponse extends ApiResponse<{
  fileUrl: string
  filePath: string
  fileType: string
  fileSize: number
  userId: string
}> {
  /** File upload response with URL and metadata */
}

export interface GetFileResponse extends ApiResponse<{
  id: string
  url: string
  path: string
  name: string
  size: number
  type: string
  created_at: string
  owner_id: string
}> {
  /** File details response */
}

// =============================================================================
// Notification API Types
// =============================================================================

export interface CreateNotificationRequest {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

export interface CreateNotificationResponse extends ApiResponse<{
  notification: Tables<'notifications'>
}> {
  /** Notification creation response */
}

export interface GetNotificationsParams extends PaginationParams {
  userId: string
  read?: boolean
  type?: string
}

export interface GetNotificationsResponse extends PaginatedResponse<{
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: Record<string, unknown>
}> {
  /** Paginated response containing list of user notifications */
}

// =============================================================================
// Global Search API Types
// =============================================================================

export interface GlobalSearchParams {
  query: string
  limit?: number
  scope?: Array<'users' | 'classes' | 'bookings'>
}

export interface GlobalSearchResponse extends ApiResponse<{
  results: Array<{
    type: 'user' | 'class' | 'booking'
    id: string
    title: string
    description: string
    url: string
    metadata?: Record<string, unknown>
  }>
}> {
  /** Global search results response */
}

// =============================================================================
// Webhook API Types
// =============================================================================

export interface WebhookEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface WebhookResponse {
  received: boolean
  message?: string
}