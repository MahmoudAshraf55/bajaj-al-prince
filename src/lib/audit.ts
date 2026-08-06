import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import type { NextRequest } from 'next/server';

/**
 * Extract client IP address from request, with security validation.
 * 
 * IMPORTANT: This function trusts X-Forwarded-For ONLY if:
 * 1. The app runs behind a known trusted reverse proxy (Vercel, Nginx, Cloudflare, etc.)
 * 2. You validate the proxy chain or restrict the proxy origin
 * 
 * In production:
 * - Vercel automatically handles X-Forwarded-For correctly
 * - For self-hosted deployments, ensure the load balancer/reverse proxy
 *   is the ONLY source of these headers (configure firewall rules)
 * 
 * The current implementation assumes:
 * - Deployment on Vercel (trusted proxy), OR
 * - A properly configured internal reverse proxy
 * 
 * If deploying without a reverse proxy, disable X-Forwarded-For extraction
 * by setting TRUST_PROXY_HEADERS=false
 */
export function extractClientIp(req: NextRequest): string {
  const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS !== 'false';
  
  if (!trustProxyHeaders) {
    // If proxy headers are disabled, only use direct connection IP
    // (Note: NextRequest doesn't expose direct socket IP, so we fall back)
    return 'unknown';
  }

  // Extract IP from X-Forwarded-For (leftmost = original client)
  // Format: "client, proxy1, proxy2"
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // Fallback to X-Real-IP
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  return 'unknown';
}

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
  | 'return'
  | 'payment'
  | 'import'
  | 'inventory_change'
  | 'scan'
  | 'password_recovery';

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
 * Extract client IP address and User-Agent from request.
 * Uses the security-aware extractClientIp function to handle proxy headers safely.
 */
export function getClientInfo(req: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ipAddress, userAgent };
}
