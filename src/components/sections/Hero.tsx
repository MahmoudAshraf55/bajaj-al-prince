'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import type { SceneRef } from '@/components/3d/MotorcycleScene';

gsap.registerPlugin(ScrollTrigger);

const MotorcycleScene = dynamic(() => import('@/components/3d/MotorcycleScene'), {
  ssr: false,
  loading: () => (
    <div className="fixed top-0 left-0 w-screen h-screen -z-10 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-muted-foreground text-sm font-medium tracking-wider">LOADING 3D MODEL</span>
      </div>
    </div>
  ),
});

const navLinks = [
  { label: 'Overview', href: '#overview' },
  { label: 'Specs', href: '#specs' },
  { label: 'Design', href: '#design' },
  { label: 'Services', href: '#services' },
  { label: 'Contact', href: '#contact' },
];

export default function Hero() {
  const sceneRef = useRef<SceneRef>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Master scroll trigger: camera orbits the centered motorcycle
      // across Overview → Specs → Design, then fades out smoothly.
      ScrollTrigger.create({
        trigger: '#overview',
        start: 'top top',
        endTrigger: '#design',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress; // 0 → 1

          if (!sceneRef.current) return;
          const camera = sceneRef.current.getCamera?.();
          const model = sceneRef.current.getModel?.();
          if (!camera || !model) return;

          // === ORBIT CAMERA AROUND CENTERED MODEL ===
          // Path: front 3/4 right → side → rear 3/4 → side → front 3/4 left
          const radius = 4.2;
          const startAngle = Math.PI / 6;   // 30°  (front 3/4 from right)
          const endAngle = Math.PI * 2 - Math.PI / 6; // 330° (front 3/4 from left)
          const currentAngle = startAngle + p * (endAngle - startAngle);

          camera.position.x = radius * Math.sin(currentAngle);
          camera.position.z = radius * Math.cos(currentAngle);
          camera.position.y = 1.2 + Math.sin(p * Math.PI) * 0.3;
          camera.lookAt(0, 0.3, 0);
          camera.fov = 32 - p * 2;
          camera.updateProjectionMatrix();

          // Subtle cinematic rotation on the model itself
          model.rotation.y = p * Math.PI * 0.25;

          // === SMOOTH FADE OUT (wrapper opacity, NOT model.visible) ===
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
  }, []);

  return (
    <div ref={scrollContainerRef}>
      <MotorcycleScene ref={sceneRef} />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-12 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="group">
            <Logo size="sm" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-medium tracking-wider text-muted-foreground hover:text-foreground transition-colors uppercase"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Content Section - Above Motorcycle */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 pt-24 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,107,0,0.06),_transparent_60%)]" />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">Intelligent Service Platform</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </motion.div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-foreground">THE FUTURE OF</span>
            <br />
            <span className="gradient-text">MOTORCYCLE</span>
            <br />
            <span className="text-foreground">SERVICE MANAGEMENT</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Manage service operations, inventory, customer relationships, and business performance from a single intelligent platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/booking/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              Book Service
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#services"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-border text-foreground font-semibold text-sm hover:bg-white/5 hover:border-primary/30 transition-all"
            >
              Explore Platform
            </Link>
          </div>
        </div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-[10px] tracking-[0.3em] uppercase">Scroll to Explore</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Section 1 - Overview (3D journey starts here) */}
      <section id="overview" className="scroll-section relative min-h-screen flex flex-col justify-end px-6 sm:px-12 pb-16">
        <div className="absolute top-24 right-6 sm:right-12 text-right space-y-1">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Authorized Dealer</p>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Cairo, Egypt</p>
        </div>

        <div className="relative z-10 max-w-5xl">
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-4">Bajaj Boxer Series</p>
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter">
            <span className="text-foreground">BAJAJ</span>
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(255,107,0,0.4)' }}>BOXER</span>
            <span className="text-foreground"> 180</span>
          </h1>
        </div>

        <div className="absolute bottom-16 right-6 sm:right-12 flex flex-col items-end gap-6">
          <div className="text-right space-y-2">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Engine</p>
              <p className="text-sm font-semibold">180cc Air-Cooled</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Power</p>
              <p className="text-sm font-semibold">14.8 HP</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Torque</p>
              <p className="text-sm font-semibold">13.2 Nm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* Section 2 - Specs */}
      <section id="specs" className="scroll-section relative min-h-screen flex items-center px-6 sm:px-12">
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] tracking-[0.3em] text-accent uppercase mb-6">Technical Specifications</p>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-8">
            BUILT FOR<br />PERFORMANCE
          </h2>
          <div className="space-y-6">
            {[
              { label: 'Displacement', value: '178.6 cc' },
              { label: 'Max Speed', value: '110 km/h' },
              { label: 'Fuel Tank', value: '14 Liters' },
              { label: 'Weight', value: '135 kg' },
              { label: 'Transmission', value: '5-Speed Manual' },
            ].map((spec) => (
              <div key={spec.label} className="flex items-center justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground uppercase tracking-wider">{spec.label}</span>
                <span className="text-sm font-semibold">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 - Design */}
      <section id="design" className="scroll-section relative min-h-screen flex items-end px-6 sm:px-12 pb-16">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] tracking-[0.3em] text-accent uppercase mb-6">Design Philosophy</p>
          <h2 className="text-4xl sm:text-6xl font-black leading-[0.9] tracking-tight mb-6">
            ICONIC<br />SILHOUETTE
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Every curve engineered for aerodynamic efficiency. The Boxer 180 represents decades of Bajaj innovation 
            in motorcycle design, blending timeless aesthetics with modern performance demands.
          </p>
        </div>
      </section>
    </div>
  );
}
