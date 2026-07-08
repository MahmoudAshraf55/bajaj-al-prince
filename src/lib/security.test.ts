import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiSecurityHeaders, withSecurityHeaders, validateOrigin } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';

describe('apiSecurityHeaders', () => {
  it('contains X-Content-Type-Options nosniff', () => {
    expect(apiSecurityHeaders['X-Content-Type-Options']).toBe('nosniff');
  });

  it('contains X-Frame-Options DENY', () => {
    expect(apiSecurityHeaders['X-Frame-Options']).toBe('DENY');
  });

  it('contains strict referrer policy', () => {
    expect(apiSecurityHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('contains CORS headers', () => {
    expect(apiSecurityHeaders['Access-Control-Allow-Credentials']).toBe('true');
    expect(apiSecurityHeaders['Access-Control-Allow-Methods']).toContain('GET');
    expect(apiSecurityHeaders['Access-Control-Allow-Methods']).toContain('POST');
    expect(apiSecurityHeaders['Access-Control-Allow-Headers']).toContain('Content-Type');
  });
});

describe('withSecurityHeaders', () => {
  it('appends all security headers to a response', () => {
    const response = NextResponse.json({ ok: true });
    const secured = withSecurityHeaders(response);

    expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(secured.headers.get('X-Frame-Options')).toBe('DENY');
    expect(secured.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(secured.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('returns the same response object', () => {
    const response = NextResponse.json({ ok: true });
    const secured = withSecurityHeaders(response);
    expect(secured).toBe(response);
  });
});

describe('validateOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null in development (skips validation)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it('returns 403 in production when origin and referer are missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
    });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('returns null in production when origin matches allowed origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    const result = validateOrigin(req);
    expect(result).toBeNull();
  });

  it('returns 403 in production when origin does not match', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { origin: 'http://evil.com' },
    });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('falls back to referer when origin is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { referer: 'http://localhost:3000/page' },
    });
    const result = validateOrigin(req);
    expect(result).toBeNull();
  });

  it('returns 403 for malformed origin URL', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { origin: 'not-a-valid-url' },
    });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
