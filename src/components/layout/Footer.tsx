import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function Footer() {
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
              BAJAJ AL PRINCE is the intelligent platform for modern motorcycle service centers. Service operations, inventory, customer relationships, and business performance — unified.
            </p>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-6">Quick Links</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/#about" className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</Link>
              <Link href="/#services" className="text-muted-foreground hover:text-primary transition-colors text-sm">Services</Link>
              <Link href="/market/" className="text-muted-foreground hover:text-primary transition-colors text-sm">Market</Link>
              <Link href="/booking/" className="text-muted-foreground hover:text-primary transition-colors text-sm">Book Service</Link>
            </nav>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-6">Contact</h3>
            <div className="flex flex-col gap-4">
              <a href="tel:+20123456789" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                <Phone className="w-4 h-4" />
                +20 123 456 789
              </a>
              <a href="mailto:info@bajajalprince.com" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                <Mail className="w-4 h-4" />
                info@bajajalprince.com
              </a>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Cairo, Egypt</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <a href="https://wa.me/20123456789" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <MessageCircle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <svg className="w-4 h-4 text-muted-foreground hover:text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.3 0 .59.05.86.13v-3.5a6.37 6.37 0 00-.86-.06A6.34 6.34 0 005.7 16.2a6.34 6.34 0 006.33 6.34 6.34 6.34 0 006.33-6.34V8.91a8.1 8.1 0 004.64 1.46V6.8a4.83 4.83 0 01-3.41-1.11z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} BAJAJ AL PRINCE. All rights reserved.
          </p>
          <Link href="/admin/" className="text-muted-foreground hover:text-primary transition-colors text-xs">
            Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
