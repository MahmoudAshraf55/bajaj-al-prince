'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import { Search, Plus, DollarSign, AlertCircle } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import PageSpinner from '@/components/ui/PageSpinner';
import Modal from '@/components/ui/Modal';

interface SupplierPayment {
  id: string;
  amount: string;
  paymentMethod: string;
  notes: string | null;
  date: string;
  createdAt: string;
  purchaseOrder: { id: string; number: string; total: string };
  createdBy: { id: string; username: string };
}

interface PurchaseOrder {
  id: string;
  number: string;
  total: string;
  paid: string;
  paymentStatus: string;
  supplier: { name: string };
}

const paymentMethodStyles: Record<string, string> = {
  cash: 'bg-green-500/10 text-green-400',
  card: 'bg-blue-500/10 text-blue-400',
  transfer: 'bg-purple-500/10 text-purple-400',
};

export default function SupplierPaymentsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [poFilter, setPoFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [form, setForm] = useState({
    purchaseOrderId: '',
    amount: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const fetchPayments = useCallback(async (p: number, q?: string, poId?: string, signal?: AbortSignal) => {
    setError('');
    setLoading(true);
    try {
      const url = new URL('/api/v1/supplier-payments/', window.location.origin);
      url.searchParams.set('page', String(p));
      url.searchParams.set('limit', '10');
      if (q) url.searchParams.set('search', q);
      if (poId) url.searchParams.set('purchaseOrderId', poId);
      const res = await fetchWithRetry(url.toString(), { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.payments)) {
        setPayments(data.data.payments);
        setMeta(data.data.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1 });
      } else {
        setError(data?.error || t('sp_no_payments'));
        addToast('error', data?.error || t('sp_no_payments'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('sp_no_payments'));
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPayments(page, search, poFilter, controller.signal);
    return () => controller.abort();
  }, [page, search, poFilter, fetchPayments]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const openModal = useCallback(async () => {
    setFormError('');
    setForm({ purchaseOrderId: '', amount: '', paymentMethod: 'cash', notes: '' });
    setShowModal(true);
    try {
      const res = await fetchWithRetry('/api/v1/purchase-orders/?status=received&limit=100', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.orders)) {
        const withRemaining = data.data.orders.filter((po: PurchaseOrder) => Number(po.total) - Number(po.paid || 0) > 0.01);
        setPos(withRemaining);
      }
    } catch {
      setPos([]);
    }
  }, []);

  const selectedPo = pos.find((p) => p.id === form.purchaseOrderId);
  const remainingAmount = selectedPo ? Number(selectedPo.total) - Number(selectedPo.paid || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.purchaseOrderId) { setFormError(t('sp_po_required')); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError(t('sp_amount_required')); return; }
    if (amount > remainingAmount + 0.01) { setFormError(t('sp_amount_exceeds')); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/supplier-payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purchaseOrderId: form.purchaseOrderId,
          amount,
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('sp_created_success'));
        setShowModal(false);
        fetchPayments(page, search, poFilter);
      } else {
        setFormError(data.error || t('sp_error'));
      }
    } catch {
      setFormError(t('sp_error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !payments.length) {
    return <PageSpinner />;
  }

  if (error && !payments.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('sp_no_payments')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchPayments(page, search, poFilter); }}
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/dashboard/" />
            <h2 className="text-2xl font-bold">{t('sp_title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('po_search') || 'Search...'}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('sp_new')}
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('sp_po')}</th>
                  <th scope="col" className="text-right px-5 py-3 font-medium">{t('sp_amount')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('sp_payment_method')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('sp_date')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('sp_paid_by')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('sp_notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-medium">{p.purchaseOrder.number}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">
                      {Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full ${paymentMethodStyles[p.paymentMethod] || 'bg-gray-500/10 text-gray-400'}`}>
                        {t(`sp_${p.paymentMethod}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{p.createdBy.username}</td>
                    <td className="px-5 py-4 text-muted-foreground text-xs max-w-[200px] truncate">
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      {t('sp_no_payments')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={meta}
            onPageChange={setPage}
            showingLabel={t('sup_pagination_showing')}
            ofLabel={t('sup_pagination_of')}
          />
        </div>
      </motion.div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('sp_new')} contentClassName="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sp_po')}</label>
            <select
              required
              value={form.purchaseOrderId}
              onChange={(e) => setForm((f) => ({ ...f, purchaseOrderId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="">{t('po_select_supplier') || 'Select PO...'}</option>
              {pos.map((po) => {
                const remaining = Number(po.total) - Number(po.paid || 0);
                return (
                  <option key={po.id} value={po.id}>
                    {po.number} — {po.supplier.name} ({(remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                  </option>
                );
              })}
            </select>
            {selectedPo && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('sp_total_paid')}: {Number(selectedPo.paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} | {t('sp_remaining')}: {remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sp_amount')}</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingAmount || 999999999}
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sp_payment_method')}</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="cash">{t('sp_cash')}</option>
              <option value="card">{t('sp_card')}</option>
              <option value="transfer">{t('sp_transfer')}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sp_notes')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
            />
          </div>

          {formError && (
            <p className="text-red-400 text-xs">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-white/5 text-muted-foreground text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {t('pos_cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              {submitting ? t('po_creating') || 'Processing...' : t('sp_new')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
