'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Truck, Phone, Mail, MapPin, Hash, FileText, AlertCircle, CheckCircle2, XCircle,
  Pencil, X,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

interface Supplier {
  id: string;
  name: string;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SupplierDetailPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', nameAr: '', phone: '', email: '', address: '', taxId: '', notes: '', isActive: true,
  });
  const [formError, setFormError] = useState('');

  const fetchSupplier = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const res = await fetchWithRetry(`/api/v1/suppliers/${supplierId}/`, { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && data?.data?.supplier) {
        const s = data.data.supplier;
        setSupplier(s);
        setForm({
          name: s.name, nameAr: s.nameAr || '', phone: s.phone || '',
          email: s.email || '', address: s.address || '', taxId: s.taxId || '',
          notes: s.notes || '', isActive: s.isActive,
        });
      } else {
        setError(data?.error || t('sup_failed_load'));
        addToast('error', data?.error || t('sup_failed_load'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : t('sup_failed_load');
      setError(msg);
      addToast('error', msg);
    }
  }, [supplierId, t, addToast]);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else {
          setLoading(false);
          const controller = new AbortController();
          fetchSupplier(controller.signal);
          return () => controller.abort();
        }
      })
      .catch(() => {
        router.push('/admin/');
      });
  }, [router, supplierId, fetchSupplier]);

  const openEditModal = () => {
    if (supplier) {
      setForm({
        name: supplier.name, nameAr: supplier.nameAr || '', phone: supplier.phone || '',
        email: supplier.email || '', address: supplier.address || '', taxId: supplier.taxId || '',
        notes: supplier.notes || '', isActive: supplier.isActive,
      });
    }
    setFormError('');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError(t('sup_name_phone_required'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/suppliers/${supplierId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          nameAr: form.nameAr.trim() || undefined,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
          notes: form.notes.trim() || undefined,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('sup_updated'));
        setShowEditModal(false);
        setSupplier(data.data.supplier);
      } else {
        setFormError(data.error || data.errors?.[0]?.message || t('sup_failed_update'));
      }
    } catch {
      setFormError(t('sup_failed_update'));
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

  if (error || !supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('sup_failed_load')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchSupplier(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('crm_retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/admin/suppliers/" />
          <h2 className="text-2xl font-bold">{t('sup_details')}</h2>
        </div>

        {/* Profile Card */}
        <div className="glass rounded-2xl p-6 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{supplier.name}</h3>
                {supplier.nameAr && (
                  <p className="text-muted-foreground text-sm">{supplier.nameAr}</p>
                )}
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full mt-2 ${
                  supplier.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {supplier.isActive ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {supplier.isActive ? t('sup_active') : t('sup_inactive')}
                </span>
              </div>
            </div>
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              {t('admin_market_edit')}
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplier.phone && (
            <div className="glass rounded-2xl p-4 border border-border flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t('sup_phone')}</p>
                <p className="font-medium">{supplier.phone}</p>
              </div>
            </div>
          )}
          {supplier.email && (
            <div className="glass rounded-2xl p-4 border border-border flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t('sup_email')}</p>
                <p className="font-medium">{supplier.email}</p>
              </div>
            </div>
          )}
          {supplier.address && (
            <div className="glass rounded-2xl p-4 border border-border flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t('sup_address')}</p>
                <p className="font-medium">{supplier.address}</p>
              </div>
            </div>
          )}
          {supplier.taxId && (
            <div className="glass rounded-2xl p-4 border border-border flex items-center gap-3">
              <Hash className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t('sup_tax_id')}</p>
                <p className="font-medium">{supplier.taxId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {supplier.notes && (
          <div className="glass rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('sup_notes')}</span>
            </div>
            <p className="text-sm">{supplier.notes}</p>
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              className="glass rounded-2xl p-6 w-full max-w-md border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{t('admin_market_edit')}</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_name')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_name_ar')}</label>
                  <input
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_phone')}</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_email')}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_address')}</label>
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_tax_id')}</label>
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_notes')}</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm">{t('sup_active')}</label>
                </div>
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
                    t('admin_market_save')
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
