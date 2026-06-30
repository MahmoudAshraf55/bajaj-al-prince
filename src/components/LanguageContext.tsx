'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const PUBLIC_KEY = 'el-prince-language';
const ADMIN_KEY = 'el-prince-language-admin';

function getStorageKey(pathname: string | null): string {
  return pathname?.startsWith('/admin') ? ADMIN_KEY : PUBLIC_KEY;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<Language>('en');
  const prevScopeRef = useRef<'admin' | 'public'>('public');

  const currentScope = pathname.startsWith('/admin') ? 'admin' : 'public';

  // Read stored language on mount only (avoid SSR/client mismatch)
  useEffect(() => {
    const key = getStorageKey(pathname);
    const stored = localStorage.getItem(key) as Language | null;
    if (stored && (stored === 'en' || stored === 'ar')) {
      setLanguageState(stored);
    }
    prevScopeRef.current = currentScope;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-read language when navigating between admin and public
  useEffect(() => {
    if (prevScopeRef.current !== currentScope) {
      const key = getStorageKey(pathname);
      const stored = localStorage.getItem(key) as Language | null;
      if (stored && (stored === 'en' || stored === 'ar')) {
        setLanguageState(stored);
      }
      prevScopeRef.current = currentScope;
    }
  }, [pathname, currentScope]);

  // Sync HTML attributes on mount and when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      const key = getStorageKey(window.location.pathname);
      localStorage.setItem(key, lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      if (typeof window !== 'undefined') {
        const key = getStorageKey(window.location.pathname);
        localStorage.setItem(key, next);
        document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = next;
      }
      return next;
    });
  }, []);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, dir, isRTL }}>
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
