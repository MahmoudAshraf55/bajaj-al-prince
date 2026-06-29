import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from './logger';
import { getRolePermissions } from './permissions';
import { DEFAULT_TENANT_ID, tenantStorage } from './tenant-context';

export type UserRole = 'admin' | 'staff' | 'viewer';

/**
 * Password complexity requirements.
 * Minimum 8 characters, at least one uppercase, one lowercase, one digit.
 * Enforce this schema on all password creation/change routes.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one digit');

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  tenantId: string;
}

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET environment variable is required but not set');
    return null;
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array | null {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is required but not set');
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

export async function createToken(payload: JWTPayload) {
  if (!payload.tenantId) {
    throw new Error('JWT_MISSING_TENANT_ID');
  }
  const secret = getSecret();
  if (!secret) {
    throw new Error('JWT_SECRET_NOT_CONFIGURED');
  }
  return new SignJWT({ ...payload, type: 'access' } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecret();
    if (!secret) {
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    if (payload.type !== 'access') return null;
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as UserRole,
      tenantId: (payload.tenantId as string) || DEFAULT_TENANT_ID,
    };
  } catch {
    return null;
  }
}

export async function createRefreshToken(userId: string, tokenVersion: number) {
  const secret = getRefreshSecret();
  if (!secret) {
    throw new Error('JWT_SECRET_NOT_CONFIGURED');
  }
  return new SignJWT({ userId, tokenVersion, type: 'refresh' } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string; tokenVersion: number } | null> {
  try {
    const secret = getRefreshSecret();
    if (!secret) {
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    if (payload.type !== 'refresh') return null;
    return {
      userId: payload.userId as string,
      tokenVersion: payload.tokenVersion as number,
    };
  } catch {
    return null;
  }
}

export function getTokenFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get('admin_token')?.value;
  return token ?? null;
}

export function getRefreshTokenFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get('refresh_token')?.value;
  return token ?? null;
}

async function authenticateRequest(req: NextRequest): Promise<JWTPayload> {
  const token = getTokenFromCookie(req);
  if (!token) {
    throw new Error('Unauthorized');
  }
  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error('Invalid token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.isDeleted || (user.lockedUntil && user.lockedUntil > new Date())) {
    throw new Error('Unauthorized');
  }

  // Ensure the token payload carries a tenant. Legacy tokens without tenantId
  // are bound to the default tenant for safe migration.
  const tenantId = payload.tenantId || DEFAULT_TENANT_ID;
  return { ...payload, tenantId };
}

/**
 * Wraps a handler with authentication and tenant context.
 * The tenant context is set via AsyncLocalStorage.run() so it is isolated per
 * request and cannot leak between concurrent requests (unlike enterWith).
 */
export async function withAuth<T>(
  req: NextRequest,
  handler: (payload: JWTPayload) => Promise<T>
): Promise<T> {
  const payload = await authenticateRequest(req);
  return tenantStorage.run({ tenantId: payload.tenantId }, () => handler(payload));
}

export async function withRole<T>(
  req: NextRequest,
  allowedRoles: UserRole[],
  handler: (payload: JWTPayload) => Promise<T>
): Promise<T> {
  return withAuth(req, async (payload) => {
    if (!allowedRoles.includes(payload.role)) {
      throw new Error('Forbidden');
    }
    return handler(payload);
  });
}

/**
 * Guards a handler by a granular permission.
 * Falls back to DEFAULT_ROLE_PERMISSIONS if the database is unreachable.
 */
export async function withPermission<T>(
  req: NextRequest,
  permissionKey: string,
  handler: (payload: JWTPayload) => Promise<T>
): Promise<T> {
  return withAuth(req, async (payload) => {
    const permissions = await getRolePermissions(payload.role);
    if (!permissions.has(permissionKey)) {
      throw new Error('Forbidden');
    }
    return handler(payload);
  });
}

/**
 * @deprecated Use withAuth() instead. requireAuth uses AsyncLocalStorage.enterWith
 * which can leak tenant context between concurrent requests.
 */
export async function requireAuth(req: NextRequest): Promise<JWTPayload> {
  return authenticateRequest(req);
}

/**
 * @deprecated Use withRole() instead.
 */
export async function requireRole(req: NextRequest, allowedRoles: UserRole[]): Promise<JWTPayload> {
  const payload = await authenticateRequest(req);
  if (!allowedRoles.includes(payload.role)) {
    throw new Error('Forbidden');
  }
  return payload;
}

/**
 * @deprecated Use withPermission() instead.
 */
export async function requirePermission(req: NextRequest, permissionKey: string): Promise<JWTPayload> {
  const payload = await authenticateRequest(req);
  const permissions = await getRolePermissions(payload.role);
  if (!permissions.has(permissionKey)) {
    throw new Error('Forbidden');
  }
  return payload;
}
