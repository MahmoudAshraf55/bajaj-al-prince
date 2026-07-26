import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, passwordSchema } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const recoverSchema = z.object({
  secret: z.string().min(1, 'Recovery secret is required'),
  newPassword: passwordSchema,
});

/**
 * Minimal admin password recovery endpoint.
 *
 * Protected by ADMIN_RECOVERY_SECRET env var — only someone who knows the
 * secret can reset the admin password. No email flow needed for a single-admin
 * setup. The secret should be a strong, randomly generated string stored in
 * Vercel environment variables (never committed to git).
 *
 * Rate-limited to 3 attempts per 15 minutes per IP to prevent brute force.
 */
export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'login');
  if (!limit.allowed) return limit.response!;

  const recoverySecret = process.env.ADMIN_RECOVERY_SECRET;
  if (!recoverySecret) {
    logger.warn('ADMIN_RECOVERY_SECRET not configured — password recovery disabled');
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Password recovery is not configured on this server.' },
        { status: 503 }
      )
    );
  }

  try {
    const body = await req.json();
    const { secret, newPassword } = recoverSchema.parse(body);

    if (secret !== recoverySecret) {
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'password_recovery',
        entity: 'User',
        entityId: 'unknown',
        newValue: { status: 'invalid_secret' },
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'Invalid recovery secret' }, { status: 403 })
      );
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin', isDeleted: false },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'No admin user found' }, { status: 404 })
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        password: hashedPassword,
        failedAttempts: 0,
        lockedUntil: null,
        tokenVersion: adminUser.tokenVersion + 1,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: adminUser.id,
      action: 'password_recovery',
      entity: 'User',
      entityId: adminUser.id,
      newValue: { status: 'password_reset', username: adminUser.username },
      ipAddress,
      userAgent,
    });

    return withSecurityHeaders(
      NextResponse.json({ success: true, message: 'Password has been reset. You can now log in with the new password.' })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, errors: error.issues }, { status: 400 })
      );
    }
    logger.error('Password recovery error', error);
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    );
  }
}
