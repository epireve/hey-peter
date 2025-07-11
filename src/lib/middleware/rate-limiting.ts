import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '../utils/security';

// Create rate limiters for different endpoints
const apiLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute for API
const authLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes for auth
const generalLimiter = new RateLimiter(200, 60 * 1000); // 200 requests per minute for general endpoints

/**
 * Get client identifier for rate limiting
 * @param request - Next.js request object
 * @returns Client identifier string
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from session if authenticated
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware
 * @param request - Next.js request object
 * @param path - Request path for determining rate limit rules
 * @returns Response if rate limited, null if allowed
 */
export function rateLimitMiddleware(request: NextRequest, path: string): NextResponse | null {
  const clientId = getClientId(request);
  
  let limiter: RateLimiter;
  let limitType: string;
  
  // Determine which rate limiter to use based on path
  if (path.startsWith('/api/auth/') || path.includes('login') || path.includes('signup')) {
    limiter = authLimiter;
    limitType = 'auth';
  } else if (path.startsWith('/api/')) {
    limiter = apiLimiter;
    limitType = 'api';
  } else {
    limiter = generalLimiter;
    limitType = 'general';
  }
  
  if (!limiter.isAllowed(clientId)) {
    const remainingRequests = limiter.getRemainingRequests(clientId);
    
    console.warn(`Rate limit exceeded for ${clientId} on ${limitType} endpoint: ${path}`);
    
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        type: limitType,
        retryAfter: 60 // seconds
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limiter['maxRequests']),
          'X-RateLimit-Remaining': String(remainingRequests),
          'X-RateLimit-Reset': String(Date.now() + limiter['windowMs']),
          'Retry-After': '60'
        }
      }
    );
  }
  
  // Request is allowed, add rate limit headers to response
  const remainingRequests = limiter.getRemainingRequests(clientId);
  
  return NextResponse.next({
    headers: {
      'X-RateLimit-Limit': String(limiter['maxRequests']),
      'X-RateLimit-Remaining': String(remainingRequests),
      'X-RateLimit-Reset': String(Date.now() + limiter['windowMs'])
    }
  });
}

/**
 * API route wrapper with rate limiting
 * @param handler - API route handler
 * @param options - Rate limiting options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    maxRequests?: number;
    windowMs?: number;
  } = {}
) {
  const limiter = new RateLimiter(
    options.maxRequests || 60, // 60 requests per minute default
    options.windowMs || 60 * 1000
  );
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientId = getClientId(request);
    
    if (!limiter.isAllowed(clientId)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(options.windowMs || 60000 / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(options.maxRequests || 60),
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(Math.ceil((options.windowMs || 60000) / 1000))
          }
        }
      );
    }
    
    try {
      const response = await handler(request);
      
      // Add rate limit headers to successful responses
      const remainingRequests = limiter.getRemainingRequests(clientId);
      response.headers.set('X-RateLimit-Limit', String(options.maxRequests || 60));
      response.headers.set('X-RateLimit-Remaining', String(remainingRequests));
      response.headers.set('X-RateLimit-Reset', String(Date.now() + (options.windowMs || 60000)));
      
      return response;
    } catch (error) {
      console.error('API handler error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Cleanup function to remove expired rate limit entries
 * Should be called periodically (e.g., via cron job)
 */
export function cleanupRateLimiters(): void {
  apiLimiter.cleanup();
  authLimiter.cleanup();
  generalLimiter.cleanup();
}

// Auto-cleanup every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(cleanupRateLimiters, 5 * 60 * 1000);
}