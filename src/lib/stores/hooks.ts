import { useCallback, useEffect } from 'react'
import { useAppStore, useAuth, useUI, useStudents, useTeachers, useAdmin } from './app-store'
import { User } from '@supabase/supabase-js'
import { UserRole } from '@/types/types'

// Enhanced auth hooks
export const useAuthActions = () => {
  const { setUser, setRole, setLoading, setError, logout, clearError } = useAuth()
  
  const login = useCallback(async (user: User, role: UserRole) => {
    try {
      setLoading(true)
      setUser(user)
      setRole(role)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }, [setUser, setRole, setLoading, setError])

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true)
      logout()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Logout failed')
    } finally {
      setLoading(false)
    }
  }, [logout, setLoading, setError])

  return {
    login,
    logout: handleLogout,
    setUser,
    setRole,
    setLoading,
    setError,
    clearError,
  }
}

// Enhanced UI hooks
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUI()
  
  const showSuccess = useCallback((title: string, message?: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: 5000,
    })
  }, [addNotification])

  const showError = useCallback((title: string, message?: string) => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 7000,
    })
  }, [addNotification])

  const showWarning = useCallback((title: string, message?: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
    })
  }, [addNotification])

  const showInfo = useCallback((title: string, message?: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 5000,
    })
  }, [addNotification])

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearNotifications,
  }
}

export const useModal = () => {
  const { activeModal, modalData, openModal, closeModal } = useUI()
  
  const isOpen = useCallback((modalId: string) => {
    return activeModal === modalId
  }, [activeModal])

  return {
    activeModal,
    modalData,
    openModal,
    closeModal,
    isOpen,
  }
}

export const useTheme = () => {
  const { theme, setTheme } = useUI()
  
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])
  
  // Apply theme on mount and changes
  useEffect(() => {
    if (theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}

// Enhanced student hooks
export const useStudentActions = () => {
  const { 
    setStudents, 
    setCurrentStudent, 
    setLoading, 
    setError, 
    setTotalCount,
    setFilters,
    resetFilters 
  } = useStudents()

  const loadStudents = useCallback(async (students: any[], totalCount: number) => {
    try {
      setLoading(true)
      setStudents(students)
      setTotalCount(totalCount)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [setStudents, setTotalCount, setLoading, setError])

  const selectStudent = useCallback((student: any) => {
    setCurrentStudent(student)
  }, [setCurrentStudent])

  return {
    loadStudents,
    selectStudent,
    setFilters,
    resetFilters,
    setLoading,
    setError,
  }
}

// Enhanced teacher hooks
export const useTeacherActions = () => {
  const { 
    setTeachers, 
    setCurrentTeacher, 
    setLoading, 
    setError, 
    setTotalCount,
    setFilters,
    resetFilters 
  } = useTeachers()

  const loadTeachers = useCallback(async (teachers: any[], totalCount: number) => {
    try {
      setLoading(true)
      setTeachers(teachers)
      setTotalCount(totalCount)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }, [setTeachers, setTotalCount, setLoading, setError])

  const selectTeacher = useCallback((teacher: any) => {
    setCurrentTeacher(teacher)
  }, [setCurrentTeacher])

  return {
    loadTeachers,
    selectTeacher,
    setFilters,
    resetFilters,
    setLoading,
    setError,
  }
}

// Enhanced admin hooks
export const useAdminActions = () => {
  const { 
    setDashboardStats, 
    setStatsLoading, 
    setStatsError,
    setAnalyticsData,
    setAnalyticsRange,
    setAnalyticsLoading,
    setSystemSettings,
    setSettingsLoading 
  } = useAdmin()

  const loadDashboardStats = useCallback(async (stats: any) => {
    try {
      setStatsLoading(true)
      setDashboardStats(stats)
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Failed to load dashboard stats')
    } finally {
      setStatsLoading(false)
    }
  }, [setDashboardStats, setStatsLoading, setStatsError])

  const loadAnalytics = useCallback(async (data: any) => {
    try {
      setAnalyticsLoading(true)
      setAnalyticsData(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [setAnalyticsData, setAnalyticsLoading])

  return {
    loadDashboardStats,
    loadAnalytics,
    setAnalyticsRange,
    setSystemSettings,
    setSettingsLoading,
  }
}

// Store hydration hook for client-side
export const useStoreHydration = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      useAppStore.persist.rehydrate()
    }
  }, [])
}

// Store subscription hook for debugging
export const useStoreSubscription = (callback: (state: any) => void) => {
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(callback)
    return unsubscribe
  }, [callback])
}