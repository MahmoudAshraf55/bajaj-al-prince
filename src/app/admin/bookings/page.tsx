'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search, Calendar, Clock, User, Phone, Car, AlertCircle, Filter } from 'lucide-react';
import PageSpinner from '@/components/ui/PageSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import fetcher from '@/lib/fetcher';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string | null;
}

interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  model: string;
  issue: string;
  date: string;
  time: string;
  status: string;
  createdAt: string;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  workOrder?: {
    id: string;
    status: string;
  } | null;
}

interface BookingsResponse {
  success: boolean;
  data: {
    bookings: Booking[];
  };
}

const swrKey = '/api/v1/bookings/?limit=100';

export default function BookingsPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<BookingsResponse>(swrKey, fetcher, {
    revalidateOnFocus: true,
  });

  const bookings = data?.data?.bookings ?? [];

  const statusLabels: Record<string, string> = {
    pending: t('crm_status_pending'),
    accepted: t('crm_status_accepted'),
    rejected: t('crm_status_rejected'),
    completed: t('crm_status_completed'),
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/v1/bookings/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        mutate();
        addToast('success', t('bookings_status_changed').replace('{{status}}', statusLabels[status] || status));
      } else {
        addToast('error', json.error || t('bookings_failed_update'));
      }
    } catch {
      addToast('error', t('bookings_network_error'));
    } finally {
      setUpdating(null);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.name.toLowerCase().includes(search.toLowerCase()) ||
      booking.phone.includes(search) ||
      booking.model.toLowerCase().includes(search.toLowerCase()) ||
      booking.issue.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    accepted: bookings.filter((b) => b.status === 'accepted').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  if (isLoading) {
    return (
      <PageSpinner />
    );
  }

  if (error && !bookings.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-2">{t('bookings_failed_load')}</p>
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
    <div className="p-6 sm:p-8 max-w-6xl mx-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('admin_bookings')}</h2>
          <p className="text-muted-foreground text-sm">{t('admin_recent_bookings')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('bookings_total')}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-1">{t('crm_status_pending')}</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-green-500/20">
          <p className="text-xs text-muted-foreground mb-1">{t('crm_status_accepted')}</p>
          <p className="text-2xl font-bold text-green-400">{stats.accepted}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-muted-foreground mb-1">{t('crm_status_rejected')}</p>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('admin_search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">{t('bookings_all_status')}</option>
            <option value="pending">{t('crm_status_pending')}</option>
            <option value="accepted">{t('crm_status_accepted')}</option>
            <option value="rejected">{t('crm_status_rejected')}</option>
            <option value="completed">{t('crm_status_completed')}</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.map((booking) => {
          return (
            <div key={booking.id} className="glass rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{booking.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{booking.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Car className="w-3 h-3" />
                    <span>{booking.model}</span>
                    {booking.vehicle?.plateNumber && <span className="font-mono">· {booking.vehicle.plateNumber}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{booking.date}</span>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{booking.time}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={booking.status} label={statusLabels[booking.status] || booking.status} />
                  {booking.workOrder && (
                    <a
                      href={`/admin/work-orders/${booking.workOrder.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('bookings_view_work_order')}
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{t('bookings_issue')}</span>
                </div>
                <p className="text-sm">{booking.issue}</p>
              </div>

              {booking.status === 'pending' && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => updateStatus(booking.id, 'accepted')}
                    disabled={updating === booking.id}
                    className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                  >
                    {t('admin_accept')}
                  </button>
                  <button
                    onClick={() => updateStatus(booking.id, 'rejected')}
                    disabled={updating === booking.id}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                  >
                    {t('admin_reject')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t('admin_no_bookings2')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
