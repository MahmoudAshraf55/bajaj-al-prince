import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const customerUpdateSchema = z.object({
  name: sanitizedString(z.string().min(2).max(200)).optional(),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().optional().nullable(),
  address: sanitizedString(z.string().max(500)).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const customer = await prisma.customer.findFirst({
        where: { id },
        include: {
          vehicles: { where: { isDeleted: false } },
          bookings: {
            where: { isDeleted: false },
            orderBy: { date: 'desc' },
            include: { vehicle: { where: { isDeleted: false } } },
          },
        },
      });
      if (!customer) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 }));
      }
      return withSecurityHeaders(NextResponse.json({ success: true, data: { customer } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = customerUpdateSchema.parse(body);
      const oldCustomer = await prisma.customer.findUnique({ where: { id } });
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email ?? '' }),
          ...(data.address !== undefined && { address: data.address }),
        },
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'Customer',
        entityId: id,
        oldValue: oldCustomer ? { name: oldCustomer.name, phone: oldCustomer.phone, email: oldCustomer.email, address: oldCustomer.address } as Record<string, unknown> : undefined,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { customer } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const oldCustomer = await prisma.customer.findUnique({ where: { id } });
      await prisma.customer.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'softDelete',
        entity: 'Customer',
        entityId: id,
        oldValue: oldCustomer ? { name: oldCustomer.name, phone: oldCustomer.phone, email: oldCustomer.email, address: oldCustomer.address } as Record<string, unknown> : undefined,
        ipAddress,
        userAgent,
      });
      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
