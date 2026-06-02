'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

interface Review {
  id: string;
  name: string;
  rating: number;
  review: string;
  date: string;
  verified: boolean;
}

// Ready for real Google Reviews integration
function getReviews(t: (key: string) => string): Review[] {
  return [
    {
      id: '1',
      name: t('review_1_name'),
      rating: 5,
      review: t('review_1_text'),
      date: '2024-11-15',
      verified: true,
    },
    {
      id: '2',
      name: t('review_2_name'),
      rating: 5,
      review: t('review_2_text'),
      date: '2024-10-28',
      verified: true,
    },
    {
      id: '3',
      name: t('review_3_name'),
      rating: 4,
      review: t('review_3_text'),
      date: '2024-09-12',
      verified: true,
    },
    {
      id: '4',
      name: t('review_4_name'),
      rating: 5,
      review: t('review_4_text'),
      date: '2024-08-05',
      verified: true,
    },
    {
      id: '5',
      name: t('review_5_name'),
      rating: 5,
      review: t('review_5_text'),
      date: '2024-07-20',
      verified: true,
    },
  ];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function CustomerReviews() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="reviews" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(249,115,22,0.04),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('reviews_tag')}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            {t('reviews_title')}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground text-sm">{t('reviews_googleReady')}</span>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {getReviews(t).map((review: Review, i: number) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              className="group glass rounded-2xl p-6 card-glow hover:-translate-y-1 transition-all duration-500"
            >
              <div className="flex items-center justify-between mb-4">
                <StarRating rating={review.rating} />
                {review.verified && (
                  <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                    {t('review_verified')}
                  </span>
                )}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-4">&ldquo;{review.review}&rdquo;</p>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <span className="text-foreground font-semibold text-sm">{review.name}</span>
                <span className="text-muted-foreground text-xs">{review.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
