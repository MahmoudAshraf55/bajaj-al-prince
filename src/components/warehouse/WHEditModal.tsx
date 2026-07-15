'use client';

import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
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
    <Modal isOpen={showEditModal && !!editProduct} onClose={() => setShowEditModal(false)} title={t('wh_edit_product')} contentClassName="max-w-lg max-h-[80vh] overflow-auto">
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
    </Modal>
  );
}
