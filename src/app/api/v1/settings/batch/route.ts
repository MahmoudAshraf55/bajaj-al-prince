import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

const batchSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1).max(100),
    value: z.string().max(500),
  })).min(1).max(50),
});

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const body = await req.json();
      const { settings } = batchSchema.parse(body);

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
      const results: { key: string; success: boolean }[] = [];

      await prisma.$transaction(async (tx) => {
        for (const s of settings) {
          const setting = await tx.appSetting.upsert({
            where: { tenantId_key: { tenantId, key: s.key } },
            update: { value: s.value },
            create: { tenantId, key: s.key, value: s.value },
          });

          const { ipAddress, userAgent } = getClientInfo(req);
          await logAudit({
            userId: payload.userId,
            action: 'update',
            entity: 'AppSetting',
            entityId: setting.id,
            newValue: s as Record<string, unknown>,
            ipAddress,
            userAgent,
          });

          results.push({ key: s.key, success: true });
        }
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { results } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
