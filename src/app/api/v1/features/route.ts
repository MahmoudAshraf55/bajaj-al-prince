import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getFeatureFlags } from '@/lib/features';
import { sanitizedString } from '@/lib/sanitize';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

const featureSchema = z.object({
  key: sanitizedString(z.string().min(1).max(100)),
  name: sanitizedString(z.string().min(1).max(200)),
  description: sanitizedString(z.string().max(1000)).optional().nullable(),
  category: sanitizedString(z.string().max(100)).optional().default('general'),
  defaultEnabled: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'admin');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const flags = await getFeatureFlags();
      return withSecurityHeaders(NextResponse.json({ success: true, data: flags }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'admin');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    return await withRole(req, ['admin'], async () => {
      const body = await req.json();
      const data = featureSchema.parse(body);

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
      const feature = await prisma.featureFlag.upsert({
        where: { tenantId_key: { tenantId, key: data.key } },
        update: {
          name: data.name,
          description: data.description,
          category: data.category,
          defaultEnabled: data.defaultEnabled,
          isDeleted: false,
          deletedAt: null,
        },
        create: {
          key: data.key,
          name: data.name,
          description: data.description,
          category: data.category,
          defaultEnabled: data.defaultEnabled,
        },
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: feature }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
