import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { sanitizedString } from '@/lib/sanitize';
import { z } from 'zod';
const bookingSchema = z.object({
  name: sanitizedString(z.string().min(2).max(100).regex(/^[-\p{L}\s']+$/u, 'Name must contain only letters')),
  email: z.string().email('Invalid email').max(100).optional().or(z.literal('')),
  phone: z.string().regex(/^\+20\d{10}$/, 'Phone must be +20 followed by exactly 10 digits'),
  model: sanitizedString(z.string().min(1).max(100)),
  issue: sanitizedString(z.string().min(5).max(1000)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  make: sanitizedString(z.string().min(1).max(100)).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  plateNumber: z.string().min(1).max(30).optional(),
  chassisNumber: z.string().max(100).optional(),
});

import { BookingService } from '@/services/BookingService';

function isFriday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  return date.getDay() === 5;
}

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date < today;
}

function isValidTime(timeStr: string): boolean {
  const [hour] = timeStr.split(':').map(Number);
  return hour >= 10 && hour < 22;
}

export async function POST(req: NextRequest) {
  const originCheck = validateOrigin(req);
  if (originCheck) return withSecurityHeaders(originCheck);

  const limit = await checkRateLimit(req, 'booking');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);

    if (isFriday(data.date)) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Friday bookings are not available' }, { status: 400 }));
    }

    if (isPastDate(data.date)) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Cannot book for past dates' }, { status: 400 }));
    }

    if (!isValidTime(data.time)) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Working hours are 10:00 AM - 10:00 PM' }, { status: 400 }));
    }

    const booking = await BookingService.createBooking(data);

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      action: 'create',
      entity: 'Booking',
      entityId: booking.id,
      newValue: { name: data.name, phone: data.phone, model: data.model, date: data.date, time: data.time } as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: { booking } }, { status: 201 }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    if (error instanceof Error && error.message === 'DOUBLE_BOOKING') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'This time slot is already booked' }, { status: 409 }));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'This time slot is already booked' }, { status: 409 }));
    }
    logger.error('Booking POST error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function GET(req: NextRequest) {
  try {
    return await withAuth(req, async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { where: { isDeleted: false } },
            vehicle: { where: { isDeleted: false } },
          },
        } as Parameters<typeof prisma.booking.findMany>[0]),
        prisma.booking.count(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          bookings,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status });
  }
}
