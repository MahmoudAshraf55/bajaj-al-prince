import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const updateAccountSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional().nullable(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const account = await prisma.account.findFirst({
        where: { id },
        include: {
          parent: { select: { id: true, name: true, code: true } },
          children: { select: { id: true, name: true, code: true, type: true } },
        },
      });
      if (!account) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 }));
      }
      return withSecurityHeaders(NextResponse.json({ success: true, data: { account } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = updateAccountSchema.parse(body);

      const existing = await prisma.account.findFirst({ where: { id } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 }));
      }

      const updated = await prisma.account.update({ where: { id }, data });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'Account',
        entityId: id,
        oldValue: { code: existing.code, name: existing.name } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { account: updated } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const existing = await prisma.account.findFirst({ where: { id } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 }));
      }

      const children = await prisma.account.count({ where: { parentId: id, isDeleted: false } });
      if (children > 0) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Account has child accounts; remove or reassign them first' }, { status: 400 }));
      }

      await prisma.account.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'delete',
        entity: 'Account',
        entityId: id,
        oldValue: { code: existing.code, name: existing.name } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
