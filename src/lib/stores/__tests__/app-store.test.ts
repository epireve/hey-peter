import { renderHook, act } from '@testing-library/react'
import { useAppStore, useAuth, useUI, useStudents, useTeachers, useAdmin } from '../app-store'
import { storeUtils } from '../utils'

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('App Store', () => {
  beforeEach(() => {
    // Reset store before each test
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
      totalCount: 0,
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
      currentTeacher: null,
      teachers: [],
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
    
    // Clear localStorage mocks
    jest.clearAllMocks()
  })

  describe('Auth Slice', () => {
    it('should initialize with default auth state', () => {
      const { result } = renderHook(() => useAuth())
      
      expect(result.current.user).toBeNull()
      expect(result.current.role).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isTeacher).toBe(false)
      expect(result.current.isStudent).toBe(false)
    })

    it('should set user and update authentication state', () => {
      const { result } = renderHook(() => useAuth())
      const mockUser = { id: '1', email: 'test@example.com' } as any

      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.user).toBe(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should set role and update role flags', () => {
      const { result } = renderHook(() => useAuth())

      act(() => {
        result.current.setRole('admin')
      })

      expect(result.current.role).toBe('admin')
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isTeacher).toBe(false)
      expect(result.current.isStudent).toBe(false)
    })

    it('should logout and reset auth state', () => {
      const { result } = renderHook(() => useAuth())
      const mockUser = { id: '1', email: 'test@example.com' } as any

      // Set user first
      act(() => {
        result.current.setUser(mockUser)
        result.current.setRole('admin')
      })

      // Then logout
      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.role).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })
  })

  describe('UI Slice', () => {
    it('should initialize with default UI state', () => {
      const { result } = renderHook(() => useUI())
      
      expect(result.current.sidebarOpen).toBe(true)
      expect(result.current.sidebarCollapsed).toBe(false)
      expect(result.current.activeModal).toBeNull()
      expect(result.current.notifications).toEqual([])
      expect(result.current.theme).toBe('system')
    })

    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useUI())

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.sidebarOpen).toBe(false)
    })

    it('should open and close modals', () => {
      const { result } = renderHook(() => useUI())

      act(() => {
        result.current.openModal('test-modal', { data: 'test' })
      })

      expect(result.current.activeModal).toBe('test-modal')
      expect(result.current.modalData).toEqual({ data: 'test' })

      act(() => {
        result.current.closeModal()
      })

      expect(result.current.activeModal).toBeNull()
      expect(result.current.modalData).toBeNull()
    })

    it('should add and remove notifications', () => {
      const { result } = renderHook(() => useUI())

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Test notification',
          message: 'Test message',
        })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].title).toBe('Test notification')

      const notificationId = result.current.notifications[0].id

      act(() => {
        result.current.removeNotification(notificationId)
      })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('should set theme', () => {
      const { result } = renderHook(() => useUI())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })
  })

  describe('Student Slice', () => {
    it('should initialize with default student state', () => {
      const { result } = renderHook(() => useStudents())
      
      expect(result.current.currentStudent).toBeNull()
      expect(result.current.students).toEqual([])
      expect(result.current.totalCount).toBe(0)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set students', () => {
      const { result } = renderHook(() => useStudents())
      const mockStudents = [{ id: '1', name: 'John Doe' }, { id: '2', name: 'Jane Smith' }]

      act(() => {
        result.current.setStudents(mockStudents)
      })

      expect(result.current.students).toBe(mockStudents)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set current student', () => {
      const { result } = renderHook(() => useStudents())
      const mockStudent = { id: '1', name: 'John Doe' }

      act(() => {
        result.current.setCurrentStudent(mockStudent)
      })

      expect(result.current.currentStudent).toBe(mockStudent)
    })

    it('should update filters', () => {
      const { result } = renderHook(() => useStudents())

      act(() => {
        result.current.setFilters({ search: 'John', status: 'active' })
      })

      expect(result.current.filters.search).toBe('John')
      expect(result.current.filters.status).toBe('active')
    })

    it('should reset filters', () => {
      const { result } = renderHook(() => useStudents())

      // Set some filters first
      act(() => {
        result.current.setFilters({ search: 'John', status: 'active' })
      })

      // Then reset
      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.filters.search).toBe('')
      expect(result.current.filters.status).toBeNull()
    })
  })

  describe('Teacher Slice', () => {
    it('should initialize with default teacher state', () => {
      const { result } = renderHook(() => useTeachers())
      
      expect(result.current.currentTeacher).toBeNull()
      expect(result.current.teachers).toEqual([])
      expect(result.current.totalCount).toBe(0)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set teachers', () => {
      const { result } = renderHook(() => useTeachers())
      const mockTeachers = [{ id: '1', name: 'Teacher One' }, { id: '2', name: 'Teacher Two' }]

      act(() => {
        result.current.setTeachers(mockTeachers)
      })

      expect(result.current.teachers).toBe(mockTeachers)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Admin Slice', () => {
    it('should initialize with default admin state', () => {
      const { result } = renderHook(() => useAdmin())
      
      expect(result.current.dashboardStats).toBeNull()
      expect(result.current.statsLoading).toBe(false)
      expect(result.current.analyticsData).toBeNull()
      expect(result.current.systemSettings).toBeNull()
    })

    it('should set dashboard stats', () => {
      const { result } = renderHook(() => useAdmin())
      const mockStats = {
        totalStudents: 100,
        activeStudents: 80,
        totalTeachers: 10,
        activeTeachers: 8,
        totalClasses: 50,
        upcomingClasses: 20,
        revenue: { monthly: 5000, yearly: 60000 },
        growth: { students: 10, teachers: 2, revenue: 5 },
      }

      act(() => {
        result.current.setDashboardStats(mockStats)
      })

      expect(result.current.dashboardStats).toBe(mockStats)
      expect(result.current.statsLoading).toBe(false)
    })

    it('should set analytics data', () => {
      const { result } = renderHook(() => useAdmin())
      const mockAnalytics = { data: 'test analytics' }

      act(() => {
        result.current.setAnalyticsData(mockAnalytics)
      })

      expect(result.current.analyticsData).toBe(mockAnalytics)
    })
  })

  describe('Store Utils', () => {
    it('should reset auth state', () => {
      // Set some auth state first
      useAppStore.setState({
        user: { id: '1', email: 'test@example.com' } as any,
        role: 'admin',
        isAdmin: true,
        isAuthenticated: true,
      })

      storeUtils.resetAuth()

      const state = useAppStore.getState()
      expect(state.user).toBeNull()
      expect(state.role).toBeNull()
      expect(state.isAdmin).toBe(false)
      expect(state.isAuthenticated).toBe(false)
    })

    it('should reset UI state', () => {
      // Set some UI state first
      useAppStore.setState({
        sidebarOpen: false,
        theme: 'dark',
        notifications: [{ id: '1', type: 'success', title: 'Test', timestamp: new Date() }],
      })

      storeUtils.resetUI()

      const state = useAppStore.getState()
      expect(state.sidebarOpen).toBe(true)
      expect(state.theme).toBe('system')
      expect(state.notifications).toEqual([])
    })
  })

  describe('Persistence', () => {
    it('should persist selected state', () => {
      const { result } = renderHook(() => useUI())

      act(() => {
        result.current.setTheme('dark')
        result.current.setSidebarCollapsed(true)
      })

      // Persistence is handled by zustand middleware
      // We would need to test the actual persistence mechanism
      expect(result.current.theme).toBe('dark')
      expect(result.current.sidebarCollapsed).toBe(true)
    })
  })
})