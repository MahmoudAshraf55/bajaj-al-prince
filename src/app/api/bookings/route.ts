import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const bookingSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(5).max(30),
  model: z.string().min(1).max(100),
  issue: z.string().min(5).max(1000),
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

function isDoubleBooking(date: string, time: string): Promise<boolean> {
  return prisma.booking.count({
    where: { date, time, status: { not: 'rejected' } },
  }).then((count: number) => count > 0);
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 'booking');
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);

    if (isFriday(data.date)) {
      return NextResponse.json({ success: false, error: 'Friday bookings are not available' }, { status: 400 });
    }

    if (isPastDate(data.date)) {
      return NextResponse.json({ success: false, error: 'Cannot book for past dates' }, { status: 400 });
    }

    if (!isValidTime(data.time)) {
      return NextResponse.json({ success: false, error: 'Working hours are 10:00 AM - 10:00 PM' }, { status: 400 });
    }

    if (await isDoubleBooking(data.date, data.time)) {
      return NextResponse.json({ success: false, error: 'This time slot is already booked' }, { status: 400 });
    }

    const booking = await prisma.booking.create({ data });
    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Invalid token')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
