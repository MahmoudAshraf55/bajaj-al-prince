'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslation } from '@/components/useTranslation';
import BackButton from '@/components/BackButton';

interface Product {
  id: string;
  name: string;
  nameAr?: string | null;
  category: string;
  price: number;
  stock: number;
  image: string | null;
  description: string | null;
  available: boolean;
}

const CAT_TRANSLATE: Record<string, string> = {
  Motorcycles: 'market_cat_motorcycles',
  'Spare Parts': 'market_cat_spareparts',
  Accessories: 'market_cat_accessories',
};

export default function MarketClient({ products }: { products: Product[] }) {
  const { t, language } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categoryLabels: Record<string, string> = {
    All: t('market_cat_all') || 'All',
    Motorcycles: t('market_cat_motorcycles') || 'Motorcycles',
    'Spare Parts': t('market_cat_spareparts') || 'Spare Parts',
    Accessories: t('market_cat_accessories') || 'Accessories',
  };

  const translateCat = (cat: string) => {
    const key = CAT_TRANSLATE[cat];
    return key ? (t(key) || cat) : cat;
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory !== 'All' && p.category !== activeCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.nameAr || '').includes(search)) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <BackButton fallback="/" />
        <h1 className="text-3xl font-bold mt-4 mb-2">
          {language === 'ar' ? 'المتجر' : 'Market'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {language === 'ar' ? 'تصفح قطع الغيار والإكسسوارات الأصلية' : 'Browse genuine spare parts and accessories'}
        </p>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث عن منتج...' : 'Search products...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Search products"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
          >
            <Link href={`/market/${p.id}/`}>
              <div className="glass rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all group">
                <div className="aspect-square bg-white/5 relative overflow-hidden">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={language === 'ar' && p.nameAr ? p.nameAr : p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {p.stock === 0 && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-red-500/80 text-white text-[10px] font-bold">
                      {t('admin_out_of_stock') || 'Out'}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">
                    {language === 'ar' && p.nameAr ? p.nameAr : p.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">{translateCat(p.category)}</p>
                  <p className="font-bold text-primary">{p.price.toFixed(2)} EGP</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
        </div>
      )}
    </div>
  );
}
