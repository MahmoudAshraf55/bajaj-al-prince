import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

const templateSchema = z.object({
  event: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  isActive: z.boolean().optional(),
});

const DEFAULT_TEMPLATES = [
  { event: 'booking_created', message: 'مرحباً {{name}}، تم استلام حجزك في مركز باجاج الأمير.\nالموديل: {{model}}\nالتاريخ: {{date}}\nالوقت: {{time}}\nنتطلع لخدمتك! 🏍️' },
  { event: 'booking_accepted', message: 'مرحباً {{name}}، تم قبول حجزك في مركز باجاج الأمير.\nالموديل: {{model}}\nالتاريخ: {{date}}\nالوقت: {{time}}\nننتظرك! 🏍️' },
  { event: 'booking_rejected', message: 'مرحباً {{name}}، نعتذر، تم رفض حجزك في مركز باجاج الأمير.\nالموديل: {{model}}\nيرجى التواصل معنا لإعادة جدولة الموعد.' },
  { event: 'booking_completed', message: 'مرحباً {{name}}، تم إنجاز صيانة {{model}} بنجاح في مركز باجاج الأمير. شكراً لثقتك! 🏍️✅' },
  { event: 'issue_changed', message: 'مرحباً {{name}}، تم تحديث وصف المشكلة لحجزك في مركز باجاج الأمير.\nالمشكلة الجديدة: {{issue}}' },
  { event: 'vehicle_added', message: 'مرحباً {{name}}، تم إضافة مركبة جديدة لملفك في مركز باجاج الأمير.\nالماركة: {{make}}\nالموديل: {{model}}\nنتطلع لخدمتك! 🏍️' },
];

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      let templates = await prisma.whatsAppMessageTemplate.findMany({
        orderBy: { event: 'asc' },
      });

      // Auto-seed defaults if empty
      if (templates.length === 0) {
        for (const t of DEFAULT_TEMPLATES) {
          await prisma.whatsAppMessageTemplate.create({
            data: { event: t.event, message: t.message, isActive: true },
          });
        }
        templates = await prisma.whatsAppMessageTemplate.findMany({
          orderBy: { event: 'asc' },
        });
      }

      return withSecurityHeaders(NextResponse.json({ success: true, data: templates }));
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
      const data = templateSchema.parse(body);

      const template = await prisma.whatsAppMessageTemplate.create({
        data: { event: data.event, message: data.message, isActive: data.isActive ?? true },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'WhatsAppMessageTemplate',
        entityId: template.id,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: template }, { status: 201 }));
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
        message: z.string().min(1).max(2000).optional(),
        isActive: z.boolean().optional(),
      });
      const data = updateSchema.parse(body);

      const oldTemplate = await prisma.whatsAppMessageTemplate.findUnique({ where: { id } });
      if (!oldTemplate) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 }));
      }

      const template = await prisma.whatsAppMessageTemplate.update({
        where: { id },
        data,
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'WhatsAppMessageTemplate',
        entityId: id,
        oldValue: { message: oldTemplate.message, isActive: oldTemplate.isActive } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: template }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}
