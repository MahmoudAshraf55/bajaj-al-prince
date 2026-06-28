'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
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
    <AnimatePresence>
      {detailProduct && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{language === 'ar' && detailProduct.nameAr ? detailProduct.nameAr : detailProduct.name}</h3>
              <button onClick={() => setDetailProduct(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-muted-foreground">{t('wh_barcode')}:</span> {detailProduct.barcode || '-'}</div>
              <div><span className="text-muted-foreground">{t('wh_current_stock')}:</span> <span className="font-bold">{detailProduct.stock}</span></div>
              <div><span className="text-muted-foreground">{t('wh_cost_price')}:</span> {detailProduct.costPrice ? `${Number(detailProduct.costPrice).toFixed(2)} EGP` : '-'}</div>
              <div><span className="text-muted-foreground">{t('wh_unit')}:</span> {detailProduct.unit}</div>
              <div><span className="text-muted-foreground">{t('wh_vehicle_model')}:</span> {detailProduct.vehicleModel || '-'}</div>
              <div><span className="text-muted-foreground">{t('wh_active_from')}:</span> {detailProduct.activeFrom ? new Date(detailProduct.activeFrom).toLocaleDateString() : '-'}</div>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
