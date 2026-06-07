import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { sendWhatsAppMessage, getWhatsAppState } from '@/lib/whatsapp';
import { logAudit, getClientInfo } from '@/lib/audit';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

async function getWhatsAppSettings() {
  let settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.whatsAppSettings.create({
      data: { id: 'default', delayMin: 60, delayMax: 120, dailyCap: 50, batchSize: 20 },
    });
  }
  return settings;
}

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    await requireRole(req, ['admin']);

    const state = getWhatsAppState();
    if (state.status !== 'connected') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'WhatsApp not connected' }, { status: 503 }));
    }

    const settings = await getWhatsAppSettings();
    const MIN_DELAY_MS = settings.delayMin * 1000;
    const MAX_DELAY_MS = settings.delayMax * 1000;
    const DAILY_CAP = settings.dailyCap;
    const BATCH_SIZE = settings.batchSize;

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

    const eligible = customers.filter((c) => {
      const b = c.bookings[0];
      if (!b) return false;
      const d = new Date(b.date);
      return !isNaN(d.getTime()) && d <= thirtyDaysAgo;
    });

    const recentReminders = await prisma.reminderLog.findMany({
      where: { sentAt: { gte: thirtyDaysAgo }, isDeleted: false },
      select: { customerId: true },
    });
    const remindedIds = new Set(recentReminders.map((r) => r.customerId));
    const targets = eligible.filter((c) => !remindedIds.has(c.id));

    const remainingToday = DAILY_CAP - todayCount;
    const batch = targets.slice(0, Math.min(BATCH_SIZE, remainingToday));

    const results: { customerId: string; phone: string; status: string; error?: string }[] = [];

    for (const customer of batch) {
      const delay = randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
      await sleep(delay);

      const vehicle = customer.vehicles[0];
      const model = vehicle ? `${vehicle.make} ${vehicle.model}` : 'دراجتك';
      const message = `مرحباً ${customer.name}، نود تذكيرك بموعد صيانة ${model} في مركز باجاج الأمير. نتطلع لخدمتك قريباً! 🏍️`;

      const sendResult = await sendWhatsAppMessage(customer.phone, message);

      await prisma.reminderLog.create({
        data: {
          customerId: customer.id,
          phone: customer.phone,
          message,
          status: sendResult.success ? 'sent' : 'failed',
        },
      });

      results.push({
        customerId: customer.id,
        phone: customer.phone,
        status: sendResult.success ? 'sent' : 'failed',
        error: sendResult.error,
      });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      action: 'create',
      entity: 'ReminderBatch',
      entityId: 'batch',
      newValue: { sent: results.filter((r) => r.status === 'sent').length, total: results.length },
      ipAddress,
      userAgent,
    });

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        sent: results.filter((r) => r.status === 'sent').length,
        failed: results.filter((r) => r.status === 'failed').length,
        total: results.length,
        details: results,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
