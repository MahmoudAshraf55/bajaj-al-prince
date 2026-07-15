'use client';

import Modal from '@/components/ui/Modal';
import { Invoice } from '@/types/pos';

interface POSInvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onReturn: (inv: Invoice) => void;
  taxRate: number;
  t: (key: string) => string;
}

export default function POSInvoiceDetailModal({
  invoice,
  onClose,
  onReturn,
  taxRate,
  t,
}: POSInvoiceDetailModalProps) {
  if (!invoice) return null;

  return (
    <Modal isOpen onClose={onClose} title={invoice.number} contentClassName="max-w-lg max-h-[80vh] overflow-auto">
      <div className="text-xs text-muted-foreground mb-4 space-y-1">
        <p>{t('pos_date')}: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '-'}</p>
        <p>{t('pos_invoice_type')}: {invoice.type ?? '-'}</p>
        <p>{t('pos_invoice_status')}: {invoice.status ?? '-'}</p>
        <p>{t('pos_customer')}: {invoice.customerName || '-'}</p>
        <p>{t('pos_payment_method')}: {invoice.paymentMethod || '-'}</p>
        {invoice.notes && <p>{t('pos_notes')}: {invoice.notes}</p>}
        <p>{t('admin_cashier')}: {invoice.createdBy?.username ?? '-'}</p>
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
          {invoice.items?.map((item) => (
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
        <div className="flex justify-between"><span>{t('pos_subtotal')}</span><span>{Number(invoice.subtotal ?? 0).toFixed(2)} EGP</span></div>
        <div className="flex justify-between"><span>{t('pos_tax')} ({taxRate}%)</span><span>{Number(invoice.taxTotal ?? 0).toFixed(2)} EGP</span></div>
        <div className="flex justify-between"><span>{t('pos_discount')}</span><span>{Number(invoice.discount ?? 0).toFixed(2)} EGP</span></div>
        <div className="flex justify-between font-bold text-lg"><span>{t('pos_total')}</span><span>{Number(invoice.total ?? 0).toFixed(2)} EGP</span></div>
        <div className="flex justify-between"><span>{t('pos_paid')}</span><span>{Number(invoice.paid ?? 0).toFixed(2)} EGP</span></div>
        {Number(invoice.change ?? 0) > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(invoice.change).toFixed(2)} EGP</span></div>}
      </div>
      {invoice.type === 'sale' && invoice.status === 'confirmed' && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onReturn(invoice)}
            className="flex-1 py-2 rounded-xl bg-orange-500/80 text-white text-sm font-medium hover:bg-orange-500 transition-colors"
          >
            {t('pos_return_items')}
          </button>
        </div>
      )}
    </Modal>
  );
}
