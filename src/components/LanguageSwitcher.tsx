'use client';

import { useLanguage } from './LanguageContext';
import { cn } from '@/lib/utils';
import { useTranslation } from './useTranslation';

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border border-border/60 hover:border-primary/40',
        className
      )}
      aria-label={t('aria_toggle_language')}
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
