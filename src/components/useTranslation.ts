'use client';

import { useCallback } from 'react';
import { useLanguage } from './LanguageContext';
import { translations, type TranslationKey } from './translations';

export function useTranslation() {
  const { language, isRTL } = useLanguage();

  const t = useCallback((key: TranslationKey | string, params?: Record<string, string | number>): string => {
    let value: string = translations[language][key as TranslationKey] || translations.en[key as TranslationKey] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [language]);

  return { t, language, isRTL };
}
