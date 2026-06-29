import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo, type AuditAction } from '@/lib/audit';
import { sendWhatsAppMessageViaService } from '@/lib/whatsapp-client';
import { buildMessage, type EventKey } from '@/lib/whatsapp-templates';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const bookingUpdateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'completed']).optional(),
  issue: z.string().min(1).max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = bookingUpdateSchema.parse(body);
      const oldBooking = await prisma.booking.findUnique({ where: { id } });

      // Build update payload: only include fields that are provided
      const updateData: Record<string, unknown> = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.issue !== undefined) updateData.issue = data.issue;

      const booking = await prisma.booking.update({ where: { id }, data: updateData });
      const { ipAddress, userAgent } = getClientInfo(req);

      // Auto-create WorkOrder when booking is accepted
      if (data.status === 'accepted' && booking.vehicleId) {
        await prisma.workOrder.create({
          data: {
            description: booking.issue,
            status: 'pending',
            vehicleId: booking.vehicleId,
            bookingId: booking.id,
          },
        }).catch(() => {});
      }

      let action: AuditAction = 'update';
      if (data.status === 'accepted') action = 'approve';
      else if (data.status === 'rejected') action = 'reject';
      else if (data.status === 'completed') action = 'complete';

      const oldValue: Record<string, unknown> = {};
      if (oldBooking) {
        if (data.status !== undefined) oldValue.status = oldBooking.status;
        if (data.issue !== undefined) oldValue.issue = oldBooking.issue;
      }

      await logAudit({
        userId: payload.userId,
        action,
        entity: 'Booking',
        entityId: id,
        oldValue: Object.keys(oldValue).length > 0 ? oldValue : undefined,
        newValue: updateData,
        ipAddress,
        userAgent,
      });

      // Fire-and-forget WhatsApp status notification
      if (oldBooking && oldBooking.phone) {
        const eventMap: Record<string, EventKey> = {
          accepted: 'booking_accepted',
          rejected: 'booking_rejected',
          completed: 'booking_completed',
        };

        let event: EventKey | null = null;
        if (data.status && eventMap[data.status]) {
          event = eventMap[data.status];
        } else if (data.issue !== undefined && data.issue !== oldBooking.issue) {
          event = 'issue_changed';
        }

        if (event) {
          buildMessage(event, {
            name: oldBooking.name,
            model: oldBooking.model,
            date: oldBooking.date,
            time: oldBooking.time,
            issue: data.issue ?? oldBooking.issue ?? '',
          }).then((message) => {
            if (message) {
              sendWhatsAppMessageViaService(oldBooking.phone!, message).catch(() => {});
            }
          });
        }

        // If booking was accepted, also send work_order_created WhatsApp
        if (data.status === 'accepted') {
          buildMessage('work_order_created', {
            name: oldBooking.name,
            model: oldBooking.model,
            work: booking.issue,
          }).then((message) => {
            if (message) {
              sendWhatsAppMessageViaService(oldBooking.phone!, message).catch(() => {});
            }
          });
        }
      }

      return withSecurityHeaders(NextResponse.json({ success: true, data: { booking } }));
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
