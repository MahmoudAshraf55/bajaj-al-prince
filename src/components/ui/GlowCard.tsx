'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefit: string;
  metric: string;
  index?: number;
  className?: string;
  inView?: boolean;
}

export default function GlowCard({
  icon: Icon,
  title,
  description,
  benefit,
  metric,
  index = 0,
  className,
  inView = true,
}: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
      className={cn(
        'group relative rounded-2xl p-6 sm:p-7 transition-all duration-500',
        'bg-card/60 backdrop-blur-xl border border-border/60',
        'hover:border-primary/40 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10',
        'card-glow',
        className
      )}
    >
      {/* Inner glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Icon */}
      <div className="relative mb-5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/40 transition-all duration-500">
          <Icon className="w-5 h-5 text-primary group-hover:text-accent transition-colors duration-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent/60 animate-pulse-glow" />
      </div>

      {/* Title */}
      <h3 className="relative text-foreground font-bold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>

      {/* Description */}
      <p className="relative text-muted-foreground text-sm leading-relaxed mb-4">
        {description}
      </p>

      {/* Divider */}
      <div className="relative h-px bg-gradient-to-r from-primary/30 via-border to-transparent mb-4" />

      {/* Benefit */}
      <p className="relative text-xs text-muted-foreground/80 mb-3">
        {benefit}
      </p>

      {/* Metric */}
      <div className="relative flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: '100%' } : {}}
            transition={{ duration: 1.2, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
        <span className="text-xs font-bold text-accent whitespace-nowrap">{metric}</span>
      </div>
    </motion.div>
  );
}
