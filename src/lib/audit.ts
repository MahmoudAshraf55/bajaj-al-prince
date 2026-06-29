import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
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
  | 'close'
  | 'reopen'
  | 'lock'
  | 'complete'
  | 'payment'
  | 'import'
  | 'inventory_change'
  | 'scan';

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
}

const SENSITIVE_WORDS = [
  'password',
  'token',
  'secret',
  'hash',
  'salt',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'creditcard',
  'credit_card',
  'cvv',
  'pin',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_WORDS.some((word) => lower.includes(word));
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
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
    const tenantId = input.tenantId ?? getTenantId() ?? DEFAULT_TENANT_ID;
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
        tenantId,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation.
    // Log structured error for observability.
    logger.error('Failed to write audit log', error, { auditInput: input });
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
