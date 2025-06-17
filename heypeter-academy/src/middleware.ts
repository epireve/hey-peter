import { type NextRequest } from 'next/server'
import { authMiddleware } from './lib/auth'

export function middleware(req: NextRequest) {
  return authMiddleware(req)
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