'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import {
  Search, Plus, ChevronDown, ChevronRight, AlertCircle, X, Pencil,
} from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  type: string;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; code: string } | null;
  children?: Array<{ id: string; name: string; code: string }>;
  description?: string | null;
}

const typeColors: Record<string, string> = {
  asset: 'text-blue-400 bg-blue-500/10',
  liability: 'text-orange-400 bg-orange-500/10',
  equity: 'text-green-400 bg-green-500/10',
  revenue: 'text-purple-400 bg-purple-500/10',
  expense: 'text-red-400 bg-red-500/10',
};

export default function AccountsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', nameAr: '', type: 'asset', parentId: '', description: '',
  });
  const [formError, setFormError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchAccounts = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const url = new URL('/api/v1/accounts/', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (typeFilter) url.searchParams.set('type', typeFilter);
      const res = await fetchWithRetry(url.toString(), { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data?.accounts)) {
        setAccounts(data.data.accounts);
      } else {
        setError(data?.error || t('acct_no_accounts'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : t('acct_no_accounts'));
    }
  }, [search, typeFilter, t]);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else { setLoading(false); }
      })
      .catch(() => {
        router.push('/admin/');
      });
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    fetchAccounts(controller.signal);
    return () => controller.abort();
  }, [loading, search, typeFilter, fetchAccounts]);

  const openAddModal = () => {
    setEditingAccount(null);
    setForm({ code: '', name: '', nameAr: '', type: 'asset', parentId: '', description: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setForm({
      code: acc.code, name: acc.name, nameAr: acc.nameAr || '',
      type: acc.type, parentId: acc.parentId || '', description: acc.description || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.code.trim() || !form.name.trim()) {
      setFormError(t('acct_code_required'));
      return;
    }
    setSubmitting(true);
    try {
      const url = editingAccount ? `/api/v1/accounts/${editingAccount.id}/` : '/api/v1/accounts/';
      const method = editingAccount ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          nameAr: form.nameAr.trim() || undefined,
          type: form.type,
          parentId: form.parentId || undefined,
          description: form.description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', editingAccount ? t('acct_updated') : t('acct_created'));
        setShowModal(false);
        fetchAccounts();
      } else {
        setFormError(data.error || data.errors?.[0]?.message || t('acct_no_accounts'));
      }
    } catch {
      setFormError(t('acct_no_accounts'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootAccounts = accounts.filter((a) => !a.parentId);
  const getChildren = (parentId: string) => accounts.filter((a) => a.parentId === parentId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !accounts.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('acct_no_accounts')}</p>
          <button
            onClick={() => { setError(''); fetchAccounts(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('crm_retry')}
          </button>
        </div>
      </div>
    );
  }

  const renderAccountRow = (acc: Account, depth: number = 0) => {
    const children = getChildren(acc.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(acc.id);

    return (
      <div key={acc.id}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
          onClick={() => hasChildren && toggleExpand(acc.id)}
        >
          <div className="w-5 flex-shrink-0">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : null}
          </div>
          <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{acc.code}</span>
          <span className="flex-1 font-medium text-sm truncate">{acc.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[acc.type] || 'text-gray-400 bg-gray-500/10'}`}>
            {t(`acct_type_${acc.type}`)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(acc); }}
            className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        {hasChildren && isExpanded && children.map((child) => renderAccountRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/dashboard/" />
            <h2 className="text-2xl font-bold">{t('acct_chart_title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('acct_search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('acct_add')}
            </button>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((ft) => (
            <button
              key={ft}
              onClick={() => setTypeFilter(ft)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                typeFilter === ft ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              {ft ? t(`acct_type_${ft}`) : t('admin_all') || 'All'}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-border">
          <div className="divide-y divide-border">
            {rootAccounts.map((acc) => renderAccountRow(acc))}
            {rootAccounts.length === 0 && (
              <div className="px-5 py-8 text-center text-muted-foreground">
                {t('acct_no_accounts')}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Add/Edit Account Modal */}
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
                <h3 className="text-lg font-bold">{editingAccount ? t('acct_edit') : t('acct_add')}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acct_code')}</label>
                    <input
                      required
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      placeholder="1100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acct_type')}</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
                        <option key={type} value={type}>{t(`acct_type_${type}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acct_name')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="Account Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acct_name_ar')}</label>
                  <input
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="اسم الحساب"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('acct_parent')}</label>
                  <select
                    value={form.parentId}
                    onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="">—</option>
                    {accounts.filter((a) => !a.parentId || a.id === form.parentId).map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('sup_notes')}</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
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
                    editingAccount ? t('acct_edit') : t('acct_add')
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
