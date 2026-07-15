'use client';

import { motion } from 'framer-motion';
import { Receipt, Calendar, ArrowRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Invoice } from '@/types';

interface CustomerInvoicesListProps {
  invoices: Invoice[];
  t: (key: string) => string;
  language: string;
  invoiceDetail: Record<string, unknown> | null;
  setInvoiceDetail: (inv: Record<string, unknown> | null) => void;
}

export default function CustomerInvoicesList({
  invoices, t, language, invoiceDetail, setInvoiceDetail,
}: CustomerInvoicesListProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{t('crm_purchase_history')}</h3>
        {invoices.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {t('crm_total_spent')} <span className="text-primary font-bold">
              {invoices.reduce((sum, inv) => sum + Number(inv.total), 0).toLocaleString()} EGP
            </span>
          </div>
        )}
      </div>
      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((inv, idx) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{inv.number}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{Number(inv.total).toLocaleString()} EGP</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    inv.status === 'confirmed' && Number(inv.paid) >= Number(inv.total) ? 'bg-green-500/10 text-green-400' :
                    inv.status === 'confirmed' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInvoiceDetail(inv as unknown as Record<string, unknown>)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t('crm_view_details')}
                <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t('crm_no_invoices')}</p>
        </div>
      )}

      {invoiceDetail && (
        <Modal isOpen={!!invoiceDetail} onClose={() => setInvoiceDetail(null)} title={t('crm_invoice_detail') || 'Invoice Detail'} contentClassName="max-w-sm">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_invoice_number')}</span><span className="font-mono">{invoiceDetail.number as string}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('crm_invoice_type') || 'Type'}</span><span>{(invoiceDetail.type as string) || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('crm_status') || 'Status'}</span><span>{(invoiceDetail.status as string) || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_subtotal')}</span><span>{Number(invoiceDetail.subtotal || 0).toFixed(2)} EGP</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_tax')}</span><span>{Number(invoiceDetail.taxTotal || 0).toFixed(2)} EGP</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_discount')}</span><span>{Number(invoiceDetail.discount || 0).toFixed(2)} EGP</span></div>
            <hr className="border-border" />
            <div className="flex justify-between font-bold"><span>{t('pos_total')}</span><span>{Number(invoiceDetail.total || 0).toFixed(2)} EGP</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_paid')}</span><span>{Number(invoiceDetail.paid || 0).toFixed(2)} EGP</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_payment_method') || 'Method'}</span><span>{(invoiceDetail.paymentMethod as string) || '—'}</span></div>
            {typeof invoiceDetail.notes === 'string' && invoiceDetail.notes && <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_notes')}</span><span className="text-xs max-w-[200px] truncate">{invoiceDetail.notes}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">{t('crm_date') || 'Date'}</span><span>{invoiceDetail.createdAt ? new Date(invoiceDetail.createdAt as string).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '—'}</span></div>
          </div>
        </Modal>
      )}
    </>
  );
}
