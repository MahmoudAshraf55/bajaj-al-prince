'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import {
  Package, Plus, Pencil, Trash2, X, Search, Upload, Sparkles, Loader2,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image: string | null;
  available: boolean;
  createdAt: string;
}

const CATEGORIES = ['Motorcycles', 'Spare Parts', 'Accessories'];

export default function AdminMarket() {
  const { t, language } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<'image' | 'describe' | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '0',
    category: 'Spare Parts',
    image: '',
    available: true,
  });

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) window.location.href = '/admin/';
        else setLoading(false);
      })
      .catch(() => { window.location.href = '/admin/'; });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/products/?limit=1000&admin=true', { credentials: 'include' });
      const d = await res.json();
      if (d.success) setProducts(d.data.products);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loading) load(); }, [loading, load]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', stock: '0', category: 'Spare Parts', image: '', available: true });
    setEditing(null);
    setSaveError('');
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
      image: p.image || '',
      available: p.available,
    });
    setEditing(p);
    setShowModal(true);
  };

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    const priceNum = parseFloat(form.price);
    if (!priceNum || priceNum <= 0) {
      alert(t('admin_market_price') + ' must be greater than 0');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: priceNum,
        stock: parseInt(form.stock) || 0,
        category: form.category,
        image: form.image || null,
        available: form.available,
      };

      let res;
      if (editing) {
        res = await fetch(`/api/v1/products/${editing.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      } else {
        body.stock = Math.max(1, body.stock || 1);
        res = await fetch('/api/v1/products/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      }

      const d = await res.json();
      if (d.success) {
        setShowModal(false);
        resetForm();
        await load();
      } else {
        const errMsg = d.errors
          ? d.errors.map((e: { path: string[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('\n')
          : d.error || 'Save failed';
        setSaveError(errMsg);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin_market_delete_confirm'))) return;
    const res = await fetch(`/api/v1/products/${id}/`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) await load();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/v1/upload/', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const d = await res.json();
      if (d.success) setForm((prev) => ({ ...prev, image: d.data.url }));
    } catch {}
  };

  const handleAiGenerateImage = async () => {
    if (!form.name) return;
    setAiBusy('image');
    try {
      const res = await fetch('/api/v1/ai/generate-image/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: `${form.name} - ${form.description || ''} - ${form.category}` }),
      });
      const d = await res.json();
      if (d.success && d.data?.url) {
        setForm((prev) => ({ ...prev, image: d.data.url }));
      } else {
        const errMsg = d.error || (d.errors ? d.errors.map((e: { message: string }) => e.message).join('; ') : 'AI feature not available');
        alert(errMsg);
      }
    } catch {
      alert('Network error. Check server console for details.');
    } finally { setAiBusy(null); }
  };

  const handleAiDescribe = async () => {
    if (!form.name) return;
    setAiBusy('describe');
    try {
      const res = await fetch('/api/v1/ai/describe/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name, category: form.category }),
      });
      const d = await res.json();
      if (d.success && d.data?.description) {
        setForm((prev) => ({ ...prev, description: d.data.description }));
      } else {
        const errMsg = d.error || (d.errors ? d.errors.map((e: { message: string }) => e.message).join('; ') : 'AI feature not available');
        alert(errMsg);
      }
    } catch {
      alert('Network error. Check server console for details.');
    } finally { setAiBusy(null); }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">{t('admin_market_title')}</h1>
            <p className="text-muted-foreground text-sm">{products.length} {t('admin_products')}</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            {t('admin_market_add')}
          </button>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('admin_search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-4 group">
              <div className="w-16 h-16 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
                {p.image ? (
                  <Image src={p.image} alt={p.name} fill className="object-cover" sizes="64px" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category} &bull; {p.price.toLocaleString()} EGP &bull; {p.stock} {t('market_in_stock')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${p.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {p.available ? t('admin_available') : t('admin_out_of_stock')}
                </span>
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">{t('admin_market_no_products')}</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              className="w-full max-w-xl glass rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <h2 className="text-lg font-bold">
                  {editing ? t('admin_market_edit_modal') : t('admin_market_add_modal')}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin_market_name')}</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="auto"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin_market_category')}</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">{t('admin_market_select_category')}</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{t(`admin_market_cat_${cat.toLowerCase().replace(/\s+/g, '')}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin_market_price')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin_market_stock')}</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.available}
                        onChange={(e) => setForm((prev) => ({ ...prev, available: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ms-3 text-sm">{t('admin_market_available')}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin_market_description')}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    dir="auto"
                  />
                  <button
                    onClick={handleAiDescribe}
                    disabled={aiBusy === 'describe' || !form.name}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiBusy === 'describe' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {t('admin_market_ai_describe')}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin_market_image')}</label>
                  {form.image && (
                    <div className="mb-3 w-32 h-32 rounded-xl overflow-hidden bg-secondary border border-border relative">
                      <Image src={form.image} alt="preview" fill className="object-cover" sizes="128px" unoptimized />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-input border border-border text-sm cursor-pointer hover:bg-white/5 transition-colors">
                      <Upload className="w-4 h-4" />
                      {t('admin_market_upload_image')}
                      <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    </label>
                    <button
                      onClick={handleAiGenerateImage}
                      disabled={aiBusy === 'image' || !form.name}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-input border border-border text-sm hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {aiBusy === 'image' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {t('admin_market_ai_generate_image')}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">{t('admin_market_ai_no_key')}</p>
                </div>
              </div>

              {saveError && (
                <div className="px-5 pt-2">
                  <p className="text-xs text-red-400 whitespace-pre-wrap bg-red-500/5 rounded-xl p-3 border border-red-500/10">{saveError}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  {t('admin_market_cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.price}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {saving ? t('admin_market_saving') : t('admin_market_save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
