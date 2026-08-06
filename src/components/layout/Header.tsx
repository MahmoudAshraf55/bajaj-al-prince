'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from '@/components/useTranslation';
import { usePublicSettings } from '@/components/SettingsContext';

const navLinks = [
  { href: '/#story', labelKey: 'nav_ourStory' as const },
  { href: '/#services', labelKey: 'nav_services' as const },
  { href: '/#reviews', labelKey: 'nav_reviews' as const },
  { href: '/#tiktok', labelKey: 'nav_tiktok' as const },
  { href: '/#contact-info', labelKey: 'nav_contact' as const },
  { href: '/market/', labelKey: 'nav_market' as const },
  { href: '/booking/', labelKey: 'nav_bookNow' as const },
];

export default function Header() {
  const { t } = useTranslation();
  const s = usePublicSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled ? 'glass py-3 border-b border-border/40 shadow-lg shadow-black/20' : 'bg-transparent py-5'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="group">
          <Logo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 min-h-11 inline-flex items-center',
                link.labelKey === 'nav_bookNow'
                  ? 'bg-linear-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://wa.me/201221370120"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors min-h-11"
            aria-label="WhatsApp"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="hidden lg:inline">WhatsApp</span>
          </a>
          <LanguageSwitcher />
          <a
            href={`tel:${s.contact_phone1.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors min-h-11"
          >
            <Phone className="w-4 h-4" />
            <span className="font-mono">{s.contact_phone1}</span>
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2.5 rounded-lg hover:bg-white/5 transition-colors"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileOpen ? t('aria_close_menu') : t('aria_open_menu')}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="md:hidden glass mt-3 mx-4 rounded-2xl p-4 border border-border depth-2">
          <div className="mb-4 pb-4 border-b border-border flex items-center justify-between">
            <Logo size="sm" />
            <LanguageSwitcher />
          </div>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  link.labelKey === 'nav_bookNow'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <a
              href="https://wa.me/201221370120"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
