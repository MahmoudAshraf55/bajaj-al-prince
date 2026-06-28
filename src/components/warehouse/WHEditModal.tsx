'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import type { WarehouseProduct } from '@/types/warehouse';

interface WHEditModalProps {
  showEditModal: boolean;
  editProduct: WarehouseProduct | null;
  editForm: Record<string, string | number | boolean | null>;
  setEditForm: (f: Record<string, string | number | boolean | null>) => void;
  setShowEditModal: (b: boolean) => void;
  handleEditSave: () => void;
  editSaving: boolean;
  t: (k: string) => string;
}

export default function WHEditModal({
  showEditModal, editProduct, editForm, setEditForm,
  setShowEditModal, handleEditSave, editSaving, t,
}: WHEditModalProps) {
  return (
    <AnimatePresence>
      {showEditModal && editProduct && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{t('wh_edit_product')}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_en_name')}</label>
                <input type="text" value={editForm.name as string} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_ar_name')}</label>
                <input type="text" value={editForm.nameAr as string} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('admin_market_category')}</label>
                <input type="text" value={editForm.category as string} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_sku')}</label>
                <input type="text" value={editForm.sku as string} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_barcode')}</label>
                <input type="text" value={editForm.barcode as string} onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('admin_market_price')}</label>
                <input type="number" step="0.01" value={editForm.price as number} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_cost_price')}</label>
                <input type="number" step="0.01" value={editForm.costPrice as number | ''} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value ? parseFloat(e.target.value) : '' })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_stock')}</label>
                <input type="number" value={editForm.stock as number} onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_unit')}</label>
                <input type="text" value={editForm.unit as string} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_vehicle_model')}</label>
                <input type="text" value={editForm.vehicleModel as string} onChange={(e) => setEditForm({ ...editForm, vehicleModel: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_import_description')}</label>
                <input type="text" value={editForm.description as string} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="taxExempt" checked={!!editForm.taxExempt} onChange={(e) => setEditForm({ ...editForm, taxExempt: e.target.checked })} className="rounded bg-input border-border" />
                <label htmlFor="taxExempt" className="text-xs text-muted-foreground">{t('pos_tax_exempt')}</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-muted-foreground text-sm font-medium hover:bg-white/10 transition-colors">{t('wh_cancel')}</button>
              <button onClick={handleEditSave} disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('wh_save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
