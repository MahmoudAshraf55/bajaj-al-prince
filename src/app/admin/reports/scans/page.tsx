'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import BackButton from '@/components/BackButton';
import { Barcode, Camera, History, AlertCircle } from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

interface ScanLog {
  id: string;
  barcode: string;
  source: string;
  status: string;
  createdAt: string;
  user?: { username: string };
  product?: { name: string; nameAr?: string };
}

export default function ScanLogsPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async (p: number, signal?: AbortSignal) => {
    setError('');
    try {
      const res = await fetchWithRetry(`/api/v1/barcode/logs/?page=${p}&limit=50`, { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success) {
        setLogs(data.data.logs);
        setTotalPages(data.meta.totalPages || 1);
      } else {
        setError(data?.error || t('scans_failed_load'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('scans_network_error'));
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false })))
      .then((d) => {
        if (!d?.success || !['admin', 'staff'].includes(d.data?.user?.role)) {
          router.push('/admin/');
        } else {
          setLoading(false);
          const controller = new AbortController();
          fetchLogs(page, controller.signal);
          return () => controller.abort();
        }
      })
      .catch(() => router.push('/admin/'));
  }, [router, page, fetchLogs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallback="/admin/reports/" />
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            {t('scans_title')}
          </h2>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-white/5">
                  <th scope="col" className="px-5 py-4 font-medium">{t('scans_col_time')}</th>
                  <th scope="col" className="px-5 py-4 font-medium">{t('scans_col_user')}</th>
                  <th scope="col" className="px-5 py-4 font-medium">{t('scans_col_barcode')}</th>
                  <th scope="col" className="px-5 py-4 font-medium">{t('scans_col_product')}</th>
                  <th scope="col" className="px-5 py-4 font-medium">{t('scans_col_source')}</th>
                  <th scope="col" className="px-5 py-4 font-medium">{t('scans_col_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-medium">{log.user?.username || t('scans_system')}</td>
                    <td className="px-5 py-4 font-mono">{log.barcode}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {log.product ? (language === 'ar' && log.product.nameAr ? log.product.nameAr : log.product.name) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {log.source === 'Webcam' || log.source === 'MobileCamera' ? (
                          <Camera className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Barcode className="w-4 h-4 text-primary" />
                        )}
                        <span>{log.source}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-500/10 text-green-400' :
                        log.status === 'not_found' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status === 'success' ? t('scans_status_success') : log.status === 'not_found' || log.status === 'error' ? t('scans_status_error') : log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      {t('scans_no_logs')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50"
              >
                {t('pos_previous')}
              </button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50"
              >
                {t('pos_next')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
