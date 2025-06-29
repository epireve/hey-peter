import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { UserRole } from '@/types/types'

interface AuthState {
  user: User | null
  role: UserRole | null
  isAdmin: boolean
  isTeacher: boolean
  isStudent: boolean
  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  role: null,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  setUser: user => set({ user }),
  setRole: role =>
    set({
      role,
      isAdmin: role === 'admin',
      isTeacher: role === 'teacher',
      isStudent: role === 'student',
    }),
}))