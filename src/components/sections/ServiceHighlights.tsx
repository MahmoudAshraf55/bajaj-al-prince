'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from '@/components/useTranslation';

const bubbles = [
  { labelKey: 'hl_certified', size: 'lg', color: 'from-primary/30 to-primary/10' },
  { labelKey: 'hl_genuine', size: 'md', color: 'from-accent/30 to-accent/10' },
  { labelKey: 'hl_expert', size: 'lg', color: 'from-secondary/30 to-secondary/10' },
  { labelKey: 'hl_warranty', size: 'sm', color: 'from-primary/20 to-primary/5' },
  { labelKey: 'hl_fast', size: 'md', color: 'from-accent/25 to-accent/5' },
  { labelKey: 'hl_satisfaction', size: 'lg', color: 'from-secondary/25 to-secondary/5' },
  { labelKey: 'hl_emergency', size: 'md', color: 'from-primary/25 to-primary/5' },
  { labelKey: 'hl_wholesale', size: 'sm', color: 'from-accent/20 to-accent/5' },
];

const sizeMap = {
  sm: 'w-24 h-24 text-[10px]',
  md: 'w-32 h-32 text-xs',
  lg: 'w-40 h-40 text-sm',
};

export default function ServiceHighlights() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden snap-start snap-always">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-linear-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('highlights_tag')}</span>
            <div className="h-px w-12 bg-linear-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            {t('highlights_title')}
          </h2>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {bubbles.map((bubble, i) => (
            <motion.div
              key={bubble.labelKey}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.1 * i, type: 'spring' }}
              className={`relative rounded-full flex items-center justify-center text-center font-semibold text-foreground backdrop-blur-xl border border-white/10 bg-linear-to-br ${bubble.color} ${sizeMap[bubble.size as keyof typeof sizeMap]} animate-bubble`}
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              <span className="px-3 leading-tight">{t(bubble.labelKey)}</span>
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
