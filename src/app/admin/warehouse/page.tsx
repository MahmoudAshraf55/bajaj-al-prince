'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { useTranslation } from '@/components/useTranslation';
import {
  Package, Search, X, LogOut, Plus, Minus, Loader2, AlertTriangle, Pencil,
  LayoutDashboard, Mail, Calendar, ShoppingCart, DollarSign,
  MessageCircle, Wrench, Users, Car, List, TrendingUp,   History, Upload, Camera,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  barcode: string | null;
  sku: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  category: string;
  vehicleModel: string | null;
  image: string | null;
  available: boolean;
  taxExempt: boolean;
  taxRate: number | null;
  description: string | null;
  activeFrom: string | null;
}

interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; username: string };
  product: { id: string; name: string; barcode: string | null };
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

type Tab = 'inventory' | 'movements' | 'import';

export default function AdminWarehouse() {
  const { t, language, isRTL } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [importPreview, setImportPreview] = useState<{ headers: string[]; preview: Array<Record<string, unknown>>; totalRows: number } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; total: number } | null>(null);
  const [importAborted, setImportAborted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean | null>>({} as Record<string, string | number | boolean | null>);
  const [categoryFilter, setCategoryFilter] = useState('');

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push('/admin/');
        else setLoading(false);
      })
      .catch(() => router.push('/admin/'));
  }, [router]);

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/v1/products/?limit=10000', { credentials: 'include' });
    const d = await res.json();
    if (d.success) setProducts(d.data.products);
  }, []);

  const loadMovements = useCallback(async () => {
    const res = await fetch('/api/v1/stock-movements/', { credentials: 'include' });
    const d = await res.json();
    if (d.success) setMovements(d.data.movements);
  }, []);

  useEffect(() => {
    if (loading) return;
    loadProducts();
  }, [loading, loadProducts]);

  useEffect(() => {
    if (loading || tab !== 'movements') return;
    loadMovements();
  }, [loading, tab, loadMovements]);

  const handleAdjust = async () => {
    if (!adjustProduct || adjustQty < 1) return;
    setAdjusting(true);
    try {
      const res = await fetch('/api/v1/stock-movements/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: adjustProduct.id,
          type: adjustType,
          quantity: adjustQty,
          notes: adjustNotes || null,
        }),
      });
      const d = await res.json();
      if (d.success) {
        addToast('success', t('wh_adjustment_saved'));
        setShowAdjustModal(false);
        setAdjustQty(1);
        setAdjustNotes('');
        await loadProducts();
        if (tab === 'movements') await loadMovements();
      } else {
        addToast('error', d.error || 'Failed');
      }
    } catch {
      addToast('error', 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  const openDetail = async (product: Product) => {
    setDetailProduct(product);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v1/stock-movements/?productId=${product.id}&limit=50`, { credentials: 'include' });
      const d = await res.json();
      if (d.success) setProductMovements(d.data.movements);
    } catch {}
    setLoadingDetail(false);
  };

  const handleImportFile = async (file: File) => {
    setImportPreview(null);
    setImportResult(null);
    setImportFile(file);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('action', 'preview');
    try {
      const res = await fetch('/api/v1/products/import-excel/', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const d = await res.json();
      if (d.success) {
        setImportPreview(d.data);
      } else {
        addToast('error', d.error || t('wh_import_parse_error'));
      }
    } catch {
      addToast('error', t('wh_import_parse_error'));
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview || !importFile) return;
    setImporting(true);
    setImportAborted(false);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const fd = new FormData();
      fd.append('action', 'confirm');
      fd.append('file', importFile);
      const res = await fetch('/api/v1/products/import-excel/', {
        method: 'POST',
        credentials: 'include',
        body: fd,
        signal: controller.signal,
      });
      const d = await res.json();
      if (d.success) {
        setImportResult(d.data);
        addToast('success', t('wh_import_success') + ` (${d.data.created} ${t('wh_import_created')}, ${d.data.updated} ${t('wh_import_updated')})`);
        await loadProducts();
      } else {
        addToast('error', d.error || t('wh_import_error'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        addToast('error', t('wh_import_cancelled'));
      } else {
        addToast('error', t('wh_import_error'));
      }
    } finally {
      setImporting(false);
      abortRef.current = null;
    }
  };

  const handleImportCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setImportAborted(true);
    }
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setEditForm({
      name: product.name,
      nameAr: product.nameAr ?? '',
      category: product.category,
      price: product.price,
      costPrice: product.costPrice ?? '',
      stock: product.stock,
      barcode: product.barcode ?? '',
      sku: product.sku ?? '',
      unit: product.unit,
      vehicleModel: product.vehicleModel ?? '',
      description: product.description ?? '',
      lowStockThreshold: product.lowStockThreshold,
      taxExempt: product.taxExempt,
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(editForm)) {
        if (key === 'taxExempt') { body[key] = val; continue; }
        if (val === '' || val === null || val === undefined) continue;
        body[key] = val;
      }
      const res = await fetch(`/api/v1/products/${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        addToast('success', t('wh_product_updated'));
        setShowEditModal(false);
        setEditProduct(null);
        await loadProducts();
      } else {
        addToast('error', d.error || 'Failed');
      }
    } catch {
      addToast('error', 'Failed to update product');
    } finally {
      setEditSaving(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    router.push('/admin/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const filtered = products.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(q));
  });

  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <aside className="fixed top-0 ltr:left-0 rtl:right-0 h-full w-64 glass ltr:border-r rtl:border-l border-border hidden md:flex flex-col z-30">
        <div className="p-6 border-b border-border">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          <button onClick={() => router.push('/admin/dashboard/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <LayoutDashboard className="w-4 h-4" />
            {t('admin_overview')}
          </button>
          <button onClick={() => router.push('/admin/dashboard/?tab=messages')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Mail className="w-4 h-4" />
            {t('admin_messages')}
          </button>
          <button onClick={() => router.push('/admin/dashboard/?tab=bookings')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Calendar className="w-4 h-4" />
            {t('admin_bookings')}
          </button>
          <button onClick={() => router.push('/admin/pos/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <ShoppingCart className="w-4 h-4" />
            {t('pos_title')}
          </button>
          <button onClick={() => router.push('/admin/accounting/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <DollarSign className="w-4 h-4" />
            {t('admin_accounting')}
          </button>
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            CRM
          </div>
          <button onClick={() => router.push('/admin/market/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Package className="w-4 h-4" />
            {t('admin_market')}
          </button>
          <button onClick={() => router.push('/admin/warehouse/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground transition-all">
            <TrendingUp className="w-4 h-4" />
            {t('wh_title')}
          </button>
          <button onClick={() => router.push('/admin/customers/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Users className="w-4 h-4" />
            {t('admin_customers')}
          </button>
          <button onClick={() => router.push('/admin/vehicles/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Car className="w-4 h-4" />
            {t('admin_vehicles')}
          </button>
          <button onClick={() => router.push('/admin/vehicle-models/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <List className="w-4 h-4" />
            {t('admin_vehicle_models')}
          </button>
          <button onClick={() => router.push('/admin/work-orders/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Wrench className="w-4 h-4" />
            {t('wo_title')}
          </button>
          <button onClick={() => router.push('/admin/whatsapp/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <MessageCircle className="w-4 h-4" />
            {t('admin_whatsapp')}
          </button>
          <button onClick={() => router.push('/admin/devices/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Camera className="w-4 h-4" />
            {t('admin_devices')}
          </button>
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all w-full">
            <LogOut className="w-4 h-4" />
            {t('admin_sign_out')}
          </button>
        </div>
      </aside>

      <main className="ltr:md:ml-64 rtl:md:mr-64 min-h-screen">
        <div className="md:hidden glass border-b border-border p-4 flex items-center justify-between">
          <span className="font-bold">{t('wh_title')}</span>
          <button onClick={logout} className="text-muted-foreground"><LogOut className="w-5 h-5" /></button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{t('wh_title')}</h1>
              <p className="text-muted-foreground text-sm">{products.length} {t('admin_products')}</p>
            </div>
            {lowStockProducts.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{lowStockProducts.length} {t('wh_low_stock')}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('inventory')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'inventory' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <Package className="w-4 h-4" />
              {t('admin_inventory')}
            </button>
            <button onClick={() => setTab('movements')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'movements' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <History className="w-4 h-4" />
              {t('wh_movements')}
            </button>
            <button onClick={() => setTab('import')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'import' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <Upload className="w-4 h-4" />
              {t('wh_import_excel')}
            </button>
          </div>

          <div className="flex gap-3 mb-6" style={{ display: tab === 'import' ? 'none' : 'flex' }}>
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

          <AnimatePresence mode="wait">
            {tab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('wh_no_products')}</p>
                  </div>
                )}
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
              </motion.div>
            )}

            {tab === 'movements' && (
              <motion.div key="movements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {movements.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('wh_movements')}</p>
                  </div>
                )}
                <div className="space-y-2">
                  {movements.slice(0, 100).map((m) => (
                    <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        m.type === 'in' ? 'bg-green-500/10 text-green-400' : m.type === 'out' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {m.type === 'in' ? <Plus className="w-4 h-4" /> : m.type === 'out' ? <Minus className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.type === 'in' ? t('wh_add_stock') : m.type === 'out' ? t('wh_remove_stock') : t('wh_adjustment')} — {m.quantity} {m.reference && `(${m.reference})`}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                        <p>{m.createdBy.username}</p>
                        <p>{new Date(m.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {tab === 'import' && (
          <motion.div key="import" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
            {!importPreview && !importResult && (
              <div className="text-center py-12">
                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-4">{t('wh_import_drop')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Upload className="w-4 h-4" />
                  {t('wh_import_browse')}
                </button>
              </div>
            )}

            {importPreview && !importResult && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">{t('wh_import_total')}: <span className="text-foreground font-bold">{importPreview.totalRows}</span></p>
                  <div className="flex gap-2">
                    {importing && (
                      <button
                        onClick={handleImportCancel}
                        disabled={importAborted}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
                      >
                        <X className="w-4 h-4" />
                        {t('wh_import_cancel')}
                      </button>
                    )}
                    <button
                      onClick={handleImportConfirm}
                      disabled={importing}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {importing ? t('wh_import_processing') : `${t('wh_import_confirm')} (${importPreview.totalRows})`}
                    </button>
                  </div>
                </div>
                {importing && (
                  <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm text-primary mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {importAborted ? t('wh_import_cancelling') : t('wh_import_processing')}
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full bg-primary transition-all ${importAborted ? 'w-0' : 'w-full animate-pulse'}`} />
                    </div>
                  </div>
                )}
                <div className="overflow-auto max-h-80 border border-border rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_sku')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_barcode')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_en_name')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_ar_name')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_vehicle_model')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('admin_market_category')}</th>
                        <th className="text-right p-2 font-medium whitespace-nowrap">{t('admin_market_price')}</th>
                        <th className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_cost_price')}</th>
                        <th className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_stock')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_unit')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_tax_rate')}</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_description')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(importPreview.preview as Array<Record<string, unknown>>).map((row, idx) => (
                        <tr key={idx} className="border-t border-border/50">
                          <td className="p-2 font-mono">{(row.sku as string) || '-'}</td>
                          <td className="p-2 font-mono">{(row.barcode as string) || '-'}</td>
                          <td className="p-2">{(row.name as string) || '-'}</td>
                          <td className="p-2">{(row.nameAr as string) || '-'}</td>
                          <td className="p-2">{(row.vehicleModel as string) || '-'}</td>
                          <td className="p-2">{(row.category as string) || '-'}</td>
                          <td className="p-2 text-right">{row.price != null ? `${Number(row.price).toFixed(2)}` : '-'}</td>
                          <td className="p-2 text-right">{row.costPrice != null ? `${Number(row.costPrice).toFixed(2)}` : '-'}</td>
                          <td className="p-2 text-right">{row.stock != null ? Number(row.stock) : '-'}</td>
                          <td className="p-2">{(row.unit as string) || '-'}</td>
                          <td className="p-2">{row.taxRate != null ? `${Number(row.taxRate)}%` : '-'}</td>
                          <td className="p-2 max-w-[120px] truncate" title={(row.description as string) || ''}>{(row.description as string) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importPreview.totalRows > 10 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 10 of {importPreview.totalRows} rows</p>
                )}
              </div>
            )}

            {importResult && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="text-lg font-bold mb-2">{t('wh_import_success')}</h4>
                <div className="flex justify-center gap-6 text-sm">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{importResult.created}</p>
                    <p className="text-muted-foreground">{t('wh_import_created')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-400">{importResult.updated}</p>
                    <p className="text-muted-foreground">{t('wh_import_updated')}</p>
                  </div>
                  {importResult.skipped > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-red-400">{importResult.skipped}</p>
                      <p className="text-muted-foreground">{t('wh_import_skipped')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold">{importResult.total}</p>
                    <p className="text-muted-foreground">{t('wh_import_total')}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setImportPreview(null); setImportResult(null); }}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  {t('pos_confirm')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>

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
        {showAdjustModal && adjustProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{t('wh_adjustment')}</h3>
                <button onClick={() => setShowAdjustModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm font-medium mb-1">{language === 'ar' && adjustProduct.nameAr ? adjustProduct.nameAr : adjustProduct.name}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('wh_current_stock')}: {adjustProduct.stock}</p>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setAdjustType('in')} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium ${adjustType === 'in' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-muted-foreground'}`}>
                  {t('wh_add_stock')}
                </button>
                <button onClick={() => setAdjustType('out')} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium ${adjustType === 'out' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-muted-foreground'}`}>
                  {t('wh_remove_stock')}
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_quantity')}</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1">{t('wh_notes')}</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('wh_notes')}
                />
              </div>
              <button
                onClick={handleAdjust}
                disabled={adjusting || adjustQty < 1}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('wh_submit')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
