// Application metadata
export const APP_NAME = 'HeyPeter Academy'
export const APP_DESCRIPTION = 'English Language Learning Management System'
export const APP_VERSION = '1.0.0'

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.TEACHER]: 'Teacher',
  [USER_ROLES.STUDENT]: 'Student',
} as const

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'classes:create',
    'classes:read',
    'classes:update',
    'classes:delete',
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'bookings:delete',
    'reports:read',
    'settings:update',
  ],
  [USER_ROLES.TEACHER]: [
    'users:read',
    'classes:create',
    'classes:read',
    'classes:update',
    'bookings:read',
    'bookings:update',
    'reports:read',
    'availability:create',
    'availability:update',
    'feedback:create',
  ],
  [USER_ROLES.STUDENT]: [
    'classes:read',
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'feedback:create',
    'profile:update',
  ],
} as const

// Class types and levels
export const CLASS_TYPES = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
} as const

export const CLASS_TYPE_LABELS = {
  [CLASS_TYPES.INDIVIDUAL]: 'One-on-One',
  [CLASS_TYPES.GROUP]: 'Group Class',
} as const

export const CLASS_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const

export const CLASS_LEVEL_LABELS = {
  [CLASS_LEVELS.BEGINNER]: 'Beginner',
  [CLASS_LEVELS.INTERMEDIATE]: 'Intermediate',
  [CLASS_LEVELS.ADVANCED]: 'Advanced',
} as const

// Booking statuses
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no-show',
  PENDING: 'pending',
  RESCHEDULED: 'rescheduled',
} as const

export const BOOKING_STATUS_LABELS = {
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.NO_SHOW]: 'No Show',
  [BOOKING_STATUS.PENDING]: 'Pending',
  [BOOKING_STATUS.RESCHEDULED]: 'Rescheduled',
} as const

export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.CONFIRMED]: 'bg-green-100 text-green-800',
  [BOOKING_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  [BOOKING_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800',
  [BOOKING_STATUS.NO_SHOW]: 'bg-gray-100 text-gray-800',
  [BOOKING_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [BOOKING_STATUS.RESCHEDULED]: 'bg-purple-100 text-purple-800',
} as const

// Recurring patterns
export const RECURRING_PATTERNS = {
  NONE: 'none',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const

export const RECURRING_PATTERN_LABELS = {
  [RECURRING_PATTERNS.NONE]: 'One-time',
  [RECURRING_PATTERNS.WEEKLY]: 'Weekly',
  [RECURRING_PATTERNS.BIWEEKLY]: 'Every 2 weeks',
  [RECURRING_PATTERNS.MONTHLY]: 'Monthly',
} as const

// Time slots and durations
export const DEFAULT_CLASS_DURATION = 60 // minutes
export const MIN_CLASS_DURATION = 15 // minutes
export const MAX_CLASS_DURATION = 180 // minutes
export const CLASS_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180] // minutes

export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00'
] as const

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const

// Availability block types
export const BLOCK_TYPES = {
  BREAK: 'break',
  MEETING: 'meeting',
  HOLIDAY: 'holiday',
  OTHER: 'other',
} as const

export const BLOCK_TYPE_LABELS = {
  [BLOCK_TYPES.BREAK]: 'Break',
  [BLOCK_TYPES.MEETING]: 'Meeting',
  [BLOCK_TYPES.HOLIDAY]: 'Holiday',
  [BLOCK_TYPES.OTHER]: 'Other',
} as const

// Pricing and currency
export const DEFAULT_CURRENCY = 'USD'
export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  MYR: 'RM',
  SGD: 'S$',
} as const

// Skill areas for feedback
export const SKILL_AREAS = {
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  READING: 'reading',
  WRITING: 'writing',
  GRAMMAR: 'grammar',
  VOCABULARY: 'vocabulary',
} as const

export const SKILL_AREA_LABELS = {
  [SKILL_AREAS.SPEAKING]: 'Speaking',
  [SKILL_AREAS.LISTENING]: 'Listening',
  [SKILL_AREAS.READING]: 'Reading',
  [SKILL_AREAS.WRITING]: 'Writing',
  [SKILL_AREAS.GRAMMAR]: 'Grammar',
  [SKILL_AREAS.VOCABULARY]: 'Vocabulary',
} as const

// Rating scale
export const RATING_SCALE = [1, 2, 3, 4, 5] as const
export const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
} as const

// Date and time formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  SHORT: 'MM/dd',
  LONG: 'EEEE, MMMM dd, yyyy',
} as const

export const TIME_FORMATS = {
  DISPLAY: 'h:mm a',
  INPUT: 'HH:mm',
  SHORT: 'h:mm',
} as const

// Pagination
export const ITEMS_PER_PAGE = 10
export const MAX_ITEMS_PER_PAGE = 100

