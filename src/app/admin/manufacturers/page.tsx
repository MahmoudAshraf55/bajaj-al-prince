'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Plus, X, AlertCircle, Building2, Trash2, Pencil,
} from 'lucide-react';

interface Manufacturer {
  id: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ManufacturersPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '' });
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const res = await fetchWithRetry('/api/v1/manufacturers/?all=true', { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.manufacturers)) {
        setManufacturers(data.data.manufacturers);
      } else {
        setError(data?.error || 'Failed to load manufacturers');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else {
          setLoading(false);
          const controller = new AbortController();
          fetchData(controller.signal);
          return () => controller.abort();
        }
      })
      .catch(() => router.push('/admin/'));
  }, [router, fetchData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', nameAr: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (m: Manufacturer) => {
    setEditing(m);
    setForm({ name: m.name, nameAr: m.nameAr || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Manufacturer name is required');
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/v1/manufacturers/${editing.id}/` : '/api/v1/manufacturers/';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name.trim(), nameAr: form.nameAr.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', editing ? 'Manufacturer updated' : 'Manufacturer added');
        setShowModal(false);
        fetchData();
      } else {
        setFormError(data.error || data.errors?.[0]?.message || 'Failed to save');
      }
    } catch {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this manufacturer?')) return;
    try {
      const res = await fetch(`/api/v1/manufacturers/${id}/`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        addToast('success', 'Manufacturer removed');
        fetchData();
      } else {
        addToast('error', 'Failed to remove');
      }
    } catch {
      addToast('error', 'Network error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !manufacturers.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">Error</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button onClick={() => { setError(''); fetchData(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/dashboard/" />
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Manufacturers
            </h2>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add Manufacturer
          </button>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="text-left px-5 py-3 font-medium">Name</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">Arabic Name</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {manufacturers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 font-medium">{m.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{m.nameAr || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.isActive ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {manufacturers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      No manufacturers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

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
              role="dialog"
              aria-modal="true"
              className="glass rounded-2xl p-6 w-full max-w-md border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{editing ? 'Edit Manufacturer' : 'Add Manufacturer'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name (English)</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="Bajaj" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name (Arabic)</label>
                  <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="باجاج" />
                </div>
                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formError}
                  </div>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    editing ? 'Save Changes' : 'Create Manufacturer'
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
