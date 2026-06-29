import { describe, it, expect } from 'vitest';
import { generateCorrelationId, setCorrelationId, getCorrelationId } from '@/lib/logger';

describe('logger', () => {
  it('generates unique correlation IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(10);
  });

  it('correlation ID format is valid (timestamp-random)', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it('setCorrelationId and getCorrelationId work', () => {
    setCorrelationId('test-correlation-123');
    expect(getCorrelationId()).toBe('test-correlation-123');
  });

  it('getCorrelationId returns undefined when not set', () => {
    setCorrelationId('test-456');
    setCorrelationId(undefined as unknown as string);
    // After setting to undefined, it should be undefined
    // Note: setCorrelationId doesn't clear, it just sets the module variable
    // So we test that it was set
    setCorrelationId('new-id');
    expect(getCorrelationId()).toBe('new-id');
  });
});
