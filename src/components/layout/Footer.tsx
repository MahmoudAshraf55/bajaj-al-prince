'use client';

import Link from 'next/link';
import { Phone, MapPin, MessageCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useTranslation } from '@/components/useTranslation';

const footerLinks = [
  { href: '/#story', labelKey: 'nav_ourStory' },
  { href: '/#services', labelKey: 'nav_services' },
  { href: '/#reviews', labelKey: 'nav_reviews' },
  { href: '/market/', labelKey: 'nav_market' },
  { href: '/booking/', labelKey: 'nav_bookNow' },
];

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/3 to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="mb-6">
              <Logo size="md" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {t('footer_description')}
            </p>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-6">{t('footer_quickLinks')}</h3>
            <nav className="flex flex-col gap-3">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-6">{t('footer_contact')}</h3>
            <div className="flex flex-col gap-4">
              <a href="tel:01221370120" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                <Phone className="w-4 h-4" />
                0122 137 0120
              </a>
              <a href="tel:01551233908" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                <Phone className="w-4 h-4" />
                0155 123 3908
              </a>
              <a href="https://maps.app.goo.gl/Dy4NToGMJqeR7ymS7" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>35JH+PC \u0645\u0631\u0643\u0632 \u0623\u0648\u0633\u064a\u0645</span>
              </a>
              <div className="flex items-center gap-3 mt-2">
                <a href="https://wa.me/201221370120" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <MessageCircle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a href="https://www.facebook.com/elprince.bajaj" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.instagram.com/elprincebajaj" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <svg className="w-4 h-4 text-muted-foreground hover:text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.tiktok.com/@elprince.bajajj" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <svg className="w-4 h-4 text-muted-foreground hover:text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.3 0 .59.05.86.13v-3.5a6.37 6.37 0 00-.86-.06A6.34 6.34 0 005.7 16.2a6.34 6.34 0 006.33 6.34 6.34 6.34 0 006.33-6.34V8.91a8.1 8.1 0 004.64 1.46V6.8a4.83 4.83 0 01-3.41-1.11z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-center gap-4">
          <p className="text-muted-foreground text-xs text-center" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} El Prince Bajaj. {t('footer_rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
