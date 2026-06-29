'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import {
  FileText, Search, X, Printer, ArrowLeft, Download,
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  type: 'sale' | 'purchase' | 'return';
  status: 'draft' | 'confirmed' | 'cancelled';
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string | null;
  customerName: string | null;
  notes: string | null;
  items: InvoiceItem[];
  createdBy: { id: string; username: string };
  createdAt: string;
}

export default function InvoiceHistory() {
  const { t, isRTL } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [taxRate, setTaxRate] = useState(14);

  useEffect(() => {
    fetch('/api/v1/settings/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.settings?.tax_rate != null) {
          const rate = parseFloat(d.data.settings.tax_rate);
          if (!isNaN(rate) && rate >= 0 && rate <= 100) setTaxRate(rate);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push('/admin/');
        else setLoading(false);
      })
      .catch(() => router.push('/admin/'));
  }, [router]);

  const loadInvoices = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/v1/invoices/?${params}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) {
      setInvoices(d.data.invoices);
      setTotalPages(d.data.meta.totalPages);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    if (loading) return;
    loadInvoices();
  }, [loading, loadInvoices]);

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!confirm(`${t('pos_confirm_return')} ${invoice.number}?`)) return;
    const res = await fetch(`/api/v1/invoices/${invoice.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const d = await res.json();
    if (d.success) {
      addToast('success', t('pos_cancel_invoice') + ' ' + invoice.number);
      await loadInvoices();
    } else {
      addToast('error', d.error || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    confirmed: 'text-green-400 bg-green-500/10',
    draft: 'text-amber-400 bg-amber-500/10',
    cancelled: 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/pos/')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{t('pos_history_title')}</h1>
              <p className="text-muted-foreground text-sm">{invoices.length} invoices</p>
            </div>
          </div>
          <button
            onClick={() => window.open('/api/v1/invoices/export/', '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('export_excel') || 'Export Excel'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('pos_search_invoices')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('pos_invoice_type')}</option>
            <option value="sale">Sale</option>
            <option value="purchase">Purchase</option>
            <option value="return">Return</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('pos_invoice_status')}</option>
            <option value="confirmed">Confirmed</option>
            <option value="draft">Draft</option>
            <option value="cancelled">{t('pos_cancelled')}</option>
          </select>
        </div>

        <div className="space-y-2">
          {invoices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('pos_history_no_invoices')}</p>
            </div>
          )}
          {invoices.map((inv) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4 flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{inv.number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status] || ''}`}>
                    {inv.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                    {inv.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                  {inv.customerName && <span>{inv.customerName}</span>}
                  <span>{inv.createdBy.username}</span>
                  {inv.paymentMethod && <span>{inv.paymentMethod}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold">{Number(inv.total).toFixed(2)} EGP</p>
                <p className="text-xs text-muted-foreground">{inv.items.length} items</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setDetailInvoice(inv)} className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors" title={t('pos_view_detail')}>
                  <FileText className="w-4 h-4" />
                </button>
                {inv.status === 'confirmed' && (
                  <button onClick={() => handleCancelInvoice(inv)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title={t('pos_cancel_invoice')}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {detailInvoice && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetailInvoice(null)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true" className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{detailInvoice.number}</h3>
              <button onClick={() => setDetailInvoice(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-xs text-muted-foreground mb-4 space-y-1">
              <p>{t('pos_date')}: {new Date(detailInvoice.createdAt).toLocaleString()}</p>
              <p>{t('pos_invoice_type')}: {detailInvoice.type}</p>
              <p>{t('pos_invoice_status')}: {detailInvoice.status}</p>
              <p>{t('pos_customer')}: {detailInvoice.customerName || '-'}</p>
              <p>{t('pos_payment_method')}: {detailInvoice.paymentMethod || '-'}</p>
              {detailInvoice.notes && <p>{t('pos_notes')}: {detailInvoice.notes}</p>}
              <p>{t('admin_cashier')}: {detailInvoice.createdBy.username}</p>
            </div>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left pb-2 font-medium">{t('admin_market_name')}</th>
                  <th scope="col" className="text-center pb-2 font-medium">{t('pos_quantity')}</th>
                  <th scope="col" className="text-right pb-2 font-medium">{t('admin_market_price')}</th>
                  <th scope="col" className="text-right pb-2 font-medium">{t('pos_total')}</th>
                </tr>
              </thead>
              <tbody>
                {detailInvoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2">{item.productName}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">{Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm border-t border-border pt-3">
              <div className="flex justify-between"><span>{t('pos_subtotal')}</span><span>{Number(detailInvoice.subtotal).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span>{t('pos_tax')} ({taxRate}%)</span><span>{Number(detailInvoice.taxTotal).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span>{t('pos_discount')}</span><span>{Number(detailInvoice.discount).toFixed(2)} EGP</span></div>
              <div className="flex justify-between font-bold text-lg"><span>{t('pos_total')}</span><span>{Number(detailInvoice.total).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span>{t('pos_paid')}</span><span>{Number(detailInvoice.paid).toFixed(2)} EGP</span></div>
              {Number(detailInvoice.change) > 0 && (
                <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(detailInvoice.change).toFixed(2)} EGP</span></div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> {t('pos_print')}
              </button>
              <button onClick={() => setDetailInvoice(null)} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                {t('pos_confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
