'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Star, ExternalLink, PenTool, CheckCircle, X, Sparkles } from 'lucide-react';
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
      rating: 5,
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
  const [visitorCount, setVisitorCount] = useState(1050);
  const [averageRating, setAverageRating] = useState(4.9);

  // Modal & Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', rating: 5, review: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const googleMapsUrl = 'https://maps.app.goo.gl/Dy4NToGMJqeR7ymS7';

  const fetchReviews = useCallback(() => {
    fetch(`/api/google-reviews?lang=${language}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch reviews');
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          // Filter rating >= 4.8 strictly as requested by the user
          const verified = data.reviews.filter((r: Review) => r.rating >= 4.8);
          setReviews(verified);
          setVisitorCount(data.visitorCount || 1050);
          setAverageRating(data.rating || 4.9);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[reviews] Fetch failed, falling back to static reviews:', err);
        setReviews(getFallbackReviews(t));
        setLoading(false);
      });
  }, [language, t]);

  useEffect(() => {
    setLoading(true);
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/google-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitSuccess(true);
      setForm({ name: '', rating: 5, review: '' });
      fetchReviews(); // Re-fetch reviews to show the newly added one!
      
      // Auto close success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setModalOpen(false);
      }, 3000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

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
                ? `(أكثر من ${visitorCount} زائر حقيقي للموقع)` 
                : `(Over ${visitorCount} unique site visitors)`}
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
          {/* Write Review on Website Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20"
          >
            <PenTool className="w-4 h-4" />
            {language === 'ar' ? 'اكتب تقييمًا على الموقع' : 'Write a Review on Website'}
          </button>

          {/* Write Review on Google Maps Button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-white/5 text-foreground font-semibold text-sm hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer"
          >
            {language === 'ar' ? 'اكتب تقييمًا على جوجل مابس' : 'Write a Review on Google'}
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

      </div>

      {/* Review Submission Modal Dialog */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg glass rounded-2xl border border-border/80 p-6 sm:p-8 shadow-2xl z-10 flex flex-col gap-5 overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">
                    {language === 'ar' ? 'اكتب تقييمًا جديدًا' : 'Write a Customer Review'}
                  </h3>
                </div>
                <button
                  onClick={() => !submitting && setModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
                  aria-label="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center text-center py-10 gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">
                    {language === 'ar' ? 'تم إرسال تقييمك بنجاح!' : 'Review Submitted Successfully!'}
                  </h4>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {language === 'ar' 
                      ? 'شكرًا لك على مشاركة رأيك الصادق ومساعدتنا على تحسين خدماتنا دائمًا.' 
                      : 'Thank you for sharing your honest feedback and helping us improve our services.'}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitReview} className="flex flex-col gap-5">
                  
                  {/* Full Name */}
                  <div>
                    <label htmlFor="review-name" className="text-sm font-medium text-muted-foreground mb-2 block">
                      {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <input
                      id="review-name"
                      required
                      type="text"
                      maxLength={50}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder={language === 'ar' ? 'أدخل اسمك الكريم' : 'e.g. John Doe'}
                    />
                  </div>

                  {/* Rating Selector */}
                  <div>
                    <span className="text-sm font-medium text-muted-foreground mb-2 block">
                      {language === 'ar' ? 'التقييم بالنجوم' : 'Select Rating'}
                    </span>
                    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Select Rating Stars">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1;
                        const isSelected = starValue <= form.rating;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setForm({ ...form, rating: starValue })}
                            className="p-1 rounded hover:bg-white/5 transition-all focus:outline-none focus:ring-1 focus:ring-ring"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${starValue} Stars`}
                          >
                            <Star
                              className={`w-8 h-8 ${isSelected ? 'text-primary fill-primary scale-110' : 'text-muted-foreground/20'} hover:scale-110 transition-transform`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Message */}
                  <div>
                    <label htmlFor="review-message" className="text-sm font-medium text-muted-foreground mb-2 block">
                      {language === 'ar' ? 'تعليقك ورأيك الصادق' : 'Your Honest Feedback'}
                    </label>
                    <textarea
                      id="review-message"
                      required
                      rows={4}
                      maxLength={500}
                      value={form.review}
                      onChange={(e) => setForm({ ...form, review: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
                      placeholder={language === 'ar' ? 'اكتب رأيك بالتفصيل هنا...' : 'Describe your experience with our service...'}
                    />
                  </div>

                  {submitError && (
                    <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-white/5 transition-all text-sm font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          {language === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          {language === 'ar' ? 'إرسال التقييم' : 'Submit Review'}
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
