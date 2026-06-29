'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Package, Truck, FileText, AlertCircle, Clock,
  CheckCircle2, XCircle, Send, Ban, Plus, X,
} from 'lucide-react';


interface PurchaseOrderDetail {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  discount: string;
  total: string;
  notes?: string | null;
  createdAt: string;
  supplier: { id: string; name: string; phone?: string; email?: string };
  createdBy: { id: string; username: string };
  items: Array<{
    id: string;
    quantity: number;
    receivedQty: number;
    unitPrice: string;
    total: string;
    product: { id: string; name: string; sku?: string };
  }>;
  receipts: Array<{
    id: string;
    receiptNumber: string;
    notes?: string | null;
    createdAt: string;
    receivedBy: { id: string; username: string };
    items: Array<{
      quantity: number;
      product: { id: string; name: string };
    }>;
  }>;
}

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; next?: string[] }> = {
  draft: { color: 'bg-yellow-500/10 text-yellow-400', icon: Clock, next: ['ordered', 'cancelled'] },
  ordered: { color: 'bg-blue-500/10 text-blue-400', icon: Send, next: ['partially_received', 'received', 'cancelled'] },
  partially_received: { color: 'bg-purple-500/10 text-purple-400', icon: Truck, next: ['received'] },
  received: { color: 'bg-green-500/10 text-green-400', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-500/10 text-red-400', icon: XCircle },
};

export default function PurchaseOrderDetailPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [transitioning, setTransitioning] = useState('');

  // Receive modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  const openReceiveModal = () => {
    if (!order) return;
    const qty: Record<string, number> = {};
    order.items.forEach((item) => {
      qty[item.id] = Math.max(0, item.quantity - item.receivedQty);
    });
    setReceiveQuantities(qty);
    setReceiveNotes('');
    setReceiveError('');
    setShowReceiveModal(true);
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiveError('');

    const items = Object.entries(receiveQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (items.length === 0) {
      setReceiveError('At least one item with quantity > 0 is required');
      return;
    }

    setReceiving(true);
    try {
      const res = await fetch(`/api/v1/purchase-orders/${orderId}/receive/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items, notes: receiveNotes.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Receipt created successfully');
        setShowReceiveModal(false);
        fetchOrder();
      } else {
        setReceiveError(data.error || 'Failed to create receipt');
      }
    } catch {
      setReceiveError('Network error');
    } finally {
      setReceiving(false);
    }
  };

  const fetchOrder = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const res = await fetchWithRetry(`/api/v1/purchase-orders/${orderId}/`, { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && data?.data?.order) {
        setOrder(data.data.order);
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
  }, [orderId, t, addToast]);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else {
          setLoading(false);
          const controller = new AbortController();
          fetchOrder(controller.signal);
          return () => controller.abort();
        }
      })
      .catch(() => {
        router.push('/admin/');
      });
  }, [router, orderId, fetchOrder]);

  const transitionStatus = async (newStatus: string) => {
    setTransitioning(newStatus);
    try {
      const res = await fetch(`/api/v1/purchase-orders/${orderId}/status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('po_updated_success'));
        fetchOrder();
      } else {
        addToast('error', data.error || t('po_updated_success'));
      }
    } catch {
      addToast('error', t('po_updated_success'));
    } finally {
      setTransitioning('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('po_no_orders')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchOrder(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('crm_retry')}
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[order.status]?.icon || Package;
  const nextStatuses = statusConfig[order.status]?.next || [];

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/admin/purchase-orders/" />
          <h2 className="text-2xl font-bold">{t('po_title')}</h2>
        </div>

        {/* Header Card */}
        <div className="glass rounded-2xl p-6 border border-border">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-mono">{order.number}</h3>
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full mt-2 ${statusConfig[order.status]?.color || 'bg-gray-500/10 text-gray-400'}`}>
                  <StatusIcon className="w-3 h-3" />
                  {t(`po_status_${order.status}`)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {['ordered', 'partially_received'].includes(order.status) && (
                <button
                  onClick={openReceiveModal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('po_receive')}
                </button>
              )}
              {nextStatuses.map((ns) => (
                <button
                  key={ns}
                  onClick={() => transitionStatus(ns)}
                  disabled={transitioning === ns}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    ns === 'cancelled'
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {transitioning === ns ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : ns === 'ordered' ? (
                    <Send className="w-4 h-4" />
                  ) : ns === 'cancelled' ? (
                    <Ban className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {t(`po_status_${ns}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-xs text-muted-foreground">{t('po_supplier')}</p>
              <p className="font-medium text-sm">{order.supplier.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('po_total')}</p>
              <p className="font-medium text-sm">{Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('po_created_by')}</p>
              <p className="font-medium text-sm">{order.createdBy.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('po_created')}</p>
              <p className="font-medium text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground bg-white/5 rounded-xl p-3">
              <FileText className="w-4 h-4 mt-0.5 shrink-0" />
              {order.notes}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="glass rounded-2xl p-6 border border-border">
          <h3 className="font-bold mb-4">{t('po_items')} ({order.items.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="text-left pb-3 font-medium">{t('po_select_product')}</th>
                  <th scope="col" className="text-center pb-3 font-medium">{t('po_qty')}</th>
                  <th scope="col" className="text-center pb-3 font-medium">{t('sup_pagination_of')} Received</th>
                  <th scope="col" className="text-right pb-3 font-medium">{t('po_unit_price')}</th>
                  <th scope="col" className="text-right pb-3 font-medium">{t('po_line_total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">{item.product.name}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-center">
                      <span className={item.receivedQty >= item.quantity ? 'text-green-400' : 'text-yellow-400'}>
                        {item.receivedQty}
                      </span>
                    </td>
                    <td className="py-3 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="py-3 text-right font-medium">{Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={4} className="pt-3 text-right font-medium">{t('po_grand_total')}</td>
                  <td className="pt-3 text-right font-bold">{Number(order.total).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Receipts */}
        {order.receipts.length > 0 && (
          <div className="glass rounded-2xl p-6 border border-border">
            <h3 className="font-bold mb-4">{t('po_receipts')} ({order.receipts.length})</h3>
            <div className="space-y-3">
              {order.receipts.map((receipt) => (
                <div key={receipt.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-mono text-xs font-medium">{receipt.receiptNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(receipt.createdAt).toLocaleString()} — {receipt.receivedBy.username}
                      </p>
                    </div>
                  </div>
                  {receipt.notes && (
                    <p className="text-xs text-muted-foreground mb-2">{receipt.notes}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {receipt.items.map((ri, i) => (
                      <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded-full">
                        {ri.product.name} x{ri.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Receive Modal */}
      <AnimatePresence>
        {showReceiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReceiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              className="glass rounded-2xl p-6 w-full max-w-lg border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{t('po_receive')}</h3>
                <button onClick={() => setShowReceiveModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleReceive} className="space-y-4">
                <p className="text-xs text-muted-foreground mb-2">
                  {t('po_number')}: {order.number}
                </p>
                {order.items.map((item) => {
                  const maxQty = item.quantity - item.receivedQty;
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Ordered: {item.quantity} | Received: {item.receivedQty} | Remaining: {maxQty}
                        </p>
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min={0}
                          max={maxQty}
                          value={receiveQuantities[item.id] || 0}
                          onChange={(e) => {
                            const val = Math.min(maxQty, Math.max(0, parseInt(e.target.value) || 0));
                            setReceiveQuantities((q) => ({ ...q, [item.id]: val }));
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm text-center"
                        />
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('po_notes')}</label>
                  <textarea
                    rows={2}
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                  />
                </div>

                {receiveError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {receiveError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={receiving}
                  className="w-full py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {receiving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    t('po_receive')
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
