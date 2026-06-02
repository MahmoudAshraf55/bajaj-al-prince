import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all admin routes except the login page itself
  if (pathname.startsWith('/admin') && pathname !== '/admin' && pathname !== '/admin/') {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/admin/', request.url));
      response.cookies.delete('admin_token');
      return response;
    }

    // RBAC: only admin, staff, and viewer roles may access admin dashboard
    if (!['admin', 'staff', 'viewer'].includes(payload.role)) {
      const response = NextResponse.redirect(new URL('/admin/', request.url));
      response.cookies.delete('admin_token');
      return response;
    }

    // Pass user context downstream via headers (read-only, not security-critical)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-name', payload.username);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
