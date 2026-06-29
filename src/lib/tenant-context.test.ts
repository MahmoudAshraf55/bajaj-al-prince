import { describe, it, expect } from 'vitest';
import { getTenantId, setTenantContext, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

describe('tenant-context', () => {
  it('exports DEFAULT_TENANT_ID as a valid UUID', () => {
    expect(DEFAULT_TENANT_ID).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('returns undefined when no context is set', () => {
    expect(getTenantId()).toBeUndefined();
  });

  it('returns tenantId inside setTenantContext', async () => {
    const result = await setTenantContext('test-tenant-id', async () => {
      return getTenantId();
    });
    expect(result).toBe('test-tenant-id');
  });

  it('returns undefined after setTenantContext completes', async () => {
    await setTenantContext('test-tenant-id', async () => 'done');
    expect(getTenantId()).toBeUndefined();
  });

  it('supports nested contexts with different tenant IDs', async () => {
    await setTenantContext('outer', async () => {
      expect(getTenantId()).toBe('outer');
      await setTenantContext('inner', async () => {
        expect(getTenantId()).toBe('inner');
      });
      expect(getTenantId()).toBe('outer');
    });
  });

  it('isolates tenant contexts across async boundaries', async () => {
    const results: string[] = [];
    await Promise.all([
      setTenantContext('tenant-a', async () => {
        results.push(getTenantId() || 'none');
      }),
      setTenantContext('tenant-b', async () => {
        results.push(getTenantId() || 'none');
      }),
    ]);
    expect(results).toContain('tenant-a');
    expect(results).toContain('tenant-b');
  });
});
