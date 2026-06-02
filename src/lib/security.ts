import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the Origin header to prevent CSRF attacks on state-changing routes.
 * Allows same-origin requests and requests from the configured app URL.
 */
export function validateOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // In development, skip origin validation — CSRF is a production threat,
  // and dev environments use proxies, tunnels, and various local IPs.
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    return null;
  }

  // Production: require either Origin or Referer header for CSRF protection.
  // Same-origin fetch sends Origin header. If missing, check Referer as fallback.
  const source = origin || referer;
  if (!source) {
    return NextResponse.json(
      { success: false, error: 'Missing origin or referer header' },
      { status: 403 }
    );
  }

  try {
    const sourceUrl = new URL(source);
    const allowedUrl = new URL(allowedOrigin);

    if (sourceUrl.origin !== allowedUrl.origin) {
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
