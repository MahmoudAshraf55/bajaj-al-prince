import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Wraps a ZodString schema with DOMPurify sanitization.
 * Strips malicious HTML/JS before the value enters the application/database.
 *
 * Usage:
 *   name: sanitizedString(z.string().min(2).max(100)),
 *   message: sanitizedString(z.string().min(10).max(2000)),
 */
export function sanitizedString(schema: z.ZodString) {
  return schema.transform((val) => DOMPurify.sanitize(val.trim()));
}
