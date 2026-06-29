/*
  TikTokPlayer Component (Free & Stable - Direct Iframe)
  Uses direct TikTok iframe embed - 100% free, no API key, no scraping.
  Env: NEXT_PUBLIC_TIKTOK_USERNAME
*/

'use client';
import { Play, Sparkles } from 'lucide-react';

// ─── Config ───
const TIKTOK_USERNAME = process.env.NEXT_PUBLIC_TIKTOK_USERNAME || 'elprince.bajajj';
const TIKTOK_VIDEO_ID = '7611079884860919060';
const TIKTOK_VIDEO_URL = `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${TIKTOK_VIDEO_ID}`;
const TIKTOK_EMBED_URL = `https://www.tiktok.com/embed/v2/${TIKTOK_VIDEO_ID}`;

// ─── Component ───
export default function TikTokPlayer() {
  // No loading state needed - iframe loads directly

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
          TIKTOK
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse-glow" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {/* ── TikTok Iframe Embed (Direct & Free) ── */}
        <div className="flex flex-col items-center gap-8">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground text-glow mb-2">
              تابعنا على TikTok
            </h3>
            <p className="text-muted-foreground/70 text-sm font-medium">
              أحدث الفيديوهات والعروض
            </p>
          </div>

          {/* TikTok Iframe */}
          <div className="glass-premium rounded-2xl p-2 sm:p-3 w-full max-w-md depth-3">
            <div className="relative aspect-9/16 rounded-xl overflow-hidden bg-black/60">
              <iframe
                src={TIKTOK_EMBED_URL}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="TikTok Video"
                loading="lazy"
              />
            </div>
          </div>

          {/* CTA */}
          <a
            href={TIKTOK_VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-linear-to-r from-amber-500 to-orange-600 text-black font-extrabold text-xs tracking-wider hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300 shadow-xl shadow-amber-500/10"
          >
            <Play className="w-3.5 h-3.5" />
            @{TIKTOK_USERNAME}
          </a>
        </div>
      </div>
    </section>
  );
}
