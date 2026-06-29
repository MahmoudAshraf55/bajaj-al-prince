'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import {
  Plus, X, Package, Loader2, Trash2, Eye, ClipboardList,
} from 'lucide-react';

interface InventoryCount {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  _count?: { items: number };
  items?: { id: string }[];
  createdBy: { username: string };
  createdAt: string;
  completedBy?: { username: string } | null;
  completedAt?: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  draft: 'ic_status_draft',
  in_progress: 'ic_status_in_progress',
  completed: 'ic_status_completed',
  cancelled: 'ic_status_cancelled',
};

export default function InventoryCountsPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();

  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/v1/inventory-counts/', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setCounts(json.data.counts ?? json.data ?? []);
    } catch {
      addToast('error', 'Failed to load inventory counts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCounts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory-counts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', json.message || 'Count created');
        setCounts((prev) => [json.data.count ?? json.data, ...prev]);
        setShowModal(false);
        setName('');
      } else {
        addToast('error', json.error || 'Failed to create count');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inventory count?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/v1/inventory-counts/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        addToast('success', 'Count deleted');
        setCounts((prev) => prev.filter((c) => c.id !== id));
      } else {
        const json = await res.json().catch(() => ({}));
        addToast('error', json.error || 'Failed to delete count');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const itemCount = (c: InventoryCount) => c._count?.items ?? c.items?.length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/accounting/" />
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              {t('ic_title')}
            </h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('ic_new_count')}
          </button>
        </div>

        {counts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t('ic_no_counts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {counts.map((count, idx) => (
              <motion.div
                key={count.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-lg">{count.name}</p>
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${statusColors[count.status]}`}>
                        {t(statusLabels[count.status])}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-3">
                      <span>{t('ic_items')}: {itemCount(count)}</span>
                      <span>&bull;</span>
                      <span>{count.createdBy.username}</span>
                      <span>&bull;</span>
                      <span>{formatDate(count.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/inventory-counts/${count.id}/`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground text-xs font-medium hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      {t('ic_items')}
                    </Link>
                    <button
                      onClick={() => handleDelete(count.id)}
                      disabled={deleting === count.id}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      {deleting === count.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

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
                <h3 className="text-lg font-bold">{t('ic_new_count')}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('ic_count_name')}</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('ic_count_name_placeholder')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    t('ic_new_count')
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
