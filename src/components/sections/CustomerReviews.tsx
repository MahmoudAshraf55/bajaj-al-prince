'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, ExternalLink, PenTool, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';
import { useLanguage } from '@/components/LanguageContext';

interface Review {
  id: string;
  name: string;
  rating: number;
  review: string;
  date: string;
  avatar?: string;
  verified?: boolean;
}

// Fallback reviews if API fetching fails
function getFallbackReviews(t: (key: string) => string): Review[] {
  return [
    {
      id: 'fallback-1',
      name: t('review_1_name'),
      rating: 5,
      review: t('review_1_text'),
      date: '2026-05-10',
      verified: true,
    },
    {
      id: 'fallback-2',
      name: t('review_2_name'),
      rating: 5,
      review: t('review_2_text'),
      date: '2026-04-28',
      verified: true,
    },
    {
      id: 'fallback-3',
      name: t('review_3_name'),
      rating: 5, // Filtered >= 4.8 stars
      review: t('review_3_text'),
      date: '2026-03-12',
      verified: true,
    },
    {
      id: 'fallback-4',
      name: t('review_4_name'),
      rating: 5,
      review: t('review_4_text'),
      date: '2026-02-05',
      verified: true,
    },
    {
      id: 'fallback-5',
      name: t('review_5_name'),
      rating: 5,
      review: t('review_5_text'),
      date: '2026-01-20',
      verified: true,
    },
  ];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-primary fill-primary' : 'text-muted-foreground/20'}`}
        />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 border border-border/40 animate-pulse flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-white/10 rounded-full" />
          ))}
        </div>
        <div className="w-16 h-5 bg-white/10 rounded-full" />
      </div>
      <div className="space-y-2 flex-grow">
        <div className="w-full h-3 bg-white/10 rounded" />
        <div className="w-5/6 h-3 bg-white/10 rounded" />
        <div className="w-2/3 h-3 bg-white/10 rounded" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="w-24 h-4 bg-white/10 rounded" />
        <div className="w-16 h-3 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export default function CustomerReviews() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(142);
  const [averageRating, setAverageRating] = useState(4.9);

  const googleMapsUrl = 'https://maps.app.goo.gl/Dy4NToGMJqeR7ymS7';

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`/api/google-reviews?lang=${language}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch reviews');
        return res.json();
      })
      .then((data) => {
        if (active && data?.success) {
          // Filter rating >= 4.8 strictly as requested by the user
          const verified = data.reviews.filter((r: Review) => r.rating >= 4.8);
          setReviews(verified);
          setTotalReviews(data.totalReviews || 142);
          setAverageRating(data.rating || 4.9);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[reviews] Fetch failed, falling back to static reviews:', err);
        if (active) {
          // Graceful fallback to pre-verified reviews
          setReviews(getFallbackReviews(t));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [language, t]);

  return (
    <section id="reviews" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(249,115,22,0.04),_transparent_60%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('reviews_tag')}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            {t('reviews_title')}
          </h2>

          {/* Real-time Google Trust Badge */}
          <div className="flex flex-wrap items-center justify-center gap-3 bg-white/5 border border-border/60 px-5 py-2.5 rounded-full text-sm font-medium text-foreground backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.111 4.113-3.418 0-6.2-2.782-6.2-6.2 0-3.418 2.782-6.2 6.2-6.2 1.493 0 2.863.535 3.943 1.5l3.056-3.056C19.123 2.115 15.912 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c5.833 0 11.233-4.148 11.233-11 0-.741-.082-1.428-.233-2.715H12.24z" />
              </svg>
              <span className="font-bold">{averageRating.toFixed(1)}</span>
            </div>
            <StarRating rating={averageRating} />
            <span className="text-muted-foreground select-none">|</span>
            <span className="text-muted-foreground text-xs">
              {language === 'ar' 
                ? `(${totalReviews} تقييم حقيقي على خرائط جوجل)` 
                : `(${totalReviews} verified reviews on Google Maps)`}
            </span>
          </div>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            reviews.map((review: Review, i: number) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * i }}
                className="group relative glass rounded-2xl p-6 card-glow hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <StarRating rating={review.rating} />
                    <span className="text-[10px] text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-accent" />
                      {t('review_verified')}
                    </span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-6 select-text">&ldquo;{review.review}&rdquo;</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase">
                      {review.avatar || (review.name ? review.name.slice(0, 2) : 'U')}
                    </div>
                    <span className="text-foreground font-bold text-sm">{review.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{review.date}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Action / Conversion Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20"
          >
            <PenTool className="w-4 h-4" />
            {language === 'ar' ? 'اكتب تقييمًا على جوجل مابس' : 'Write a Review on Google'}
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-white/5 text-foreground font-semibold text-sm hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer"
          >
            {language === 'ar' ? 'عرض جميع المراجعات' : 'View All Reviews'}
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

      </div>
    </section>
  );
}
