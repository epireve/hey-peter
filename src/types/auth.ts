import { User as SupabaseUser } from '@supabase/supabase-js'
import { USER_ROLES } from '../lib/constants'

// User role type from constants
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Extended user interface with role metadata
export interface AuthUser extends SupabaseUser {
  user_metadata: {
    role?: UserRole
    first_name?: string
    last_name?: string
    phone?: string
    avatar_url?: string
    timezone?: string
    language?: string
    is_active?: boolean
  }
  app_metadata: {
    provider?: string
    providers?: string[]
  }
}

// User profile data structure
export interface UserProfile {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  timezone: string
  language: string
  created_at: string
  updated_at: string
  last_sign_in_at?: string
  email_verified_at?: string
  is_active: boolean
  metadata?: Record<string, unknown>
}

// Authentication session state
export interface AuthSession {
  user: AuthUser | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
}

// Sign in form data
export interface SignInFormData {
  email: string
  password: string
  remember?: boolean
}

// Sign up form data (admin creates accounts)
export interface SignUpFormData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: UserRole
  phone?: string
  timezone?: string
  language?: string
}

// Password reset form data
export interface PasswordResetFormData {
  email: string
}

// Password update form data
export interface PasswordUpdateFormData {
  current_password?: string
  new_password: string
  confirm_password: string
}

// Profile update form data
export interface ProfileUpdateFormData {
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  timezone: string
  language: string
}

// Authentication error types
export interface AuthError {
  message: string
  code?: string
  details?: unknown
}

// Authentication state changes
export type AuthChangeEvent = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'

// Authentication providers (if needed for future expansion)
export type AuthProvider = 'email' | 'google' | 'github' | 'microsoft'

// Role-based permissions
export interface RolePermissions {
  [USER_ROLES.ADMIN]: string[]
  [USER_ROLES.TEACHER]: string[]
  [USER_ROLES.STUDENT]: string[]
}

// Permission constants
export const PERMISSIONS = {
  // User management
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  VIEW_ALL_USERS: 'view_all_users',
  
  // Class management
  CREATE_CLASS: 'create_class',
  UPDATE_CLASS: 'update_class',
  DELETE_CLASS: 'delete_class',
  VIEW_ALL_CLASSES: 'view_all_classes',
  TEACH_CLASS: 'teach_class',
  
  // Booking management
  CREATE_BOOKING: 'create_booking',
  UPDATE_BOOKING: 'update_booking',
  DELETE_BOOKING: 'delete_booking',
  VIEW_ALL_BOOKINGS: 'view_all_bookings',
  VIEW_OWN_BOOKINGS: 'view_own_bookings',
  CANCEL_BOOKING: 'cancel_booking',
  
  // Availability management
  MANAGE_AVAILABILITY: 'manage_availability',
  VIEW_AVAILABILITY: 'view_availability',
  
  // Feedback management
  CREATE_FEEDBACK: 'create_feedback',
  UPDATE_FEEDBACK: 'update_feedback',
  VIEW_ALL_FEEDBACK: 'view_all_feedback',
  VIEW_OWN_FEEDBACK: 'view_own_feedback',
  
  // Reports and analytics
  VIEW_REPORTS: 'view_reports',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // System settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_LOGS: 'view_logs',
  
  // Notifications
  SEND_NOTIFICATIONS: 'send_notifications',
  MANAGE_NOTIFICATIONS: 'manage_notifications',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Default role permissions mapping
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [USER_ROLES.ADMIN]: [
    // All permissions for admin
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.CREATE_CLASS,
    PERMISSIONS.UPDATE_CLASS,
    PERMISSIONS.DELETE_CLASS,
    PERMISSIONS.VIEW_ALL_CLASSES,
    PERMISSIONS.CREATE_BOOKING,
    PERMISSIONS.UPDATE_BOOKING,
    PERMISSIONS.DELETE_BOOKING,
    PERMISSIONS.VIEW_ALL_BOOKINGS,
    PERMISSIONS.CANCEL_BOOKING,
    PERMISSIONS.MANAGE_AVAILABILITY,
    PERMISSIONS.VIEW_AVAILABILITY,
    PERMISSIONS.CREATE_FEEDBACK,
    PERMISSIONS.UPDATE_FEEDBACK,
    PERMISSIONS.VIEW_ALL_FEEDBACK,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.SEND_NOTIFICATIONS,
    PERMISSIONS.MANAGE_NOTIFICATIONS,
  ],
  [USER_ROLES.TEACHER]: [
    // Teacher permissions
    PERMISSIONS.VIEW_OWN_BOOKINGS,
    PERMISSIONS.UPDATE_BOOKING,
    PERMISSIONS.CANCEL_BOOKING,
    PERMISSIONS.MANAGE_AVAILABILITY,
    PERMISSIONS.VIEW_AVAILABILITY,
    PERMISSIONS.TEACH_CLASS,
    PERMISSIONS.CREATE_FEEDBACK,
    PERMISSIONS.UPDATE_FEEDBACK,
    PERMISSIONS.VIEW_OWN_FEEDBACK,
    PERMISSIONS.VIEW_ALL_CLASSES,
  ],
  [USER_ROLES.STUDENT]: [
    // Student permissions
    PERMISSIONS.CREATE_BOOKING,
    PERMISSIONS.VIEW_OWN_BOOKINGS,
    PERMISSIONS.CANCEL_BOOKING,
    PERMISSIONS.VIEW_AVAILABILITY,
    PERMISSIONS.VIEW_ALL_CLASSES,
    PERMISSIONS.VIEW_OWN_FEEDBACK,
  ],
}

