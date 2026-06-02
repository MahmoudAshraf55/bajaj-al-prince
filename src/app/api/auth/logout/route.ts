import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { logAudit, getClientInfo } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const token = getTokenFromCookie(req);
  const { ipAddress, userAgent } = getClientInfo(req);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await logAudit({
        userId: payload.userId,
        action: 'logout',
        entity: 'User',
        entityId: payload.userId,
        ipAddress,
        userAgent,
      });
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
