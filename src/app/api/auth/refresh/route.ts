import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, verifyRefreshToken, getRefreshTokenFromCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromCookie(req);
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      const response = NextResponse.json({ success: false, error: 'Invalid refresh token' }, { status: 401 });
      response.cookies.set('admin_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      return response;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isDeleted || (user.lockedUntil && user.lockedUntil > new Date()) || user.tokenVersion !== payload.tokenVersion) {
      const response = NextResponse.json({ success: false, error: 'Token revoked. Please log in again.' }, { status: 401 });
      response.cookies.set('admin_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      return response;
    }

    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'JWT_SECRET_NOT_CONFIGURED') {
      return NextResponse.json({ success: false, error: 'Server authentication is not configured. Contact administrator.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
