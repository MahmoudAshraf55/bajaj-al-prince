import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const updateSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)).optional(),
  nameAr: sanitizedString(z.string().max(100)).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = updateSchema.parse(body);
      const old = await prisma.manufacturer.findUnique({ where: { id } });
      const manufacturer = await prisma.manufacturer.update({ where: { id }, data });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'Manufacturer',
        entityId: id,
        oldValue: old ? { name: old.name, isActive: old.isActive } as Record<string, unknown> : undefined,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { manufacturer } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      await prisma.$transaction(async (tx) => {
        await tx.vehicleModel.updateMany({ where: { manufacturerId: id }, data: { manufacturerId: null } });
        await tx.manufacturer.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({ userId: payload.userId, action: 'delete', entity: 'Manufacturer', entityId: id, ipAddress, userAgent });
      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
