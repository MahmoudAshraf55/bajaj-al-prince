import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requirePermission, requireRole, type UserRole, type JWTPayload } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';

export type RateLimitPrefix = 'contact' | 'booking' | 'login' | 'admin' | 'public';

interface ApiHandlerOptions<TBody = unknown> {
  /** HTTP methods allowed for this handler. Defaults to all. */
  methods?: string[];
  /** Require authentication. */
  auth?: boolean;
  /** Require one of the given legacy roles. */
  roles?: UserRole[];
  /** Require a specific granular permission. */
  permission?: string;
  /** Rate limit prefix to apply. */
  rateLimit?: RateLimitPrefix;
  /** Validate origin header for state-changing methods (POST/PATCH/PUT/DELETE). */
  validateOrigin?: boolean;
  /** Zod schema to validate request body. */
  schema?: z.ZodType<TBody>;
  /** Audit log configuration. */
  audit?: {
    action: Parameters<typeof logAudit>[0]['action'];
    entity: string;
    getEntityId?: (payload: JWTPayload, body: TBody) => string | undefined;
    getOldValue?: (payload: JWTPayload, body: TBody) => Record<string, unknown> | undefined;
    getNewValue?: (payload: JWTPayload, body: TBody) => Record<string, unknown> | undefined;
  };
}

export interface ApiContext<TBody = unknown> {
  req: NextRequest;
  payload: JWTPayload;
  body: TBody;
}

export type ApiHandler<TBody = unknown> = (ctx: ApiContext<TBody>) => Promise<NextResponse> | NextResponse;

/**
 * Standard error serializer mapping Error messages to HTTP status codes.
 */
export function getErrorStatus(message: string): number {
  if (message === 'Unauthorized' || message === 'Invalid token') return 401;
  if (message === 'Forbidden') return 403;
  if (message === 'Not found' || message.includes('not found')) return 404;
  if (message.includes('No accounting period')) return 409;
  if (message === 'JWT_SECRET_NOT_CONFIGURED') return 500;
  return 500;
}

/**
 * Composes authentication, authorization, rate limiting, validation,
 * audit logging, and security headers into a single route handler.
 */
export function withApiHandler<TBody = unknown>(handler: ApiHandler<TBody>, options: ApiHandlerOptions<TBody> = {}) {
  return async function (req: NextRequest): Promise<NextResponse> {
    // Rate limiting first
    if (options.rateLimit) {
      const limit = await checkRateLimit(req, options.rateLimit);
      if (!limit.allowed) return withSecurityHeaders(limit.response!);
    }

    // Method check
    if (options.methods && !options.methods.includes(req.method)) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 }));
    }

    // Origin validation for state-changing methods
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    if (options.validateOrigin !== false && isMutation) {
      const originError = validateOrigin(req);
      if (originError) return withSecurityHeaders(originError);
    }

    let payload: JWTPayload | undefined;
    let body: TBody | undefined;

    try {
      // Auth & authorization
      if (options.permission) {
        payload = await requirePermission(req, options.permission);
      } else if (options.roles) {
        payload = await requireRole(req, options.roles);
      } else if (options.auth) {
        payload = await requireAuth(req);
      }

      // Body parsing & validation
      if (options.schema) {
        const rawBody = await req.json();
        body = options.schema.parse(rawBody);
      }

      const ctx: ApiContext<TBody> = {
        req,
        payload: payload ?? ({} as JWTPayload),
        body: body ?? ({} as TBody),
      };

      const response = await handler(ctx);
      const secured = withSecurityHeaders(response);

      // Audit logging (fire-and-forget)
      if (options.audit && payload) {
        const { ipAddress, userAgent } = getClientInfo(req);
        logAudit({
          userId: payload.userId,
          action: options.audit.action,
          entity: options.audit.entity,
          entityId: options.audit.getEntityId?.(payload, body ?? ({} as TBody)),
          oldValue: options.audit.getOldValue?.(payload, body ?? ({} as TBody)),
          newValue: options.audit.getNewValue?.(payload, body ?? ({} as TBody)),
          ipAddress,
          userAgent,
        }).catch((err) => logger.error('Audit log failed', err));
      }

      return secured;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
      }

      const message = error instanceof Error ? error.message : 'Internal server error';
      const status = getErrorStatus(message);

      // Never leak internal details for 500 errors
      const clientMessage = status === 500 ? 'Internal server error' : message;
      logger.error('API handler error', error, { path: req.nextUrl.pathname, method: req.method });

      return withSecurityHeaders(NextResponse.json({ success: false, error: clientMessage }, { status }));
    }
  };
}
