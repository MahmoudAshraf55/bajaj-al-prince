import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'softDelete'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject'
  | 'payment'
  | 'inventory_change';

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'secret',
  'hash',
  'salt',
  'apiKey',
  'api_key',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
]);

/**
 * Strips sensitive fields from an object before audit logging.
 * Prevents accidental leakage of passwords, tokens, secrets, etc.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeValue(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        oldValue: input.oldValue ? JSON.stringify(sanitizeValue(input.oldValue)) : null,
        newValue: input.newValue ? JSON.stringify(sanitizeValue(input.newValue)) : null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch {
    // Audit logging should never break the main operation.
    // Log to console as a fallback for observability.
    console.error('[audit] Failed to write audit log', input);
  }
}

/**
 * Extracts client IP and User-Agent from request headers.
 *
 * SECURITY NOTE: If the app is NOT behind a trusted reverse proxy
 * (nginx, Cloudflare, etc.), the X-Forwarded-For header can be forged
 * by the client. Always deploy behind a trusted proxy in production.
 */
export function getClientInfo(req: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ipAddress, userAgent };
}
