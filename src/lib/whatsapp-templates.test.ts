import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { applyVariables } from '@/lib/whatsapp-templates';

describe('applyVariables', () => {
  it('replaces all known placeholders', () => {
    const template = 'Hello {{name}}, your {{model}} is ready on {{date}} at {{time}}.';
    const result = applyVariables(template, {
      name: 'Ahmed',
      model: 'Bajaj Pulsar',
      date: '2025-01-15',
      time: '10:00',
    });
    expect(result).toBe('Hello Ahmed, your Bajaj Pulsar is ready on 2025-01-15 at 10:00.');
  });

  it('replaces multiple occurrences of the same variable', () => {
    const template = '{{name}} booked for {{name}}';
    const result = applyVariables(template, { name: 'Ahmed' });
    expect(result).toBe('Ahmed booked for Ahmed');
  });

  it('replaces missing variables with empty string', () => {
    const template = 'Hello {{name}}, issue: {{issue}}';
    const result = applyVariables(template, {});
    expect(result).toBe('Hello , issue: ');
  });

  it('handles all variable types', () => {
    const template = '{{name}} {{model}} {{date}} {{time}} {{issue}} {{make}} {{cost}} {{work}}';
    const result = applyVariables(template, {
      name: 'A',
      model: 'B',
      date: 'C',
      time: 'D',
      issue: 'E',
      make: 'F',
      cost: 'G',
      work: 'H',
    });
    expect(result).toBe('A B C D E F G H');
  });

  it('returns template unchanged when no placeholders present', () => {
    const template = 'No placeholders here';
    const result = applyVariables(template, { name: 'Ahmed' });
    expect(result).toBe('No placeholders here');
  });

  it('handles empty template', () => {
    expect(applyVariables('', { name: 'Ahmed' })).toBe('');
  });

  it('handles Arabic text in template and variables', () => {
    const template = 'مرحبا {{name}}، موعدك يوم {{date}}';
    const result = applyVariables(template, { name: 'أحمد', date: '2025-01-15' });
    expect(result).toBe('مرحبا أحمد، موعدك يوم 2025-01-15');
  });
});
