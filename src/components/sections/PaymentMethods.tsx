'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { CreditCard, Smartphone, Banknote } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

const methods = [
  { icon: Smartphone, nameKey: 'pay_instapay', descKey: 'pay_instapay_desc', color: 'from-primary/20 to-primary/5' },
  { icon: CreditCard, nameKey: 'pay_vodafone', descKey: 'pay_vodafone_desc', color: 'from-accent/20 to-accent/5' },
  { icon: Banknote, nameKey: 'pay_cash', descKey: 'pay_cash_desc', color: 'from-secondary/20 to-secondary/5' },
];

export default function PaymentMethods() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden snap-start snap-always">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.03),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('payment_tag')}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            {t('payment_title')}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {methods.map((method, i) => (
            <motion.div
              key={method.nameKey}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.15 * i }}
              className="group glass rounded-2xl p-6 sm:p-8 text-center card-glow hover:-translate-y-1 transition-all duration-500"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${method.color} border border-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500`}>
                <method.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-foreground font-bold text-lg mb-2">{t(method.nameKey)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(method.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
