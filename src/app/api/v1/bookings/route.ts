import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, withSecurityHeaders } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { sanitizedString } from '@/lib/sanitize';
import { z } from 'zod';

const bookingSchema = z.object({
  name: sanitizedString(z.string().min(2).max(100)),
  phone: z.string().min(5).max(30),
  model: sanitizedString(z.string().min(1).max(100)),
  issue: sanitizedString(z.string().min(5).max(1000)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

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

    const booking = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({
        where: { date: data.date, time: data.time, status: { not: 'rejected' } },
      });
      if (existing) {
        throw new Error('DOUBLE_BOOKING');
      }
      return tx.booking.create({ data });
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
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.booking.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
