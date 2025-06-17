import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  user_metadata: {
    role?: 'admin' | 'teacher' | 'student'
    full_name?: string
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    throw error
  }
  
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw error
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw error
  }
  
  return user as AuthUser | null
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    throw error
  }
  
  return session
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user as AuthUser | null)
  })
}

export function getUserRole(user: AuthUser | null): 'admin' | 'teacher' | 'student' | null {
  return user?.user_metadata?.role || null
}

export function isAdmin(user: AuthUser | null): boolean {
  return getUserRole(user) === 'admin'
}

export function isTeacher(user: AuthUser | null): boolean {
  return getUserRole(user) === 'teacher'
}

export function isStudent(user: AuthUser | null): boolean {
  return getUserRole(user) === 'student'
}