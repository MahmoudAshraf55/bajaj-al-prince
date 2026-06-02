import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the Origin header to prevent CSRF attacks on state-changing routes.
 * Allows same-origin requests and requests from the configured app URL.
 */
export function validateOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // If no origin header (e.g., same-origin fetch or mobile app), allow it
  if (!origin) {
    return null;
  }

  try {
    const originUrl = new URL(origin);
    const allowedUrl = new URL(allowedOrigin);

    // In development, allow any localhost origin regardless of port
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && originUrl.hostname === 'localhost') {
      return null;
    }

    if (originUrl.origin !== allowedUrl.origin) {
      if (referer) {
        const refererUrl = new URL(referer);
        if (refererUrl.origin === allowedUrl.origin) {
          return null;
        }
      }
      return NextResponse.json(
        { success: false, error: 'Invalid origin' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid origin' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Security headers to append to API responses.
 */
export const apiSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Appends security headers to a NextResponse.
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(apiSecurityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
