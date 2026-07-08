import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    return await withAuth(req, async (payload) => {
      return withSecurityHeaders(NextResponse.json({ success: true, data: { user: payload } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 401 }));
  }
}
