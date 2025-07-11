import { StateCreator } from 'zustand'
import { AuthState } from '../types'

export const createAuthSlice: StateCreator<
  AuthState,
  [],
  [],
  AuthState
> = (set) => ({
  user: null,
  role: null,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    })),

  setRole: (role) =>
    set((state) => ({
      role,
      isAdmin: role === 'admin',
      isTeacher: role === 'teacher',
      isStudent: role === 'student',
    })),

  setLoading: (loading) =>
    set((state) => ({
      isLoading: loading,
    })),

  setError: (error) =>
    set((state) => ({
      error,
      isLoading: false,
    })),

  logout: () =>
    set((state) => ({
      user: null,
      role: null,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })),

  clearError: () =>
    set((state) => ({
      error: null,
    })),
})