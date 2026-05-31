import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

export async function createToken(payload: object) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { clockTolerance: 60 });
    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error('Invalid token');
  }
  return payload;
}
