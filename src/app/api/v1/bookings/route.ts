import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { sendWhatsAppMessageViaService } from '@/lib/whatsapp-client';
import { buildMessage } from '@/lib/whatsapp-templates';
import { sendEmail } from '@/lib/email';
import { Prisma } from '@prisma/client';
import { sanitizedString } from '@/lib/sanitize';
import { z } from 'zod';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';

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

function extractMakeModel(modelStr: string): { make: string; model: string } {
  const knownMakes = ['bajaj', 'honda', 'yamaha', 'suzuki', 'kawasaki', 'hero', 'tvs', 'ktm', 'ducati', 'bmw', 'kymco', 'sym'];
  const lower = modelStr.toLowerCase().trim();

  for (const make of knownMakes) {
    if (lower.startsWith(make + ' ')) {
      return {
        make: make.charAt(0).toUpperCase() + make.slice(1),
        model: modelStr.slice(make.length + 1).trim(),
      };
    }
  }

  for (const make of knownMakes) {
    const idx = lower.indexOf(make);
    if (idx !== -1) {
      const before = modelStr.slice(0, idx).trim();
      const after = modelStr.slice(idx + make.length).trim();
      return {
        make: make.charAt(0).toUpperCase() + make.slice(1),
        model: (before + ' ' + after).trim() || modelStr,
      };
    }
  }

  return { make: 'Unknown', model: modelStr };
}

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

      // 1. Find or create customer by phone
      let customer = await tx.customer.findFirst({
        where: { phone: data.phone },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: { name: data.name, phone: data.phone, email: data.email || '', tenantId: DEFAULT_TENANT_ID },
        });
      } else if (data.email && !customer.email) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { email: data.email },
        });
      }

      // 2. Find or create vehicle
      let vehicle = null;

      if (data.plateNumber) {
        vehicle = await tx.vehicle.findFirst({
          where: { plateNumber: data.plateNumber, customerId: customer.id },
        });
      }

      if (!vehicle) {
        vehicle = await tx.vehicle.findFirst({
          where: {
            customerId: customer.id,
            model: { equals: data.model, mode: 'insensitive' },
          },
        });
      }

      if (!vehicle) {
        const extracted = extractMakeModel(data.model);
        const make = data.make || extracted.make;
        const model = extracted.model;
        vehicle = await tx.vehicle.create({
          data: {
            make,
            model,
            year: data.year || null,
            plateNumber: data.plateNumber || null,
            chassisNumber: data.chassisNumber || null,
            customerId: customer.id,
            tenantId: DEFAULT_TENANT_ID,
          },
        });
      }

      // 3. Create booking linked to customer and vehicle
      return tx.booking.create({
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone,
          model: data.model,
          issue: data.issue,
          date: data.date,
          time: data.time,
          plateNumber: data.plateNumber || null,
          customerId: customer.id,
          vehicleId: vehicle.id,
          tenantId: DEFAULT_TENANT_ID,
        },
        include: { customer: true, vehicle: true },
      });
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      action: 'create',
      entity: 'Booking',
      entityId: booking.id,
      newValue: { name: data.name, phone: data.phone, model: data.model, date: data.date, time: data.time } as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    // Fire-and-forget WhatsApp confirmation
    buildMessage('booking_created', {
      name: data.name,
      model: data.model,
      date: data.date,
      time: data.time,
    }).then((message) => {
      if (message) {
        sendWhatsAppMessageViaService(data.phone, message).catch(() => {});
      }
    });

    // Fire-and-forget email confirmation
    if (data.email) {
      sendEmail({
        to: data.email,
        subject: 'Booking Confirmation - El Prince Bajaj',
        text: `Dear ${data.name},\n\nYour service booking has been received!\n\nModel: ${data.model}\nDate: ${data.date}\nTime: ${data.time}\nIssue: ${data.issue}\n\nWe will contact you shortly to confirm your appointment.\n\nBest regards,\nEl Prince Bajaj Team`,
        html: `<h2>Booking Confirmation</h2><p>Dear <strong>${data.name}</strong>,</p><p>Your service booking has been received!</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0"><tr><td><strong>Model</strong></td><td>${data.model}</td></tr><tr><td><strong>Date</strong></td><td>${data.date}</td></tr><tr><td><strong>Time</strong></td><td>${data.time}</td></tr><tr><td><strong>Issue</strong></td><td>${data.issue}</td></tr></table><p>We will contact you shortly to confirm your appointment.</p><p>Best regards,<br/>El Prince Bajaj Team</p>`,
      }).catch(() => {});
    }

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
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
