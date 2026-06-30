import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { sendWhatsAppMessageViaService, getWhatsAppStateFromService } from '@/lib/whatsapp-client';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

async function getWhatsAppSettings() {
  let settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.whatsAppSettings.create({
      data: { id: 'default', delayMin: 60, delayMax: 120, dailyCap: 50, batchSize: 5, tenantId: getTenantId() ?? DEFAULT_TENANT_ID },
    });
  }
  return settings;
}

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async () => {

      const state = await getWhatsAppStateFromService();
      if (state.status !== 'connected') {
        logger.warn('WhatsApp cron: not connected', { status: state.status });
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'WhatsApp not connected' }, { status: 503 }));
      }

      const settings = await getWhatsAppSettings();
      const DAILY_CAP = settings.dailyCap;
      const BATCH_SIZE = Math.min(settings.batchSize, 5); // Cap at 5 per cron invocation to avoid timeout

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await prisma.reminderLog.count({
        where: { sentAt: { gte: todayStart }, isDeleted: false },
      });

      if (todayCount >= DAILY_CAP) {
        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: { sent: 0, reason: 'Daily cap reached', cap: DAILY_CAP },
        }));
      }

      const schedules = await prisma.reminderSchedule.findMany({
        where: { isActive: true, isDeleted: false },
      });

      if (schedules.length === 0) {
        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: { sent: 0, reason: 'No active reminder schedules', total: 0 },
        }));
      }

      const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        include: {
          bookings: {
            where: { status: 'completed', isDeleted: false },
            orderBy: { date: 'desc' },
            take: 1,
          },
          vehicles: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const allResults: { scheduleName: string; sent: number; failed: number; total: number }[] = [];
      let totalSent = 0;
      let processed = 0;
      const MAX_PER_INVOCATION = BATCH_SIZE; // Process limited batch per cron call

      for (const schedule of schedules) {
        if (processed >= MAX_PER_INVOCATION) break;

        let eligible;
        let remindedIds: Set<string>;

        if (schedule.intervalDays === 0) {
          eligible = customers;
          const todayReminders = await prisma.reminderLog.findMany({
            where: { sentAt: { gte: todayStart }, isDeleted: false },
            select: { customerId: true },
          });
          remindedIds = new Set(todayReminders.map((r) => r.customerId));
        } else {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - schedule.intervalDays);

          eligible = customers.filter((c) => {
            const b = c.bookings[0];
            if (!b) return false;
            const d = new Date(b.date);
            return !isNaN(d.getTime()) && d <= cutoffDate;
          });

          const recentReminders = await prisma.reminderLog.findMany({
            where: { sentAt: { gte: cutoffDate }, isDeleted: false },
            select: { customerId: true },
          });
          remindedIds = new Set(recentReminders.map((r) => r.customerId));
        }

        const targets = eligible.filter((c) => !remindedIds.has(c.id));

        const remainingToday = DAILY_CAP - todayCount - totalSent;
        if (remainingToday <= 0) break;

        const batch = targets.slice(0, Math.min(MAX_PER_INVOCATION - processed, remainingToday));
        let scheduleSent = 0;
        let scheduleFailed = 0;

        for (const customer of batch) {
          const vehicle = customer.vehicles[0];
          const model = vehicle ? `${vehicle.make} ${vehicle.model}` : 'دراجتك';
          const message = schedule.message
            .replace(/\{\{name\}\}/g, customer.name)
            .replace(/\{\{model\}\}/g, model);

          const phone = customer.phone ?? '';
          if (!phone) {
            scheduleFailed++;
            processed++;
            continue;
          }

          let sendResult: { success: boolean; error?: string } = { success: false, error: 'Unknown' };
          try {
            sendResult = await sendWhatsAppMessageViaService(phone, message);
          } catch (err) {
            sendResult = { success: false, error: err instanceof Error ? err.message : 'Exception during send' };
            logger.error('WhatsApp send failed', { phone, error: sendResult.error });
          }

          await prisma.reminderLog.create({
            data: {
              customerId: customer.id,
              phone,
              message,
              status: sendResult.success ? 'sent' : 'failed',
              tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
            },
          });

          if (sendResult.success) {
            scheduleSent++;
            totalSent++;
          } else {
            scheduleFailed++;
          }
          processed++;
        }

        allResults.push({
          scheduleName: schedule.name,
          sent: scheduleSent,
          failed: scheduleFailed,
          total: scheduleSent + scheduleFailed,
        });
      }

      const grandTotal = allResults.reduce((sum, r) => sum + r.total, 0);

      logger.info('WhatsApp cron batch', { sent: totalSent, processed, total: grandTotal });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'create',
        entity: 'ReminderBatch',
        entityId: 'batch',
        newValue: { sent: totalSent, total: grandTotal, schedules: allResults, processed },
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          sent: totalSent,
          failed: allResults.reduce((sum, r) => sum + r.failed, 0),
          total: grandTotal,
          processed,
          schedules: allResults,
          nextRunIn: '10 minutes (cron)',
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
