'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Search, Plus, ChevronLeft, ChevronRight, Package,
  AlertCircle, X, Trash2, PlusCircle, Upload,
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  discount: string;
  total: string;
  createdAt: string;
  supplier: { id: string; name: string };
  createdBy: { id: string; username: string };
  _count: { items: number; receipts: number };
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
}

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-yellow-500/10 text-yellow-400',
  ordered: 'bg-blue-500/10 text-blue-400',
  partially_received: 'bg-purple-500/10 text-purple-400',
  received: 'bg-green-500/10 text-green-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    supplierId: '',
    notes: '',
    items: [] as LineItem[],
  });
  const [formError, setFormError] = useState('');

  const fetchOrders = useCallback(async (p: number, q?: string, status?: string, signal?: AbortSignal) => {
    setError('');
    try {
      const url = new URL('/api/v1/purchase-orders/', window.location.origin);
      url.searchParams.set('page', String(p));
      url.searchParams.set('limit', '10');
      if (q) url.searchParams.set('search', q);
      if (status) url.searchParams.set('status', status);
      const res = await fetchWithRetry(url.toString(), { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.orders)) {
        setOrders(data.data.orders);
        setMeta(data.data.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1 });
      } else {
        setError(data?.error || t('po_no_orders'));
        addToast('error', data?.error || t('po_no_orders'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : t('po_no_orders');
      setError(msg);
      addToast('error', msg);
    }
  }, [t, addToast]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/v1/suppliers/?limit=100&isActive=true', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.suppliers)) {
        setSuppliers(data.data.suppliers);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/v1/products/?limit=200', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.products)) {
        setProducts(data.data.products);
      }
    } catch { /* ignore */ }
  }, []);

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
    fetchOrders(page, search, statusFilter, controller.signal);
    return () => controller.abort();
  }, [page, loading, search, statusFilter, fetchOrders]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const openModal = async () => {
    setFormError('');
    setForm({ supplierId: '', notes: '', items: [] });
    setSubmitting(false);
    setShowModal(true);
    fetchSuppliers();
    fetchProducts();
  };

  const addLineItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const removeLineItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setForm((f) => {
      const items = [...f.items];
      const item = { ...items[idx] };
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        item.productId = value as string;
        item.productName = prod?.name || '';
      } else if (field === 'quantity') {
        item.quantity = Number(value);
      } else if (field === 'unitPrice') {
        item.unitPrice = Number(value);
      }
      item.total = item.quantity * item.unitPrice;
      items[idx] = item;
      return { ...f, items };
    });
  };

  const calcTotals = () => {
    const subtotal = form.items.reduce((sum, i) => sum + i.total, 0);
    return { subtotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.supplierId) {
      setFormError(t('po_select_supplier'));
      return;
    }
    if (form.items.length === 0) {
      setFormError(t('po_at_least_one_item'));
      return;
    }
    for (const item of form.items) {
      if (!item.productId) {
        setFormError(t('po_select_product'));
        return;
      }
    }

    setSubmitting(true);
    const { subtotal } = calcTotals();
    const total = subtotal;

    try {
      const res = await fetch('/api/v1/purchase-orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supplierId: form.supplierId,
          notes: form.notes.trim() || undefined,
          subtotal,
          taxTotal: 0,
          discount: 0,
          total,
          items: form.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('po_created_success'));
        setShowModal(false);
        fetchOrders(page, search, statusFilter);
      } else {
        setFormError(data.error || data.errors?.[0]?.message || t('po_at_least_one_item'));
      }
    } catch {
      setFormError(t('po_at_least_one_item'));
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

  if (error && !orders.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('po_no_orders')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchOrders(page, search, statusFilter); }}
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
            <h2 className="text-2xl font-bold">{t('po_title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('po_search')}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
            <Link
              href="/admin/purchase-orders/import/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-muted-foreground text-sm font-medium hover:bg-white/10 hover:text-foreground transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t('po_import')}
            </Link>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('po_new')}
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {['', 'draft', 'ordered', 'partially_received', 'received', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              {s ? t(`po_status_${s}`) : t('admin_all') || 'All'}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('po_number')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('po_supplier')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('po_status')}</th>
                  <th scope="col" className="text-right px-5 py-3 font-medium">{t('po_total')}</th>
                  <th scope="col" className="text-center px-5 py-3 font-medium">{t('po_items')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('po_created')}</th>
                  <th scope="col" className="text-right px-5 py-3 font-medium">{t('crm_customer_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-mono text-xs font-medium">{o.number}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{o.supplier.name}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full ${statusStyles[o.status] || 'bg-gray-500/10 text-gray-400'}`}>
                        {t(`po_status_${o.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">
                      {Number(o.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-center text-muted-foreground">{o._count.items}</td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/purchase-orders/${o.id}/`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t('sup_view_details')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      {t('po_no_orders')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
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
        </div>
      </motion.div>

      {/* Create Order Modal */}
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
              className="glass rounded-2xl p-6 w-full max-w-3xl border border-border max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{t('po_add_modal')}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('po_supplier')}</label>
                  <select
                    required
                    value={form.supplierId}
                    onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="">{t('po_select_supplier')}</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('po_notes')}</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                  />
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('po_items')}</label>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <PlusCircle className="w-3 h-3" />
                      {t('po_add_item')}
                    </button>
                  </div>

                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-end gap-2 mb-2 p-2 rounded-xl bg-white/5">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">{t('po_select_product')}</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                        >
                          <option value="">--</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="text-[10px] text-muted-foreground">{t('po_qty')}</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[10px] text-muted-foreground">{t('po_unit_price')}</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                        />
                      </div>
                      <div className="w-20 text-right">
                        <label className="text-[10px] text-muted-foreground">{t('po_line_total')}</label>
                        <div className="text-xs font-medium py-2">{item.total.toFixed(2)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                {form.items.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('po_subtotal')}</span>
                      <span className="font-medium">{calcTotals().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                      <span>{t('po_grand_total')}</span>
                      <span>{calcTotals().subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

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
                    t('po_new')
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
