'use client';

import { useLanguage } from './LanguageContext';
import { translations, type TranslationKey } from './translations';

export function useTranslation() {
  const { language, isRTL } = useLanguage();

  const t = (key: TranslationKey | string): string => {
    return translations[language][key as TranslationKey] || translations.en[key as TranslationKey] || key;
  };

  return { t, language, isRTL };
}
