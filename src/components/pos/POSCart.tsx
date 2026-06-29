'use client';

import { ShoppingCart, Minus, Plus, Trash2, Check, Loader2, PlusCircle, X } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';

interface POSCartProps {
  cart: CartItem[];
  t: (key: string) => string;
  subtotal: number;
  taxTotal: number;
  total: number;
  paid: string;
  setPaid: (val: string) => void;
  paymentMethod: string;
  setPaymentMethod: (val: 'cash' | 'card' | 'transfer' | '') => void;
  splitPayments: Array<{ method: 'cash' | 'card' | 'transfer'; amount: string }>;
  setSplitPayments: (val: Array<{ method: 'cash' | 'card' | 'transfer'; amount: string }>) => void;
  remaining: number;
  discount: number;
  setDiscount: (val: number) => void;
  discountType: string;
  setDiscountType: (val: 'amount' | 'percent') => void;
  taxRate: number;
  selectedCustomer: Customer | null;
  setShowCustomerModal: (val: boolean) => void;
  setConfirmSale: (val: boolean) => void;
  saving: boolean;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  change: number;
}

export default function POSCart({
  cart,
  t,
  subtotal,
  taxTotal,
  total,
  paid,
  setPaid,
  paymentMethod,
  setPaymentMethod,
  splitPayments,
  setSplitPayments,
  remaining,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  taxRate,
  selectedCustomer,
  setShowCustomerModal,
  setConfirmSale,
  saving,
  updateQuantity,
  removeFromCart,
  change,
}: POSCartProps) {
  const addSplitPayment = () => {
    setSplitPayments([...splitPayments, { method: 'cash', amount: '' }]);
  };

  const removeSplitPayment = (idx: number) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== idx));
  };

  const updateSplitPayment = (idx: number, field: 'method' | 'amount', value: string) => {
    setSplitPayments(splitPayments.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  return (
    <div className="w-full lg:w-96 xl:w-[28rem] glass ltr:lg:border-l rtl:lg:border-r border-border lg:min-h-[calc(100vh-0px)] flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-bold">{t('pos_cart')} ({cart.length})</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {cart.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>{t('pos_empty_cart')}</p>
          </div>
        )}
        {cart.map((item) => (
          <div key={item.productId} className="glass-light rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                <p className="text-xs text-muted-foreground">{Number(item.unitPrice).toFixed(2)} EGP</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeFromCart(item.productId)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors ml-1">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <div className="text-right mt-1">
              <span className="text-sm font-bold">{item.total.toFixed(2)} EGP</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4 space-y-3">
        <button
          onClick={() => setShowCustomerModal(true)}
          className="w-full text-left px-3 py-2 rounded-xl bg-white/5 text-sm text-muted-foreground hover:bg-white/10 transition-colors"
        >
          {selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ''}` : t('pos_select_customer')}
        </button>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('pos_subtotal')}</span>
            <span>{subtotal.toFixed(2)} EGP</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('pos_discount')}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : subtotal}
                step="0.01"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 text-right px-2 py-1 rounded-lg bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => setDiscountType(discountType === 'amount' ? 'percent' : 'amount')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  discountType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'
                }`}
              >
                {discountType === 'percent' ? '%' : 'EGP'}
              </button>
            </div>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('pos_tax')} ({taxRate}%)</span>
            <span>{taxTotal.toFixed(2)} EGP</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-1 border-t border-border">
            <span>{t('pos_total')}</span>
            <span>{total.toFixed(2)} EGP</span>
          </div>
        </div>

        {/* Split Payments */}
        {splitPayments.length > 0 ? (
          <div className="space-y-2">
            {splitPayments.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
                <select
                  value={p.method}
                  onChange={(e) => updateSplitPayment(idx, 'method', e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {(['cash', 'card', 'transfer'] as const).map((m) => (
                    <option key={m} value={m}>{t(`pos_${m}`)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.amount}
                  onChange={(e) => updateSplitPayment(idx, 'amount', e.target.value)}
                  placeholder={remaining > 0 ? remaining.toFixed(2) : '0.00'}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm text-right focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => removeSplitPayment(idx)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={addSplitPayment}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <PlusCircle className="w-3 h-3" />
              {t('po_add_item') || 'Add Payment'}
            </button>
            {remaining > 0 && (
              <div className="flex justify-between text-sm text-yellow-400 font-medium">
                <span>{t('pos_remaining') || 'Remaining'}</span>
                <span>{remaining.toFixed(2)} EGP</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {(['cash', 'card', 'transfer'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    paymentMethod === method
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {t(`pos_${method}`)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('pos_paid')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder={total.toFixed(2)}
                className="flex-1 px-3 py-2 rounded-xl bg-input border border-border text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={addSplitPayment}
              className="flex items-center justify-center gap-1 w-full text-xs text-primary hover:underline"
            >
              <PlusCircle className="w-3 h-3" />
              {t('pos_split_payment') || 'Split Payment'}
            </button>
          </>
        )}

        {change > 0 && (
          <div className="flex justify-between text-sm text-green-400 font-bold">
            <span>{t('pos_change')}</span>
            <span>{change.toFixed(2)} EGP</span>
          </div>
        )}

        <button
          onClick={() => setConfirmSale(true)}
          disabled={cart.length === 0 || saving || remaining > 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {saving ? t('admin_market_saving') : t('pos_complete_sale')}
        </button>
      </div>
    </div>
  );
}
