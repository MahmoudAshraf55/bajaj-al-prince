'use client';

import { useCallback } from 'react';
import { useLanguage } from './LanguageContext';

export function useTranslation() {
  const { language, isRTL, dictionary } = useLanguage();

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value: string = dictionary[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [dictionary]);

  return { t, language, isRTL };
}
