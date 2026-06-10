/*
  TikTokPlayer Component (Free & Stable)
  Auto-refreshes every 60s, shows live status, playlist, error states.
  API: /api/tiktok (server-side scraping, no CORS, no API key)
  Env overrides: NEXT_PUBLIC_TIKTOK_USERNAME, NEXT_PUBLIC_TIKTOK_FORCE_LIVE
*/

'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Music, Play, ExternalLink, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import Image from 'next/image';

// ─── Types ───
interface TikTokVideo {
  id: string;
  title: string;
  thumbnail: string;
  embedHtml: string;
  url: string;
  author: string;
}

interface TikTokApiResponse {
  isLive: boolean;
  videos: TikTokVideo[];
  error?: string;
}

// ─── Config ───
const TIKTOK_USERNAME = process.env.NEXT_PUBLIC_TIKTOK_USERNAME || 'elprince.bajajj';
const AUTO_REFRESH_MS = 60_000; // 60 seconds

// ─── Component ───
export default function TikTokPlayer() {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredVideo, setHoveredVideo] = useState<TikTokVideo | null>(null);
  const [countdown, setCountdown] = useState(60);

  const getEmbedUrl = (video: TikTokVideo | undefined | null) => {
    if (!video) return null;

    // Best-effort: prefer direct video url
    if (video.url) {
      // Ensure we use an embeddable URL format; TikTok accepts standard /video/{id}
      return video.url.includes('/video/')
        ? video.url
        : null;
    }

    return null;
  };
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch Videos / Live Status ───
  const fetchTikTokData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const forcedLive = process.env.NEXT_PUBLIC_TIKTOK_FORCE_LIVE;
      let response: TikTokApiResponse;

      if (forcedLive === 'true') {
        response = { isLive: true, videos: [] };
      } else if (forcedLive === 'false') {
        const res = await fetch(`/api/tiktok?mode=videos`);
        response = await res.json();
      } else {
        const res = await fetch(`/api/tiktok`);
        response = await res.json();
      }

      setIsLive(response.isLive);
      if (response.videos && response.videos.length > 0) {
        setVideos(response.videos);
      } else if (!response.isLive && response.videos.length === 0) {
        // Keep previous videos or empty
      }

      if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      console.error('TikPlayer fetch failed:', err);
      setError('فشل الاتصال بـ TikTok. تأكد من اتصال الإنترنت.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Auto-refresh ───
  useEffect(() => {
    // Initial fetch
    fetchTikTokData();

    // 60s background refresh
    refreshTimerRef.current = setInterval(() => {
      fetchTikTokData(true);
    }, AUTO_REFRESH_MS);

    // Countdown timer
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [fetchTikTokData]);

  const handleManualRefresh = () => {
    setCountdown(60);
    fetchTikTokData();
  };

  // ─── Render ───
  return (
    <section
      id="tiktok"
      className="scroll-section relative min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-24 snap-start snap-always overflow-hidden"
    >
      {/* Backgrounds */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(230,177,92,0.08), transparent 65%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 60%, rgba(249,115,22,0.04), transparent 40%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Letterbox */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-black/80 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black/80 to-transparent pointer-events-none z-10" />

      {/* Section tag */}
      <div className="relative z-10 flex items-center justify-center gap-2 mb-8">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse-glow" />
        <span className="text-amber-400/80 text-[10px] font-black tracking-[0.4em] uppercase select-none">
          {isLive ? 'LIVE STREAM' : 'TIKTOK'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse-glow" />
      </div>

      {/* ── Auto-refresh pill ── */}
      {!loading && !error && (
        <button
          onClick={handleManualRefresh}
          className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-amber-500/20 text-amber-400/80 text-[10px] font-bold tracking-wider uppercase mb-4 hover:bg-amber-500/10 transition-colors cursor-pointer"
          title="تحديث الآن"
        >
          <RefreshCw className="w-3 h-3" />
          <span>تحديث تلقائي كل {countdown}s</span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {loading ? (
          /* ── Loading ── */
          <div className="flex flex-col items-center justify-center gap-4 h-125">
            <div className="w-10 h-10 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-muted-foreground/60 text-xs tracking-widest uppercase animate-pulse-glow">
              جاري التحميل...
            </p>
          </div>
        ) : error ? (
          /* ── Error State ── */
          <div className="flex flex-col items-center justify-center gap-6 h-100">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400/80" />
            </div>
            <div className="text-center max-w-md">
              <p className="text-muted-foreground/80 text-sm font-medium mb-2">{error}</p>
              <p className="text-muted-foreground/50 text-xs">
                جاري المحاولة تلقائياً خلال {countdown} ثانية
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs tracking-wider hover:bg-amber-500/20 transition-all duration-300 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              حاول الآن
            </button>
          </div>
        ) : isLive ? (
          /* ── LIVE MODE ── */
          <div className="flex flex-col items-center gap-6">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-red-400 text-xs font-bold tracking-widest uppercase">Live</span>
            </div>

            {/* Live iframe */}
            <div className="glass-premium rounded-2xl p-2 sm:p-3 w-full max-w-95 depth-3">
              <div className="relative aspect-video-vertical rounded-xl overflow-hidden bg-black/60">
                <iframe
                  src={`https://www.tiktok.com/@${TIKTOK_USERNAME}/live`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  title="TikTok Live"
                />
              </div>
            </div>

            {/* CTA */}
            <a
              href={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-linear-to-r from-amber-500 to-orange-600 text-black font-extrabold text-xs tracking-wider hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300 shadow-xl shadow-amber-500/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              تابع البث المباشر
            </a>
          </div>
        ) : videos.length > 0 ? (
          /* ── PLAYLIST CAROUSEL MODE ── */
          <div className="flex flex-col items-center gap-8">
            {/* Header */}
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-foreground text-glow mb-2">
                أحدث الفيديوهات
              </h3>
              <p className="text-muted-foreground/70 text-sm font-medium">
                تابعنا على <span className="text-amber-400">TikTok</span>
              </p>
            </div>

            {/* Video Grid (with hover quick preview) */}
            <div className="flex flex-col items-center gap-6 w-full">
              {/* Main Player */}
              <div
                className="glass-premium rounded-2xl p-2 sm:p-3 w-full max-w-90 depth-3 hover:-translate-y-0.5 transition-all duration-500 relative"
                onMouseEnter={() => setHoveredVideo(videos[activeIndex])}
                onMouseLeave={() => setHoveredVideo(null)}
              >
                <div className="relative aspect-video-vertical rounded-xl overflow-hidden bg-black/60">
                  {(() => {
                    const v = hoveredVideo ?? videos[activeIndex];
                    const embedUrl = getEmbedUrl(v);

                    // Prefer a direct iframe (more reliable than embedHtml/script widgets)
                    if (embedUrl) {
                      const iframeSrc = embedUrl.includes('/live')
                        ? `https://www.tiktok.com/@${TIKTOK_USERNAME}/live`
                        : embedUrl;

                      return (
                        <iframe
                          key={v?.id ?? embedUrl}
                          src={iframeSrc}
                          className="absolute inset-0 w-full h-full border-0"
                          allow="autoplay; encrypted-media; picture-in-picture"
                          referrerPolicy="origin"
                          allowFullScreen
                          loading="eager"
                          title={v?.title ?? 'TikTok Video'}
                        />
                      );
                    }

                    // Fallback: thumbnail
                    if (videos[activeIndex]?.thumbnail) {
                      return (
                        <Image
                          src={videos[activeIndex].thumbnail}
                          alt={videos[activeIndex].title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      );
                    }

                    // Ultimate fallback: show profile iframe so TikTok never disappears
                    return (
                      <iframe
                        key={videos[activeIndex]?.id ?? `profile-${TIKTOK_USERNAME}`}
                        src={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        referrerPolicy="origin"
                        allowFullScreen
                        loading="eager"
                        title="TikTok Profile"
                      />
                    );
                  })()}
                </div>
                
                {/* Quick preview hint on hover */}
                {hoveredVideo && (
                  <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] text-amber-400/90 font-bold text-center">
                    Quick Preview
                  </div>
                )}
              </div>

              {/* Video Cards (Thumbnails) */}
              {videos.length > 1 && (
                <div className="flex gap-3 flex-wrap justify-center">
                  {videos.map((video, idx) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        setActiveIndex(idx);
                        setHoveredVideo(null);
                      }}
                      onMouseEnter={() => setHoveredVideo(video)}
                      onMouseLeave={() => setHoveredVideo(null)}
                      className={`relative rounded-xl overflow-hidden w-24 h-32 sm:w-28 sm:h-36 border-2 transition-all duration-300 cursor-pointer ${
                        idx === activeIndex
                          ? 'border-amber-500 scale-105 shadow-lg shadow-amber-500/20'
                          : 'border-transparent hover:border-amber-500/40'
                      }`}
                    >
                      {video.thumbnail ? (
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-black/40 flex items-center justify-center">
                          <Play className="w-5 h-5 text-amber-400/60" />
                        </div>
                      )}
                      {idx === activeIndex && (
                        <div className="absolute inset-0 bg-amber-500/20" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Video Info */}
              <div className="text-center max-w-md">
                <p className="text-foreground/80 text-sm font-medium leading-relaxed">
                  {videos[activeIndex]?.title || 'فيديو TikTok'}
                </p>
                <a
                  href={videos[activeIndex]?.url || `https://www.tiktok.com/@${TIKTOK_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 text-xs font-bold mt-2 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  @{videos[activeIndex]?.author || TIKTOK_USERNAME}
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ── NO CONTENT ── */
          <div className="flex flex-col items-center justify-center gap-6 h-100">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Music className="w-7 h-7 text-amber-400/60" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground/70 text-sm font-medium mb-1">لا توجد فيديوهات متاحة</p>
              <p className="text-muted-foreground/50 text-xs">جاري التجريب تلقائياً خلال {countdown} ثانية</p>
            </div>
            <a
              href={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-amber-500/20 text-amber-100/80 font-bold text-xs hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-300"
            >
              <Play className="w-3.5 h-3.5" />
              @{TIKTOK_USERNAME}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
