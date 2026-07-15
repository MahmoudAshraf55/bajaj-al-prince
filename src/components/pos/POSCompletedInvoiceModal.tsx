'use client';

import { Check, Printer } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Invoice } from '@/types/pos';
import { printReceipt } from '@/components/pos/POSReceipt';
import type { Dispatch, SetStateAction } from 'react';

interface POSCompletedInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
  setReceiptHTML: Dispatch<SetStateAction<string>>;
  taxRate: number;
  t: (key: string) => string;
  language: string;
}

export default function POSCompletedInvoiceModal({
  invoice,
  onClose,
  setReceiptHTML,
  taxRate,
  t,
  language,
}: POSCompletedInvoiceModalProps) {
  return (
    <Modal isOpen={true} onClose={onClose} contentClassName="max-w-lg max-h-[90vh] overflow-auto">
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-green-500" />
        </div>
        <h2 className="text-lg font-bold">{t('pos_sale_completed')}</h2>
      </div>

      <div className="bg-black/20 rounded-xl p-4 mb-4 text-sm font-mono">
        <div className="text-center mb-3 border-b border-dashed border-white/10 pb-3">
          <p className="font-bold text-base">{t('pos_title')}</p>
          <p className="text-xs text-muted-foreground">{t('pos_invoice_number')}: {invoice.number}</p>
        </div>
        <div className="space-y-1 mb-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pos_date')}:</span>
            <span>{new Date(invoice.createdAt).toLocaleString()}</span>
          </div>
          {invoice.customerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('pos_customer')}:</span>
              <span>{invoice.customerName}{invoice.customerPhone ? ` (${invoice.customerPhone})` : ''}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pos_payment_method')}:</span>
            <span>{invoice.paymentMethod ? t(`pos_${invoice.paymentMethod}`) : '-'}</span>
          </div>
        </div>
        <table className="w-full text-xs mb-3">
          <thead>
            <tr className="border-b border-white/10">
              <th scope="col" className="text-left py-1 font-medium text-muted-foreground">{t('admin_market_name')}</th>
              <th scope="col" className="text-center py-1 font-medium text-muted-foreground">{t('pos_quantity')}</th>
              <th scope="col" className="text-right py-1 font-medium text-muted-foreground">{t('admin_market_price')}</th>
              <th scope="col" className="text-right py-1 font-medium text-muted-foreground">{t('pos_total')}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-white/5">
                <td className="py-1">{item.productName}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                <td className="py-1 text-right">{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-0.5 text-xs border-t border-dashed border-white/10 pt-2">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_subtotal')}</span><span>{Number(invoice.subtotal).toFixed(2)} EGP</span></div>
          {Number(invoice.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_discount')}</span><span>-{Number(invoice.discount).toFixed(2)} EGP</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_tax')} ({taxRate}%)</span><span>{Number(invoice.taxTotal).toFixed(2)} EGP</span></div>
          <div className="flex justify-between font-bold text-sm pt-1"><span>{t('pos_total')}</span><span>{Number(invoice.total).toFixed(2)} EGP</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_paid')}</span><span>{Number(invoice.paid).toFixed(2)} EGP</span></div>
          {Number(invoice.change) > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(invoice.change).toFixed(2)} EGP</span></div>}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => printReceipt(invoice, setReceiptHTML, t, language, taxRate)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
          <Printer className="w-4 h-4" />
          {t('pos_print')}
        </button>
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
          {t('pos_confirm')}
        </button>
      </div>
    </Modal>
  );
}
