import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('checkRateLimit (in-memory fallback)', () => {
  let checkRateLimit: typeof import('@/lib/rate-limit').checkRateLimit;

  beforeEach(async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
    const mod = await import('@/lib/rate-limit');
    checkRateLimit = mod.checkRateLimit;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeRequest(ip: string = '127.0.0.1'): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': ip },
    });
  }

  it('allows requests within the rate limit', async () => {
    const req = makeRequest('10.0.0.1');
    const result = await checkRateLimit(req, 'login');
    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it('blocks after exceeding the limit', async () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < 5; i++) {
      const req = makeRequest(ip);
      const result = await checkRateLimit(req, 'login');
      expect(result.allowed).toBe(true);
    }

    const req = makeRequest(ip);
    const result = await checkRateLimit(req, 'login');
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(429);
  });

  it('different IPs have independent limits', async () => {
    for (let i = 0; i < 5; i++) {
      const req = makeRequest('10.0.0.3');
      await checkRateLimit(req, 'login');
    }

    const req = makeRequest('10.0.0.4');
    const result = await checkRateLimit(req, 'login');
    expect(result.allowed).toBe(true);
  });

  it('different prefixes have independent limits', async () => {
    const ip = '10.0.0.5';
    for (let i = 0; i < 5; i++) {
      const req = makeRequest(ip);
      await checkRateLimit(req, 'login');
    }

    const req = makeRequest(ip);
    const result = await checkRateLimit(req, 'admin');
    expect(result.allowed).toBe(true);
  });

  it('429 response contains retry-after header', async () => {
    const ip = '10.0.0.6';
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(makeRequest(ip), 'login');
    }

    const result = await checkRateLimit(makeRequest(ip), 'login');
    expect(result.allowed).toBe(false);
    const retryAfter = result.response!.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('429 response contains rate limit headers', async () => {
    const ip = '10.0.0.7';
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(makeRequest(ip), 'login');
    }

    const result = await checkRateLimit(makeRequest(ip), 'login');
    expect(result.response!.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(result.response!.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});
