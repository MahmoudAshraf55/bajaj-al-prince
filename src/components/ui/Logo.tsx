'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizes = {
    sm: { img: 32, text: 'text-sm', sub: 'text-[9px]' },
    md: { img: 40, text: 'text-base', sub: 'text-[10px]' },
    lg: { img: 48, text: 'text-lg', sub: 'text-[11px]' },
  };

  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 overflow-hidden shadow-lg shadow-primary/10"
        style={{ width: s.img, height: s.img }}
      >
        <Image
          src="/Logo.png"
          alt="BAJAJ AL PRINCE Logo"
          width={s.img}
          height={s.img}
          className="object-cover w-full h-full"
          priority
        />
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-primary/20 pointer-events-none" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-tight text-foreground', s.text)}>
            BAJAJ
          </span>
          <span className={cn('font-semibold tracking-[0.15em] uppercase text-primary', s.sub)}>
            AL PRINCE
          </span>
        </div>
      )}
    </div>
  );
}
