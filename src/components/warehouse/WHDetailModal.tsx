'use client';

import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { WarehouseProduct, StockMovement } from '@/types/warehouse';

interface WHDetailModalProps {
  detailProduct: WarehouseProduct | null;
  productMovements: StockMovement[];
  loadingDetail: boolean;
  setDetailProduct: (p: WarehouseProduct | null) => void;
  t: (k: string) => string;
  language: string;
}

export default function WHDetailModal({
  detailProduct, productMovements, loadingDetail, setDetailProduct, t, language,
}: WHDetailModalProps) {
  return (
    <Modal isOpen={!!detailProduct} onClose={() => setDetailProduct(null)} title={language === 'ar' && detailProduct?.nameAr ? detailProduct.nameAr : detailProduct?.name} contentClassName="max-w-lg max-h-[80vh] overflow-auto">
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div><span className="text-muted-foreground">{t('wh_barcode')}:</span> {detailProduct?.barcode || '-'}</div>
        <div><span className="text-muted-foreground">{t('wh_current_stock')}:</span> <span className="font-bold">{detailProduct?.stock ?? 0}</span></div>
        <div><span className="text-muted-foreground">{t('wh_cost_price')}:</span> {detailProduct?.costPrice ? `${Number(detailProduct.costPrice).toFixed(2)} EGP` : '-'}</div>
        <div><span className="text-muted-foreground">{t('wh_unit')}:</span> {detailProduct?.unit ?? '-'}</div>
        <div><span className="text-muted-foreground">{t('wh_vehicle_model')}:</span> {detailProduct?.vehicleModel || '-'}</div>
        <div><span className="text-muted-foreground">{t('wh_active_from')}:</span> {detailProduct?.activeFrom ? new Date(detailProduct.activeFrom).toLocaleDateString() : '-'}</div>
      </div>
      <h4 className="text-sm font-bold mb-2">{t('wh_movements')}</h4>
      {loadingDetail ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : productMovements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No movements</p>
      ) : (
        <div className="space-y-1">
          {productMovements.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  m.type === 'in' ? 'bg-green-500/10 text-green-400' : m.type === 'out' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '±'}{m.quantity}
                </span>
                <span className="text-muted-foreground text-xs">{m.createdBy.username}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
