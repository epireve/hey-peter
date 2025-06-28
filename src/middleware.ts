import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);

  if (
    !session &&
    (url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/teacher') ||
      url.pathname.startsWith('/student'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && (url.pathname === '/login' || url.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (session && url.pathname.startsWith('/admin')) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (error || !data || data.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/login',
    '/signup',
  ],
};