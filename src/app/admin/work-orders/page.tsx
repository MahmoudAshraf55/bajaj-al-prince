'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X, CheckCircle, Clock, Wrench, Edit3, Package, DollarSign, Trash2 } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string | null;
  customer: Customer | null;
}

interface WorkOrderPart {
  id: string;
  productId: string;
  product?: { id: string; name: string; barcode: string | null };
  quantity: number;
  unitPrice: number;
  total: number;
}

interface WorkOrderLabour {
  id: string;
  description: string;
  hours: number | null;
  rate: number | null;
  total: number;
}

interface WorkOrderItem {
  id: string;
  description: string;
  status: string;
  cost: number | null;
  vehicleId: string;
  vehicle: Vehicle;
  parts?: WorkOrderPart[];
  labourLines?: WorkOrderLabour[];
  createdAt: string;
  updatedAt: string | null;
}

interface SimpleProduct {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
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
  const { addToast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const [updating, setUpdating] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkOrderItem | null>(null);
  const [editForm, setEditForm] = useState({ description: '', cost: '' });

  const [manageWo, setManageWo] = useState<WorkOrderItem | null>(null);
  const [manageParts, setManageParts] = useState<WorkOrderPart[]>([]);
  const [manageLabour, setManageLabour] = useState<WorkOrderLabour[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [addLabourOpen, setAddLabourOpen] = useState(false);
  const [labourForm, setLabourForm] = useState({ description: '', hours: '', rate: '', total: '' });
  const [savePartsBusy, setSavePartsBusy] = useState(false);

  const statusLabels: Record<string, string> = {
    pending: t('wo_status_pending'),
    in_progress: t('wo_status_in_progress'),
    completed: t('wo_status_completed'),
    cancelled: t('wo_status_cancelled'),
  };

  const fetchWorkOrders = useCallback(async () => {
    const res = await fetch('/api/v1/work-orders/?limit=100', { credentials: 'include' });
    const json = await res.json();
    if (json.success) setWorkOrders(json.data.workOrders);
  }, []);

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

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/v1/products/?limit=500', { credentials: 'include' });
    const json = await res.json();
    if (json.success) setProducts(json.data.products || []);
  }, []);

