import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import { UserRole } from '@/types/types'

// Simplified store interface
interface AppStore {
  // Auth state
  user: User | null
  role: UserRole | null
  isAdmin: boolean
  isTeacher: boolean
  isStudent: boolean
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // UI state
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  activeModal: string | null
  modalData: any
  globalLoading: boolean
  loadingMessage: string | null
  notifications: any[]
  theme: 'light' | 'dark' | 'system'
  
  // Student state
  currentStudent: any | null
  students: any[]
  studentTotalCount: number
  studentLoading: boolean
  studentError: string | null
  studentFilters: any
  
  // Teacher state
  currentTeacher: any | null
  teachers: any[]
  teacherTotalCount: number
  teacherLoading: boolean
  teacherError: string | null
  teacherFilters: any
  
  // Admin state
  dashboardStats: any | null
  statsLoading: boolean
  statsError: string | null
  analyticsData: any | null
  analyticsRange: { start: Date; end: Date }
  analyticsLoading: boolean
  systemSettings: any | null
  settingsLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  clearError: () => void
  
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  openModal: (modalId: string, data?: any) => void
  closeModal: () => void
  setGlobalLoading: (loading: boolean, message?: string) => void
  addNotification: (notification: any) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  
  setCurrentStudent: (student: any | null) => void
  setStudents: (students: any[]) => void
  setStudentTotalCount: (count: number) => void
  setStudentLoading: (loading: boolean) => void
  setStudentError: (error: string | null) => void
  setStudentFilters: (filters: any) => void
  resetStudentFilters: () => void
  
  setCurrentTeacher: (teacher: any | null) => void
  setTeachers: (teachers: any[]) => void
  setTeacherTotalCount: (count: number) => void
  setTeacherLoading: (loading: boolean) => void
  setTeacherError: (error: string | null) => void
  setTeacherFilters: (filters: any) => void
  resetTeacherFilters: () => void
  
  setDashboardStats: (stats: any | null) => void
  setStatsLoading: (loading: boolean) => void
  setStatsError: (error: string | null) => void
  setAnalyticsData: (data: any) => void
  setAnalyticsRange: (range: { start: Date; end: Date }) => void
  setAnalyticsLoading: (loading: boolean) => void
  setSystemSettings: (settings: any) => void
  setSettingsLoading: (loading: boolean) => void
}

