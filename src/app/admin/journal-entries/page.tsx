'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Search, Plus, ChevronLeft, ChevronRight, AlertCircle, X, FileText,
} from 'lucide-react';

interface JournalEntryLine {
  id: string;
  debit: string;
  credit: string;
  description?: string | null;
  account: { id: string; code: string; name: string; type: string };
}

interface JournalEntry {
  id: string;
  type: string;
  amount: string;
  description?: string | null;
  referenceType?: string | null;
  referenceNumber?: string | null;
  paymentMethod?: string | null;
  date: string;
  createdBy: { id: string; username: string };
  lines: JournalEntryLine[];
}

const typeColors: Record<string, string> = {
  SALE: 'bg-green-500/10 text-green-400',
  RETURN: 'bg-orange-500/10 text-orange-400',
  PURCHASE: 'bg-blue-500/10 text-blue-400',
  EXPENSE: 'bg-red-500/10 text-red-400',
  INCOME: 'bg-purple-500/10 text-purple-400',
  STOCK_ADJUSTMENT: 'bg-yellow-500/10 text-yellow-400',
};

export default function JournalEntriesPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'INCOME',
    amount: '',
    description: '',
    paymentMethod: 'cash',
  });
  const [formError, setFormError] = useState('');

  const fetchEntries = useCallback(async (p: number, q?: string, type?: string, signal?: AbortSignal) => {
    setError('');
    try {
      const url = new URL('/api/v1/journal-entries/', window.location.origin);
      url.searchParams.set('page', String(p));
      url.searchParams.set('limit', '20');
      if (type) url.searchParams.set('type', type);
      const res = await fetchWithRetry(url.toString(), { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.entries)) {
        setEntries(data.data.entries);
        setMeta(data.data.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
      } else {
        setError(data?.error || t('je_no_entries'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : t('je_no_entries'));
    }
  }, [t]);

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
    fetchEntries(page, search, typeFilter, controller.signal);
    return () => controller.abort();
  }, [page, loading, search, typeFilter, fetchEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError('Amount must be positive');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Description is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/journal-entries/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: form.type,
          amount: parseFloat(form.amount),
          description: form.description.trim(),
          paymentMethod: form.paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('je_created'));
        setForm({ type: 'INCOME', amount: '', description: '', paymentMethod: 'cash' });
        setShowModal(false);
        fetchEntries(page, search, typeFilter);
      } else {
        setFormError(data.error || data.errors?.[0]?.message || t('je_no_entries'));
      }
    } catch {
      setFormError(t('je_no_entries'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !entries.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('je_no_entries')}</p>
          <button
            onClick={() => { setError(''); fetchEntries(page, search, typeFilter); }}
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
            <h2 className="text-2xl font-bold">{t('je_title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('je_search')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('je_new')}
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          {['', 'SALE', 'RETURN', 'PURCHASE', 'INCOME', 'EXPENSE', 'STOCK_ADJUSTMENT'].map((ft) => (
            <button
              key={ft}
              onClick={() => { setTypeFilter(ft); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                typeFilter === ft ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              {ft || (t('admin_all') || 'All')}
            </button>
          ))}
        </div>

        {/* Entries list */}
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="glass rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-1 ${typeColors[entry.type] || 'bg-gray-500/10 text-gray-400'}`}>
                      {entry.type}
                    </span>
                    <p className="text-sm font-medium">{entry.description || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Lines */}
              <div className="ml-11">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th scope="col" className="text-left py-1 font-medium">{t('je_account')}</th>
                      <th scope="col" className="text-right py-1 font-medium">{t('je_debit')}</th>
                      <th scope="col" className="text-right py-1 font-medium">{t('je_credit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/50">
                        <td className="py-1.5">
                          <span className="font-mono text-muted-foreground mr-2">{line.account.code}</span>
                          {line.account.name}
                        </td>
                        <td className="py-1.5 text-right font-mono text-green-400">
                          {Number(line.debit) > 0 ? Number(line.debit).toFixed(2) : '—'}
                        </td>
                        <td className="py-1.5 text-right font-mono text-red-400">
                          {Number(line.credit) > 0 ? Number(line.credit).toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
              {t('je_no_entries')}
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('sup_pagination_showing')} {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} {t('sup_pagination_of')} {meta.total}
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
      </motion.div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              className="glass rounded-2xl p-6 w-full max-w-md border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{t('je_add_modal')}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('je_type')}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    {['SALE', 'RETURN', 'PURCHASE', 'INCOME', 'EXPENSE', 'STOCK_ADJUSTMENT'].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('je_amount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('je_description')}</label>
                  <textarea
                    rows={2}
                    required
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    t('je_new')
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
