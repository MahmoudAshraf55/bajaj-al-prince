'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { Customer, Vehicle, VehicleModel, Booking } from '@/types';
import CustomerTimeline from '@/components/CustomerTimeline';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Car, Plus, Calendar,
  AlertCircle, CheckCircle2, X, Hash, Gauge, Pencil, ChevronDown,
  Wrench, ClipboardList, Clock, Bell, History, Receipt, ArrowRight,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [historyTab, setHistoryTab] = useState<'bookings' | 'timeline' | 'invoices'>('bookings');

  const [form, setForm] = useState({
    make: 'Bajaj', model: '', year: '', chassisNumber: '', plateNumber: '',
  });
  const [formError, setFormError] = useState('');
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [isCustomModel, setIsCustomModel] = useState(false);

  // Booking edit modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({ issue: '' });

  // Work Order modal state
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<Record<string, unknown> | null>(null);
  const [workOrderForm, setWorkOrderForm] = useState({ vehicleId: '', description: '' });
  const [workOrderSubmitting, setWorkOrderSubmitting] = useState(false);

  const fetchCustomer = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const res = await fetchWithRetry(`/api/customers/${customerId}/`, { credentials: 'include', signal });
      const data = await res.json();
      if (data?.success && data?.data?.customer) {
        setCustomer(data.data.customer);
      } else {
        const msg = data?.error || t('crm_customer_not_found');
        setError(msg);
        addToast('error', msg);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : t('crm_failed_load_customer');
      setError(msg);
      addToast('error', msg);
    }
  }, [customerId, t, addToast]);

  useEffect(() => {
    fetchWithRetry('/api/vehicle-models/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, data: { models: [] } })))
      .then((d) => {
        if (d?.success && Array.isArray(d?.data?.models)) {
          setVehicleModels(d.data.models);
        }
      })
      .catch(() => setVehicleModels([]));

    const controller = new AbortController();
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false, error: 'Invalid auth response' })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else {
          setLoading(false);
          fetchCustomer(controller.signal);
        }
      })
      .catch(() => {
        router.push('/admin/');
      });
    return () => controller.abort();
  }, [router, customerId, fetchCustomer]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setIsCustomModel(false);
    setForm({ make: 'Bajaj', model: '', year: '', chassisNumber: '', plateNumber: '' });
    setFormError('');
    setShowVehicleModal(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    const knownModel = vehicleModels.find((m) => m.name === v.model);
    setIsCustomModel(!knownModel);
    setForm({
      make: 'Bajaj',
      model: v.model,
      year: v.year ? String(v.year) : '',
      chassisNumber: v.chassisNumber || '',
      plateNumber: v.plateNumber || '',
    });
    setFormError('');
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.model.trim()) {
      setFormError(t('crm_make_model_required'));
      return;
    }
    setSubmitting(true);
    try {
      const yearVal = form.year.trim() ? parseInt(form.year, 10) : undefined;
      const payload = {
        make: 'Bajaj',
        model: form.model.trim(),
        year: yearVal || undefined,
        chassisNumber: form.chassisNumber.trim() || undefined,
        plateNumber: form.plateNumber.trim() || undefined,
        customerId,
      };
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}/` : '/api/vehicles/';
      const method = editingVehicle ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) {
        addToast('success', editingVehicle ? t('crm_vehicle_updated') : t('crm_vehicle_added'));
        setForm({ make: 'Bajaj', model: '', year: '', chassisNumber: '', plateNumber: '' });
        setIsCustomModel(false);
        setShowVehicleModal(false);
        setEditingVehicle(null);
        fetchCustomer();
      } else {
        setFormError(data?.error || data?.errors?.[0]?.message || t('crm_failed_create'));
      }
    } catch {
      setFormError(t('crm_network_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm(t('crm_remove_vehicle_confirm'))) return;
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      let data: { success?: boolean; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // response body is not valid JSON
      }
      if (res.ok && data?.success) {
        addToast('success', t('crm_vehicle_removed'));
        await fetchCustomer();
      } else {
        addToast('error', data?.error || t('crm_failed_remove_vehicle'));
      }
    } catch {
      addToast('error', t('crm_network_error'));
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        addToast('success', t('crm_status_completed'));
        await fetchCustomer();
      } else {
        addToast('error', data?.error || t('crm_failed_create'));
      }
    } catch {
      addToast('error', t('crm_network_error'));
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!workOrderForm.vehicleId || !workOrderForm.description) {
      addToast('error', t('wo_validation_vehicle_description'));
      return;
    }

    setWorkOrderSubmitting(true);
    try {
      const res = await fetch('/api/v1/work-orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(workOrderForm),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', t('wo_created_success'));
        setShowWorkOrderModal(false);
        setWorkOrderForm({ vehicleId: '', description: '' });
        fetchCustomer();
      } else {
        addToast('error', data.error || t('wo_create_failed'));
      }
    } catch {
      addToast('error', t('crm_network_error'));
    } finally {
      setWorkOrderSubmitting(false);
    }
  };

  const handleOpenIssueEdit = (b: Booking) => {
    setEditingBooking(b);
    setBookingForm({ issue: b.issue });
    setShowBookingModal(true);
  };

  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    try {
      const res = await fetch(`/api/bookings/${editingBooking.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ issue: bookingForm.issue.trim() }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        addToast('success', t('crm_save_actual_issue'));
        setShowBookingModal(false);
        setEditingBooking(null);
        setBookingForm({ issue: '' });
        await fetchCustomer();
      } else {
        addToast('error', data?.error || t('crm_failed_create'));
      }
    } catch {
      addToast('error', t('crm_network_error'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getNextVisitDate = (bookings: Booking[]) => {
    if (!bookings || bookings.length === 0) return null;
    const lastDate = bookings[0].date;
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 30);
    return nextDate.toISOString().split('T')[0];
  };

  const isOverdue = (nextDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(nextDateStr);
    return nextDate < today;
  };

  // Use useMemo to avoid hydration mismatch from Date calculations
  const maxYear = useMemo(() => new Date().getFullYear() + 1, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('crm_error_loading')}</p>
          <p className="text-muted-foreground text-sm">{error || t('crm_customer_not_found')}</p>
          <button
            onClick={() => { setError(''); fetchCustomer(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('crm_retry')}
          </button>
          <Link
            href="/admin/customers/"
            className="block mt-2 text-sm text-primary hover:underline"
          >
            {t('crm_back_to_customers')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/customers/" className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-bold">{t('crm_customer_profile')}</h2>
        </div>

        {/* Profile Card */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold">{customer.name}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {customer.phone}
                </span>
                {customer.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {customer.email}
                  </span>
                )}
                {customer.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {customer.address}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Calendar className="w-3 h-3" />
                {t('crm_customer_since')} {new Date(customer.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Garage Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {t('crm_garage')} ({customer?.vehicles?.length ?? 0})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWorkOrderModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <Wrench className="w-4 h-4" />
                {t('wo_create')}
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('crm_add_vehicle')}
              </button>
            </div>
          </div>

          {customer?.vehicles && customer.vehicles.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customer?.vehicles?.map((v: Vehicle) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass rounded-2xl p-5 relative group"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title={t('crm_edit_vehicle')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      title={t('crm_remove_vehicle')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{v.make} {v.model}</p>
                      {v.year && <p className="text-xs text-muted-foreground">{v.year}</p>}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {v.plateNumber && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono">{v.plateNumber}</span>
                      </div>
                    )}
                    {v.chassisNumber && (
                      <div className="flex items-center gap-2">
                        <Gauge className="w-3 h-3" />
                        <span className="font-mono">{v.chassisNumber}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t('crm_no_vehicles_garage')}</p>
              <button
                onClick={() => setShowVehicleModal(true)}
                className="mt-3 text-sm text-primary font-medium hover:underline"
              >
                {t('crm_add_first_vehicle')}
              </button>
            </div>
          )}
        </div>

        {/* History Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setHistoryTab('bookings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              historyTab === 'bookings'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            {t('crm_service_history')} ({customer?.bookings?.length ?? 0})
          </button>
          <button
            onClick={() => setHistoryTab('timeline')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              historyTab === 'timeline'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            {t('crm_timeline')}
          </button>
          <button
            onClick={() => setHistoryTab('invoices')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              historyTab === 'invoices'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            {t('crm_invoices_tab').replace('{count}', String(customer?.invoices?.length ?? 0))}
          </button>
        </div>

        {historyTab === 'timeline' ? (
          <CustomerTimeline customerId={customerId} />
        ) : historyTab === 'invoices' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t('crm_purchase_history')}</h3>
              {customer?.invoices && customer.invoices.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t('crm_total_spent')} <span className="text-primary font-bold">
                    {customer.invoices.reduce((sum, inv) => sum + Number(inv.total), 0).toLocaleString()} EGP
                  </span>
                </div>
              )}
            </div>
            {customer?.invoices && customer.invoices.length > 0 ? (
              <div className="space-y-3">
                {customer.invoices.map((inv, idx) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{inv.number}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{Number(inv.total).toLocaleString()} EGP</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          inv.status === 'confirmed' && Number(inv.paid) >= Number(inv.total) ? 'bg-green-500/10 text-green-400' :
                          inv.status === 'confirmed' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setInvoiceDetail(inv as unknown as Record<string, unknown>)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t('crm_view_details')}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-8 text-center">
                <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t('crm_no_invoices')}</p>
              </div>
            )}
          </>
        ) : (
          <>
            {customer?.bookings && customer.bookings.length > 0 && (
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {t('crm_next_visit')}: <span className="text-primary font-medium">{getNextVisitDate(customer.bookings)}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Next Visit Alert Card */}
            {customer?.bookings && customer.bookings.length > 0 && (() => {
              const nextDate = getNextVisitDate(customer.bookings);
              if (!nextDate) return null;
              const overdue = isOverdue(nextDate);
              return (
                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
                  overdue
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-primary/5 border-primary/20'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    overdue ? 'bg-red-500/10' : 'bg-primary/10'
                  }`}>
                    <Calendar className={`w-5 h-5 ${overdue ? 'text-red-400' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${overdue ? 'text-red-400' : 'text-primary'}`}>
                      {overdue ? t('crm_overdue_visit') : t('crm_upcoming_visit')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {overdue
                        ? t('crm_overdue_visit_desc').replace('{date}', nextDate)
                        : t('crm_upcoming_visit_desc').replace('{date}', nextDate)
                      }
                    </p>
                  </div>
                </div>
              );
            })()}

            {customer?.bookings && customer.bookings.length > 0 ? (
              <div className="space-y-3">
                {customer.bookings.map((b: Booking, idx: number) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{b.model}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{b.date}</span>
                            <Clock className="w-3 h-3 ml-1" />
                            <span>{b.time}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(b.status)}`}>
                        {b.status === 'pending' && t('crm_status_pending')}
                        {b.status === 'accepted' && t('crm_status_accepted')}
                        {b.status === 'completed' && t('crm_status_completed')}
                        {b.status === 'rejected' && t('crm_status_rejected')}
                      </span>
                    </div>

                    <div className={`rounded-xl p-3 ${
                      b.status === 'completed'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-secondary/30'
                    }`}>
                      <p className={`text-xs mb-1 flex items-center gap-1 ${
                        b.status === 'completed' ? 'text-green-400' : 'text-muted-foreground'
                      }`}>
                        <AlertCircle className="w-3 h-3" /> {t('crm_issue_description')}
                      </p>
                      <p className={`text-sm ${b.status === 'completed' ? 'text-green-300' : 'text-foreground'}`}>
                        {b.issue}
                      </p>
                    </div>

                    {b.status !== 'completed' && b.status !== 'rejected' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleMarkCompleted(b.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium hover:bg-green-500/20 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {t('crm_maintenance_done')}
                        </button>
                        <button
                          onClick={() => handleOpenIssueEdit(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          {t('crm_issue_changed')}
                        </button>
                      </div>
                    )}

                    {b.vehicle && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Car className="w-3 h-3" />
                        <span>{b.vehicle.make} {b.vehicle.model}</span>
                        {b.vehicle.plateNumber && (
                          <span className="font-mono">· {b.vehicle.plateNumber}</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-8 text-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t('crm_no_service_history')}</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  {t('crm_no_service_history_desc')}
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {showVehicleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVehicleModal(false)}
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
                <h3 className="text-lg font-bold">{editingVehicle ? t('crm_edit_vehicle') : t('crm_add_vehicle')}</h3>
                <button
                  onClick={() => { setShowVehicleModal(false); setEditingVehicle(null); }}
                  className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveVehicle} className="space-y-4">
                {/* Make (fixed Bajaj) */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle_make')}</label>
                  <input
                    readOnly
                    value="Bajaj"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground focus:outline-none cursor-not-allowed text-sm"
                  />
                </div>
                {/* Model dropdown */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle_model')}</label>
                  <div className="relative">
                    <select
                      required
                      value={isCustomModel ? '__other__' : form.model}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__other__') {
                          setIsCustomModel(true);
                          setForm((f) => ({ ...f, model: '' }));
                        } else {
                          setIsCustomModel(false);
                          setForm((f) => ({ ...f, model: val }));
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-10 text-sm"
                    >
                      <option value="">{t('booking_select_model')}</option>
                      {vehicleModels.map((m) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                      <option value="__other__">{t('booking_model_other')}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {/* Custom model input */}
                {isCustomModel && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('booking_custom_model')}</label>
                    <input
                      required
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      placeholder="Pulsar 150"
                    />
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle_year')}</label>
                    <input
                      type="number"
                      min="1900"
                      max={maxYear}
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      placeholder="2023"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_plate_number')}</label>
                    <input
                      value={form.plateNumber}
                      onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      placeholder="ABC-1234"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_chassis_number')}</label>
                  <input
                    value={form.chassisNumber}
                    onChange={(e) => setForm((f) => ({ ...f, chassisNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
                    placeholder="MLHJC..."
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
                    editingVehicle ? t('crm_update_vehicle_btn') : t('crm_add_vehicle_btn')
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Issue Edit Modal */}
      <AnimatePresence>
        {showBookingModal && editingBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowBookingModal(false); setEditingBooking(null); }}
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
                <h3 className="text-lg font-bold">{t('crm_actual_issue')}</h3>
                <button
                  onClick={() => { setShowBookingModal(false); setEditingBooking(null); }}
                  className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveIssue} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t('crm_issue_description')}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={bookingForm.issue}
                    onChange={(e) => setBookingForm({ issue: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                    placeholder={t('booking_issue_ph')}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowBookingModal(false); setEditingBooking(null); }}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/80 transition-colors"
                  >
                    {t('crm_cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-600/90 transition-colors disabled:opacity-50"
                  >
                    {t('crm_save_actual_issue')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Work Order Create Modal */}
      <AnimatePresence>
        {showWorkOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWorkOrderModal(false)}
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
                <h3 className="text-lg font-bold">{t('wo_create')}</h3>
                <button
                  onClick={() => setShowWorkOrderModal(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle')}</label>
                  <select
                    required
                    value={workOrderForm.vehicleId}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, vehicleId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="">{t('wo_select_vehicle')}</option>
                    {customer?.vehicles?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} {v.plateNumber ? `(${v.plateNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_description')}</label>
                  <textarea
                    required
                    rows={4}
                    value={workOrderForm.description}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                    placeholder={t('wo_describe_work')}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWorkOrderModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/80 transition-colors"
                  >
                    {t('crm_cancel')}
                  </button>
                  <button
                    onClick={handleCreateWorkOrder}
                    disabled={workOrderSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {workOrderSubmitting ? t('wo_creating') : t('wo_create')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {invoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInvoiceDetail(null)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" className="glass rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t('crm_invoice_detail') || 'Invoice Detail'}</h3>
              <button onClick={() => setInvoiceDetail(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_invoice_number')}</span><span className="font-mono">{invoiceDetail.number as string}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('crm_invoice_type') || 'Type'}</span><span>{(invoiceDetail.type as string) || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('crm_status') || 'Status'}</span><span>{(invoiceDetail.status as string) || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_subtotal')}</span><span>{Number(invoiceDetail.subtotal || 0).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_tax')}</span><span>{Number(invoiceDetail.taxTotal || 0).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_discount')}</span><span>{Number(invoiceDetail.discount || 0).toFixed(2)} EGP</span></div>
              <hr className="border-border" />
              <div className="flex justify-between font-bold"><span>{t('pos_total')}</span><span>{Number(invoiceDetail.total || 0).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_paid')}</span><span>{Number(invoiceDetail.paid || 0).toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_payment_method') || 'Method'}</span><span>{(invoiceDetail.paymentMethod as string) || '—'}</span></div>
              {typeof invoiceDetail.notes === 'string' && invoiceDetail.notes && <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_notes')}</span><span className="text-xs max-w-[200px] truncate">{invoiceDetail.notes}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">{t('crm_date') || 'Date'}</span><span>{invoiceDetail.createdAt ? new Date(invoiceDetail.createdAt as string).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '—'}</span></div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
