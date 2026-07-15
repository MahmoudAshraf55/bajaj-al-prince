'use client';

import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { WarehouseProduct } from '@/types/warehouse';

interface WHAdjustModalProps {
  showAdjustModal: boolean;
  adjustProduct: WarehouseProduct | null;
  adjustType: 'in' | 'out';
  adjustQty: number;
  adjustNotes: string;
  adjusting: boolean;
  setAdjustType: (t: 'in' | 'out') => void;
  setAdjustQty: (n: number) => void;
  setAdjustNotes: (s: string) => void;
  setShowAdjustModal: (b: boolean) => void;
  handleAdjust: () => void;
  t: (k: string) => string;
  language: string;
}

export default function WHAdjustModal({
  showAdjustModal, adjustProduct, adjustType, adjustQty, adjustNotes, adjusting,
  setAdjustType, setAdjustQty, setAdjustNotes, setShowAdjustModal, handleAdjust,
  t, language,
}: WHAdjustModalProps) {
  return (
    <Modal isOpen={showAdjustModal && !!adjustProduct} onClose={() => setShowAdjustModal(false)} title={t('wh_adjustment')} contentClassName="max-w-sm">
      <p className="text-sm font-medium mb-1">{language === 'ar' && adjustProduct?.nameAr ? adjustProduct.nameAr : adjustProduct?.name}</p>
      <p className="text-xs text-muted-foreground mb-4">{t('wh_current_stock')}: {adjustProduct?.stock}</p>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setAdjustType('in')} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium ${adjustType === 'in' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-muted-foreground'}`}>
          {t('wh_add_stock')}
        </button>
        <button onClick={() => setAdjustType('out')} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium ${adjustType === 'out' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-muted-foreground'}`}>
          {t('wh_remove_stock')}
        </button>
      </div>
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1">{t('wh_quantity')}</label>
        <input
          type="number"
          min="1"
          value={adjustQty}
          onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1">{t('wh_notes')}</label>
        <input
          type="text"
          value={adjustNotes}
          onChange={(e) => setAdjustNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t('wh_notes')}
        />
      </div>
      <button
        onClick={handleAdjust}
        disabled={adjusting || adjustQty < 1}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t('wh_submit')}
      </button>
    </Modal>
  );
}
