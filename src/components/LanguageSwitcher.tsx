'use client';

import { useLanguage } from './LanguageContext';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border border-border/60 hover:border-primary/40',
        className
      )}
      aria-label="Toggle language"
    >
      <span
        className={cn(
          'transition-colors duration-300',
          language === 'en' ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        EN
      </span>
      <span className="w-px h-3 bg-border" />
      <span
        className={cn(
          'transition-colors duration-300',
          language === 'ar' ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        AR
      </span>
    </button>
  );
}
