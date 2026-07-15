'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Product } from '@/types/pos';

interface POSQuickCreateModalProps {
  barcode: string | null;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
  t: (key: string) => string;
  addToast: (type: 'success' | 'error', message: string) => void;
}

export default function POSQuickCreateModal({
  barcode,
  onClose,
  onProductCreated,
  t,
  addToast,
}: POSQuickCreateModalProps) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const price = parseFloat(fd.get('price') as string);
    if (!name || isNaN(price)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          nameAr: (fd.get('nameAr') as string) || null,
          barcode: (fd.get('barcode') as string) || barcode,
          category: (fd.get('category') as string) || 'Spare Parts',
          price,
          stock: parseInt(fd.get('stock') as string) || 1,
        }),
      });
      const d = await res.json();
      if (d.success) {
        addToast('success', t('pos_quick_created'));
        onClose();
        const newProduct = d.data.product;
        onProductCreated({
          id: newProduct.id,
          name: newProduct.name,
          nameAr: newProduct.nameAr || null,
          barcode: newProduct.barcode,
          price: Number(newProduct.price),
          stock: newProduct.stock,
          category: newProduct.category || 'Spare Parts',
          image: newProduct.image || null,
          available: true,
        });
      } else {
        addToast('error', d.error || t('pos_failed'));
      }
    } catch {
      addToast('error', t('pos_failed_create_product'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!barcode} onClose={onClose} title={t('pos_quick_create_title')}>
      <p className="text-sm text-muted-foreground mb-4">
        {t('pos_barcode_not_found')} <span className="font-mono text-foreground">{barcode}</span>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_name')} *</label>
            <input name="name" required className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('pos_quick_create_name')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_name_ar')}</label>
            <input name="nameAr" className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('pos_quick_create_name_ar')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_barcode')}</label>
            <input name="barcode" defaultValue={barcode ?? ''} className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('pos_quick_create_barcode')} dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_price')} *</label>
            <input name="price" type="number" step="0.01" min="0" required className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_category')}</label>
            <input name="category" className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('admin_market_category')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_stock')}</label>
            <input name="stock" type="number" min="0" className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="1" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
              {t('pos_quick_create_skip')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? t('pos_quick_create_saving') : t('pos_quick_create_save')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
