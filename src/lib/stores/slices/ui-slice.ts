import { StateCreator } from 'zustand'
import { UIState, Notification } from '../types'

export const createUISlice: StateCreator<
  UIState,
  [],
  [],
  UIState
> = (set, get) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
    
  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),
    
  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  // Modals
  activeModal: null,
  modalData: null,
  
  openModal: (modalId, data) =>
    set({
      activeModal: modalId,
      modalData: data,
    }),
    
  closeModal: () =>
    set({
      activeModal: null,
      modalData: null,
    }),

  // Loading states
  globalLoading: false,
  loadingMessage: null,
  
  setGlobalLoading: (loading, message) =>
    set({
      globalLoading: loading,
      loadingMessage: message || null,
    }),

  // Notifications
  notifications: [],
  
  addNotification: (notification) => {
    const id = Date.now().toString()
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    }
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))
    
    // Auto-remove notification after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration || 5000)
    }
  },
  
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    })),
    
  clearNotifications: () =>
    set({ notifications: [] }),

  // Theme
  theme: 'system',
  
  setTheme: (theme) => {
    set({ theme })
    
    // Apply theme to document
    if (theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },
})