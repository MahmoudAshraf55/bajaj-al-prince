'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Upload, FileText, PlusCircle, Trash2, AlertCircle,
  CheckCircle2, ArrowLeft,
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
}

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function PurchaseOrderImportPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplierId: '',
    notes: '',
    items: [] as LineItem[],
  });
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/v1/suppliers/?limit=100&isActive=true', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.suppliers)) {
        setSuppliers(data.data.suppliers);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/v1/products/?limit=200', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.products)) {
        setProducts(data.data.products);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else {
          setLoading(false);
          fetchSuppliers();
          fetchProducts();
        }
      })
      .catch(() => router.push('/admin/'));
  }, [router, fetchSuppliers, fetchProducts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      addToast('error', 'Please select a PDF file');
      return;
    }
    setPdfFile(file);
    setPdfPreviewUrl(URL.createObjectURL(file));
  };

  const addLineItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const removeLineItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setForm((f) => {
      const items = [...f.items];
      const item = { ...items[idx] };
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        item.productId = value as string;
        item.productName = prod?.name || '';
      } else if (field === 'quantity') {
        item.quantity = Number(value);
      } else if (field === 'unitPrice') {
        item.unitPrice = Number(value);
      }
      item.total = item.quantity * item.unitPrice;
      items[idx] = item;
      return { ...f, items };
    });
  };

  const calcSubtotal = () => form.items.reduce((sum, i) => sum + i.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.supplierId) {
      setFormError(t('po_select_supplier'));
      return;
    }
    if (form.items.length === 0) {
      setFormError(t('po_at_least_one_item'));
      return;
    }
    for (const item of form.items) {
      if (!item.productId) {
        setFormError(t('po_select_product'));
        return;
      }
    }

    setSubmitting(true);
    const subtotal = calcSubtotal();

    try {
      const res = await fetch('/api/v1/purchase-orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supplierId: form.supplierId,
          notes: form.notes.trim() || undefined,
          subtotal,
          taxTotal: 0,
          discount: 0,
          total: subtotal,
          items: form.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('po_created_success'));
        setCreated(true);
      } else {
        setFormError(data.error || data.errors?.[0]?.message || t('po_at_least_one_item'));
      }
    } catch {
      setFormError(t('po_at_least_one_item'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-8 text-center max-w-md"
        >
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">{t('po_import_created_title')}</h3>
          <p className="text-muted-foreground text-sm mb-6">{t('po_import_created_desc')}</p>
          <button
            onClick={() => router.push('/admin/purchase-orders/')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('po_import_back')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/admin/purchase-orders/" />
          <h2 className="text-2xl font-bold">{t('po_import_title')}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: PDF Upload & Preview */}
          <div className="glass rounded-2xl p-6 border border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t('po_import_title')}
            </h3>

            {!pdfFile ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">{t('po_import_upload')}</p>
                <p className="text-xs text-muted-foreground">{t('po_import_upload_desc')}</p>
                <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm bg-white/5 rounded-xl p-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="flex-1 truncate font-medium">{pdfFile.name}</span>
                  <button
                    onClick={() => { setPdfFile(null); setPdfPreviewUrl(null); }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    {t('po_import_remove')}
                  </button>
                </div>
                {pdfPreviewUrl && (
                  <iframe
                    src={pdfPreviewUrl}
                    className="w-full h-[500px] rounded-xl border border-border"
                    title="PDF Preview"
                  />
                )}
              </div>
            )}
          </div>

          {/* Right: Create PO Form */}
          <div className="glass rounded-2xl p-6 border border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Create Purchase Order
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('po_supplier')}</label>
                <select
                  required
                  value={form.supplierId}
                  onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  <option value="">{t('po_select_supplier')}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('po_notes')}</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('po_items')}</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <PlusCircle className="w-3 h-3" />
                    {t('po_add_item')}
                  </button>
                </div>

                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-end gap-2 mb-2 p-2 rounded-xl bg-white/5">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground">{t('po_select_product')}</label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                      >
                        <option value="">--</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] text-muted-foreground">{t('po_qty')}</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-muted-foreground">{t('po_unit_price')}</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                      />
                    </div>
                    <div className="w-20 text-right">
                      <label className="text-[10px] text-muted-foreground">{t('po_line_total')}</label>
                      <div className="text-xs font-medium py-2">{item.total.toFixed(2)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {form.items.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('po_subtotal')}</span>
                    <span className="font-medium">{calcSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>{t('po_grand_total')}</span>
                    <span>{calcSubtotal().toFixed(2)}</span>
                  </div>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  t('po_new')
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