// Create the unified store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Auth initial state
        user: null,
        role: null,
        isAdmin: false,
        isTeacher: false,
        isStudent: false,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        // UI initial state
        sidebarOpen: true,
        sidebarCollapsed: false,
        activeModal: null,
        modalData: null,
        globalLoading: false,
        loadingMessage: null,
        notifications: [],
        theme: 'system',
        
        // Student initial state
        currentStudent: null,
        students: [],
        studentTotalCount: 0,
        studentLoading: false,
        studentError: null,
        studentFilters: {
          search: '',
          status: null,
          courseType: null,
          teacherId: null,
          sortBy: 'created_at',
          sortOrder: 'desc',
          page: 1,
          pageSize: 10,
        },
        
        // Teacher initial state
        currentTeacher: null,
        teachers: [],
        teacherTotalCount: 0,
        teacherLoading: false,
        teacherError: null,
        teacherFilters: {
          search: '',
          status: null,
          availability: null,
          sortBy: 'created_at',
          sortOrder: 'desc',
          page: 1,
          pageSize: 10,
        },
        
        // Admin initial state
        dashboardStats: null,
        statsLoading: false,
        statsError: null,
        analyticsData: null,
        analyticsRange: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          end: new Date(),
        },
        analyticsLoading: false,
        systemSettings: null,
        settingsLoading: false,
        
        // Auth actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setRole: (role) => set({ 
          role, 
          isAdmin: role === 'admin',
          isTeacher: role === 'teacher',
          isStudent: role === 'student' 
        }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        logout: () => set({
          user: null,
          role: null,
          isAdmin: false,
          isTeacher: false,
          isStudent: false,
          isAuthenticated: false,
          error: null,
        }),
        clearError: () => set({ error: null }),
        
        // UI actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        openModal: (modalId, data) => set({ activeModal: modalId, modalData: data }),
        closeModal: () => set({ activeModal: null, modalData: null }),
        setGlobalLoading: (loading, message) => set({ globalLoading: loading, loadingMessage: message || null }),
        addNotification: (notification) => {
          const id = Date.now().toString()
          const newNotification = {
            ...notification,
            id,
            timestamp: new Date(),
          }
          set((state) => ({ notifications: [...state.notifications, newNotification] }))
          
          // Auto-remove notification after duration
          if (notification.duration !== 0) {
            setTimeout(() => {
              get().removeNotification(id)
            }, notification.duration || 5000)
          }
        },
        removeNotification: (id) => set((state) => ({ 
          notifications: state.notifications.filter(n => n.id !== id) 
        })),
        clearNotifications: () => set({ notifications: [] }),
        setTheme: (theme) => set({ theme }),
        
        // Student actions
        setCurrentStudent: (student) => set({ currentStudent: student }),
        setStudents: (students) => set({ students, studentLoading: false }),
        setStudentTotalCount: (count) => set({ studentTotalCount: count }),
        setStudentLoading: (loading) => set({ studentLoading: loading }),
        setStudentError: (error) => set({ studentError: error, studentLoading: false }),
        setStudentFilters: (filters) => set((state) => ({ 
          studentFilters: { ...state.studentFilters, ...filters } 
        })),
        resetStudentFilters: () => set({
          studentFilters: {
            search: '',
            status: null,
            courseType: null,
            teacherId: null,
            sortBy: 'created_at',
            sortOrder: 'desc',
            page: 1,
            pageSize: 10,
          }
        }),
        
        // Teacher actions
        setCurrentTeacher: (teacher) => set({ currentTeacher: teacher }),
        setTeachers: (teachers) => set({ teachers, teacherLoading: false }),
        setTeacherTotalCount: (count) => set({ teacherTotalCount: count }),
        setTeacherLoading: (loading) => set({ teacherLoading: loading }),
        setTeacherError: (error) => set({ teacherError: error, teacherLoading: false }),
        setTeacherFilters: (filters) => set((state) => ({ 
          teacherFilters: { ...state.teacherFilters, ...filters } 
        })),
        resetTeacherFilters: () => set({
          teacherFilters: {
            search: '',
            status: null,
            availability: null,
            sortBy: 'created_at',
            sortOrder: 'desc',
            page: 1,
            pageSize: 10,
          }
        }),
        
        // Admin actions
        setDashboardStats: (stats) => set({ dashboardStats: stats, statsLoading: false }),
        setStatsLoading: (loading) => set({ statsLoading: loading }),
        setStatsError: (error) => set({ statsError: error, statsLoading: false }),
        setAnalyticsData: (data) => set({ analyticsData: data, analyticsLoading: false }),
        setAnalyticsRange: (range) => set({ analyticsRange: range }),
        setAnalyticsLoading: (loading) => set({ analyticsLoading: loading }),
        setSystemSettings: (settings) => set({ systemSettings: settings, settingsLoading: false }),
        setSettingsLoading: (loading) => set({ settingsLoading: loading }),
      }),
      {
        name: 'hey-peter-app-store',
        partialize: (state) => ({
          role: state.role,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
        skipHydration: true,
      }
    ),
    {
      name: 'hey-peter-store',
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
  totalCount: state.studentTotalCount,
  isLoading: state.studentLoading,
  error: state.studentError,
  filters: state.studentFilters,
  setCurrentStudent: state.setCurrentStudent,
  setStudents: state.setStudents,
  setTotalCount: state.setStudentTotalCount,
  setLoading: state.setStudentLoading,
  setError: state.setStudentError,
  setFilters: state.setStudentFilters,
  resetFilters: state.resetStudentFilters,
}))

export const useTeachers = () => useAppStore((state) => ({
  currentTeacher: state.currentTeacher,
  teachers: state.teachers,
  totalCount: state.teacherTotalCount,
  isLoading: state.teacherLoading,
  error: state.teacherError,
  filters: state.teacherFilters,
  setCurrentTeacher: state.setCurrentTeacher,
  setTeachers: state.setTeachers,
  setTotalCount: state.setTeacherTotalCount,
  setLoading: state.setTeacherLoading,
  setError: state.setTeacherError,
  setFilters: state.setTeacherFilters,
  resetFilters: state.resetTeacherFilters,
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
    user: null,
    role: null,
    isAdmin: false,
    isTeacher: false,
    isStudent: false,
    isAuthenticated: false,
    isLoading: false,
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