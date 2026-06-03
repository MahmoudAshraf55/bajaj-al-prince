import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyRefreshToken, getTokenFromCookie, getRefreshTokenFromCookie } from '@/lib/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';

export async function POST(req: NextRequest) {
  const token = getTokenFromCookie(req);
  const refreshToken = getRefreshTokenFromCookie(req);
  const { ipAddress, userAgent } = getClientInfo(req);

  let userId: string | undefined;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      userId = payload.userId;
    }
  }

  if (!userId && refreshToken) {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload) {
      userId = payload.userId;
    }
  }

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await logAudit({
      userId,
      action: 'logout',
      entity: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  const response = withSecurityHeaders(NextResponse.json({ success: true }));
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
