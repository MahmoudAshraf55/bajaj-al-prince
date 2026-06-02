'use client';

import { useCallback } from 'react';
import { useLanguage } from './LanguageContext';
import { translations, type TranslationKey } from './translations';

export function useTranslation() {
  const { language, isRTL } = useLanguage();

  const t = useCallback((key: TranslationKey | string): string => {
    return translations[language][key as TranslationKey] || translations.en[key as TranslationKey] || key;
  }, [language]);

  return { t, language, isRTL };
}
