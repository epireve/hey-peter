import { type NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'
import { UserRole } from '@/types/types'

const protectedRoutes: Record<UserRole, string[]> = {
  admin: ['/admin'],
  teacher: ['/teacher'],
  student: ['/student', '/dashboard'],
}

const authRoutes = ['/login', '/signup', '/password-reset']
const publicRoutes = ['/']

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    if (
      !authRoutes.includes(pathname) &&
      !publicRoutes.includes(pathname) &&
      !pathname.startsWith('/api')
    ) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  const userRole = (data.user?.user_metadata?.role as UserRole) || 'student'

  const isProtectedRoute = Object.values(protectedRoutes)
    .flat()
    .some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    const allowedRoutes = protectedRoutes[userRole] || []
    if (!allowedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  if (authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}