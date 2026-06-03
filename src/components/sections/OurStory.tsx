'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Store, Award, TrendingUp, Wrench, Shield, Users } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

const milestones = [
  { year: '2019', icon: Store, side: 'left' as const, titleKey: 'story_2019_title', descKey: 'story_2019_desc' },
  { year: '2020', icon: Award, side: 'right' as const, titleKey: 'story_2020_title', descKey: 'story_2020_desc' },
  { year: '2021', icon: TrendingUp, side: 'left' as const, titleKey: 'story_2021_title', descKey: 'story_2021_desc' },
  { year: '2022', icon: Wrench, side: 'right' as const, titleKey: 'story_2022_title', descKey: 'story_2022_desc' },
  { year: '2023', icon: Shield, side: 'left' as const, titleKey: 'story_2023_title', descKey: 'story_2023_desc' },
  { yearKey: 'story_today_year', icon: Users, side: 'right' as const, titleKey: 'story_today_title', descKey: 'story_today_desc' },
];

export default function OurStory() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="story" className="relative py-24 sm:py-32 overflow-hidden snap-start snap-always">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('story_tag')}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-6 leading-tight">
            {t('story_title')}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            {t('story_description')}
          </p>
        </motion.div>

        <div className="relative">
          {/* Center line - hidden on mobile */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <div className="w-full h-full bg-gradient-to-b from-primary/40 via-accent/20 to-transparent" />
          </div>

          <div className="space-y-12 md:space-y-0">
            {milestones.map((milestone, i) => (
              <motion.div
                key={milestone.year || milestone.yearKey}
                initial={{ opacity: 0, x: milestone.side === 'left' ? -50 : 50, y: 20 }}
                animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.15 * i }}
                className={`relative md:grid md:grid-cols-2 md:gap-8 ${i > 0 ? 'md:mt-12' : ''}`}
              >
                {/* Left side content */}
                <div className={`${milestone.side === 'right' ? 'md:col-start-2' : ''} flex ${milestone.side === 'left' ? 'md:justify-end' : 'md:justify-start'}`}>
                  <div className={`glass rounded-2xl p-6 sm:p-8 card-glow hover:-translate-y-1 transition-transform duration-500 max-w-md w-full ${milestone.side === 'left' ? 'md:text-right' : 'md:text-left'}`}>
                    <div className={`flex items-center gap-3 mb-4 ${milestone.side === 'left' ? 'md:flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <milestone.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-2xl sm:text-3xl font-black gradient-text">{milestone.year || t(milestone.yearKey || '')}</span>
                    </div>
                    <h3 className="text-foreground font-bold text-lg mb-2">{t(milestone.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(milestone.descKey)}</p>
                  </div>
                </div>

                {/* Center dot - hidden on mobile */}
                <div className="hidden md:flex absolute left-1/2 top-8 -translate-x-1/2">
                  <div className="w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse-glow" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
