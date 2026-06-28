'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, X, Barcode, Camera, Package, ShoppingCart } from 'lucide-react';
import { Product, CartItem } from '@/types/pos';

interface POSProductGridProps {
  search: string;
  setSearch: (val: string) => void;
  manualBarcode: string;
  setManualBarcode: (val: string) => void;
  filtered: Product[];
  handleSelectProduct: (product: Product) => void;
  handleBarcodeEnter: (barcode: string) => void;
  handleBarcodeSearch: (e: React.KeyboardEvent) => void;
  setShowWebcamScanner: (val: boolean) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  t: (key: string) => string;
  language: string;
  cart: CartItem[];
}

export default function POSProductGrid({
  search,
  setSearch,
  manualBarcode,
  setManualBarcode,
  filtered,
  handleSelectProduct,
  handleBarcodeEnter,
  handleBarcodeSearch,
  setShowWebcamScanner,
  searchRef,
  barcodeInputRef,
  t,
  language,
  cart,
}: POSProductGridProps) {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={searchRef}
          type="text"
          placeholder={t('pos_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleBarcodeSearch}
          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder={t('pos_manual_barcode')}
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualBarcode) {
                handleBarcodeEnter(manualBarcode);
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <button
          onClick={() => setShowWebcamScanner(true)}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <Camera className="w-4 h-4" />
          {t('pos_scan_webcam')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {search && filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('pos_no_products')}</p>
          </div>
        )}
        {search && filtered.map((product) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleSelectProduct(product)}
            className="glass rounded-2xl p-4 text-left hover:bg-white/10 transition-all group"
            disabled={product.stock < 1}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0 relative">
                {product.image ? (
                  <Image src={product.image} alt={product.name} fill className="object-cover" sizes="56px" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{language === 'ar' && product.nameAr ? product.nameAr : product.name}</p>
                {product.barcode && <p className="text-xs text-muted-foreground/60 font-mono">{product.barcode}</p>}
                <p className="text-sm font-bold text-primary mt-0.5">{Number(product.price).toFixed(2)} EGP</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {!search && cart.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">{t('pos_title')}</p>
          <p className="text-sm">{t('pos_search')}</p>
        </div>
      )}
    </div>
  );
}
