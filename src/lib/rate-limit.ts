import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/* ── In-memory fallback store ── */
interface MemoryEntry { count: number; resetAt: number }
const memoryStore = new Map<string, MemoryEntry>();

function memoryLimit(key: string, windowMs: number, maxRequests: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs };
  }
  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { success: entry.count <= maxRequests, limit: maxRequests, remaining, reset: entry.resetAt };
}

/* ── Redis or fallback ── */
let redis: Redis | null = null;
let useRedis = false;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    useRedis = true;
  } else {
    console.warn('[rate-limit] Redis credentials missing. Using in-memory rate limiter.');
  }
} catch (err) {
  console.warn('[rate-limit] Redis initialization failed. Using in-memory rate limiter.', err);
}

const redisLimits: Record<string, Ratelimit> = useRedis ? {
  contact: new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(20, '15 m') }),
  booking: new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(10, '15 m') }),
  login: new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(5, '15 m') }),
  admin: new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(100, '15 m') }),
} : {};

const windowMap: Record<string, { max: number; ms: number }> = {
  contact: { max: 20, ms: 15 * 60 * 1000 },
  booking: { max: 10, ms: 15 * 60 * 1000 },
  login:   { max: 20, ms: 15 * 60 * 1000 },
  admin:   { max: 100, ms: 15 * 60 * 1000 },
};

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function checkRateLimit(
  req: NextRequest,
  prefix: 'contact' | 'booking' | 'login' | 'admin'
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const ip = getClientIp(req);
  const key = `${prefix}:${ip}`;
  let result: { success: boolean; limit: number; remaining: number; reset: number };

  if (useRedis && redis) {
    result = await redisLimits[prefix].limit(key);
  } else {
    const cfg = windowMap[prefix];
    result = memoryLimit(key, cfg.ms, cfg.max);
  }

  if (!result.success) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
          },
        }
      ),
    };
  }

  return { allowed: true };
}
