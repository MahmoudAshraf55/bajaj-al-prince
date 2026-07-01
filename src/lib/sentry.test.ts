import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSentry, captureException } from '@/lib/sentry';

describe('sentry', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('initSentry', () => {
    it('warns and returns when SENTRY_DSN is not set', () => {
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      initSentry();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('SENTRY_DSN not configured')
      );
    });
  });

  describe('captureException', () => {
    it('logs error to console when SENTRY_DSN is not set', () => {
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const error = new Error('Test error');
      captureException(error, { module: 'test' });
      expect(console.error).toHaveBeenCalledWith(
        '[error]',
        'Test error',
        { module: 'test' }
      );
    });

    it('logs error without context when context is undefined', () => {
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const error = new Error('No context error');
      captureException(error);
      expect(console.error).toHaveBeenCalledWith(
        '[error]',
        'No context error',
        ''
      );
    });
  });
});
