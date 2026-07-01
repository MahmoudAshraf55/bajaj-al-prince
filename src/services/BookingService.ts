import { prisma } from '@/lib/prisma';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { sendWhatsAppMessageViaService } from '@/lib/whatsapp-client';
import { buildMessage } from '@/lib/whatsapp-templates';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { BOOKING_STATUS } from '@/constants/booking';

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

export interface BookingData {
  date: string;
  time: string;
  phone: string;
  name: string;
  email?: string | null;
  plateNumber?: string | null;
  model: string;
  make?: string | null;
  year?: number | null;
  chassisNumber?: string | null;
  issue: string;
}

export class BookingService {
  static async createBooking(data: BookingData) {
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
          status: BOOKING_STATUS.PENDING,
          tenantId: DEFAULT_TENANT_ID,
        },
        include: { customer: true, vehicle: true },
      });
    });

    // Fire-and-forget WhatsApp confirmation
    buildMessage('booking_created', {
      name: data.name,
      model: data.model,
      date: data.date,
      time: data.time,
    }).then((message) => {
      if (message) {
        sendWhatsAppMessageViaService(data.phone, message).catch((err) => {
          logger.warn('Booking WhatsApp confirmation failed', { phone: data.phone, error: err instanceof Error ? err.message : String(err) });
        });
      }
    });

    // Fire-and-forget email confirmation
    if (data.email) {
      sendEmail({
        to: data.email,
        subject: 'Booking Confirmation - El Prince Bajaj',
        text: `Dear ${data.name},\n\nYour service booking has been received!\n\nModel: ${data.model}\nDate: ${data.date}\nTime: ${data.time}\nIssue: ${data.issue}\n\nWe will contact you shortly to confirm your appointment.\n\nBest regards,\nEl Prince Bajaj Team`,
        html: `<h2>Booking Confirmation</h2><p>Dear <strong>${data.name}</strong>,</p><p>Your service booking has been received!</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0"><tr><td><strong>Model</strong></td><td>${data.model}</td></tr><tr><td><strong>Date</strong></td><td>${data.date}</td></tr><tr><td><strong>Time</strong></td><td>${data.time}</td></tr><tr><td><strong>Issue</strong></td><td>${data.issue}</td></tr></table><p>We will contact you shortly to confirm your appointment.</p><p>Best regards,<br/>El Prince Bajaj Team</p>`,
      }).catch((err) => {
        logger.warn('Booking email confirmation failed', { email: data.email, error: err instanceof Error ? err.message : String(err) });
      });
    }

    return booking;
  }
}
