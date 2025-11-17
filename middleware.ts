import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { getRateLimiter, RATE_LIMITS } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Handle session and authentication first
  const response = await updateSession(request)
  
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResult = await applyRateLimit(request)
    if (rateLimitResult) {
      return rateLimitResult
    }
  }
  
  return response
}

async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  // Skip rate limiting for webhook and tracking endpoints
  if (
    request.nextUrl.pathname.startsWith('/api/webhooks') ||
    request.nextUrl.pathname.startsWith('/api/track')
  ) {
    return null
  }

  // Check if user is admin (exempt from rate limiting)
  const isAdmin = await checkAdminStatus(request)
  if (isAdmin) {
    return null
  }

  // Find matching rate limit configuration
  const rateLimitConfig = Object.entries(RATE_LIMITS).find(([path]) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!rateLimitConfig) {
    return null // No rate limit configured for this endpoint
  }

  const [, config] = rateLimitConfig
  const rateLimiter = getRateLimiter()
  const key = config.keyGenerator(request)
  const result = await rateLimiter.check(key, config)

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.resetAt,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': result.resetAt.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
        },
      }
    )
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.resetAt.toString())

  return null // Continue with normal processing
}

async function checkAdminStatus(request: NextRequest): Promise<boolean> {
  // Check for admin emails from environment variable
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e: string) => e.trim().toLowerCase()) || []
  
  if (adminEmails.length === 0) {
    return false
  }

  // Try to get user email from the request
  // This is a simplified check - in production you'd want to verify the user's email
  // from the session/token
  const userEmail = request.headers.get('x-user-email')?.toLowerCase()
  
  if (userEmail && adminEmails.includes(userEmail)) {
    return true
  }

  return false
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks (webhook endpoints)
     * - api/track (tracking endpoints)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/track|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}