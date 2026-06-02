import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Account locked. Try again in ${minutesLeft} minutes.` },
        { status: 423 }
      );
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

      if (lockedUntil) {
        return NextResponse.json(
          { success: false, error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` },
          { status: 423 }
        );
      }

      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

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
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'JWT_SECRET_NOT_CONFIGURED') {
      return NextResponse.json({ success: false, error: 'Server authentication is not configured. Contact administrator.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
