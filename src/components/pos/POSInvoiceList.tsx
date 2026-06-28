'use client';

import { motion } from 'framer-motion';
import { Search, Loader2, FileText, X } from 'lucide-react';
import { Invoice } from '@/types/pos';

interface POSInvoiceListProps {
  invLoading: boolean;
  invoices: Invoice[];
  invSearch: string;
  setInvSearch: (val: string) => void;
  invTypeFilter: string;
  setInvTypeFilter: (val: string) => void;
  invStatusFilter: string;
  setInvStatusFilter: (val: string) => void;
  invPage: number;
  setInvPage: (val: number | ((prev: number) => number)) => void;
  invTotalPages: number;
  handleCancelInvoice: (inv: Invoice) => Promise<void>;
  setDetailInvoice: (inv: Invoice | null) => void;
  statusColors: Record<string, string>;
  t: (key: string) => string;
}

export default function POSInvoiceList({
  invLoading,
  invoices,
  invSearch,
  setInvSearch,
  invTypeFilter,
  setInvTypeFilter,
  invStatusFilter,
  setInvStatusFilter,
  invPage,
  setInvPage,
  invTotalPages,
  handleCancelInvoice,
  setDetailInvoice,
  statusColors,
  t,
}: POSInvoiceListProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('pos_search_invoices')}
            value={invSearch}
            onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={invTypeFilter}
          onChange={(e) => { setInvTypeFilter(e.target.value); setInvPage(1); }}
          className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pos_invoice_type')}</option>
          <option value="sale">{t('pos_type_sale')}</option>
          <option value="return">{t('pos_type_return')}</option>
          <option value="purchase">{t('pos_type_purchase')}</option>
        </select>
        <select
          value={invStatusFilter}
          onChange={(e) => { setInvStatusFilter(e.target.value); setInvPage(1); }}
          className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pos_invoice_status')}</option>
          <option value="confirmed">{t('pos_status_confirmed')}</option>
          <option value="draft">{t('pos_status_draft')}</option>
          <option value="cancelled">{t('pos_status_cancelled')}</option>
        </select>
      </div>

      {invLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('pos_history_no_invoices')}</p>
        </div>
      ) : (
        <div className="space-y-2">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold">{inv.number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status] || ''}`}>
                    {inv.status === 'confirmed' ? t('pos_status_confirmed') : inv.status === 'cancelled' ? t('pos_status_cancelled') : inv.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                    {inv.type === 'sale' ? t('pos_type_sale') : inv.type === 'return' ? t('pos_type_return') : inv.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                  {inv.customerName && <span>{inv.customerName}</span>}
                  <span>{inv.createdBy.username}</span>
                  {inv.paymentMethod && <span>{t(`pos_${inv.paymentMethod}`)}</span>}
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
      )}

      {invTotalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setInvPage((p) => Math.max(1, p - 1))}
            disabled={invPage <= 1}
            className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            {t('pos_previous')}
          </button>
          <span className="text-sm text-muted-foreground">{invPage} / {invTotalPages}</span>
          <button
            onClick={() => setInvPage((p) => Math.min(invTotalPages, p + 1))}
            disabled={invPage >= invTotalPages}
            className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            {t('pos_next')}
          </button>
        </div>
      )}
    </div>
  );
}
