import { describe, it, expect } from 'vitest';
import { parseBarcodeFormat } from '@/lib/barcode-utils';

describe('parseBarcodeFormat', () => {
  it('recognizes UPC-A (12 digits)', () => {
    expect(parseBarcodeFormat('012345678901')).toEqual({ format: 'UPC-A', isValid: true });
  });

  it('recognizes EAN-13 (13 digits)', () => {
    expect(parseBarcodeFormat('0123456789012')).toEqual({ format: 'EAN-13', isValid: true });
  });

  it('recognizes EAN-8 (8 digits)', () => {
    expect(parseBarcodeFormat('01234567')).toEqual({ format: 'EAN-8', isValid: true });
  });

  it('recognizes ITF-14 (14 digits)', () => {
    expect(parseBarcodeFormat('01234567890123')).toEqual({ format: 'ITF-14', isValid: true });
  });

  it('recognizes Code128/Code39 alphanumeric (3-50 chars)', () => {
    expect(parseBarcodeFormat('ABC-123')).toEqual({ format: 'Code128/Code39', isValid: true });
    expect(parseBarcodeFormat('abc')).toEqual({ format: 'Code128/Code39', isValid: true });
    expect(parseBarcodeFormat('A_B-C')).toEqual({ format: 'Code128/Code39', isValid: true });
  });

  it('rejects Code128/Code39 shorter than 3 chars', () => {
    expect(parseBarcodeFormat('AB')).toEqual({ format: 'Unknown', isValid: false });
  });

  it('rejects Code128/Code39 longer than 50 chars', () => {
    const longCode = 'A'.repeat(51);
    expect(parseBarcodeFormat(longCode)).toEqual({ format: 'Unknown', isValid: false });
  });

  it('returns Unknown for invalid barcodes with special chars', () => {
    expect(parseBarcodeFormat('ABC!@#')).toEqual({ format: 'Unknown', isValid: false });
  });

  it('returns Empty for empty string', () => {
    expect(parseBarcodeFormat('')).toEqual({ format: 'Empty', isValid: false });
  });

  it('returns Empty for whitespace-only string', () => {
    expect(parseBarcodeFormat('   ')).toEqual({ format: 'Empty', isValid: false });
  });

  it('trims whitespace before parsing', () => {
    expect(parseBarcodeFormat('  01234567  ')).toEqual({ format: 'EAN-8', isValid: true });
  });

  it('handles 50-char alphanumeric at boundary', () => {
    const code50 = 'A'.repeat(50);
    expect(parseBarcodeFormat(code50)).toEqual({ format: 'Code128/Code39', isValid: true });
  });

  it('treats numeric strings with specific lengths as barcode formats (not Code128)', () => {
    expect(parseBarcodeFormat('12345')).toEqual({ format: 'Code128/Code39', isValid: true });
    expect(parseBarcodeFormat('1234567')).toEqual({ format: 'Code128/Code39', isValid: true });
  });
});
