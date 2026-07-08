import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (!customer) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 }));
      }

      const [bookings, invoices, vehicles, reminderLogs] = await Promise.all([
        prisma.booking.findMany({
          where: { customerId: id, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, issue: true, date: true, time: true, status: true, createdAt: true },
        }),
        prisma.invoice.findMany({
          where: { customerId: id, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, number: true, total: true, status: true, createdAt: true },
        }),
        prisma.vehicle.findMany({
          where: { customerId: id, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          select: { id: true, make: true, model: true, year: true, plateNumber: true, chassisNumber: true, createdAt: true },
        }),
        prisma.reminderLog.findMany({
          where: { customerId: id },
          orderBy: { sentAt: 'desc' },
          take: 50,
          select: { id: true, message: true, status: true, sentAt: true },
        }),
      ]);

      const vehicleIds = vehicles.map((v) => v.id);
      const workOrders = vehicleIds.length > 0
        ? await prisma.workOrder.findMany({
            where: { vehicleId: { in: vehicleIds }, isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true, description: true, status: true, cost: true, vehicleId: true, createdAt: true },
          })
        : [];

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          customer,
          timeline: {
            bookings: bookings.map((b) => ({ ...b, type: 'booking' })),
            invoices: invoices.map((i) => ({ ...i, total: Number(i.total), type: 'invoice' })),
            vehicles: vehicles.map((v) => ({ ...v, type: 'vehicle' })),
            workOrders: workOrders.map((w) => ({ ...w, cost: w.cost ? Number(w.cost) : null, type: 'work_order' })),
            reminders: reminderLogs.map((r) => ({ ...r, type: 'reminder' })),
          },
        },
      }));
    });
  } catch (error) {
    logger.error('Customer timeline GET error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
