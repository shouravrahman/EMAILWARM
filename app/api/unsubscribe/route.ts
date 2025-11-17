import { NextRequest, NextResponse } from 'next/server';
import { UnsubscribeManager } from '@/lib/unsubscribe';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetAt) {
    // Reset or create new limit
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + 60000, // 1 minute window
    });
    return true;
  }

  if (limit.count >= 10) {
    // Max 10 requests per minute
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Process unsubscribe
    const result = await UnsubscribeManager.processUnsubscribe(token);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      message: 'Successfully unsubscribed',
    });
  } catch (error) {
    console.error('Error in unsubscribe API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for direct link clicks (redirects to page with token)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe', request.url));
  }

  // Redirect to the unsubscribe page with token
  return NextResponse.redirect(new URL(`/unsubscribe?token=${token}`, request.url));
}
