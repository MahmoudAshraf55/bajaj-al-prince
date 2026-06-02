'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import type { VehicleModel } from '@/types';
import {
  Plus, X, AlertCircle, CheckCircle2, List, Trash2, Pencil,
} from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export default function VehicleModelsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [form, setForm] = useState({ name: '', make: 'Bajaj' });
  const [formError, setFormError] = useState('');

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  };

  const fetchModels = async () => {
    setError('');
    try {
      const res = await fetch('/api/vehicle-models/?all=true', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.models)) {
        setModels(data.data.models);
      } else {
        setError(data?.error || t('vmodels_failed_load'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('vmodels_failed_load');
      setError(msg);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else { setLoading(false); fetchModels(); }
      })
      .catch(() => router.push('/admin/'));
  }, [router]);

  const openAddModal = () => {
    setEditingModel(null);
    setForm({ name: '', make: 'Bajaj' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (m: VehicleModel) => {
    setEditingModel(m);
    setForm({ name: m.name, make: m.make });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError(t('crm_make_model_required'));
      return;
    }
    setSubmitting(true);
    try {
      const url = editingModel ? `/api/vehicle-models/${editingModel.id}/` : '/api/vehicle-models/';
      const method = editingModel ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name.trim(), make: form.make.trim() }),
      });
      const data = await res.json();
      if (data?.success) {
        addToast('success', editingModel ? t('vmodels_model_updated') : t('vmodels_model_added'));
        setForm({ name: '', make: 'Bajaj' });
        setShowModal(false);
        setEditingModel(null);
        fetchModels();
      } else {
        setFormError(data?.error || data?.errors?.[0]?.message || t('vmodels_failed_create'));
      }
    } catch {
      setFormError(t('crm_network_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vmodels_confirm_remove'))) return;
    try {
      const res = await fetch(`/api/vehicle-models/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        addToast('success', t('vmodels_model_removed'));
        fetchModels();
      } else {
        addToast('error', t('vmodels_failed_remove'));
      }
    } catch {
      addToast('error', t('crm_network_error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !models.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('crm_error_loading')}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchModels(); }}
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
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
                toast.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <List className="w-6 h-6 text-primary" />
            {t('vmodels_title')}
          </h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('vmodels_add')}
          </button>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">{t('vmodels_name')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('vmodels_make')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('vmodels_active')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('vmodels_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {models?.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 font-medium">{m.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{m.make}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.isActive ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {m.isActive ? t('vmodels_active') : t('vmodels_inactive')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title={t('crm_edit_vehicle')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title={t('crm_remove_vehicle')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!models || models.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      {t('vmodels_no_models')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-md border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{editingModel ? t('vmodels_edit_modal_title') : t('vmodels_add_modal_title')}</h3>
                <button onClick={() => { setShowModal(false); setEditingModel(null); }} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('vmodels_name')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="Pulsar N160"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('vmodels_make')}</label>
                  <input
                    required
                    value={form.make}
                    onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="Bajaj"
                  />
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
                    editingModel ? t('vmodels_save') : t('vmodels_create')
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
