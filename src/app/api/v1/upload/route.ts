import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {

      const formData = await req.formData();
      const file = formData.get('file') as File | null;
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
      const base64 = Buffer.from(bytes).toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      return withSecurityHeaders(NextResponse.json({ success: true, data: { url: dataUrl } }, { status: 200 }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const status = message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
