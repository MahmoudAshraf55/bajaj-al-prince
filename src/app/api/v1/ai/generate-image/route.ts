import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const generateSchema = z.object({
  prompt: z.string().min(3).max(500),
});

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async () => {
      const body = await req.json();
      const { prompt } = generateSchema.parse(body);

      const pollKey = process.env.POLLINATIONS_API_KEY;
      const headers: Record<string, string> = {};
      if (pollKey) headers['Authorization'] = `Bearer ${pollKey}`;

      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=1024&height=1024&nologo=true`;
      const res = await fetch(url, { headers, cache: 'no-store' });

      if (!res.ok) {
        const err = await res.text().catch(() => 'Pollinations API error');
        return withSecurityHeaders(NextResponse.json({ success: false, error: err }, { status: 502 }));
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      const filename = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      const url_ = `/uploads/${filename}`;
      return withSecurityHeaders(NextResponse.json({ success: true, data: { url: url_ } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((i) => i.message).join('; ');
      return withSecurityHeaders(NextResponse.json({ success: false, error: messages, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 502 }));
  }
}
