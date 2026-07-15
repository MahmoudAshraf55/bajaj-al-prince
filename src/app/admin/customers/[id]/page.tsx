'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { Customer, Vehicle, VehicleModel, Booking } from '@/types';
import CustomerInfoCard from '@/components/customers/CustomerInfoCard';
import CustomerVehiclesList from '@/components/customers/CustomerVehiclesList';
import CustomerInvoicesList from '@/components/customers/CustomerInvoicesList';
import CustomerActivityTimeline from '@/components/customers/CustomerActivityTimeline';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import PageSpinner from '@/components/ui/PageSpinner';

export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const params = useParams();
  const customerId = params.id as string;

  const [loading] = useState(false);
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

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({ issue: '' });

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
    fetchCustomer(controller.signal);
    return () => controller.abort();
  }, [customerId, fetchCustomer]);

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

  if (loading) {
    return (
      <PageSpinner />
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
        <div className="flex items-center gap-3">
          <Link href="/admin/customers/" className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-bold">{t('crm_customer_profile')}</h2>
        </div>

        <CustomerInfoCard customer={customer} t={t} />

        <CustomerVehiclesList
          vehicles={customer.vehicles ?? []}
          vehicleModels={vehicleModels}
          t={t}
          onAdd={openAddModal}
          onEdit={openEditModal}
          onDelete={handleDeleteVehicle}
          onCreateWorkOrder={() => setShowWorkOrderModal(true)}
          showVehicleModal={showVehicleModal}
          editingVehicle={editingVehicle}
          form={form}
          setForm={setForm}
          formError={formError}
          isCustomModel={isCustomModel}
          setIsCustomModel={setIsCustomModel}
          submitting={submitting}
          onSaveVehicle={handleSaveVehicle}
          onCloseModal={() => { setShowVehicleModal(false); setEditingVehicle(null); }}
        />

        <CustomerActivityTimeline
          customer={customer}
          customerId={customerId}
          t={t}
          historyTab={historyTab}
          setHistoryTab={setHistoryTab}
          onMarkCompleted={handleMarkCompleted}
          onOpenIssueEdit={handleOpenIssueEdit}
          showBookingModal={showBookingModal}
          editingBooking={editingBooking}
          bookingForm={bookingForm}
          setBookingForm={setBookingForm}
          onSaveIssue={handleSaveIssue}
          onCloseBookingModal={() => { setShowBookingModal(false); setEditingBooking(null); }}
          showWorkOrderModal={showWorkOrderModal}
          setShowWorkOrderModal={setShowWorkOrderModal}
          workOrderForm={workOrderForm}
          setWorkOrderForm={setWorkOrderForm}
          workOrderSubmitting={workOrderSubmitting}
          onCreateWorkOrder={handleCreateWorkOrder}
          submitting={submitting}
        />

        {historyTab === 'invoices' && (
          <CustomerInvoicesList
            invoices={customer.invoices ?? []}
            t={t}
            language="en"
            invoiceDetail={invoiceDetail}
            setInvoiceDetail={setInvoiceDetail}
          />
        )}
      </motion.div>
    </div>
  );
}
