'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, Package, AlertTriangle, Pencil, Plus, Minus, History } from 'lucide-react';
import type { WarehouseProduct } from '@/types/warehouse';

interface WHProductListProps {
  products: WarehouseProduct[];
  filtered: WarehouseProduct[];
  search: string;
  setSearch: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  categories: string[];
  openEdit: (p: WarehouseProduct) => void;
  openDetail: (p: WarehouseProduct) => void;
  setAdjustProduct: (p: WarehouseProduct | null) => void;
  setAdjustType: (t: 'in' | 'out') => void;
  setAdjustQty: (n: number) => void;
  setShowAdjustModal: (b: boolean) => void;
  t: (k: string) => string;
  language: string;
}

export default function WHProductList({
  filtered, search, setSearch, categoryFilter, setCategoryFilter, categories,
  openEdit, openDetail, setAdjustProduct, setAdjustType, setAdjustQty,
  setShowAdjustModal, t, language,
}: WHProductListProps) {
  return (
    <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('wh_search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('wh_all_categories')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('wh_no_products')}</p>
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((product) => (
          <div key={product.id} className="glass rounded-2xl p-4 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden flex-shrink-0 relative">
              {product.image ? (
                <Image src={product.image} alt={product.name} fill className="object-cover" sizes="48px" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{language === 'ar' && product.nameAr ? product.nameAr : product.name}</p>
                {product.stock <= product.lowStockThreshold && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {product.barcode && <span className="font-mono">{product.barcode}</span>}
                {product.sku && <span>SKU: {product.sku}</span>}
                {product.vehicleModel && <span>{product.vehicleModel}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-sm font-bold ${product.stock <= product.lowStockThreshold ? 'text-amber-400' : product.stock === 0 ? 'text-red-400' : ''}`}>
                {product.stock} {product.unit}
              </div>
              <div className="text-[10px] text-muted-foreground">{t('wh_cost_price')}: {product.costPrice ? Number(product.costPrice).toFixed(2) : '-'} EGP</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(product)} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title={t('wh_edit')}>
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => { setAdjustProduct(product); setAdjustType('in'); setAdjustQty(1); setShowAdjustModal(true); }} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title={t('wh_add_stock')}>
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => { setAdjustProduct(product); setAdjustType('out'); setAdjustQty(1); setShowAdjustModal(true); }} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title={t('wh_remove_stock')}>
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => openDetail(product)} className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors" title={t('wh_movements')}>
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
