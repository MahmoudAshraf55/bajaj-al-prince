'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type Language = 'en' | 'ar';
type LangScope = 'admin' | 'site';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  scope: LangScope;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_KEY_BASE = 'el-prince-lang';

function storageKey(scope: LangScope): string {
  return `${LANG_KEY_BASE}-${scope}`;
}

export function LanguageProvider({ children, scope }: { children: ReactNode; scope: LangScope }) {
  const [language, setLanguageState] = useState<Language>('en');
  const key = storageKey(scope);

  useEffect(() => {
    const stored = localStorage.getItem(key) as Language | null;
    if (stored && (stored === 'en' || stored === 'ar')) {
      setLanguageState(stored);
    }
  }, [key]);

  // Only site scope changes the HTML dir (global); admin stays contained (Issue 26)
  useEffect(() => {
    if (typeof window !== 'undefined' && scope === 'site') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, scope]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, lang);
      // Set scope-specific cookie for server-side rendering
      document.cookie = `${key}=${lang};path=/;max-age=31536000;SameSite=Lax`;
      if (scope === 'site') {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    }
  }, [key, scope]);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, next);
        document.cookie = `${key}=${next};path=/;max-age=31536000;SameSite=Lax`;
        if (scope === 'site') {
          document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.lang = next;
        }
      }
      return next;
    });
  }, [key, scope]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, dir, isRTL, scope }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
