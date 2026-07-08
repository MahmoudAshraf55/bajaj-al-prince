import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { passwordSchema, hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth';
import type { JWTPayload } from '@/lib/auth';

describe('passwordSchema', () => {
  it('accepts a valid password', () => {
    expect(() => passwordSchema.parse('Admin@123')).not.toThrow();
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(() => passwordSchema.parse('Ab1')).toThrow('at least 8 characters');
  });

  it('rejects passwords without uppercase', () => {
    expect(() => passwordSchema.parse('abcdefg1')).toThrow('uppercase');
  });

  it('rejects passwords without lowercase', () => {
    expect(() => passwordSchema.parse('ABCDEFG1')).toThrow('lowercase');
  });

  it('rejects passwords without a digit', () => {
    expect(() => passwordSchema.parse('Abcdefgh')).toThrow('digit');
  });

  it('accepts a password with exactly 8 characters', () => {
    expect(() => passwordSchema.parse('Abcdef1x')).not.toThrow();
  });

  it('accepts a complex password', () => {
    expect(() => passwordSchema.parse('MyP@ssw0rd!2025')).not.toThrow();
  });
});

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies correctly', async () => {
    const password = 'TestPassword1';
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(await verifyPassword(password, hashed)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hashed = await hashPassword('CorrectPass1');
    expect(await verifyPassword('WrongPass1', hashed)).toBe(false);
  });

  it('produces different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('SamePass1');
    const hash2 = await hashPassword('SamePass1');
    expect(hash1).not.toBe(hash2);
  });
});

describe('createToken / verifyToken', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates and verifies a valid access token', async () => {
    const payload: JWTPayload = {
      userId: 'user-1',
      username: 'admin',
      role: 'admin',
      tenantId: 'tenant-1',
    };
    const token = await createToken(payload);
    expect(typeof token).toBe('string');

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.userId).toBe('user-1');
    expect(verified!.username).toBe('admin');
    expect(verified!.role).toBe('admin');
    expect(verified!.tenantId).toBe('tenant-1');
  });

  it('throws when tenantId is missing in payload', async () => {
    const payload = {
      userId: 'user-1',
      username: 'admin',
      role: 'admin' as const,
      tenantId: '',
    };
    await expect(createToken(payload)).rejects.toThrow('JWT_MISSING_TENANT_ID');
  });

  it('throws when JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    const payload: JWTPayload = {
      userId: 'user-1',
      username: 'admin',
      role: 'admin',
      tenantId: 'tenant-1',
    };
    await expect(createToken(payload)).rejects.toThrow('JWT_SECRET_NOT_CONFIGURED');
  });

  it('returns null for an invalid token', async () => {
    const result = await verifyToken('invalid-token');
    expect(result).toBeNull();
  });

  it('returns null for a tampered token', async () => {
    const payload: JWTPayload = {
      userId: 'user-1',
      username: 'admin',
      role: 'admin',
      tenantId: 'tenant-1',
    };
    const token = await createToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });
});
