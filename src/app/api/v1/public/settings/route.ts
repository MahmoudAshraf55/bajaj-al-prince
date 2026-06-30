import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';

const PUBLIC_KEYS = [
  'brand_name',
  'brand_tagline',
  'location_address',
  'location_map_url',
  'contact_phone1',
  'contact_phone2',
  'contact_email',
  'contact_facebook',
  'contact_instagram',
  'contact_tiktok',
  'contact_whatsapp',
];

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'public');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return withSecurityHeaders(NextResponse.json({ success: true, data: { settings: map } }));
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 }));
  }
}
