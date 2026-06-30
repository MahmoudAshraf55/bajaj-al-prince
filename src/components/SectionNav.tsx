'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/components/useTranslation';

const SECTIONS = [
  { id: 'hero', key: 'nav_ourStory' },
  { id: 'tiktok', key: 'nav_tiktok' },
  { id: 'story', key: 'nav_ourStory' },
  { id: 'why-us', key: 'nav_services' },
  { id: 'services', key: 'nav_services' },
  { id: 'reviews', key: 'nav_reviews' },
  { id: 'contact-info', key: 'nav_contact' },
  { id: 'payment', key: 'cta_book' },
  { id: 'cta', key: 'cta_book' },
] as const;

export default function SectionNav() {
  const { t, isRTL } = useTranslation();
  const [active, setActive] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const scrollY = window.scrollY + window.innerHeight * 0.35;
        let current = 0;
        for (let i = 0; i < SECTIONS.length; i++) {
          const el = document.getElementById(SECTIONS[i].id);
          if (el && el.offsetTop <= scrollY) current = i;
        }
        setActive(current);
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const sideClass = isRTL ? 'left-3' : 'right-3';
  const tooltipSide = isRTL ? 'left-6' : 'right-6';

  return (
    <nav className={`fixed ${sideClass} top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-3`}>
      {SECTIONS.map((section, i) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById(section.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="group relative flex items-center justify-center w-5 h-5 outline-none"
          aria-label={t(section.key) || section.id}
        >
          <span className={`absolute ${tooltipSide} opacity-0 group-hover:opacity-100 text-[10px] text-foreground/80 font-medium whitespace-nowrap bg-background/80 px-2 py-0.5 rounded border border-border/30 transition-all duration-200 pointer-events-none`}>
            {t(section.key) || section.id}
          </span>
          <div
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? 'w-2.5 h-2.5 bg-primary shadow-lg shadow-primary/40'
                : 'w-1.5 h-1.5 bg-foreground/20 hover:bg-foreground/40 hover:scale-125'
            }`}
          />
        </a>
      ))}
    </nav>
  );
}
