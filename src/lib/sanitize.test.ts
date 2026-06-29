import { describe, it, expect } from 'vitest';
import { sanitizedString } from '@/lib/sanitize';
import { z } from 'zod';

describe('sanitize', () => {
  it('strips HTML tags from input', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('<script>alert("xss")</script>');
    expect(result).toBe('alert("xss")');
  });

  it('strips nested HTML tags', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('<div><p>Hello</p></div>');
    expect(result).toBe('Hello');
  });

  it('trims whitespace', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('  hello  ');
    expect(result).toBe('hello');
  });

  it('strips HTML and trims outer whitespace', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('  <b>  world  </b>  ');
    // trim happens first (outer), then HTML is stripped (inner spaces preserved)
    expect(result).toBe('  world  ');
  });

  it('returns empty string for empty input', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('');
    expect(result).toBe('');
  });

  it('strips self-closing tags', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('Hello<br/>World');
    expect(result).toBe('HelloWorld');
  });

  it('preserves plain text', () => {
    const schema = sanitizedString(z.string());
    const result = schema.parse('Just plain text');
    expect(result).toBe('Just plain text');
  });

  it('rejects strings shorter than min', () => {
    const schema = sanitizedString(z.string().min(5));
    expect(() => schema.parse('abc')).toThrow();
  });

  it('accepts strings at min length after sanitization', () => {
    const schema = sanitizedString(z.string().min(5));
    const result = schema.parse('<b>Hello</b>');
    expect(result).toBe('Hello');
  });
});
