import { NextResponse, NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, 'public');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return withSecurityHeaders(NextResponse.json({ error: 'Missing video URL' }, { status: 400 }));
  }

  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error('TikTok oEmbed API failed');
    }

    const data = await response.json();
    return withSecurityHeaders(NextResponse.json(data));
  } catch (error) {
    console.error('TikTok oEmbed error:', error);
    return withSecurityHeaders(NextResponse.json(
      { error: 'Failed to fetch TikTok oEmbed' },
      { status: 500 }
    ));
  }
}
