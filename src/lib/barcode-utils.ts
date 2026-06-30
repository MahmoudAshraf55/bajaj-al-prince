export function parseBarcodeFormat(barcode: string): { format: string; isValid: boolean } {
  const cleaned = barcode.trim();

  if (/^\d{12}$/.test(cleaned)) return { format: 'UPC-A', isValid: true };
  if (/^\d{13}$/.test(cleaned)) return { format: 'EAN-13', isValid: true };
  if (/^\d{8}$/.test(cleaned)) return { format: 'EAN-8', isValid: true };
  if (/^\d{14}$/.test(cleaned)) return { format: 'ITF-14', isValid: true };
  if (/^[A-Za-z0-9\-_]+$/.test(cleaned) && cleaned.length >= 3 && cleaned.length <= 50)
    return { format: 'Code128/Code39', isValid: true };
  if (cleaned.length > 0) return { format: 'Unknown', isValid: false };
  return { format: 'Empty', isValid: false };
}
