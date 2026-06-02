'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Wrench, Settings, RotateCcw, Zap, Puzzle, CalendarDays, PhoneCall, HeadphonesIcon, ClipboardCheck
} from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

const services = [
  { icon: Wrench, titleKey: 'svc_maintenance', descKey: 'svc_maintenance_desc' },
  { icon: Settings, titleKey: 'svc_engine', descKey: 'svc_engine_desc' },
  { icon: RotateCcw, titleKey: 'svc_frame', descKey: 'svc_frame_desc' },
  { icon: Zap, titleKey: 'svc_electrical', descKey: 'svc_electrical_desc' },
  { icon: Puzzle, titleKey: 'svc_diagnostics', descKey: 'svc_diagnostics_desc' },
  { icon: ClipboardCheck, titleKey: 'svc_rareParts', descKey: 'svc_rareParts_desc' },
  { icon: CalendarDays, titleKey: 'svc_periodic', descKey: 'svc_periodic_desc' },
  { icon: PhoneCall, titleKey: 'svc_emergency', descKey: 'svc_emergency_desc' },
  { icon: HeadphonesIcon, titleKey: 'svc_consultation', descKey: 'svc_consultation_desc' },
  { icon: ClipboardCheck, titleKey: 'svc_followup', descKey: 'svc_followup_desc' },
];

export default function WhyChooseUs() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="services" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.05),_transparent_60%)]" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('services_tag')}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            {t('services_title')}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            {t('services_description')}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.titleKey}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className="group relative rounded-2xl p-6 bg-card/50 backdrop-blur-xl border border-border/60 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 card-glow"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <service.icon className="w-5 h-5 text-primary group-hover:text-accent transition-colors duration-500" />
                </div>
                <h3 className="text-foreground font-semibold text-sm mb-2">{t(service.titleKey)}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{t(service.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
