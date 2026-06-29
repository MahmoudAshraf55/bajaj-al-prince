'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { Vehicle } from '@/types';
import {
  Search, Car, ChevronLeft, ChevronRight, Hash,
  AlertCircle, User,
} from 'lucide-react';

export default function VehiclesPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchVehicles = useCallback(async (p: number, q?: string, signal?: AbortSignal) => {
    setError('');
    try {
      const url = new URL('/api/vehicles/', window.location.origin);
      url.searchParams.set('page', String(p));
      url.searchParams.set('limit', '10');
      if (q) url.searchParams.set('search', q);
      const res = await fetchWithRetry(url.toString(), { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.vehicles)) {
        setVehicles(data.data.vehicles);
        setMeta(data.data.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1 });
      } else {
        setError(data?.error || t('crm_failed_load_vehicles'));
        addToast('error', data?.error || t('crm_failed_load_vehicles'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : t('crm_failed_load_vehicles');
      setError(msg);
      addToast('error', msg);
    }
  }, [t, addToast]);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else { setLoading(false); }
      })
      .catch(() => {
        router.push('/admin/');
      });
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    fetchVehicles(page, search, controller.signal);
    return () => controller.abort();
  }, [page, loading, search, fetchVehicles]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    fetchVehicles(1, val);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !vehicles.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('crm_error_loading')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchVehicles(page, search); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('crm_retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/dashboard/" />
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Car className="w-6 h-6 text-primary" />
              {t('crm_vehicle_directory')}
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('crm_search_vehicle_placeholder')}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring w-72"
            />
          </div>
        </div>

        {/* Vehicle Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_vehicle')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_vehicle_year_col')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_vehicle_plate')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_vehicle_chassis')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_vehicle_owner')}</th>
                  <th scope="col" className="text-right px-5 py-3 font-medium">{t('crm_customer_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles?.map((v) => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Car className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{v.make} {v.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{v.year || '—'}</td>
                    <td className="px-5 py-4">
                      {v.plateNumber ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-1 rounded-lg bg-white/5">
                          <Hash className="w-3 h-3" />
                          {v.plateNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t('crm_vehicle_unknown')}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{v.chassisNumber || '—'}</td>
                    <td className="px-5 py-4">
                      {v.customer ? (
                        <Link
                          href={`/admin/customers/${v.customerId}/`}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <User className="w-3 h-3" />
                          {v.customer.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t('crm_vehicle_unknown')}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/customers/${v.customerId}/`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t('crm_view_owner')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!vehicles || vehicles.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      {t('crm_no_vehicles')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {t('crm_pagination_showing')} {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} {t('crm_pagination_of')} {meta.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {meta.page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={meta.page >= meta.totalPages}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
