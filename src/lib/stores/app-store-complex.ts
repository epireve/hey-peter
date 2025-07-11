import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { AppStore } from './types'
import { createAuthSlice } from './slices/auth-slice'
import { createUISlice } from './slices/ui-slice'
import { createStudentSlice } from './slices/student-slice'
import { createTeacherSlice } from './slices/teacher-slice'
import { createAdminSlice } from './slices/admin-slice'

// Create the unified store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get, store) => ({
        // Auth slice
        ...createAuthSlice(set, get, store),
        // UI slice
        ...createUISlice(set, get, store),
        // Student slice
        ...createStudentSlice(set, get, store),
        // Teacher slice
        ...createTeacherSlice(set, get, store),
        // Admin slice
        ...createAdminSlice(set, get, store),
      }),
      {
        name: 'hey-peter-app-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          // Auth
          role: state.role,
          // UI preferences
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
        // Skip hydration on server-side
        skipHydration: true,
      }
    ),
    {
      name: 'hey-peter-store',
      // Enable devtools only in development
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Typed selectors for better performance
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  role: state.role,
  isAdmin: state.isAdmin,
  isTeacher: state.isTeacher,
  isStudent: state.isStudent,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
  setUser: state.setUser,
  setRole: state.setRole,
  setLoading: state.setLoading,
  setError: state.setError,
  logout: state.logout,
  clearError: state.clearError,
}))

export const useUI = () => useAppStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  sidebarCollapsed: state.sidebarCollapsed,
  activeModal: state.activeModal,
  modalData: state.modalData,
  globalLoading: state.globalLoading,
  loadingMessage: state.loadingMessage,
  notifications: state.notifications,
  theme: state.theme,
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  setSidebarCollapsed: state.setSidebarCollapsed,
  openModal: state.openModal,
  closeModal: state.closeModal,
  setGlobalLoading: state.setGlobalLoading,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  setTheme: state.setTheme,
}))

export const useStudents = () => useAppStore((state) => ({
  currentStudent: state.currentStudent,
  students: state.students,
  totalCount: state.totalCount,
  isLoading: state.isLoading,
  error: state.error,
  filters: state.filters,
  setCurrentStudent: state.setCurrentStudent,
  setStudents: state.setStudents,
  setTotalCount: state.setTotalCount,
  setLoading: state.setLoading,
  setError: state.setError,
  setFilters: state.setFilters,
  resetFilters: state.resetFilters,
}))

export const useTeachers = () => useAppStore((state) => ({
  currentTeacher: state.currentTeacher,
  teachers: state.teachers,
  totalCount: state.totalCount,
  isLoading: state.isLoading,
  error: state.error,
  filters: state.filters,
  setCurrentTeacher: state.setCurrentTeacher,
  setTeachers: state.setTeachers,
  setTotalCount: state.setTotalCount,
  setLoading: state.setLoading,
  setError: state.setError,
  setFilters: state.setFilters,
  resetFilters: state.resetFilters,
}))

export const useAdmin = () => useAppStore((state) => ({
  dashboardStats: state.dashboardStats,
  statsLoading: state.statsLoading,
  statsError: state.statsError,
  analyticsData: state.analyticsData,
  analyticsRange: state.analyticsRange,
  analyticsLoading: state.analyticsLoading,
  systemSettings: state.systemSettings,
  settingsLoading: state.settingsLoading,
  setDashboardStats: state.setDashboardStats,
  setStatsLoading: state.setStatsLoading,
  setStatsError: state.setStatsError,
  setAnalyticsData: state.setAnalyticsData,
  setAnalyticsRange: state.setAnalyticsRange,
  setAnalyticsLoading: state.setAnalyticsLoading,
  setSystemSettings: state.setSystemSettings,
  setSettingsLoading: state.setSettingsLoading,
}))

// Store hydration helper for client-side
export const hydrateStore = () => {
  if (typeof window !== 'undefined') {
    useAppStore.persist.rehydrate()
  }
}

// Store reset helper
export const resetStore = () => {
  useAppStore.setState({
    // Reset to initial state
    user: null,
    role: null,
    isAdmin: false,
    isTeacher: false,
    isStudent: false,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    sidebarOpen: true,
    sidebarCollapsed: false,
    activeModal: null,
    modalData: null,
    globalLoading: false,
    loadingMessage: null,
    notifications: [],
    theme: 'system',
    currentStudent: null,
    students: [],
    currentTeacher: null,
    teachers: [],
    dashboardStats: null,
    analyticsData: null,
    systemSettings: null,
  })
}