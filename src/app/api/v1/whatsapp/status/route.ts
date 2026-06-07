import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { getWhatsAppStateFromService } from '@/lib/whatsapp-client';

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    await requireRole(req, ['admin', 'staff']);
    const state = await getWhatsAppStateFromService();
    return withSecurityHeaders(NextResponse.json({ success: true, data: state }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
