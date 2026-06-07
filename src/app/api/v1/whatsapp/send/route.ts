import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { sendWhatsAppMessageViaService, getWhatsAppStateFromService } from '@/lib/whatsapp-client';
import { z } from 'zod';

const sendSchema = z.object({
  phone: z.string().min(5).max(30),
  message: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    await requireRole(req, ['admin', 'staff']);

    const waState = await getWhatsAppStateFromService();
    if (waState.status !== 'connected') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'WhatsApp not connected' }, { status: 503 }));
    }

    const body = await req.json();
    const data = sendSchema.parse(body);

    const result = await sendWhatsAppMessageViaService(data.phone, data.message);

    if (result.success) {
      return withSecurityHeaders(NextResponse.json({ success: true, data: { sent: true } }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: result.error }, { status: 500 }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}
