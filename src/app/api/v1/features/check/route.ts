import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { isFeatureEnabled } from '@/lib/features';

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'public');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Missing feature key' }, { status: 400 }));
    }

    const enabled = await isFeatureEnabled(key);
    return withSecurityHeaders(NextResponse.json({ success: true, data: { key, enabled } }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}
