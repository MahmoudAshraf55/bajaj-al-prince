import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    return withSecurityHeaders(NextResponse.json({ success: true, data: { user: payload } }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 401 }));
  }
}
