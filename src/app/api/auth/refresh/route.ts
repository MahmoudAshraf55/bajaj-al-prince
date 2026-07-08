import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, createRefreshToken, verifyRefreshToken, getRefreshTokenFromCookie } from '@/lib/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { withSecurityHeaders } from '@/lib/security';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromCookie(req);
    if (!refreshToken) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      const response = NextResponse.json({ success: false, error: 'Invalid refresh token' }, { status: 401 });
      response.cookies.set('admin_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      return withSecurityHeaders(response);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isDeleted || (user.lockedUntil && user.lockedUntil > new Date()) || user.tokenVersion !== payload.tokenVersion) {
      const response = NextResponse.json({ success: false, error: 'Token revoked. Please log in again.' }, { status: 401 });
      response.cookies.set('admin_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      return withSecurityHeaders(response);
    }

    // 1. Rotate the token by incrementing the tokenVersion in DB.
    // This invalidates all previous refresh tokens and prevents replay attacks.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const token = await createToken({
      userId: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId ?? DEFAULT_TENANT_ID,
    });

    const newRefreshToken = await createRefreshToken(updatedUser.id, updatedUser.tokenVersion);

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: updatedUser.id,
      action: 'login',
      entity: 'User',
      entityId: updatedUser.id,
      newValue: { status: 'refresh_rotated', username: updatedUser.username, tokenVersion: updatedUser.tokenVersion },
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60,
      path: '/',
    });
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return withSecurityHeaders(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'JWT_SECRET_NOT_CONFIGURED') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Server authentication is not configured. Contact administrator.' }, { status: 500 }));
    }
    logger.error('Token refresh error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
