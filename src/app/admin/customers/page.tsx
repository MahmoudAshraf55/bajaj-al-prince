'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import fetcher from '@/lib/fetcher';
import type { Customer } from '@/types';
import {
  Search, Plus, User,
  AlertCircle, Car,
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import PageSpinner from '@/components/ui/PageSpinner';
import Modal from '@/components/ui/Modal';

interface CustomersResponse {
  success: boolean;
  data: {
    customers: Customer[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
  error?: string;
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) params.set('search', search);
    return `/api/customers/?${params.toString()}`;
  }, [page, search]);

  const { data, error, isLoading, mutate } = useSWR<CustomersResponse>(swrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: true,
  });

  const customers = data?.data?.customers ?? [];
  const meta = data?.data?.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    if (field === 'name' && !value.trim()) error = t('crm_name_phone_required');
    if (field === 'phone' && !value.trim()) error = t('crm_name_phone_required');
    setFormErrors((prev) => {
      if (error) return { ...prev, [field]: error };
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('crm_name_phone_required');
    if (!form.phone.trim()) errs.phone = t('crm_name_phone_required');
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', t('crm_customer_created'));
        setForm({ name: '', phone: '', email: '', address: '' });
        setFormErrors({});
        setShowModal(false);
        mutate();
      } else {
        setServerError(json.error || json.errors?.[0]?.message || t('crm_failed_create'));
      }
    } catch {
      setServerError(t('crm_network_error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error && !customers.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('crm_error_loading')}</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <button
            onClick={() => mutate()}
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallback="/admin/dashboard/" />
            <h2 className="text-2xl font-bold">{t('crm_customer_management')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('crm_search_customer_placeholder')}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('crm_add_customer')}
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_customer_name')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_customer_phone')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_customer_email')}</th>
                  <th scope="col" className="text-left px-5 py-3 font-medium">{t('crm_customer_vehicles')}</th>
                  <th scope="col" className="text-right px-5 py-3 font-medium">{t('crm_customer_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers?.map((c: Customer) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{c.phone}</td>
                    <td className="px-5 py-4 text-muted-foreground">{c.email || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        <Car className="w-3 h-3" />
                        {c._count?.vehicles || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/customers/${c.id}/`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t('crm_view_profile')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!customers || customers.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      {t('crm_no_customers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            meta={meta}
            onPageChange={setPage}
            showingLabel={t('crm_pagination_showing')}
            ofLabel={t('crm_pagination_of')}
          />
        </div>
      </motion.div>

      {/* Add Customer Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setFormErrors({}); setServerError(''); }} title={t('crm_add_customer_modal')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_full_name')}</label>
            <input
              required
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (formErrors.name) validateField('name', e.target.value);
              }}
              onBlur={() => validateField('name', form.name)}
              className={`w-full px-4 py-2.5 rounded-xl bg-input border ${formErrors.name ? 'border-red-400' : 'border-border'} text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm`}
              placeholder="John Doe"
            />
            {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_phone')}</label>
            <input
              required
              value={form.phone}
              onChange={(e) => {
                setForm((f) => ({ ...f, phone: e.target.value }));
                if (formErrors.phone) validateField('phone', e.target.value);
              }}
              onBlur={() => validateField('phone', form.phone)}
              className={`w-full px-4 py-2.5 rounded-xl bg-input border ${formErrors.phone ? 'border-red-400' : 'border-border'} text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm`}
              placeholder="+20 123 456 7890"
            />
            {formErrors.phone && <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_email_label')}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_address')}</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              placeholder="Street, City"
            />
          </div>
          {serverError && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {serverError}
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
              t('crm_create_customer')
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
