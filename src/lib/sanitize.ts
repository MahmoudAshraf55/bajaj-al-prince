import { z } from 'zod';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function sanitizedString(schema: z.ZodString) {
  return schema.transform((val) => stripHtml(val.trim()));
}
