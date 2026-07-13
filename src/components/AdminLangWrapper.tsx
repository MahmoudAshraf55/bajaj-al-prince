'use client';

import { type ReactNode } from 'react';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';

function AdminDirWrapper({ children }: { children: ReactNode }) {
  const { dir, isRTL } = useLanguage();
  return (
    <div dir={dir} lang={isRTL ? 'ar' : 'en'} className="contents">
      {children}
    </div>
  );
}

export function AdminLangWrapper({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider scope="admin">
      <AdminDirWrapper>{children}</AdminDirWrapper>
    </LanguageProvider>
  );
}
