'use client';

import { Search } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Customer } from '@/types/pos';

interface POSCustomerModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (val: Customer | null) => void;
  t: (key: string) => string;
}

export default function POSCustomerModal({
  open,
  onClose,
  customers,
  customerSearch,
  setCustomerSearch,
  selectedCustomer,
  setSelectedCustomer,
  t,
}: POSCustomerModalProps) {
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  return (
    <Modal isOpen={open} onClose={onClose} title={t('pos_select_customer')} contentClassName="max-w-sm">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('admin_search')}
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="max-h-60 overflow-auto space-y-1">
        <button
          onClick={() => { setSelectedCustomer(null); onClose(); }}
          className="w-full text-left px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-white/5 transition-colors"
        >
          — {t('pos_cancel_sale')}
        </button>
        {filteredCustomers.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedCustomer(c); onClose(); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors ${selectedCustomer?.id === c.id ? 'bg-white/10' : ''}`}
          >
            <span className="font-medium">{c.name}</span>
            {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}
