import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing video URL' }, { status: 400 });
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('TikTok oEmbed error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TikTok oEmbed' },
      { status: 500 }
    );
  }
}
