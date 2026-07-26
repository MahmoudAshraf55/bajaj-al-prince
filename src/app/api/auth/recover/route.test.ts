import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  getClientInfo: vi.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
  extractClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/recover', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, ADMIN_RECOVERY_SECRET: 'test-secret-123' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 503 when ADMIN_RECOVERY_SECRET is not set', async () => {
    delete process.env.ADMIN_RECOVERY_SECRET;
    const { POST } = await import('@/app/api/auth/recover/route');
    const res = await POST(makeRequest({ secret: 'any', newPassword: 'Admin@1234' }) );
    expect(res.status).toBe(503);
  });

  it('returns 403 when secret does not match', async () => {
    const { POST } = await import('@/app/api/auth/recover/route');
    const res = await POST(makeRequest({ secret: 'wrong', newPassword: 'Admin@1234' }) );
    expect(res.status).toBe(403);
  });

  it('returns 400 when newPassword fails validation', async () => {
    const { POST } = await import('@/app/api/auth/recover/route');
    const res = await POST(makeRequest({ secret: 'test-secret-123', newPassword: 'weak' }) );
    expect(res.status).toBe(400);
  });

  it('returns 404 when no admin user exists', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const { POST } = await import('@/app/api/auth/recover/route');
    const res = await POST(makeRequest({ secret: 'test-secret-123', newPassword: 'Admin@1234' }) );
    expect(res.status).toBe(404);
  });

  it('resets password and returns 200 on valid request', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      username: 'admin',
      role: 'admin',
      tokenVersion: 5,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const { POST } = await import('@/app/api/auth/recover/route');
    const res = await POST(makeRequest({ secret: 'test-secret-123', newPassword: 'NewPass@123' }) );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'admin-1' },
        data: expect.objectContaining({
          failedAttempts: 0,
          lockedUntil: null,
          tokenVersion: 6,
        }),
      })
    );
  });
});
