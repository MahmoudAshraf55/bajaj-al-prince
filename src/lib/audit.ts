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

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
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

export function getClientInfo(req: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ipAddress, userAgent };
}
