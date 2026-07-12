import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withSecurityHeaders } from '@/lib/security';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    return await withAuth(req, async () => {

      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const prefix = (formData.get('prefix') as string) || 'product';
      if (!file) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 }));
      }

      if (!ALLOWED_MIME.has(file.type)) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 }));
      }

      if (file.size > MAX_SIZE) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'File size must be under 5MB' }, { status: 400 }));
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const rawExt = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt.toLowerCase()) ? rawExt : 'png';
      const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filepath = path.join(uploadDir, filename);

      if (!filepath.startsWith(uploadDir)) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid file path' }, { status: 400 }));
      }

      await writeFile(filepath, buffer);

      const url = `/uploads/${filename}`;
      return withSecurityHeaders(NextResponse.json({ success: true, data: { url } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const status = message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
