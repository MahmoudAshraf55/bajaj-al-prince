'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, Wrench, Award, TrendingUp } from 'lucide-react';
import type { SceneRef } from '@/components/3d/MotorcycleScene';
import MotorcycleSceneClient from '@/components/3d/MotorcycleSceneClient';
import { useTranslation } from '@/components/useTranslation';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const { t } = useTranslation();
  const sceneRef = useRef<SceneRef>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined' || shouldReduceMotion) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: '#overview',
        start: 'top top',
        endTrigger: '#design',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress;

          if (!sceneRef.current) return;
          const camera = sceneRef.current.getCamera?.();
          const model = sceneRef.current.getModel?.();
          if (!camera || !model) return;

          const radius = 4.2;
          const startAngle = Math.PI / 6;
          const endAngle = Math.PI * 2 - Math.PI / 6;
          const currentAngle = startAngle + p * (endAngle - startAngle);

          camera.position.x = radius * Math.sin(currentAngle);
          camera.position.z = radius * Math.cos(currentAngle);
          camera.position.y = 1.2 + Math.sin(p * Math.PI) * 0.3;
          camera.lookAt(0, 0.3, 0);
          camera.fov = 32 - p * 2;
          camera.updateProjectionMatrix();

          model.rotation.y = p * Math.PI * 0.25;

          const fadeStart = 0.80;
          if (p > fadeStart) {
            const fadeProgress = (p - fadeStart) / (1 - fadeStart);
            sceneRef.current.setOpacity?.(Math.max(0, 1 - fadeProgress));
          } else {
            sceneRef.current.setOpacity?.(1);
          }
        },
      });
    }, scrollContainerRef);

    return () => ctx.revert();
  }, [shouldReduceMotion]);

  return (
    <div ref={scrollContainerRef}>
      <MotorcycleSceneClient ref={sceneRef} />

      {/* Hero Content Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 pt-32 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.08),_transparent_60%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('hero_tag')}</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </motion.div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-foreground">{t('hero_title_line1')}</span>
            <br />
            <span className="gradient-text">{t('hero_title_line2')}</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            {t('hero_description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="tel:01221370120"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              {t('hero_callNow')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/booking/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-border text-foreground font-semibold text-sm hover:bg-white/5 hover:border-primary/30 transition-all"
            >
              {t('hero_bookService')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-[10px] tracking-[0.3em] uppercase">{t('hero_scroll')}</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Section 1 - Overview (3D journey starts here) - LEFT CARD */}
      <section id="overview" className="scroll-section relative min-h-screen flex items-center px-6 sm:px-12">
        <div className="absolute top-24 right-6 sm:right-12 text-right space-y-1">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Authorized Service Center</p>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Since 2019</p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-200px' }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <div className="glass rounded-2xl p-6 sm:p-8 card-glow depth-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] text-accent uppercase tracking-[0.3em] font-semibold">{t('card_expertise')}</span>
            </div>
            <h3 className="text-foreground font-bold text-xl mb-2">{t('card_professionalService')}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('card_professionalService_desc')}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <div className="w-16 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section 2 - Specs - RIGHT CARD */}
      <section id="specs" className="scroll-section relative min-h-screen flex items-center justify-end px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-200px' }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <div className="glass rounded-2xl p-6 sm:p-8 card-glow depth-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <span className="text-[10px] text-accent uppercase tracking-[0.3em] font-semibold">{t('card_quality')}</span>
            </div>
            <h3 className="text-foreground font-bold text-xl mb-2">{t('card_genuineParts')}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('card_genuineParts_desc')}</p>
            <div className="mt-4 flex items-center gap-2 justify-end">
              <div className="w-16 h-px bg-gradient-to-l from-accent/50 to-transparent" />
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section 3 - Design - LEFT CARD */}
      <section id="design" className="scroll-section relative min-h-screen flex items-center px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-200px' }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <div className="glass rounded-2xl p-6 sm:p-8 card-glow depth-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-[10px] text-accent uppercase tracking-[0.3em] font-semibold">{t('card_fullService')}</span>
            </div>
            <h3 className="text-foreground font-bold text-xl mb-2">{t('card_completeSolutions')}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('card_completeSolutions_desc')}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
              <div className="w-16 h-px bg-gradient-to-r from-secondary/50 to-transparent" />
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
