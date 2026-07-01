import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { FEATURE_FLAGS } from '@/lib/features';

describe('FEATURE_FLAGS registry', () => {
  it('contains expected feature flags', () => {
    const keys = FEATURE_FLAGS.map((f) => f.key);
    expect(keys).toContain('whatsapp_module');
    expect(keys).toContain('advanced_accounting');
    expect(keys).toContain('supplier_management');
    expect(keys).toContain('ai_product_generator');
    expect(keys).toContain('push_notifications');
    expect(keys).toContain('mixed_payments');
    expect(keys).toContain('customer_timeline');
  });

  it('has unique keys', () => {
    const keys = FEATURE_FLAGS.map((f) => f.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('every flag has required fields', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(flag.key).toBeTruthy();
      expect(flag.name).toBeTruthy();
      expect(typeof flag.description).toBe('string');
      expect(flag.category).toBeTruthy();
      expect(typeof flag.defaultEnabled).toBe('boolean');
    }
  });

  it('whatsapp_module is enabled by default', () => {
    const flag = FEATURE_FLAGS.find((f) => f.key === 'whatsapp_module');
    expect(flag?.defaultEnabled).toBe(true);
  });

  it('mixed_payments is enabled by default', () => {
    const flag = FEATURE_FLAGS.find((f) => f.key === 'mixed_payments');
    expect(flag?.defaultEnabled).toBe(true);
  });

  it('customer_timeline is enabled by default', () => {
    const flag = FEATURE_FLAGS.find((f) => f.key === 'customer_timeline');
    expect(flag?.defaultEnabled).toBe(true);
  });

  it('advanced_accounting is disabled by default', () => {
    const flag = FEATURE_FLAGS.find((f) => f.key === 'advanced_accounting');
    expect(flag?.defaultEnabled).toBe(false);
  });

  it('ai_product_generator is disabled by default', () => {
    const flag = FEATURE_FLAGS.find((f) => f.key === 'ai_product_generator');
    expect(flag?.defaultEnabled).toBe(false);
  });

  it('has valid categories', () => {
    const categories = new Set(FEATURE_FLAGS.map((f) => f.category));
    expect(categories.size).toBeGreaterThan(0);
    for (const cat of categories) {
      expect(typeof cat).toBe('string');
      expect(cat.length).toBeGreaterThan(0);
    }
  });
});
