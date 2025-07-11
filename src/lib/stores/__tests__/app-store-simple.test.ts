import { renderHook, act } from '@testing-library/react'
import { create } from 'zustand'

// Create a test store without middleware
const createTestStore = () => create((set, get) => ({
  // Auth state
  user: null,
  role: null,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // UI state
  sidebarOpen: true,
  sidebarCollapsed: false,
  notifications: [],
  theme: 'system',

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setRole: (role) => set({ 
    role, 
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isStudent: role === 'student' 
  }),
  logout: () => set({
    user: null,
    role: null,
    isAdmin: false,
    isTeacher: false,
    isStudent: false,
    isAuthenticated: false,
    error: null,
  }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  addNotification: (notification) => {
    const id = Date.now().toString()
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    }
    set((state) => ({ notifications: [...state.notifications, newNotification] }))
  },
  removeNotification: (id) => set((state) => ({ 
    notifications: state.notifications.filter(n => n.id !== id) 
  })),
  setTheme: (theme) => set({ theme }),
}))

describe('Simple Store Tests', () => {
  let useTestStore

  beforeEach(() => {
    useTestStore = createTestStore()
  })

  describe('Auth State', () => {
    it('should initialize with default auth state', () => {
      const { result } = renderHook(() => useTestStore())
      
      expect(result.current.user).toBeNull()
      expect(result.current.role).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isTeacher).toBe(false)
      expect(result.current.isStudent).toBe(false)
    })

    it('should set user and update authentication state', () => {
      const { result } = renderHook(() => useTestStore())
      const mockUser = { id: '1', email: 'test@example.com' }

      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.user).toBe(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should set role and update role flags', () => {
      const { result } = renderHook(() => useTestStore())

      act(() => {
        result.current.setRole('admin')
      })

      expect(result.current.role).toBe('admin')
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isTeacher).toBe(false)
      expect(result.current.isStudent).toBe(false)
    })

    it('should logout and reset auth state', () => {
      const { result } = renderHook(() => useTestStore())
      const mockUser = { id: '1', email: 'test@example.com' }

      act(() => {
        result.current.setUser(mockUser)
        result.current.setRole('admin')
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.role).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })
  })

  describe('UI State', () => {
    it('should initialize with default UI state', () => {
      const { result } = renderHook(() => useTestStore())
      
      expect(result.current.sidebarOpen).toBe(true)
      expect(result.current.sidebarCollapsed).toBe(false)
      expect(result.current.notifications).toEqual([])
      expect(result.current.theme).toBe('system')
    })

    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useTestStore())

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.sidebarOpen).toBe(false)
    })

    it('should add and remove notifications', () => {
      const { result } = renderHook(() => useTestStore())

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
      const { result } = renderHook(() => useTestStore())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })
  })
})