import { useAppStore } from './app-store'

// Store debugging utilities
export const storeUtils = {
  // Get current store state
  getState: () => useAppStore.getState(),
  
  // Subscribe to store changes
  subscribe: (callback: (state: any) => void) => useAppStore.subscribe(callback),
  
  // Reset specific slices
  resetAuth: () => {
    useAppStore.setState({
      user: null,
      role: null,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  },
  
  resetUI: () => {
    useAppStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: null,
      notifications: [],
      theme: 'system',
    })
  },
  
  resetStudents: () => {
    useAppStore.setState({
      currentStudent: null,
      students: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      filters: {
        search: '',
        status: null,
        courseType: null,
        teacherId: null,
        sortBy: 'created_at',
        sortOrder: 'desc',
        page: 1,
        pageSize: 10,
      },
    })
  },
  
  resetTeachers: () => {
    useAppStore.setState({
      currentTeacher: null,
      teachers: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      filters: {
        search: '',
        status: null,
        availability: null,
        sortBy: 'created_at',
        sortOrder: 'desc',
        page: 1,
        pageSize: 10,
      },
    })
  },
  
  resetAdmin: () => {
    useAppStore.setState({
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
    })
  },
  
  // Development helpers
  logState: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Current store state:', useAppStore.getState())
    }
  },
  
  // Clear persisted state
  clearPersistedState: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hey-peter-app-store')
    }
  },
}

// Performance monitoring
export const performanceUtils = {
  // Track state changes
  trackStateChanges: () => {
    if (process.env.NODE_ENV === 'development') {
      let previousState = useAppStore.getState()
      
      return useAppStore.subscribe((state) => {
        const changedKeys = Object.keys(state).filter(
          key => state[key] !== previousState[key]
        )
        
        if (changedKeys.length > 0) {
          console.log('State changed:', changedKeys)
        }
        
        previousState = state
      })
    }
  },
  
  // Measure render performance
  measureRender: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now()
      
      return () => {
        const end = performance.now()
        console.log(`${componentName} render time: ${end - start}ms`)
      }
    }
    
    return () => {}
  },
}

// Type guards
export const typeGuards = {
  isAuthState: (obj: any): obj is import('./types').AuthState => {
    return obj && typeof obj.setUser === 'function' && typeof obj.setRole === 'function'
  },
  
  isUIState: (obj: any): obj is import('./types').UIState => {
    return obj && typeof obj.toggleSidebar === 'function' && typeof obj.openModal === 'function'
  },
  
  isStudentState: (obj: any): obj is import('./types').StudentState => {
    return obj && typeof obj.setStudents === 'function' && Array.isArray(obj.students)
  },
  
  isTeacherState: (obj: any): obj is import('./types').TeacherState => {
    return obj && typeof obj.setTeachers === 'function' && Array.isArray(obj.teachers)
  },
  
  isAdminState: (obj: any): obj is import('./types').AdminState => {
    return obj && typeof obj.setDashboardStats === 'function'
  },
}

// Migration helpers
export const migrationUtils = {
  // Migrate from old auth store
  migrateAuthStore: (oldAuthState: any) => {
    if (oldAuthState) {
      useAppStore.setState({
        user: oldAuthState.user,
        role: oldAuthState.role,
        isAdmin: oldAuthState.isAdmin,
        isTeacher: oldAuthState.isTeacher,
        isStudent: oldAuthState.isStudent,
        isAuthenticated: !!oldAuthState.user,
        isLoading: false,
        error: null,
      })
    }
  },
  
  // Validate migrated state
  validateMigratedState: () => {
    const state = useAppStore.getState()
    
    // Check auth state
    if (state.user && !state.isAuthenticated) {
      console.warn('Auth state inconsistency: user exists but isAuthenticated is false')
    }
    
    // Check role consistency
    if (state.role) {
      const expectedRoleFlags = {
        isAdmin: state.role === 'admin',
        isTeacher: state.role === 'teacher',
        isStudent: state.role === 'student',
      }
      
      Object.entries(expectedRoleFlags).forEach(([key, expected]) => {
        if (state[key] !== expected) {
          console.warn(`Role flag inconsistency: ${key} should be ${expected}`)
        }
      })
    }
    
    return true
  },
}