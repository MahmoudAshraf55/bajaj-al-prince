'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, X, CheckCircle, Clock, Wrench, Edit3 } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';

interface WorkOrderItem {
  id: string;
  description: string;
  status: string;
  cost: number | null;
  vehicleId: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    plateNumber: string | null;
    customer: { id: string; name: string; phone: string | null } | null;
  };
  createdAt: string;
  updatedAt: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  in_progress: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-green-500/10 text-green-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Wrench,
  completed: CheckCircle,
  cancelled: X,
};

export default function WorkOrdersPage() {
  const { t, language } = useTranslation();
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const [updating, setUpdating] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkOrderItem | null>(null);
  const [editForm, setEditForm] = useState({ description: '', cost: '' });

  const statusLabels: Record<string, string> = {
    pending: t('wo_status_pending'),
    in_progress: t('wo_status_in_progress'),
    completed: t('wo_status_completed'),
    cancelled: t('wo_status_cancelled'),
  };

  const fetchWorkOrders = async () => {
    const res = await fetch('/api/v1/work-orders/?limit=100', { credentials: 'include' });
    const json = await res.json();
    if (json.success) setWorkOrders(json.data.workOrders);
  };

  const fetchVehicles = async () => {
    const res = await fetch('/api/v1/vehicles/?limit=500', { credentials: 'include' });
    const json = await res.json();
    if (json.success) {
      setVehicles(
        json.data.vehicles.map((v: { id: string; make: string; model: string; plateNumber: string | null }) => ({
          id: v.id,
          label: `${v.make} ${v.model}${v.plateNumber ? ` (${v.plateNumber})` : ''}`,
        }))
      );
    }
  };

  useEffect(() => {
    fetchWorkOrders().finally(() => setLoading(false));
    fetchVehicles();
  }, []);

  const createWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/v1/work-orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        vehicleId: form.vehicleId,
        description: form.description,
        cost: form.cost ? parseFloat(form.cost) : undefined,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setWorkOrders((prev) => [json.data.workOrder, ...prev]);
      setShowCreate(false);
      setForm({ vehicleId: '', description: '', cost: '' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const res = await fetch(`/api/v1/work-orders/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setWorkOrders((prev) => prev.map((wo) => (wo.id === id ? { ...wo, status } : wo)));
    }
    setUpdating(null);
  };

  const openEdit = (wo: WorkOrderItem) => {
    setEditing(wo);
    setEditForm({ description: wo.description, cost: wo.cost ? String(wo.cost) : '' });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setUpdating(editing.id);
    const body: Record<string, unknown> = { description: editForm.description };
    if (editForm.cost) body.cost = parseFloat(editForm.cost);
    const res = await fetch(`/api/v1/work-orders/${editing.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        setWorkOrders((prev) => prev.map((wo) => (wo.id === editing.id ? json.data.workOrder : wo)));
      }
    }
    setUpdating(null);
    setEditing(null);
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
          <h2 className="text-2xl font-bold">{t('wo_title')}</h2>
          <p className="text-muted-foreground text-sm">{t('wo_subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t('wo_new')}
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t('wo_create')}</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createWorkOrder} className="space-y-4">
              <select
                required
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm"
              >
                <option value="">{t('wo_select_vehicle')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <textarea
                required
                placeholder={t('wo_describe_work')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm min-h-[100px]"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={t('wo_cost_optional')}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
              >
                {t('wo_create_btn')}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('wo_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        {workOrders
          .filter((wo) =>
            wo.description.toLowerCase().includes(search.toLowerCase()) ||
            wo.vehicle.make.toLowerCase().includes(search.toLowerCase()) ||
            wo.vehicle.model.toLowerCase().includes(search.toLowerCase())
          )
          .map((wo) => {
            const StatusIcon = statusIcons[wo.status] || Clock;
            return (
              <div key={wo.id} className="glass rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold">
                      {wo.vehicle.make} {wo.vehicle.model}
                      {wo.vehicle.plateNumber && <span className="text-muted-foreground font-normal"> &bull; {wo.vehicle.plateNumber}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {wo.vehicle.customer?.name || t('wo_unknown')} &bull; {new Date(wo.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${statusColors[wo.status] || 'bg-gray-500/10 text-gray-400'}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusLabels[wo.status] || wo.status.replace('_', ' ')}
                    </span>
                    {wo.cost !== null && (
                      <span className="text-sm font-mono font-bold text-primary">{wo.cost.toLocaleString()} EGP</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3 mb-3">{wo.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(wo)}
                    disabled={updating === wo.id}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground text-xs font-medium hover:bg-white/10 disabled:opacity-50"
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />
                    {t('wo_edit')}
                  </button>
                  {wo.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(wo.id, 'in_progress')}
                        disabled={updating === wo.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50"
                      >
                        {t('wo_start')}
                      </button>
                      <button
                        onClick={() => updateStatus(wo.id, 'cancelled')}
                        disabled={updating === wo.id}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {t('wo_cancel')}
                      </button>
                    </>
                  )}
                  {wo.status === 'in_progress' && (
                    <button
                      onClick={() => updateStatus(wo.id, 'completed')}
                      disabled={updating === wo.id}
                      className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50"
                    >
                      {t('wo_complete')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        {workOrders.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t('wo_no_orders')}</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t('wo_edit_title')}</h3>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <textarea
                required
                placeholder={t('wo_describe_work')}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm min-h-[100px]"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={t('wo_cost_optional')}
                value={editForm.cost}
                onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updating === editing.id}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
                >
                  {t('wo_save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-6 py-2.5 rounded-xl bg-white/5 text-muted-foreground font-medium text-sm hover:bg-white/10"
                >
                  {t('wo_cancel_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
