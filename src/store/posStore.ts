import { create } from 'zustand';
import { CartItem, Customer } from '@/types/pos';

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
}));
