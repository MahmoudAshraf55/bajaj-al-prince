'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

const socialLinks = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/elprince.bajaj',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/elprincebajaj',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@elprince.bajajj',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.3 0 .59.05.86.13v-3.5a6.37 6.37 0 00-.86-.06A6.34 6.34 0 005.7 16.2a6.34 6.34 0 006.33 6.34 6.34 6.34 0 006.33-6.34V8.91a8.1 8.1 0 004.64 1.46V6.8a4.83 4.83 0 01-3.41-1.11z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: 'https://wa.me/201221370120',
    icon: <MessageCircle className="w-5 h-5" />,
  },
];

const contacts = [
  {
    label: 'Phone 1',
    value: '0122 137 0120',
    href: 'tel:01221370120',
    icon: Phone,
    action: 'Call Now',
  },
  {
    label: 'Phone 2',
    value: '0155 123 3908',
    href: 'tel:01551233908',
    icon: Phone,
    action: 'Call Now',
  },
  {
    label: 'Location',
    value: '35JH+PC \u0645\u0631\u0643\u0632 \u0623\u0648\u0633\u064a\u0645',
    href: 'https://maps.app.goo.gl/Dy4NToGMJqeR7ymS7',
    icon: MapPin,
    action: 'Open Map',
  },
];

export default function ContactInfo() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="contact" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.04),_transparent_60%)]" />

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
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">{t('contact_tag')}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            {t('contact_title')}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            {t('contact_description')}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {contacts.map((contact, i) => (
            <motion.a
              key={contact.label}
              href={contact.href}
              target={contact.label === 'Location' ? '_blank' : undefined}
              rel={contact.label === 'Location' ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group glass rounded-2xl p-6 card-glow hover:-translate-y-1 transition-all duration-500 block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <contact.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] text-accent uppercase tracking-wider font-semibold">{t(contact.action)}</span>
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t(`contact_${contact.label.toLowerCase().replace(' ', '')}_label`)}</p>
              <p className="text-foreground font-bold text-lg">{contact.value}</p>
            </motion.a>
          ))}
        </div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-muted-foreground text-sm">{t('contact_social')}</p>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-xl bg-card/50 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
