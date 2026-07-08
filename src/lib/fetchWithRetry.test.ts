import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

describe('fetchWithRetry', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns response on first successful fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const res = await fetchWithRetry('http://example.com/api', { retries: 2, retryDelay: 0 });
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 errors and succeeds on later attempt', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('Server error', { status: 500 }))
      .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const res = await fetchWithRetry('http://example.com/api', { retries: 2, retryDelay: 0 });
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx client errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response('Not Found', { status: 404 })
    );

    const res = await fetchWithRetry('http://example.com/api', { retries: 2, retryDelay: 0 });
    expect(res.status).toBe(404);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries on server errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Server error', { status: 500 })
    );

    await expect(
      fetchWithRetry('http://example.com/api', { retries: 2, retryDelay: 0 })
    ).rejects.toThrow('HTTP 500');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries on network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      fetchWithRetry('http://example.com/api', { retries: 1, retryDelay: 0 })
    ).rejects.toThrow('Network error');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses default retries of 3 when not specified', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      fetchWithRetry('http://example.com/api', { retryDelay: 0 })
    ).rejects.toThrow('fail');
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it('passes through fetch options', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response('OK', { status: 200 })
    );

    await fetchWithRetry('http://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 1 }),
      retries: 0,
      retryDelay: 0,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('http://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 1 }),
    });
  });

  it('converts non-Error throws to Error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue('string error');

    await expect(
      fetchWithRetry('http://example.com/api', { retries: 0, retryDelay: 0 })
    ).rejects.toThrow('string error');
  });
});
