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
    <div ref={scrollContainerRef} className="relative">
      <MotorcycleSceneClient ref={sceneRef} />

      {/* Cinematic Sidebar Progress Tracker */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-2 bg-black/30 backdrop-blur-sm py-2 px-1 rounded-full border border-white/5">
        {['overview', 'specs', 'design', 'story', 'services', 'reviews', 'contact'].map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className="group relative flex items-center justify-center w-4 h-4 outline-none"
            title={`Scroll to ${id}`}
          >
            <span className="absolute right-5 opacity-0 group-hover:opacity-100 text-[7px] text-amber-400/90 uppercase font-bold tracking-[0.12em] transition-all duration-300 pointer-events-none select-none bg-black/90 px-1.5 py-0.5 rounded border border-amber-500/10 whitespace-nowrap">
              {id}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/15 group-hover:bg-amber-400 group-hover:scale-150 transition-all duration-300" />
          </a>
        ))}
      </div>

      {/* Hero Content Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 pt-32 pb-16 snap-start snap-always overflow-hidden">
        {/* Cinematic Backdrop Ambient Smoke & Glimmers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(230,177,92,0.12),_transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(249,115,22,0.06),_transparent_40%)] pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* Letterbox Cinema Borders */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse-glow" />
            <span className="text-amber-400/90 text-xs font-black tracking-[0.4em] uppercase select-none">{t('hero_tag')}</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse-glow" />
          </motion.div>

          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black leading-[1.02] tracking-tight mb-8">
            <span className="text-foreground text-glow">{t('hero_title_line1')}</span>
            <br />
            <span className="gradient-text-gold">{t('hero_title_line2')}</span>
          </h1>

          <p className="text-muted-foreground/90 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-12 font-medium">
            {t('hero_description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link
              href="tel:01221370120"
              className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-sm hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300 shadow-xl shadow-amber-500/10 hover:shadow-amber-500/25 active:translate-y-0"
            >
              {t('hero_callNow')}
              <ArrowRight className="w-4 h-4 text-black stroke-[3px]" />
            </Link>
            <Link
              href="/booking/"
              className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full border border-amber-500/20 bg-black/40 backdrop-blur-md text-amber-100/90 font-bold text-sm hover:bg-amber-500/10 hover:border-amber-500/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              {t('hero_bookService')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-amber-500/60 pointer-events-none">
          <span className="text-[9px] tracking-[0.4em] uppercase font-bold">{t('hero_scroll')}</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Section 1 - Overview (3D journey starts here) - LEFT CARD */}
      <section id="overview" className="scroll-section relative min-h-screen flex items-center px-6 sm:px-12 snap-start snap-always">
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
          <div className="glass-premium glass-premium-hover rounded-2xl p-6 sm:p-8 hover:-translate-y-1 transition-all duration-500 depth-3 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-700" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/10 border border-amber-500/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] text-amber-400 uppercase tracking-[0.3em] font-bold">{t('card_expertise')}</span>
            </div>
            <h3 className="text-foreground font-black text-xl mb-2 text-glow">{t('card_professionalService')}</h3>
            <p className="text-muted-foreground/90 text-sm leading-relaxed font-medium">{t('card_professionalService_desc')}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-glow" />
              <div className="w-16 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section 2 - Specs - RIGHT CARD */}
      <section id="specs" className="scroll-section relative min-h-screen flex items-center justify-end px-6 sm:px-12 snap-start snap-always">
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-200px' }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <div className="glass-premium glass-premium-hover rounded-2xl p-6 sm:p-8 hover:-translate-y-1 transition-all duration-500 depth-3 relative overflow-hidden group">
            <div className="absolute -left-20 -top-20 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-700" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/10 border border-amber-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] text-amber-400 uppercase tracking-[0.3em] font-bold">{t('card_quality')}</span>
            </div>
            <h3 className="text-foreground font-black text-xl mb-2 text-glow">{t('card_genuineParts')}</h3>
            <p className="text-muted-foreground/90 text-sm leading-relaxed font-medium">{t('card_genuineParts_desc')}</p>
            <div className="mt-4 flex items-center gap-2 justify-end">
              <div className="w-16 h-px bg-gradient-to-l from-amber-500/40 to-transparent" />
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-glow" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section 3 - Design - LEFT CARD */}
      <section id="design" className="scroll-section relative min-h-screen flex items-center px-6 sm:px-12 snap-start snap-always">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-200px' }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <div className="glass-premium glass-premium-hover rounded-2xl p-6 sm:p-8 hover:-translate-y-1 transition-all duration-500 depth-3 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-700" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/10 border border-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] text-amber-400 uppercase tracking-[0.3em] font-bold">{t('card_fullService')}</span>
            </div>
            <h3 className="text-foreground font-black text-xl mb-2 text-glow">{t('card_completeSolutions')}</h3>
            <p className="text-muted-foreground/90 text-sm leading-relaxed font-medium">{t('card_completeSolutions_desc')}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-glow" />
              <div className="w-16 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
