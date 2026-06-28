'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/useTranslation';
import {
  Camera, Search, Loader2, BarChart3,
  Smartphone, Monitor, LayoutDashboard, LogOut, Mail, Calendar, DollarSign,
  ShoppingCart, MessageCircle, TrendingUp, Wrench, Users, Car, List,
} from 'lucide-react';

interface ScanLog {
  id: string;
  barcode: string;
  source: string;
  status: string;
  deviceName: string | null;
  createdAt: string;
  product: { id: string; name: string; nameAr: string | null; barcode: string | null } | null;
  user: { id: string; username: string } | null;
}

export default function AdminDevices() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchBarcode, setSearchBarcode] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push('/admin/');
        else setLoading(false);
      })
      .catch(() => router.push('/admin/'));
  }, [router]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchBarcode) params.set('barcode', searchBarcode);
      if (filterSource) params.set('source', filterSource);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/v1/scan-logs/?${params}`, { credentials: 'include' });
      const d = await res.json();
      if (d.success) {
        setLogs(d.data.logs);
        setTotal(d.data.meta.total);
        setTotalPages(d.data.meta.totalPages);
      }
    } catch {}
    setLoadingLogs(false);
  }, [page, searchBarcode, filterSource, filterStatus]);

  useEffect(() => {
    if (loading) return;
    loadLogs();
  }, [loading, loadLogs]);

  const sources = ['HH400', 'MobileCamera', 'Webcam'];
  const statuses = ['success', 'not_found'];

  const totalScans = total;
  const successCount = logs.filter((l) => l.status === 'success').length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sourceIcons: Record<string, typeof Smartphone> = {
    HH400: Monitor,
    MobileCamera: Smartphone,
    Webcam: Camera,
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{t('dev_title')}</h1>
              <p className="text-muted-foreground text-sm">{total} {t('admin_records')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass rounded-2xl p-4 text-center">
              <Camera className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{totalScans}</p>
              <p className="text-xs text-muted-foreground">{t('dev_total_scans')}</p>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-1 text-green-400" />
              <p className="text-xl font-bold">{successRate}%</p>
              <p className="text-xs text-muted-foreground">{t('dev_success_rate')}</p>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <Search className="w-6 h-6 mx-auto mb-1 text-blue-400" />
              <p className="text-xl font-bold">{successCount}</p>
              <p className="text-xs text-muted-foreground">{t('dev_recent_scans')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('dev_barcode')}
                value={searchBarcode}
                onChange={(e) => { setSearchBarcode(e.target.value); setPage(1); }}
                className="w-full ltr:pl-10 rtl:pr-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('dev_source')}</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('dev_status')}</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('dev_no_logs')}</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left p-3 font-medium">{t('dev_barcode')}</th>
                      <th className="text-left p-3 font-medium">{t('dev_product')}</th>
                      <th className="text-left p-3 font-medium">{t('dev_source')}</th>
                      <th className="text-left p-3 font-medium">{t('dev_status')}</th>
                      <th className="text-left p-3 font-medium">{t('dev_user')}</th>
                      <th className="text-left p-3 font-medium">{t('dev_date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const SourceIcon = sourceIcons[log.source] || Camera;
                      return (
                        <tr key={log.id} className="border-t border-border/50 hover:bg-white/5">
                          <td className="p-3 font-mono text-xs">{log.barcode}</td>
                          <td className="p-3">
                            {log.product
                              ? (language === 'ar' && log.product.nameAr ? log.product.nameAr : log.product.name)
                              : <span className="text-red-400">{t('dev_scan_not_found')}</span>
                            }
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <SourceIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs">{log.source}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              log.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {log.status === 'success' ? t('pos_status_confirmed') : t('dev_scan_not_found')}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{log.user?.username || '-'}</td>
                          <td className="p-3 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                {t('pos_previous')}
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                {t('pos_next')}
              </button>
            </div>
          )}
      </div>
    </>
  );
}
