import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(500),
});

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return withSecurityHeaders(NextResponse.json({ success: true, data: { settings: map } }));
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const payload = await requireRole(req, ['admin']);
    const body = await req.json();
    const data = settingSchema.parse(body);

    const setting = await prisma.appSetting.upsert({
      where: { key: data.key },
      update: { value: data.value },
      create: { key: data.key, value: data.value },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'update',
      entity: 'AppSetting',
      entityId: setting.id,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: { setting } }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
