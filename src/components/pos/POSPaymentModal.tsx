'use client';

import { Check, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { CartItem } from '@/types/pos';

interface POSPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
  cart: CartItem[];
  subtotal: number;
  discountNum: number;
  taxTotal: number;
  taxRate: number;
  total: number;
  t: (key: string) => string;
}

export default function POSPaymentModal({
  open,
  onClose,
  onConfirm,
  saving,
  cart,
  subtotal,
  discountNum,
  taxTotal,
  taxRate,
  total,
  t,
}: POSPaymentModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose} title={t('pos_confirm_sale')}>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span>{t('pos_cart')}</span>
          <span>{cart.length} {t('pos_items')}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('pos_subtotal')}</span>
          <span>{subtotal.toFixed(2)} EGP</span>
        </div>
        <div className="flex justify-between">
          <span>{t('pos_discount')}</span>
          <span>{discountNum.toFixed(2)} EGP</span>
        </div>
        <div className="flex justify-between">
          <span>{t('pos_tax')} ({taxRate}%)</span>
          <span>{taxTotal.toFixed(2)} EGP</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
          <span>{t('pos_total')}</span>
          <span>{total.toFixed(2)} EGP</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          {t('pos_cancel_sale')}
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t('pos_confirm')}
        </button>
      </div>
    </Modal>
  );
}
