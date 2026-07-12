'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Clock, User, Phone, Car, CheckCircle, X, AlertCircle, Filter } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';

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

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  accepted: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
  completed: 'bg-blue-500/10 text-blue-400',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  accepted: CheckCircle,
  rejected: X,
  completed: CheckCircle,
};

export default function BookingsPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    pending: t('crm_status_pending'),
    accepted: t('crm_status_accepted'),
    rejected: t('crm_status_rejected'),
    completed: t('crm_status_completed'),
  };

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/bookings/?limit=100', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setBookings(json.data.bookings || []);
      }
    } catch {
      addToast('error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.success) { router.push('/admin/'); return; }
        fetchBookings();
      })
      .catch(() => { if (!cancelled) router.push('/admin/'); });
    return () => { cancelled = true; };
  }, [router, fetchBookings]);

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
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
        addToast('success', `Status changed to ${status}`);
      } else {
        addToast('error', json.error || 'Failed to update');
      }
    } catch {
      addToast('error', 'Network error');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-green-500/20">
          <p className="text-xs text-muted-foreground mb-1">Accepted</p>
          <p className="text-2xl font-bold text-green-400">{stats.accepted}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-muted-foreground mb-1">Rejected</p>
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
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.map((booking) => {
          const StatusIcon = statusIcons[booking.status] || Clock;
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
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${statusColors[booking.status] || 'bg-gray-500/10 text-gray-400'}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusLabels[booking.status] || booking.status}
                  </span>
                  {booking.workOrder && (
                    <a
                      href={`/admin/work-orders/${booking.workOrder.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View Work Order
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Issue</span>
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
