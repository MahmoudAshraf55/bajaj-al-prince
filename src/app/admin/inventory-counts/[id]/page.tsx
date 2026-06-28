'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import {
  Loader2, AlertCircle, Save, CheckCircle2, ClipboardList, User, Calendar,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode?: string | null;
}

interface InventoryCountItem {
  id: string;
  productId: string;
  product: Product;
  expectedQty: number;
  actualQty: number;
  variance: number;
  unit: string;
  notes?: string | null;
}

interface InventoryCount {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  items: InventoryCountItem[];
  createdBy: { username: string };
  createdAt: string;
  completedBy?: { username: string } | null;
  completedAt?: string | null;
  notes?: string | null;
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

export default function InventoryCountDetailPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();
  const params = useParams();
  const countId = params.id as string;

  const [count, setCount] = useState<InventoryCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const fetchCount = async () => {
    setError('');
    try {
      const res = await fetch(`/api/v1/inventory-counts/${countId}/`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        const data = json.data.count ?? json.data;
        setCount(data);
        const initial: Record<string, number> = {};
        (data.items ?? []).forEach((item: InventoryCountItem) => {
          initial[item.id] = item.actualQty;
        });
        setEdits(initial);
      } else {
        setError(json.error || 'Failed to load count');
        addToast('error', json.error || 'Failed to load count');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCount(); }, [countId]);

  const handleSave = async () => {
    const items = Object.entries(edits).map(([itemId, actualQty]) => {
      const item = count?.items.find((i) => i.id === itemId);
      return { productId: item?.productId, actualQty };
    });
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/inventory-counts/${countId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'update_items', items }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', json.message || 'Count saved');
        await fetchCount();
      } else {
        addToast('error', json.error || 'Failed to save');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/v1/inventory-counts/${countId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'complete' }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', json.message || 'Count completed');
        await fetchCount();
        setShowConfirm(false);
      } else {
        addToast('error', json.error || 'Failed to complete');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getVariance = (item: InventoryCountItem) => {
    const actual = edits[item.id] ?? item.actualQty;
    return actual - item.expectedQty;
  };

  const totalVariance = () => {
    if (!count) return 0;
    return count.items.reduce((sum, item) => sum + Math.abs(getVariance(item)), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !count) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('ic_title')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(''); fetchCount(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Retry
          </button>
          <div className="mt-2">
            <BackButton fallback="/admin/inventory-counts/" />
          </div>
        </div>
      </div>
    );
  }

  if (!count) return null;

  const isEditable = count.status === 'draft' || count.status === 'in_progress';

  return (
    <div className="min-h-screen p-6 sm:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/inventory-counts/" />
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              {count.name}
            </h2>
            <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${statusColors[count.status]}`}>
              {t(statusLabels[count.status])}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('ic_total_items')}</p>
            <p className="text-2xl font-bold">{count.items.length}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('ic_total_variance')}</p>
            <p className="text-2xl font-bold">{totalVariance()}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('ic_status_' + count.status) || count.status}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>{count.createdBy.username}</span>
              <Calendar className="w-3.5 h-3.5 ml-2" />
              <span>{formatDate(count.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Barcode</th>
                  <th className="text-left px-5 py-3 font-medium">{t('ic_title')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('ic_expected')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('ic_actual')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('ic_variance')}</th>
                  <th className="text-left px-5 py-3 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {count.items.map((item) => {
                  const variance = getVariance(item);
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {item.product.barcode || '—'}
                      </td>
                      <td className="px-5 py-4 font-medium">{item.product.name}</td>
                      <td className="px-5 py-4 text-right">{item.expectedQty}</td>
                      <td className="px-5 py-4 text-right">
                        {isEditable ? (
                          <input
                            type="number"
                            min="0"
                            value={edits[item.id] ?? item.actualQty}
                            onChange={(e) => setEdits({ ...edits, [item.id]: parseInt(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 rounded-lg bg-input border border-border text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          item.actualQty
                        )}
                      </td>
                      <td className={`px-5 py-4 text-right font-medium ${variance !== 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {variance > 0 ? '+' : ''}{variance}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{item.unit}</td>
                    </tr>
                  );
                })}
                {count.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      No items in this count
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditable && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('ic_save')}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={completing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 disabled:opacity-50 transition-colors"
            >
              {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('ic_complete')}
            </button>
          </div>
        )}

        {/* Completed Info */}
        {count.status === 'completed' && count.completedBy && (
          <div className="glass rounded-2xl p-4 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Completed by {count.completedBy.username} on {count.completedAt ? formatDate(count.completedAt) : ''}
          </div>
        )}
      </motion.div>

      {/* Confirm Complete Modal */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-md border border-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-bold">{t('ic_complete')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t('ic_complete_confirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-600/90 disabled:opacity-50"
              >
                {completing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('ic_complete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
