'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizes = {
    sm: { img: 44, text: 'text-sm', sub: 'text-[9px]', gap: 'gap-2.5' },
    md: { img: 52, text: 'text-base', sub: 'text-[10px]', gap: 'gap-3' },
    lg: { img: 64, text: 'text-lg', sub: 'text-[11px]', gap: 'gap-3.5' },
    xl: { img: 80, text: 'text-xl', sub: 'text-xs', gap: 'gap-4' },
  };

  const s = sizes[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <div
        className="relative flex items-center justify-center rounded-full overflow-hidden logo-glow"
        style={{ width: s.img, height: s.img }}
      >
        <Image
          src="/Logo.png"
          alt="El Prince Bajaj Logo"
          width={s.img}
          height={s.img}
          className="object-cover w-full h-full"
          priority
        />
        <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-primary/30 pointer-events-none" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-black tracking-tight text-foreground', s.text)}>
            EL PRINCE
          </span>
          <span className={cn('font-bold tracking-[0.2em] uppercase text-primary', s.sub)}>
            BAJAJ
          </span>
        </div>
      )}
    </div>
  );
}
