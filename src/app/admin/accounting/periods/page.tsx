'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import {
  Plus, X, Calendar, CheckCircle2, Lock, Unlock, Loader2, ClipboardList,
} from 'lucide-react';

interface AccountingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  closedById?: string | null;
  closedBy?: { username: string } | null;
  closedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-green-500/10 text-green-400 border-green-500/20',
  closed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  locked: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  open: Unlock,
  closed: CheckCircle2,
  locked: Lock,
};

export default function AccountingPeriodsPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const statusLabels: Record<string, string> = {
    open: t('acc_period_status_open'),
    closed: t('acc_period_status_closed'),
    locked: t('acc_period_status_locked'),
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/v1/accounting/periods/', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setPeriods(json.data.periods ?? json.data ?? []);
    } catch {
      addToast('error', 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/accounting/periods/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', json.message || 'Period created');
        setPeriods((prev) => [json.data.period ?? json.data, ...prev]);
        setShowModal(false);
        setForm({ name: '', startDate: '', endDate: '' });
      } else {
        addToast('error', json.error || 'Failed to create period');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'close' | 'reopen' | 'lock') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/v1/accounting/periods/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', json.message || `Period ${action}ed`);
        setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, status: json.data.period?.status ?? json.data?.status ?? p.status } : p)));
      } else {
        addToast('error', json.error || `Failed to ${action} period`);
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

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
              {t('acc_periods_title')}
            </h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('acc_new_period')}
          </button>
        </div>

        {periods.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t('acc_no_periods')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {periods.map((period, idx) => {
              const StatusIcon = statusIcons[period.status];
              return (
                <motion.div
                  key={period.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-lg">{period.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${statusColors[period.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabels[period.status]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(period.startDate)} — {formatDate(period.endDate)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {period.status === 'open' && (
                        <button
                          onClick={() => handleAction(period.id, 'close')}
                          disabled={updating === period.id}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                        >
                          {updating === period.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('acc_close_period')}
                        </button>
                      )}
                      {period.status === 'closed' && (
                        <>
                          <button
                            onClick={() => handleAction(period.id, 'reopen')}
                            disabled={updating === period.id}
                            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                          >
                            {updating === period.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('acc_reopen_period')}
                          </button>
                          <button
                            onClick={() => handleAction(period.id, 'lock')}
                            disabled={updating === period.id}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                          >
                            {updating === period.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('acc_lock_period')}
                          </button>
                        </>
                      )}
                      {period.closedBy && (
                        <span className="text-xs text-muted-foreground self-center">
                          {period.closedBy.username}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
              className="glass rounded-2xl p-6 w-full max-w-md border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{t('acc_new_period')}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acc_period_name')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('acc_period_name_placeholder')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acc_start_date')}</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acc_end_date')}</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                    t('acc_new_period')
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
