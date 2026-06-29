import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

const scheduleSchema = z.object({
  name: z.string().min(1).max(200),
  intervalDays: z.number().int().min(0).max(365),
  message: z.string().min(1).max(2000),
  isActive: z.boolean().optional(),
});

const DEFAULT_SCHEDULES = [
  { name: 'صيانة دورية', intervalDays: 30, message: 'مرحباً {{name}}، نود تذكيرك بموعد صيانة {{model}} في مركز باجاج البرنس. نتطلع لخدمتك قريباً! 🏍️', isActive: true },
  { name: 'متابعة', intervalDays: 7, message: 'مرحباً {{name}}، نأمل أن صيانة {{model}} نالت إعجابك في مركز باجاج البرنس. نحن هنا دائماً لخدمتك! 🏍️', isActive: true },
  { name: 'عرض خاص', intervalDays: 0, message: 'مرحباً {{name}}، لدينا عرض خاص على قطع الغيار لـ {{model}} في مركز باجاج البرنس. لا تفوت الفرصة! 🏍️💰', isActive: false },
];

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      let schedules = await prisma.reminderSchedule.findMany({
        where: { isDeleted: false },
        orderBy: { intervalDays: 'asc' },
      });

      if (schedules.length === 0) {
        for (const s of DEFAULT_SCHEDULES) {
          await prisma.reminderSchedule.create({ data: s });
        }
        schedules = await prisma.reminderSchedule.findMany({
          where: { isDeleted: false },
          orderBy: { intervalDays: 'asc' },
        });
      }

      return withSecurityHeaders(NextResponse.json({ success: true, data: schedules }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const body = await req.json();
      const data = scheduleSchema.parse(body);

      const schedule = await prisma.reminderSchedule.create({
        data: { name: data.name, intervalDays: data.intervalDays, message: data.message, isActive: data.isActive ?? true },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'ReminderSchedule',
        entityId: schedule.id,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: schedule }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}

export async function PATCH(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'id is required' }, { status: 400 }));
      }

      const body = await req.json();
      const updateSchema = z.object({
        name: z.string().min(1).max(200).optional(),
        intervalDays: z.number().int().min(0).max(365).optional(),
        message: z.string().min(1).max(2000).optional(),
        isActive: z.boolean().optional(),
      });
      const data = updateSchema.parse(body);

      const oldSchedule = await prisma.reminderSchedule.findUnique({ where: { id } });
      if (!oldSchedule) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 }));
      }

      const schedule = await prisma.reminderSchedule.update({
        where: { id },
        data,
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'ReminderSchedule',
        entityId: schedule.id,
        oldValue: oldSchedule as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: schedule }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}
