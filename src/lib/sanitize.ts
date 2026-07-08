import { z } from 'zod';

/**
 * Strips HTML tags and dangerous characters to prevent XSS.
 * Handles malformed tags, null bytes, and common bypass vectors.
 */
function stripHtml(input: string): string {
  let result = input;
  // Remove null bytes which can bypass filters
  result = result.replace(/\0/g, '');
  // Remove HTML tags (including malformed ones with extra whitespace/newlines)
  result = result.replace(/<\/?[^>]*>/gi, '');
  // Remove javascript: and data: URI schemes
  result = result.replace(/javascript\s*:/gi, '');
  result = result.replace(/data\s*:\s*text\/html/gi, '');
  // Remove event handler patterns (on*)
  result = result.replace(/\bon\w+\s*=/gi, '');
  return result;
}

export function sanitizedString(schema: z.ZodString) {
  return schema.transform((val) => stripHtml(val.trim()));
}
