'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';

import { Search, Plus, Package, Barcode, DollarSign, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import PageSpinner from '@/components/ui/PageSpinner';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
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

interface WorkOrdersResponse {
  success: boolean;
  data: { workOrders: WorkOrderItem[] };
}

interface VehiclesListResponse {
  success: boolean;
  data: { vehicles: { id: string; make: string; model: string; plateNumber: string | null }[] };
}

interface ProductsResponse {
  success: boolean;
  data: { products: SimpleProduct[] };
}

export default function WorkOrdersPage() {
  const { t, language } = useTranslation();
  const { addToast } = useToast();

  const {
    data: woData,
    isLoading,
    mutate: mutateWo,
  } = useSWR<WorkOrdersResponse>('/api/v1/work-orders/?limit=100', fetcher, {
    revalidateOnFocus: true,
  });

  const { data: vData } = useSWR<VehiclesListResponse>('/api/v1/vehicles/?limit=500', fetcher);
  const { data: pData } = useSWR<ProductsResponse>('/api/v1/products/?limit=500', fetcher);

  const workOrders = woData?.data?.workOrders ?? [];

  const vehicles = useMemo(
    () =>
      vData?.data?.vehicles?.map((v) => ({
        id: v.id,
        label: `${v.make} ${v.model}${v.plateNumber ? ` (${v.plateNumber})` : ''}`,
      })) ?? [],
    [vData]
  );

  const products = pData?.data?.products ?? [];

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const [updating, setUpdating] = useState<string | null>(null);

  const [manageWo, setManageWo] = useState<WorkOrderItem | null>(null);
  const [manageParts, setManageParts] = useState<WorkOrderPart[]>([]);
  const [manageLabour, setManageLabour] = useState<WorkOrderLabour[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [addLabourOpen, setAddLabourOpen] = useState(false);
  const [labourForm, setLabourForm] = useState({ description: '', hours: '', rate: '', total: '' });
  const [savePartsBusy, setSavePartsBusy] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [serverTotals, setServerTotals] = useState<{
    partsTotal: number;
    labourTotal: number;
    subtotal: number;
    discountAmount: number;
    taxTotal: number;
    total: number;
  } | null>(null);

  const statusLabels: Record<string, string> = {
    pending: t('wo_status_pending'),
    in_progress: t('wo_status_in_progress'),
    completed: t('wo_status_completed'),
    cancelled: t('wo_status_cancelled'),
  };

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
      mutateWo();
      setShowCreate(false);
      setForm({ vehicleId: '', description: '', cost: '' });
      addToast('success', t('wo_created_toast'));
    } else {
      addToast('error', json.error || t('wo_failed'));
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
        mutateWo();
        addToast('success', t('wo_status_changed', { status }));
      }
    } else {
      const json = await res.json().catch(() => ({}));
      addToast('error', json.error || t('wo_failed_update'));
    }
    setUpdating(null);
  };

  const handleReturn = async (wo: WorkOrderItem) => {
    if (!confirm(t('wo_return_confirm'))) return;
    setUpdating(wo.id);
    try {
      const res = await fetch(`/api/v1/work-orders/${wo.id}/return/`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', t('wo_returned_success'));
        mutateWo();
      } else {
        addToast('error', json.error || t('wo_failed_return'));
      }
    } catch {
      addToast('error', t('wo_network_error'));
    } finally {
      setUpdating(null);
    }
  };

  const openManage = (wo: WorkOrderItem) => {
    setManageWo(wo);
    setManageParts(wo.parts || []);
    setManageLabour(wo.labourLines || []);
    setProductSearch('');
    setShowProductPicker(false);
    setAddLabourOpen(false);
    loadServerTotals(wo.id);
  };

  const loadServerTotals = async (woId: string) => {
    try {
      const res = await fetch(`/api/v1/work-orders/${woId}/totals/`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setServerTotals(json.data);
    } catch {
      setServerTotals(null);
    }
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
        addToast('success', t('wo_part_added', { name: product.name }));
        loadServerTotals(manageWo.id);
      } else {
        addToast('error', json.error || t('wo_failed'));
      }
    } catch {
      addToast('error', t('wo_network_error'));
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
      if (manageWo) loadServerTotals(manageWo.id);
    } else {
      addToast('error', t('wo_failed_remove_part'));
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
        addToast('success', t('wo_labour_added'));
        loadServerTotals(manageWo.id);
      } else {
        addToast('error', json.error || t('wo_failed'));
      }
    } catch {
      addToast('error', t('wo_network_error'));
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
      if (manageWo) loadServerTotals(manageWo.id);
    } else {
      addToast('error', t('wo_failed_remove_labour'));
    }
  };

  const partsTotal = manageParts.reduce((sum, p) => sum + Number(p.total), 0);
  const labourTotal = manageLabour.reduce((sum, l) => sum + Number(l.total), 0);
  const subtotalBeforeDisc = serverTotals?.subtotal ?? (partsTotal + labourTotal);
  const discountAmount = discountType === 'percent' ? subtotalBeforeDisc * (discount / 100) : discount;
  const taxAmount = serverTotals?.taxTotal ?? 0;
  const totalBeforeDiscount = serverTotals?.total ?? (Math.max(0, subtotalBeforeDisc - discountAmount) + taxAmount);
  const grandTotal = Math.max(0, totalBeforeDiscount - discountAmount);
  const paidNum = parseFloat(paymentAmount) || 0;
  const change = paidNum > grandTotal ? paidNum - grandTotal : 0;

  const handleCompleteAndPay = async () => {
    if (!manageWo || !paymentAmount || parseFloat(paymentAmount) <= 0) return;
    setProcessingPayment(true);
    try {
      const res = await fetch(`/api/v1/work-orders/${manageWo.id}/complete-and-pay/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentMethod,
          amountPaid: parseFloat(paymentAmount),
          discount: discountAmount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', t('wo_completed_invoice'));
        // Print receipt
        const inv = json.data?.invoice;
        if (inv) {
          const receiptWindow = window.open('', '_blank', 'width=360,height=600');
          if (receiptWindow) {
            receiptWindow.document.write(`<html dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${t('pos_invoice_number')} ${inv.number || ''}</title><style>body{font-family:monospace;padding:16px;max-width:320px;margin:0 auto}hr{margin:8px 0;border-color:#ddd}.total{font-size:1.2em;font-weight:bold}</style></head><body>
              <h2>${t('wo_invoice') || 'Invoice'}</h2>
              <p><strong>#${inv.number}</strong></p><hr>
              ${manageParts.map(p => `<div>${(p.product?.name || p.id)} x${p.quantity} - ${Number(p.total).toFixed(2)} EGP</div>`).join('')}
              ${manageLabour.map(l => `<div>${l.description} - ${Number(l.total).toFixed(2)} EGP</div>`).join('')}
              <hr><div>${t('pos_subtotal')}: ${subtotalBeforeDisc.toFixed(2)} EGP</div>
              ${discountAmount > 0 ? `<div>${t('pos_discount')}: -${discountAmount.toFixed(2)} EGP</div>` : ''}
              <div>${t('pos_tax')}: ${taxAmount.toFixed(2)} EGP</div>
              <div class="total">${t('pos_total')}: ${grandTotal.toFixed(2)} EGP</div>
              <div>${t('pos_paid')}: ${paidNum.toFixed(2)} EGP</div>
              ${change > 0 ? `<div>${t('pos_change')}: ${change.toFixed(2)} EGP</div>` : ''}
              <hr><small>${new Date().toLocaleString()}</small>
              </body></html>`);
            receiptWindow.document.close();
            receiptWindow.focus();
            setTimeout(() => receiptWindow.print(), 300);
          }
        }
        setShowPaymentModal(false);
        setManageWo(null);
        setServerTotals(null);
        mutateWo();
      } else {
        addToast('error', json.error || t('wo_failed_complete'));
      }
    } catch {
      addToast('error', t('wo_network_error'));
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
  });

  if (isLoading) {
    return (
      <PageSpinner />
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('wo_create')}>
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
      </Modal>

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
                    <StatusBadge status={wo.status} label={statusLabels[wo.status] || wo.status.replace('_', ' ')} />
                    {wo.cost !== null && (
                      <span className="text-sm font-mono font-bold text-primary">{wo.cost.toLocaleString()} EGP</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3 mb-3">{wo.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openManage(wo)}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <Package className="w-3 h-3 inline mr-1" /> {t('wo_parts_labour')}
                  </button>
                  {wo.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(wo.id, 'in_progress')} disabled={updating === wo.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50">
                        {t('wo_start')}
                      </button>
                    </>
                  )}
                  {wo.status === 'in_progress' && (
                    <>
                      <button onClick={() => { setShowPaymentModal(true); setManageWo(wo); loadServerTotals(wo.id); }}
                        className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20">
                        {t('wo_complete_pay')}
                      </button>
                      <button onClick={() => updateStatus(wo.id, 'completed')} disabled={updating === wo.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50">
                        {t('wo_complete')}
                      </button>
                    </>
                  )}
                  {wo.status === 'completed' && (
                    <button onClick={() => handleReturn(wo)} disabled={updating === wo.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50">
                      <RotateCcw className="w-3 h-3 inline mr-1" /> {t('wo_return')}
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

      <Modal isOpen={!!manageWo} onClose={() => { setManageWo(null); setServerTotals(null); mutateWo(); }} title={`${manageWo?.vehicle.make ?? ''} ${manageWo?.vehicle.model ?? ''}`} contentClassName="max-w-2xl max-h-[85vh] overflow-auto">
        {manageWo && (<>
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
                {/* Barcode Scanner */}
                <div className="relative mb-2">
                  <Barcode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input autoFocus placeholder={t('pos_manual_barcode')}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && productSearch.trim()) {
                        e.preventDefault();
                        const q = productSearch.trim();
                        const match = products.find(p => p.barcode === q);
                        if (match) {
                          if (match.stock > 0) { addPart(match); setProductSearch(''); }
                          else { addToast('error', t('wo_out_of_stock')); }
                        }
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                {/* Text Search */}
                <input placeholder={t('wo_search_product')} value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm mb-2" />
                <div className="max-h-48 overflow-auto space-y-1">
                  {filteredProducts.map((p) => (
                    <button key={p.id} onClick={() => addPart(p)} disabled={savePartsBusy || p.stock < 1}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm disabled:opacity-40 transition-colors flex items-center justify-between">
                      <span>{p.name} {p.barcode && <span className="text-muted-foreground text-xs">({p.barcode})</span>}</span>
                      <span className="text-muted-foreground text-xs">{p.price} EGP {p.stock < 1 && '(out)'}</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-xs text-muted-foreground px-3">{t('wo_no_products')}</p>}
                </div>
              </div>
            )}
        </>)}
        </Modal>

      <Modal isOpen={!!showPaymentModal && !!manageWo} onClose={() => setShowPaymentModal(false)} title={t('wo_complete_pay')} contentClassName="max-w-md max-h-[90vh] overflow-auto">
        <div className="space-y-4">
              {/* Invoice Preview */}
              <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_subtotal')}</span><span>{subtotalBeforeDisc.toFixed(2)} EGP</span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t('pos_discount')}</span>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max={discountType === 'percent' ? 100 : subtotalBeforeDisc} step="0.01" value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right px-2 py-1 rounded-lg bg-input border border-border text-xs" />
                    <button onClick={() => setDiscountType(discountType === 'amount' ? 'percent' : 'amount')}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${discountType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-white/5'}`}>
                      {discountType === 'percent' ? '%' : 'EGP'}
                    </button>
                  </div>
                </div>
                {discountAmount > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_discount')}</span><span>-{discountAmount.toFixed(2)} EGP</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_tax')}</span><span>{taxAmount.toFixed(2)} EGP</span></div>
                <hr className="border-border" />
                <div className="flex justify-between text-lg font-bold"><span>{t('pos_total')}</span><span>{grandTotal.toFixed(2)} EGP</span></div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('pos_payment_method')}</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'transfer')}
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm">
                  <option value="cash">{t('pos_cash')}</option>
                  <option value="card">{t('pos_card')}</option>
                  <option value="transfer">{t('pos_transfer')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('wo_amount_paid')}</label>
                <input type="number" step="0.01" min="0" value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={t('wo_enter_amount')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCompleteAndPay(); } }}
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm" />
              </div>
              {change > 0 && (
                <div className="flex justify-between text-green-400 font-bold text-sm">
                  <span>{t('pos_change')}</span>
                  <span>{change.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-muted-foreground font-medium text-sm">
                  {t('wo_cancel')}
                </button>
                <button onClick={() => handleCompleteAndPay()}
                  disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {processingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {processingPayment ? t('wo_processing') : t('wo_complete_pay')}
                </button>
              </div>
            </div>
      </Modal>
    </div>
  );
}
