/*
  TikTok API Route (Free & Self-Healing)
  - Scrapes TikTok profile server-side (no CORS, no API key)
  - Extracts latest video URLs via robust regex fallbacks
  - Enrich via TikTok oEmbed (also free)
  - Caches results for 6 hours to avoid rate limits
  - Gracefully degrades to fallback data on failure
*/

import { NextResponse } from 'next/server';

const TIKTOK_USERNAME = process.env.NEXT_PUBLIC_TIKTOK_USERNAME || 'elprince.bajajj';
const CACHE_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours

interface TikTokVideo {
  id: string;
  title: string;
  thumbnail: string;
  embedHtml: string;
  url: string;
  author: string;
}

// ─── Fallbacks: hard-codable top videos if scraping ever fails ───
const FALLBACK_VIDEOS: TikTokVideo[] = [
  {
    // Fallback video is a real TikTok video link so UI can render an iframe even if scraping/oEmbed fails.
    id: 'fallback-video-1',
    title: 'تابعنا على TikTok لأحدث الفيديوهات!',
    thumbnail: '',
    embedHtml: '',
    url: 'https://www.tiktok.com/@elprince.bajajj/video/7611079884860919060',
    author: TIKTOK_USERNAME,
  },
];

// ─── Helpers ───
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function extractVideoIds(html: string): string[] {
  const patterns = [
    // Modern TikTok SSR embed
    /"([^"]*\/video\/(\d+))"/g,
    // Legacy patterns
    /href="(https:\/\/www\.tiktok\.com\/@[^/]+\/video\/(\d+))"/g,
    /href="(https:\/\/tiktok\.com\/@[^/]+\/video\/(\d+))"/g,
    // Data attributes
    /data-e2e="user-video-list".*?"id":"(\d+)"/g,
    // Any video URL pattern
    /(https:\/\/(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+))/g,
  ];

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = match[1] || match[0];
      const idMatch = url.match(/video\/(\d+)/);
      if (idMatch) {
        const id = idMatch[1];
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
  }

  return ids.slice(0, 5);
}

async function fetchOEmbed(videoUrl: string): Promise<Partial<TikTokVideo>> {
  try {
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      { cache: 'no-store' }
    );
    if (!oembedRes.ok) throw new Error('oEmbed failed');
    const oembed = await oembedRes.json();
    return {
      title: oembed.title || 'TikTok Video',
      thumbnail: oembed.thumbnail_url || '',
      embedHtml: oembed.html || '',
      author: oembed.author_name || TIKTOK_USERNAME,
    };
  } catch {
    return {
      title: 'TikTok Video',
      thumbnail: '',
      embedHtml: '',
      author: TIKTOK_USERNAME,
    };
  }
}

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
        },
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries) throw err;
      await delay(1000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

async function checkLiveStatus(): Promise<boolean> {
  try {
    const html = await fetchWithRetry(`https://www.tiktok.com/@${TIKTOK_USERNAME}/live`);
    const liveSignals = [
      /"isLive":true/i,
      /"live":true/i,
      /"liveUrl"/i,
      /stream_status.*live/i,
      /"status":\s*"LIVE"/i,
    ];
    return liveSignals.some((pattern) => pattern.test(html));
  } catch {
    return false;
  }
}

// ─── Main Handler ───
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'videos'; // 'videos' | 'live'

  try {
    if (mode === 'live') {
      const isLive = await checkLiveStatus();
      return NextResponse.json({ isLive }, {
        headers: {
          'Cache-Control': `public, s-maxage=${60 * 5}, stale-while-revalidate=${60 * 10}`,
        },
      });
    }

    // 1. Check live status first (lightweight)
    const [isLive, profileHtml] = await Promise.allSettled([
      checkLiveStatus(),
      fetchWithRetry(`https://www.tiktok.com/@${TIKTOK_USERNAME}`),
    ]);

    // If live, return early
    if (isLive.status === 'fulfilled' && isLive.value) {
      return NextResponse.json(
        { isLive: true, videos: [] },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${60 * 5}, stale-while-revalidate=${60 * 10}`,
          },
        }
      );
    }

    // 2. Extract video IDs from profile
    if (profileHtml.status !== 'fulfilled') {
      throw new Error('Failed to fetch TikTok profile');
    }

    const videoIds = extractVideoIds(profileHtml.value);

    if (videoIds.length === 0) {
      // No videos found, return fallback
      return NextResponse.json(
        { isLive: false, videos: FALLBACK_VIDEOS },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${60 * 60}, stale-while-revalidate=${60 * 30}`,
          },
        }
      );
    }

    // 3. Enrich each video with oEmbed data
    const videos = await Promise.all(
      videoIds.map(async (id) => {
        const videoUrl = `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${id}`;
        const oembedData = await fetchOEmbed(videoUrl);
        return {
          id,
          title: oembedData.title || 'TikTok Video',
          thumbnail: oembedData.thumbnail || '',
          embedHtml: oembedData.embedHtml || '',
          url: videoUrl,
          author: oembedData.author || TIKTOK_USERNAME,
        };
      })
    );

    return NextResponse.json(
      { isLive: false, videos },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${60 * 60}`,
        },
      }
    );
  } catch (error) {
    console.error('TikTok API error:', error);
    
    // Graceful degradation: return fallback
    return NextResponse.json(
      { isLive: false, videos: FALLBACK_VIDEOS, error: 'Service temporarily unavailable' },
      {
        status: 200, // Return 200 with fallback data so UI doesn't break
        headers: {
          'Cache-Control': `public, s-maxage=${60 * 5}, stale-while-revalidate=${60 * 10}`,
        },
      }
    );
  }
}
