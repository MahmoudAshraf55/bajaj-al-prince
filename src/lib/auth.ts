import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[auth] JWT_SECRET environment variable is required but not set');
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
  const secret = getSecret();
  if (!secret) {
    throw new Error('JWT_SECRET_NOT_CONFIGURED');
  }
  return new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecret();
    if (!secret) {
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

function getTokenFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get('admin_token')?.value;
  return token ?? null;
}

export async function requireAuth(req: NextRequest): Promise<JWTPayload> {
  const token = getTokenFromCookie(req);
  if (!token) {
    throw new Error('Unauthorized');
  }
  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error('Invalid token');
  }
  return payload;
}

export async function requireRole(req: NextRequest, allowedRoles: UserRole[]): Promise<JWTPayload> {
  const payload = await requireAuth(req);
  if (!allowedRoles.includes(payload.role)) {
    throw new Error('Forbidden');
  }
  return payload;
}
