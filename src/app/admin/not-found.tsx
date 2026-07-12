'use client';

import Link from 'next/link';
import { useTranslation } from '@/components/useTranslation';

export default function AdminNotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-black gradient-text">404</h1>
        <h2 className="text-2xl font-bold">{t('admin_page_not_found')}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t('admin_page_not_found_desc')}
        </p>
        <Link
          href="/admin/dashboard"
          className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
        >
          {t('admin_back_to_dashboard')}
        </Link>
      </div>
    </div>
  );
}
