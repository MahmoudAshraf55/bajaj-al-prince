'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ClipboardList, PackageSearch, MessageCircle, LineChart } from 'lucide-react';
import GlowCard from '@/components/ui/GlowCard';

const features = [
  {
    icon: ClipboardList,
    title: 'Smart Work Orders',
    description: 'Create, assign, and track repair jobs in real time.',
    benefit: 'Reduce paperwork by 80%.',
    metric: '2x Faster Service Flow',
  },
  {
    icon: PackageSearch,
    title: 'Inventory Control',
    description: 'Monitor stock levels and parts availability.',
    benefit: 'Prevent shortages before they happen.',
    metric: '70% Fewer Stockouts',
  },
  {
    icon: MessageCircle,
    title: 'Customer Experience',
    description: 'Automated WhatsApp and SMS updates.',
    benefit: 'Keep customers informed at every stage.',
    metric: '35% Higher Retention',
  },
  {
    icon: LineChart,
    title: 'Business Analytics',
    description: 'Revenue, technician performance, and service metrics.',
    benefit: 'Make decisions using live operational data.',
    metric: 'Real-Time Insights',
  },
];

export default function Services() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="services" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,229,255,0.04),_transparent_60%)]" />
      <div className="absolute top-40 right-20 w-64 h-64 bg-primary/3 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent/3 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-linear-to-r from-transparent to-accent" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">Core Features</span>
            <div className="h-px w-12 bg-linear-to-l from-transparent to-accent" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            Everything You Need to <span className="gradient-text-cyan">Win</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            A complete toolkit designed for motorcycle service centers that want to operate
            faster, serve better, and grow smarter.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <GlowCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              benefit={feature.benefit}
              metric={feature.metric}
              index={i}
              inView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
