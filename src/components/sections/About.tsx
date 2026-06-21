'use client';

import { motion, useInView, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Zap, TrendingUp, Clock, BarChart3 } from 'lucide-react';

const stats = [
  {
    icon: Zap,
    value: 95,
    suffix: '%',
    label: 'Customer Satisfaction',
    description: 'Consistently rated by verified customers',
  },
  {
    icon: TrendingUp,
    value: 70,
    suffix: '%',
    label: 'Inventory Accuracy Improvement',
    description: 'After implementing smart tracking',
  },
  {
    icon: Clock,
    value: 50,
    suffix: '%',
    label: 'Faster Service Processing',
    description: 'With automated workflow engine',
  },
  {
    icon: BarChart3,
    value: 24,
    suffix: '/7',
    label: 'Business Visibility',
    description: 'Real-time operational dashboards',
  },
];

function AnimatedCounter({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 2,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(Math.round(v)),
    });
    return controls.stop;
  }, [inView, value]);

  return (
    <span className="tabular-nums">
      {displayValue}{suffix}
    </span>
  );
}

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="about" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,107,0,0.04),_transparent_60%)]" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/3 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-linear-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">Platform Overview</span>
            <div className="h-px w-12 bg-linear-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-6 leading-tight">
            Built For <span className="gradient-text">Modern</span>
            <br />
            Service Centers
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            From work orders and inventory management to customer engagement and operational analytics,
            BAJAJ AL PRINCE provides everything required to run a modern motorcycle service business efficiently.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1 }}
              className="group relative rounded-2xl p-6 sm:p-8 bg-card/50 backdrop-blur-xl border border-border/60 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 card-glow"
            >
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <stat.icon className="w-5 h-5 text-primary group-hover:text-accent transition-colors duration-500" />
                </div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black gradient-text mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} inView={isInView} />
                </div>
                <h3 className="text-foreground font-semibold text-sm sm:text-base mb-1">{stat.label}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Floating decorative elements */}
        <div className="hidden lg:block absolute -top-10 left-1/4 w-2 h-2 rounded-full bg-primary/40 animate-pulse-glow" />
        <div className="hidden lg:block absolute top-1/3 right-1/5 w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="hidden lg:block absolute bottom-1/4 left-1/6 w-2 h-2 rounded-full bg-secondary/40 animate-pulse-glow" style={{ animationDelay: '3s' }} />
      </div>
    </section>
  );
}
