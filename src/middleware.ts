import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is signed in and the current path is /login or /signup redirect the user to /admin/dashboard
  if (user && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url))
  }

  // If user is not signed in and the current path requires authentication, redirect the user to /login
  const protectedPaths = ['/admin', '/teacher', '/student', '/dashboard']
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))
  
  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/password-reset',
  ],
}