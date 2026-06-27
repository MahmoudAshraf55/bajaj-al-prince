import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const describeSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().optional().default(''),
});

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    await requireRole(req, ['admin']);
    const body = await req.json();
    const { name, category } = describeSchema.parse(body);

    const pollKey = process.env.POLLINATIONS_API_KEY;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (pollKey) headers['Authorization'] = `Bearer ${pollKey}`;

    const prompt = `Generate a concise product description for a motorcycle part: "${name}"${category ? ` in category "${category}"` : ''}. Describe key features, material, compatibility, and condition. Keep under 100 words. Write in clear professional language.`;

    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text().catch(() => 'AI text service error');
      return withSecurityHeaders(NextResponse.json({ success: false, error: err }, { status: 502 }));
    }

    const description = await res.text();
    if (description && description.trim()) {
      return withSecurityHeaders(NextResponse.json({ success: true, data: { description: description.trim() } }));
    }

    return withSecurityHeaders(NextResponse.json({ success: false, error: 'AI could not generate a description' }, { status: 502 }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'AI description failed';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 502 }));
  }
}
