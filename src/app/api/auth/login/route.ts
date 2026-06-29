import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, createRefreshToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(128),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'login');
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 }));
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return withSecurityHeaders(NextResponse.json(
        { success: false, error: `Account locked. Try again in ${minutesLeft} minutes.` },
        { status: 423 }
      ));
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      const newFailed = user.failedAttempts + 1;
      const lockedUntil = newFailed >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: newFailed, lockedUntil },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: user.id,
        action: 'login',
        entity: 'User',
        entityId: user.id,
        newValue: { status: lockedUntil ? 'locked' : 'failed', failedAttempts: newFailed },
        ipAddress,
        userAgent,
      });

      if (lockedUntil) {
        return withSecurityHeaders(NextResponse.json(
          { success: false, error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` },
          { status: 423 }
        ));
      }

      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 }));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId ?? DEFAULT_TENANT_ID,
    });
    const refreshToken = await createRefreshToken(user.id, user.tokenVersion);

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: user.id,
      action: 'login',
      entity: 'User',
      entityId: user.id,
      newValue: { status: 'success', username: user.username, role: user.role },
      ipAddress,
      userAgent,
    });

    const response = withSecurityHeaders(NextResponse.json({ success: true }));
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    if (error instanceof Error && error.message === 'JWT_SECRET_NOT_CONFIGURED') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Server authentication is not configured. Contact administrator.' }, { status: 500 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
