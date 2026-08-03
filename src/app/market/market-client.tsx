'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslation } from '@/components/useTranslation';
import BackButton from '@/components/BackButton';

const PAGE_SIZE = 24;

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

const CATEGORY_MAP: Record<string, { en: string; ar: string }> = {
  '3W': { en: 'Three-Wheelers', ar: 'ثلاثي العجلات' },
  '2W': { en: 'Two-Wheelers', ar: 'ثنائي العجلات' },
  '4W': { en: 'Four-Wheelers', ar: 'رباعي العجلات' },
  COM: { en: 'Commercial', ar: 'تجاري' },
  com: { en: 'Commercial', ar: 'تجاري' },
  '3W & 4w': { en: 'Three & Four Wheelers', ar: 'ثلاثي ورباعي العجلات' },
  '3W & 4W': { en: 'Three & Four Wheelers', ar: 'ثلاثي ورباعي العجلات' },
  Motorcycles: { en: 'Motorcycles', ar: 'دراجات نارية' },
  'Spare Parts': { en: 'Spare Parts', ar: 'قطع غيار' },
  Accessories: { en: 'Accessories', ar: 'إكسسوارات' },
  oil: { en: 'Oils & Lubricants', ar: 'زيوت ومواد تشحيم' },
  '4w': { en: 'Four-Wheelers', ar: 'رباعي العجلات' },
  '2w': { en: 'Two-Wheelers', ar: 'ثنائي العجلات' },
};

function translateCategory(cat: string, lang: string) {
  const mapped = CATEGORY_MAP[cat] || CATEGORY_MAP[cat.toLowerCase()] || CATEGORY_MAP[cat.toUpperCase()] || CATEGORY_MAP[cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()];
  if (mapped) return lang === 'ar' ? mapped.ar : mapped.en;
  return cat;
}

type SortMode = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

export default function MarketClient({ products }: { products: Product[] }) {
  const { t, language } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name-asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const result = products.filter((p) => {
      if (p.stock <= 0) return false;
      if (activeCategory !== 'All' && p.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.nameAr || '').includes(q)) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      switch (sort) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name-desc': return b.name.localeCompare(a.name);
        default: return a.name.localeCompare(b.name);
      }
    });
    return result;
  }, [products, activeCategory, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => {
    const c = p.category.trim();
    return c.charAt(0).toUpperCase() + c.slice(1);
  }))).filter(Boolean)];

  const resetPage = () => setPage(1);

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

      {/* Search + Sort + Categories */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث عن منتج...' : 'Search products...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Search products"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as SortMode); resetPage(); }}
          className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Sort products"
        >
          <option value="name-asc">{language === 'ar' ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
          <option value="name-desc">{language === 'ar' ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</option>
          <option value="price-asc">{language === 'ar' ? 'السعر (الأقل أولاً)' : 'Price (Low-High)'}</option>
          <option value="price-desc">{language === 'ar' ? 'السعر (الأعلى أولاً)' : 'Price (High-Low)'}</option>
        </select>
      </div>
      <div className="flex gap-2 flex-wrap mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); resetPage(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            {cat === 'All' ? (language === 'ar' ? 'الكل' : 'All') : translateCategory(cat, language)}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {paged.map((p, i) => (
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
                  <p className="text-xs text-muted-foreground mb-1">{translateCategory(p.category, language)}</p>
                  <p className="font-bold text-primary">{p.price.toFixed(2)} EGP</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10" role="navigation" aria-label="Pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                page === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
              aria-label={`Page ${p}`}
              aria-current={page === p ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
        </div>
      )}
    </div>
  );
}
