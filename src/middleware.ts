import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';

/**
 * Attempts to silently refresh the access token using the refresh token.
 * Returns the new token string if successful, null otherwise.
 */
async function trySilentRefresh(request: NextRequest): Promise<string | null> {
  try {
    const refreshRes = await fetch(new URL('/api/auth/refresh', request.url), {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (refreshRes.ok && refreshRes.status === 200) {
      // Extract the new admin_token from the Set-Cookie header
      const setCookie = refreshRes.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/admin_token=([^;]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all admin routes except the login page itself
  if (pathname.startsWith('/admin') && pathname !== '/admin' && pathname !== '/admin/') {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/', request.url));
    }

    let payload = await verifyToken(token);

    // If token expired, try silent refresh
    if (!payload) {
      const newToken = await trySilentRefresh(request);
      if (newToken) {
        payload = await verifyToken(newToken);
      }
    }

    if (!payload) {
      const response = NextResponse.redirect(new URL('/admin/', request.url));
      response.cookies.delete('admin_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    // RBAC: only admin, staff, and viewer roles may access admin dashboard
    if (!['admin', 'staff', 'viewer'].includes(payload.role)) {
      const response = NextResponse.redirect(new URL('/admin/', request.url));
      response.cookies.delete('admin_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    // Pass user context downstream via headers (read-only, not security-critical)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-name', payload.username);
    requestHeaders.set('x-tenant-id', payload.tenantId || DEFAULT_TENANT_ID);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