// Invitation data for creating new users
export interface UserInvitation {
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  timezone?: string
  language?: string
  invited_by: string
  expires_at: string
  accepted: boolean
  created_at: string
}

// Session storage keys
export const SESSION_STORAGE_KEYS = {
  USER: 'heypeter_user',
  PROFILE: 'heypeter_profile',
  PREFERENCES: 'heypeter_preferences',
  LAST_ROUTE: 'heypeter_last_route',
  THEME: 'heypeter_theme',
} as const

// Authentication hooks return types
export interface UseAuthReturn {
  user: AuthUser | null
  profile: UserProfile | null
  session: AuthSession
  signIn: (data: SignInFormData) => Promise<{ error?: AuthError }>
  signOut: () => Promise<{ error?: AuthError }>
  updateProfile: (data: ProfileUpdateFormData) => Promise<{ error?: AuthError }>
  updatePassword: (data: PasswordUpdateFormData) => Promise<{ error?: AuthError }>
  resetPassword: (email: string) => Promise<{ error?: AuthError }>
  refreshSession: () => Promise<{ error?: AuthError }>
  isLoading: boolean
  error: AuthError | null
}

// Route protection types
export interface RouteGuardConfig {
  requireAuth?: boolean
  requiredRole?: UserRole
  requiredRoles?: UserRole[]
  requiredPermission?: Permission
  requiredPermissions?: Permission[]
  redirectTo?: string
  fallback?: React.ComponentType
}

// Auth middleware types for API routes
export interface AuthenticatedRequest extends Request {
  user: AuthUser
  profile: UserProfile
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  requiredRole?: UserRole
  requiredRoles?: UserRole[]
  requiredPermission?: Permission
  requiredPermissions?: Permission[]
}

// Two-factor authentication (future enhancement)
export interface TwoFactorAuth {
  enabled: boolean
  method: 'totp' | 'sms' | 'email'
  backup_codes?: string[]
  last_used_at?: string
}

// Account security settings
export interface SecuritySettings {
  two_factor_auth?: TwoFactorAuth
  login_notifications: boolean
  session_timeout: number
  allowed_ip_ranges?: string[]
  last_password_change?: string
  force_password_change: boolean
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    booking_reminders: boolean
    schedule_changes: boolean
    feedback_requests: boolean
    system_announcements: boolean
  }
  dashboard: {
    default_view: 'calendar' | 'list' | 'grid'
    items_per_page: number
    auto_refresh: boolean
    compact_mode: boolean
  }
}

// Authentication context type
export interface AuthContextType {
  session: AuthSession
  signIn: (data: SignInFormData) => Promise<{ error?: AuthError }>
  signOut: () => Promise<{ error?: AuthError }>
  updateProfile: (data: ProfileUpdateFormData) => Promise<{ error?: AuthError }>
  updatePassword: (data: PasswordUpdateFormData) => Promise<{ error?: AuthError }>
  resetPassword: (email: string) => Promise<{ error?: AuthError }>
  refreshSession: () => Promise<{ error?: AuthError }>
  isLoading: boolean
  error: AuthError | null
}