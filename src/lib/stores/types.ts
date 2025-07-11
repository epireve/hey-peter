import { User } from '@supabase/supabase-js'
import { UserRole } from '@/types/types'

// Auth Slice Types
export interface AuthState {
  user: User | null
  role: UserRole | null
  isAdmin: boolean
  isTeacher: boolean
  isStudent: boolean
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  clearError: () => void
}

// UI Slice Types
export interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Modals
  activeModal: string | null
  modalData: any
  openModal: (modalId: string, data?: any) => void
  closeModal: () => void
  
  // Loading states
  globalLoading: boolean
  loadingMessage: string | null
  setGlobalLoading: (loading: boolean, message?: string) => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  timestamp: Date
  duration?: number
}

// Student Slice Types
export interface StudentState {
  currentStudent: any | null
  students: any[]
  totalCount: number
  isLoading: boolean
  error: string | null
  filters: StudentFilters
  setCurrentStudent: (student: any | null) => void
  setStudents: (students: any[]) => void
  setTotalCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<StudentFilters>) => void
  resetFilters: () => void
}

export interface StudentFilters {
  search: string
  status: string | null
  courseType: string | null
  teacherId: string | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}

// Teacher Slice Types
export interface TeacherState {
  currentTeacher: any | null
  teachers: any[]
  totalCount: number
  isLoading: boolean
  error: string | null
  filters: TeacherFilters
  setCurrentTeacher: (teacher: any | null) => void
  setTeachers: (teachers: any[]) => void
  setTotalCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<TeacherFilters>) => void
  resetFilters: () => void
}

export interface TeacherFilters {
  search: string
  status: string | null
  availability: string | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}

// Admin Slice Types
export interface AdminState {
  // Dashboard stats
  dashboardStats: DashboardStats | null
  statsLoading: boolean
  statsError: string | null
  setDashboardStats: (stats: DashboardStats | null) => void
  setStatsLoading: (loading: boolean) => void
  setStatsError: (error: string | null) => void
  
  // Analytics
  analyticsData: any | null
  analyticsRange: { start: Date; end: Date }
  analyticsLoading: boolean
  setAnalyticsData: (data: any) => void
  setAnalyticsRange: (range: { start: Date; end: Date }) => void
  setAnalyticsLoading: (loading: boolean) => void
  
  // System settings
  systemSettings: SystemSettings | null
  settingsLoading: boolean
  setSystemSettings: (settings: SystemSettings) => void
  setSettingsLoading: (loading: boolean) => void
}

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  activeTeachers: number
  totalClasses: number
  upcomingClasses: number
  revenue: {
    monthly: number
    yearly: number
  }
  growth: {
    students: number
    teachers: number
    revenue: number
  }
}

export interface SystemSettings {
  maintenanceMode: boolean
  allowRegistration: boolean
  defaultCurrency: string
  timezone: string
  emailNotifications: boolean
  smsNotifications: boolean
}

// Combined Store Type
export interface AppStore extends 
  AuthState, 
  UIState, 
  StudentState, 
  TeacherState, 
  AdminState {
  _hasHydrated?: boolean
}