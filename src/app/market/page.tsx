'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Package, Search, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/components/useTranslation';
import BackButton from '@/components/BackButton';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string | null;
  description: string | null;
  available: boolean;
}

const categoryKeys = ['All', 'Motorcycles', 'Spare Parts', 'Accessories'];

export default function MarketPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categoryLabels: Record<string, string> = {
    All: t('market_cat_all'),
    Motorcycles: t('market_cat_motorcycles'),
    'Spare Parts': t('market_cat_spareparts'),
    Accessories: t('market_cat_accessories'),
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/products/?limit=1000');
        const data = await res.json();
        if (data.success) {
          setProducts(data.data.products.filter((p: Product) => p.available));
        } else {
          setError(data.error || 'Failed to load products');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton fallback="/" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-primary" />
            <span className="text-primary text-xs font-semibold tracking-[0.3em] uppercase">{t('market_tag')}</span>
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">{t('market_title')}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('market_desc')}</p>
        </motion.div>

        <div className="glass rounded-2xl p-4 mb-8 flex items-center gap-3 border border-primary/20">
          <AlertTriangle className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">{t('market_notice')}</span> {t('market_notice_text')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('market_search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto scrollbar-hide pb-2 sm:pb-0">
            {categoryKeys.map((key) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-input border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {categoryLabels[key]}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl overflow-hidden group hover:border-primary/30 transition-all duration-500"
                >
                  <div className="aspect-4/3 bg-secondary flex items-center justify-center relative">
                    <Package className="w-12 h-12 text-muted-foreground/30" />
                    {!product.stock && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">
                        {t('market_out_of_stock')}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-primary font-medium uppercase tracking-wider">{product.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {product.stock > 0 ? `${product.stock} ${t('market_in_stock')}` : t('market_unavailable')}
                      </span>
                    </div>
                    <h3 className="text-foreground font-semibold mb-1">{product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{product.description || t('market_no_description')}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">{product.price.toLocaleString()} EGP</span>
                      <button className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                        {t('market_inquire')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">{t('market_no_products')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
