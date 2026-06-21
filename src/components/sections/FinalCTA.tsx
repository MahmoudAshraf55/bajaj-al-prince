'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Phone, MessageCircle, MapPin, CalendarDays, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

const actions = [
  { labelKey: 'cta_call', href: 'tel:01221370120', icon: Phone, primary: true },
  { labelKey: 'cta_whatsapp', href: 'https://wa.me/201221370120', icon: MessageCircle, primary: false },
  { labelKey: 'cta_directions', href: 'https://maps.app.goo.gl/Dy4NToGMJqeR7ymS7', icon: MapPin, primary: false },
  { labelKey: 'cta_book', href: '/booking/', icon: CalendarDays, primary: false },
];

export default function FinalCTA() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden snap-start snap-always">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-linear-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('cta_tag')}</span>
            <div className="h-px w-12 bg-linear-to-l from-transparent to-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-6 leading-tight">
            {t('cta_title')}
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            {t('cta_description')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {actions.map((action, i) => (
              <motion.a
                key={action.labelKey}
                href={action.href}
                target={action.href.startsWith('http') ? '_blank' : undefined}
                rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 ${
                  action.primary
                    ? 'bg-linear-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50'
                    : 'glass border border-border/60 text-foreground hover:border-primary/30 hover:bg-white/5'
                }`}
              >
                <action.icon className="w-4 h-4" />
                {t(action.labelKey)}
                {action.primary && <ArrowRight className="w-4 h-4" />}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
