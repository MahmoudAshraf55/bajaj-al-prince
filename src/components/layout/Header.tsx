'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/Logo';

const navLinks = [
  { href: '/#about', label: 'About' },
  { href: '/#services', label: 'Services' },
  { href: '/#contact', label: 'Contact' },
  { href: '/market/', label: 'Market' },
  { href: '/booking/', label: 'Book Now' },
];

export default function Header() {
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
        isScrolled ? 'glass py-3 border-b border-border/40' : 'bg-transparent py-5'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="group">
          <Logo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                link.label === 'Book Now'
                  ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="tel:+20123456789"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="font-mono">+20 123 456 789</span>
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass mt-3 mx-4 rounded-2xl p-4 border border-border">
          <div className="mb-4 pb-4 border-b border-border">
            <Logo size="sm" />
          </div>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  link.label === 'Book Now'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
