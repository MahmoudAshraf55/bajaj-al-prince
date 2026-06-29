import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const settingsUpdateSchema = z.object({
  delayMin: z.number().int().min(10).max(300).optional(),
  delayMax: z.number().int().min(10).max(600).optional(),
  dailyCap: z.number().int().min(1).max(500).optional(),
  batchSize: z.number().int().min(1).max(100).optional(),
});

async function ensureDefaultSettings() {
  const existing = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
  if (!existing) {
    return prisma.whatsAppSettings.create({
      data: { id: 'default', delayMin: 60, delayMax: 120, dailyCap: 50, batchSize: 20 },
    });
  }
  return existing;
}

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const settings = await ensureDefaultSettings();
      return withSecurityHeaders(NextResponse.json({ success: true, data: settings }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function PATCH(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async () => {
      const body = await req.json();
      const data = settingsUpdateSchema.parse(body);

      await ensureDefaultSettings();

      const updated = await prisma.whatsAppSettings.update({
        where: { id: 'default' },
        data,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: updated }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