// Search and filtering
export const SEARCH_DELAY = 300 // milliseconds
export const MIN_SEARCH_LENGTH = 2

// File upload limits
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const

// Notification types
export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_REMINDER: 'booking_reminder',
  CLASS_UPDATED: 'class_updated',
  FEEDBACK_RECEIVED: 'feedback_received',
  SYSTEM_UPDATE: 'system_update',
} as const

export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 'Booking Confirmed',
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 'Booking Cancelled',
  [NOTIFICATION_TYPES.BOOKING_REMINDER]: 'Booking Reminder',
  [NOTIFICATION_TYPES.CLASS_UPDATED]: 'Class Updated',
  [NOTIFICATION_TYPES.FEEDBACK_RECEIVED]: 'Feedback Received',
  [NOTIFICATION_TYPES.SYSTEM_UPDATE]: 'System Update',
} as const

// System settings
export const TIMEZONE_DEFAULT = 'UTC'
export const LANGUAGE_DEFAULT = 'en'

export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kuala_Lumpur',
  'Asia/Singapore',
  'Australia/Sydney',
] as const

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' },
] as const

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  CLASSES: '/api/classes',
  BOOKINGS: '/api/bookings',
  AVAILABILITY: '/api/availability',
  REPORTS: '/api/reports',
  FEEDBACK: '/api/feedback',
  NOTIFICATIONS: '/api/notifications',
  SETTINGS: '/api/settings',
} as const

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  SERVER_ERROR: 'Something went wrong. Please try again later',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SIGNED_IN: 'Signed in successfully',
  SIGNED_OUT: 'Signed out successfully',
  EMAIL_SENT: 'Email sent successfully',
  PASSWORD_UPDATED: 'Password updated successfully',
} as const

// Route paths
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  RESET_PASSWORD: '/auth/reset-password',
  PROFILE: '/profile',
  CLASSES: '/classes',
  BOOKINGS: '/bookings',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  USERS: '/users',
  CALENDAR: '/calendar',
} as const

// Class size and capacity management
export const CLASS_CAPACITY = {
  INDIVIDUAL: 1,
  GROUP_MAX: 9,
  GROUP_MIN: 2,
  GROUP_OPTIMAL: 6,
  WAITING_LIST_MAX: 15,
} as const

export const COURSE_TYPE_CAPACITY = {
  'Basic': { min: 3, max: 9, optimal: 6 },
  'Everyday A': { min: 3, max: 9, optimal: 6 },
  'Everyday B': { min: 3, max: 9, optimal: 6 },
  'Speak Up': { min: 4, max: 9, optimal: 7 },
  'Business English': { min: 2, max: 6, optimal: 4 },
  '1-on-1': { min: 1, max: 1, optimal: 1 },
} as const

export const ENROLLMENT_STATUS = {
  ENROLLED: 'enrolled',
  WAITLISTED: 'waitlisted',
  DROPPED: 'dropped',
  COMPLETED: 'completed',
} as const

export const ENROLLMENT_STATUS_LABELS = {
  [ENROLLMENT_STATUS.ENROLLED]: 'Enrolled',
  [ENROLLMENT_STATUS.WAITLISTED]: 'Waitlisted',
  [ENROLLMENT_STATUS.DROPPED]: 'Dropped',
  [ENROLLMENT_STATUS.COMPLETED]: 'Completed',
} as const

export const ENROLLMENT_STATUS_COLORS = {
  [ENROLLMENT_STATUS.ENROLLED]: 'bg-green-100 text-green-800',
  [ENROLLMENT_STATUS.WAITLISTED]: 'bg-yellow-100 text-yellow-800',
  [ENROLLMENT_STATUS.DROPPED]: 'bg-red-100 text-red-800',
  [ENROLLMENT_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800',
} as const

export const CLASS_SPLIT_REASONS = {
  OVERCAPACITY: 'overcapacity',
  TEACHER_AVAILABILITY: 'teacher_availability',
  STUDENT_PREFERENCE: 'student_preference',
  LEVEL_MISMATCH: 'level_mismatch',
} as const

export const CLASS_SPLIT_REASON_LABELS = {
  [CLASS_SPLIT_REASONS.OVERCAPACITY]: 'Over Capacity',
  [CLASS_SPLIT_REASONS.TEACHER_AVAILABILITY]: 'Teacher Availability',
  [CLASS_SPLIT_REASONS.STUDENT_PREFERENCE]: 'Student Preference',
  [CLASS_SPLIT_REASONS.LEVEL_MISMATCH]: 'Level Mismatch',
} as const

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'heypeter-theme',
  SIDEBAR_COLLAPSED: 'heypeter-sidebar-collapsed',
  TIMEZONE: 'heypeter-timezone',
  LANGUAGE: 'heypeter-language',
  BOOKING_DRAFT: 'heypeter-booking-draft',
} as const