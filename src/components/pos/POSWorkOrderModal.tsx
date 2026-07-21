'use client';

import Modal from '@/components/ui/Modal';
import type { WorkOrder } from '@/types';

interface POSWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  selectedWorkOrderId: string | null;
  setSelectedWorkOrderId: (val: string | null) => void;
  selectedCustomer: { id: string } | null;
  t: (key: string) => string;
}

export default function POSWorkOrderModal({
  open,
  onClose,
  workOrders,
  selectedWorkOrderId,
  setSelectedWorkOrderId,
  selectedCustomer,
  t,
}: POSWorkOrderModalProps) {
  const filtered = selectedCustomer
    ? workOrders.filter((wo) => wo.vehicle?.customerId === selectedCustomer.id)
    : workOrders;

  return (
    <Modal isOpen={open} onClose={onClose} title={t('pos_link_work_order')} contentClassName="max-w-sm">
      <div className="max-h-60 overflow-auto space-y-1">
        <button
          onClick={() => { setSelectedWorkOrderId(null); onClose(); }}
          className="w-full text-left px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-white/5 transition-colors"
        >
          — {t('pos_no_work_order').replace(/^-- /, '')}
        </button>
        {filtered.map((wo) => (
          <button
            key={wo.id}
            onClick={() => { setSelectedWorkOrderId(wo.id); onClose(); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors ${selectedWorkOrderId === wo.id ? 'bg-white/10' : ''}`}
          >
            <span className="font-medium">{wo.vehicle?.model || t('pos_unknown')}</span>
            <span className="text-muted-foreground ml-2">- {wo.description?.substring(0, 30) || t('pos_no_description')}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            {selectedCustomer ? (t('pos_no_work_orders_for_customer') || 'No work orders for this customer') : t('pos_no_pending_work_orders')}
          </p>
        )}
      </div>
    </Modal>
  );
}
