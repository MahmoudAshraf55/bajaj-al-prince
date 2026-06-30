'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import { Package, History, Upload, AlertTriangle, Download, FileText } from 'lucide-react';
import type { WarehouseProduct, StockMovement, ImportPreview, ImportResult } from '@/types/warehouse';
import WHProductList from '@/components/warehouse/WHProductList';
import WHMovementsList from '@/components/warehouse/WHMovementsList';
import WHImportTab from '@/components/warehouse/WHImportTab';
import WHPdfImportTab from '@/components/warehouse/WHPdfImportTab';
import WHEditModal from '@/components/warehouse/WHEditModal';
import WHDetailModal from '@/components/warehouse/WHDetailModal';
import WHAdjustModal from '@/components/warehouse/WHAdjustModal';

type Tab = 'inventory' | 'movements' | 'import';
type ImportSubTab = 'excel' | 'pdf';

export default function AdminWarehouse() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('inventory');
  const [importSubTab, setImportSubTab] = useState<ImportSubTab>('excel');
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<WarehouseProduct | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [detailProduct, setDetailProduct] = useState<WarehouseProduct | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importAborted, setImportAborted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editProduct, setEditProduct] = useState<WarehouseProduct | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean | null>>({} as Record<string, string | number | boolean | null>);
  const [categoryFilter, setCategoryFilter] = useState('');

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
    const res = await fetch('/api/v1/products/?limit=10000&admin=true', { credentials: 'include' });
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

  const openDetail = async (product: WarehouseProduct) => {
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

  const resetImport = () => {
    setImportPreview(null);
    setImportResult(null);
  };

  const openEdit = (product: WarehouseProduct) => {
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
      const nullableFields = ['nameAr', 'description', 'barcode', 'sku', 'costPrice', 'vehicleModel'];
      const body: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(editForm)) {
        if (key === 'taxExempt') { body[key] = val; continue; }
        if (val === undefined) continue;
        if (val === '' && nullableFields.includes(key)) {
          body[key] = null;
        } else if (key === 'unit' && val === '') {
          body[key] = 'piece';
        } else {
          body[key] = val;
        }
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
    <>
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
          <button
            onClick={() => window.open('/api/v1/products/export/', '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('export_excel') || 'Export Excel'}
          </button>
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

        <AnimatePresence mode="wait">
          {tab === 'inventory' && (
            <WHProductList
              products={products}
              filtered={filtered}
              search={search}
              setSearch={setSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categories={categories}
              openEdit={openEdit}
              openDetail={openDetail}
              setAdjustProduct={setAdjustProduct}
              setAdjustType={setAdjustType}
              setAdjustQty={setAdjustQty}
              setShowAdjustModal={setShowAdjustModal}
              t={t}
              language={language}
            />
          )}
          {tab === 'movements' && (
            <WHMovementsList
              movements={movements}
              t={t}
            />
          )}
        </AnimatePresence>
      </div>

      {tab === 'import' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setImportSubTab('excel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${importSubTab === 'excel' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              onClick={() => setImportSubTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${importSubTab === 'pdf' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
          {importSubTab === 'excel' ? (
            <WHImportTab
              t={t}
              fileInputRef={fileInputRef}
              handleImportFile={handleImportFile}
              importPreview={importPreview}
              importResult={importResult}
              importing={importing}
              importAborted={importAborted}
              handleImportConfirm={handleImportConfirm}
              handleImportCancel={handleImportCancel}
              resetImport={resetImport}
            />
          ) : (
            <WHPdfImportTab />
          )}
        </div>
      )}

      <WHEditModal
        showEditModal={showEditModal}
        editProduct={editProduct}
        editForm={editForm}
        setEditForm={setEditForm}
        setShowEditModal={setShowEditModal}
        handleEditSave={handleEditSave}
        editSaving={editSaving}
        t={t}
      />

      <WHAdjustModal
        showAdjustModal={showAdjustModal}
        adjustProduct={adjustProduct}
        adjustType={adjustType}
        adjustQty={adjustQty}
        adjustNotes={adjustNotes}
        adjusting={adjusting}
        setAdjustType={setAdjustType}
        setAdjustQty={setAdjustQty}
        setAdjustNotes={setAdjustNotes}
        setShowAdjustModal={setShowAdjustModal}
        handleAdjust={handleAdjust}
        t={t}
        language={language}
      />

      <WHDetailModal
        detailProduct={detailProduct}
        productMovements={productMovements}
        loadingDetail={loadingDetail}
        setDetailProduct={setDetailProduct}
        t={t}
        language={language}
      />
    </>
  );
}