  useEffect(() => {
    Promise.all([fetchWorkOrders(), fetchVehicles(), fetchProducts()]).finally(() => setLoading(false));
  }, [fetchWorkOrders, fetchProducts]);

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
      addToast('success', 'Work order created');
    } else {
      addToast('error', json.error || 'Failed');
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
      const json = await res.json();
      if (json.success) {
        setWorkOrders((prev) => prev.map((wo) => (wo.id === id ? json.data.workOrder : wo)));
        addToast('success', `Status changed to ${status}`);
      }
    } else {
      const json = await res.json().catch(() => ({}));
      addToast('error', json.error || 'Failed to update');
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
        addToast('success', 'Work order updated');
      }
    }
    setUpdating(null);
    setEditing(null);
  };

  const openManage = (wo: WorkOrderItem) => {
    setManageWo(wo);
    setManageParts(wo.parts || []);
    setManageLabour(wo.labourLines || []);
    setProductSearch('');
    setShowProductPicker(false);
    setAddLabourOpen(false);
  };

  const addPart = async (product: SimpleProduct) => {
    if (!manageWo) return;
    setSavePartsBusy(true);
    try {
      const res = await fetch(`/api/v1/work-orders/${manageWo.id}/parts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const json = await res.json();
      if (json.success) {
        setManageParts((prev) => [...prev, json.data.part]);
        addToast('success', `${product.name} added`);
      } else {
        addToast('error', json.error || 'Failed');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setSavePartsBusy(false);
      setShowProductPicker(false);
    }
  };

  const removePart = async (partId: string) => {
    if (!manageWo) return;
    const res = await fetch(`/api/v1/work-orders/${manageWo.id}/parts/?partId=${partId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) {
      setManageParts((prev) => prev.filter((p) => p.id !== partId));
    } else {
      addToast('error', 'Failed to remove part');
    }
  };

  const addLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageWo) return;
    const total = labourForm.total ? parseFloat(labourForm.total) : 0;
    if (!labourForm.description.trim() || total <= 0) return;
    setSavePartsBusy(true);
    try {
      const res = await fetch(`/api/v1/work-orders/${manageWo.id}/labour/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: labourForm.description.trim(),
          hours: labourForm.hours ? parseFloat(labourForm.hours) : undefined,
          rate: labourForm.rate ? parseFloat(labourForm.rate) : undefined,
          total,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setManageLabour((prev) => [...prev, json.data.labour]);
        setLabourForm({ description: '', hours: '', rate: '', total: '' });
        setAddLabourOpen(false);
        addToast('success', 'Labour line added');
      } else {
        addToast('error', json.error || 'Failed');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setSavePartsBusy(false);
    }
  };

  const removeLabour = async (labourId: string) => {
    if (!manageWo) return;
    const res = await fetch(`/api/v1/work-orders/${manageWo.id}/labour/?labourId=${labourId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) {
      setManageLabour((prev) => prev.filter((l) => l.id !== labourId));
    } else {
      addToast('error', 'Failed to remove labour line');
    }
  };

  const partsTotal = manageParts.reduce((sum, p) => sum + Number(p.total), 0);
  const labourTotal = manageLabour.reduce((sum, l) => sum + Number(l.total), 0);
  const grandTotal = partsTotal + labourTotal;

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
  });

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
              <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm">
                <option value="">{t('wo_select_vehicle')}</option>
                {vehicles.map((v) => (<option key={v.id} value={v.id}>{v.label}</option>))}
              </select>
              <textarea required placeholder={t('wo_describe_work')} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm min-h-[100px]" />
              <input type="number" step="0.01" min="0" placeholder={t('wo_cost_optional')} value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
                {t('wo_create_btn')}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder={t('wo_search')} value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
            const partCount = (wo.parts || []).length;
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {partCount > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
                        <Package className="w-3 h-3" /> {partCount}
                      </span>
                    )}
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
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openManage(wo)}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <Package className="w-3 h-3 inline mr-1" /> Parts & Labour
                  </button>
                  <button onClick={() => openEdit(wo)} disabled={updating === wo.id}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground text-xs font-medium hover:bg-white/10 disabled:opacity-50">
                    <Edit3 className="w-3 h-3 inline mr-1" /> {t('wo_edit')}
                  </button>
                  {wo.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(wo.id, 'in_progress')} disabled={updating === wo.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50">
                        {t('wo_start')}
                      </button>
                      <button onClick={() => updateStatus(wo.id, 'cancelled')} disabled={updating === wo.id}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50">
                        {t('wo_cancel')}
                      </button>
                    </>
                  )}
                  {wo.status === 'in_progress' && (
                    <button onClick={() => updateStatus(wo.id, 'completed')} disabled={updating === wo.id}
                      className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50">
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
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <textarea required placeholder={t('wo_describe_work')} value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm min-h-[100px]" />
              <input type="number" step="0.01" min="0" placeholder={t('wo_cost_optional')} value={editForm.cost}
                onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm" />
              <div className="flex gap-3">
                <button type="submit" disabled={updating === editing.id}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
                  {t('wo_save')}
                </button>
                <button type="button" onClick={() => setEditing(null)}
                  className="px-6 py-2.5 rounded-xl bg-white/5 text-muted-foreground font-medium text-sm hover:bg-white/10">
                  {t('wo_cancel_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageWo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                {manageWo.vehicle.make} {manageWo.vehicle.model}
              </h3>
              <button onClick={() => { setManageWo(null); fetchWorkOrders(); }} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3 mb-4">{manageWo.description}</p>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> {t('wo_parts')}</h4>
                <button onClick={() => { setShowProductPicker(true); setProductSearch(''); }}
                  disabled={manageWo.status === 'completed' || manageWo.status === 'cancelled'}
                  className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors">
                  <Plus className="w-3 h-3 inline mr-1" /> {t('wo_add_part')}
                </button>
              </div>
              {manageParts.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('wo_no_parts')}</p>
              ) : (
                <div className="space-y-1">
                  {manageParts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium">{p.product?.name || t('wo_unknown')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">x{p.quantity}</span>
                        <span className="font-mono">{Number(p.total).toFixed(2)} EGP</span>
                        {(manageWo.status === 'pending' || manageWo.status === 'in_progress') && (
                          <button onClick={() => removePart(p.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t('wo_labour')}</h4>
                <button onClick={() => { setAddLabourOpen(true); setLabourForm({ description: '', hours: '', rate: '', total: '' }); }}
                  disabled={manageWo.status === 'completed' || manageWo.status === 'cancelled'}
                  className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors">
                  <Plus className="w-3 h-3 inline mr-1" /> {t('wo_add_labour')}
                </button>
              </div>
              {manageLabour.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('wo_no_labour')}</p>
              ) : (
                <div className="space-y-1">
                  {manageLabour.map((l) => (
                    <div key={l.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{l.description}</span>
                        {l.hours && <span className="text-muted-foreground ml-2">({l.hours}h)</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono">{Number(l.total).toFixed(2)} EGP</span>
                        {(manageWo.status === 'pending' || manageWo.status === 'in_progress') && (
                          <button onClick={() => removeLabour(l.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {grandTotal > 0 && (
              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>{t('wo_total')}</span>
                <span>{grandTotal.toFixed(2)} EGP</span>
              </div>
            )}

            {addLabourOpen && (
              <form onSubmit={addLabour} className="mt-4 p-4 bg-white/5 rounded-xl space-y-3">
                <input required placeholder={t('wo_labour_description')} value={labourForm.description}
                  onChange={(e) => setLabourForm({ ...labourForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm" />
                <div className="flex gap-2">
                  <input type="number" step="0.5" min="0" placeholder={t('wo_labour_hours')} value={labourForm.hours}
                    onChange={(e) => {
                      setLabourForm({ ...labourForm, hours: e.target.value });
                      const h = parseFloat(e.target.value) || 0;
                      const r = parseFloat(labourForm.rate) || 0;
                      if (h > 0 && r > 0) setLabourForm((f) => ({ ...f, total: (h * r).toFixed(2) }));
                    }}
                    className="w-1/3 px-3 py-2 rounded-lg bg-input border border-border text-sm" />
                  <input type="number" step="1" min="0" placeholder={t('wo_labour_rate')} value={labourForm.rate}
                    onChange={(e) => {
                      setLabourForm({ ...labourForm, rate: e.target.value });
                      const h = parseFloat(labourForm.hours) || 0;
                      const r = parseFloat(e.target.value) || 0;
                      if (h > 0 && r > 0) setLabourForm((f) => ({ ...f, total: (h * r).toFixed(2) }));
                    }}
                    className="w-1/3 px-3 py-2 rounded-lg bg-input border border-border text-sm" />
                  <input type="number" step="0.01" min="0" required placeholder={t('wo_labour_total')} value={labourForm.total}
                    onChange={(e) => setLabourForm({ ...labourForm, total: e.target.value })}
                    className="w-1/3 px-3 py-2 rounded-lg bg-input border border-border text-sm" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savePartsBusy}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                    {savePartsBusy ? t('wo_saving') : t('wo_add_btn')}
                  </button>
                  <button type="button" onClick={() => setAddLabourOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 text-muted-foreground text-sm">{t('wo_cancel')}</button>
                </div>
              </form>
            )}

            {showProductPicker && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <input autoFocus placeholder={t('wo_search_barcode')} value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && productSearch.trim()) {
                      e.preventDefault();
                      const barcode = productSearch.trim();
                      const match = products.find(p => p.barcode === barcode);
                      if (match) {
                        if (match.stock > 0) {
                          addPart(match);
                          setProductSearch('');
                        } else {
                          addToast('error', 'Product out of stock');
                        }
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm mb-2" />
                <div className="max-h-48 overflow-auto space-y-1">
                  {filteredProducts.slice(0, 30).map((p) => (
                    <button key={p.id} onClick={() => addPart(p)} disabled={savePartsBusy || p.stock < 1}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm disabled:opacity-40 transition-colors flex items-center justify-between">
                      <span>{p.name} {p.barcode && <span className="text-muted-foreground text-xs">({p.barcode})</span>}</span>
                      <span className="text-muted-foreground text-xs">{p.price} EGP {p.stock < 1 && '(out)'}</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-xs text-muted-foreground px-3">No products found</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
