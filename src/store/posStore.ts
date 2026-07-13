import { create } from 'zustand';
import { CartItem, Customer } from '@/types/pos';

export interface HeldDraft {
  id: string;
  label: string;
  createdAt: string;
  cart: CartItem[];
  discount: number;
  discountType: 'amount' | 'percent';
  paid: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | '';
  splitPayments: Array<{ method: 'cash' | 'card' | 'transfer'; amount: string }>;
  notes: string;
  taxRate: number;
  selectedCustomer: Customer | null;
  isReturn: boolean;
}

interface POSState {
  cart: CartItem[];
  discount: number;
  discountType: 'amount' | 'percent';
  paid: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | '';
  splitPayments: Array<{ method: 'cash' | 'card' | 'transfer'; amount: string }>;
  notes: string;
  taxRate: number;
  selectedCustomer: Customer | null;
  isReturn: boolean;

  // Multi-invoice (held drafts) support — Issue 3
  heldDrafts: HeldDraft[];

  // Actions
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  setDiscount: (discount: number) => void;
  setDiscountType: (type: 'amount' | 'percent') => void;
  setPaid: (paid: string) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'transfer' | '') => void;
  setSplitPayments: (payments: Array<{ method: 'cash' | 'card' | 'transfer'; amount: string }>) => void;
  setNotes: (notes: string) => void;
  setTaxRate: (rate: number) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setIsReturn: (isReturn: boolean) => void;

  // Helpers
  clearCart: () => void;
  holdCart: () => void;
  loadDraft: (id: string) => void;
  removeDraft: (id: string) => void;
}

export const usePOSStore = create<POSState>((set) => ({
  cart: [],
  discount: 0,
  discountType: 'amount',
  paid: '',
  paymentMethod: 'cash',
  splitPayments: [],
  notes: '',
  taxRate: 14,
  selectedCustomer: null,
  isReturn: false,
  heldDrafts: [],

  setCart: (cart) => set((state) => ({ cart: typeof cart === 'function' ? cart(state.cart) : cart })),
  setDiscount: (discount) => set({ discount }),
  setDiscountType: (discountType) => set({ discountType }),
  setPaid: (paid) => set({ paid }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setSplitPayments: (splitPayments) => set({ splitPayments }),
  setNotes: (notes) => set({ notes }),
  setTaxRate: (taxRate) => set({ taxRate }),
  setSelectedCustomer: (selectedCustomer) => set({ selectedCustomer }),
  setIsReturn: (isReturn) => set({ isReturn }),

  clearCart: () => set({
    cart: [],
    discount: 0,
    paid: '',
    splitPayments: [],
    notes: '',
    selectedCustomer: null,
  }),

  holdCart: () => set((state) => {
    if (state.cart.length === 0) return state;
    const draft: HeldDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      label: `Draft ${state.heldDrafts.length + 1}`,
      createdAt: new Date().toISOString(),
      cart: state.cart,
      discount: state.discount,
      discountType: state.discountType,
      paid: state.paid,
      paymentMethod: state.paymentMethod,
      splitPayments: state.splitPayments,
      notes: state.notes,
      taxRate: state.taxRate,
      selectedCustomer: state.selectedCustomer,
      isReturn: state.isReturn,
    };
    return {
      heldDrafts: [...state.heldDrafts, draft],
      cart: [],
      discount: 0,
      paid: '',
      splitPayments: [],
      notes: '',
      selectedCustomer: null,
    };
  }),

  loadDraft: (id) => set((state) => {
    const draft = state.heldDrafts.find((d) => d.id === id);
    if (!draft) return state;
    return {
      heldDrafts: state.heldDrafts.filter((d) => d.id !== id),
      cart: draft.cart,
      discount: draft.discount,
      discountType: draft.discountType,
      paid: draft.paid,
      paymentMethod: draft.paymentMethod,
      splitPayments: draft.splitPayments,
      notes: draft.notes,
      taxRate: draft.taxRate,
      selectedCustomer: draft.selectedCustomer,
      isReturn: draft.isReturn,
    };
  }),

  removeDraft: (id) => set((state) => ({
    heldDrafts: state.heldDrafts.filter((d) => d.id !== id),
  })),
}));
