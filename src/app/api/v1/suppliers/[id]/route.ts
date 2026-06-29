import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const updateSupplierSchema = z.object({
  name: sanitizedString(z.string().min(1).max(200)).optional(),
  nameAr: sanitizedString(z.string().max(200)).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  address: sanitizedString(z.string().max(500)).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  notes: sanitizedString(z.string().max(1000)).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const supplier = await prisma.supplier.findFirst({ where: { id } });
      if (!supplier) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 }));
      }
      return withSecurityHeaders(NextResponse.json({ success: true, data: { supplier } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = updateSupplierSchema.parse(body);

      const existing = await prisma.supplier.findFirst({ where: { id } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 }));
      }

      const updated = await prisma.supplier.update({ where: { id }, data });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'Supplier',
        entityId: id,
        oldValue: { name: existing.name } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { supplier: updated } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const existing = await prisma.supplier.findFirst({ where: { id } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 }));
      }

      await prisma.supplier.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'delete',
        entity: 'Supplier',
        entityId: id,
        oldValue: { name: existing.name } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
