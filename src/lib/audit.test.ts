import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { getClientInfo } from '@/lib/audit';
import { NextRequest } from 'next/server';

describe('getClientInfo', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        'user-agent': 'TestAgent/1.0',
      },
    });
    const info = getClientInfo(req);
    expect(info.ipAddress).toBe('192.168.1.1');
    expect(info.userAgent).toBe('TestAgent/1.0');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-real-ip': '10.0.0.5',
        'user-agent': 'TestAgent/2.0',
      },
    });
    const info = getClientInfo(req);
    expect(info.ipAddress).toBe('10.0.0.5');
  });

  it('returns unknown when no IP headers present', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'user-agent': 'TestAgent/3.0' },
    });
    const info = getClientInfo(req);
    expect(info.ipAddress).toBe('unknown');
  });

  it('returns unknown user-agent when header is missing', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    const info = getClientInfo(req);
    expect(info.userAgent).toBe('unknown');
  });

  it('trims whitespace from x-forwarded-for first entry', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' },
    });
    const info = getClientInfo(req);
    expect(info.ipAddress).toBe('192.168.1.1');
  });
});
