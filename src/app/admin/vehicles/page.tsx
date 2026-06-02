'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import type { Vehicle } from '@/types';
import {
  Search, Car, ChevronLeft, ChevronRight, Hash, Calendar,
  AlertCircle, CheckCircle2, User, Gauge,
} from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export default function VehiclesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchVehicles = async (p: number, q?: string) => {
    try {
      const url = new URL('/api/vehicles/', window.location.origin);
      url.searchParams.set('page', String(p));
      url.searchParams.set('limit', '10');
      if (q) url.searchParams.set('search', q);
      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data.vehicles);
        setMeta(data.data.meta);
      }
    } catch {
      addToast('error', t('crm_failed_load_vehicles'));
    }
  };

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push('/admin/');
        else { setLoading(false); fetchVehicles(1); }
      });
  }, [router]);

  useEffect(() => {
    if (!loading) fetchVehicles(page, search);
  }, [page, loading]);

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

  return (
    <div className="min-h-screen p-6 sm:p-8">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
                toast.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            {t('crm_vehicle_directory')}
          </h2>
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
                  <th className="text-left px-5 py-3 font-medium">{t('crm_vehicle')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('crm_vehicle_year_col')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('crm_vehicle_plate')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('crm_vehicle_chassis')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('crm_vehicle_owner')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('crm_customer_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.map((v) => (
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
                {vehicles.length === 0 && (
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
