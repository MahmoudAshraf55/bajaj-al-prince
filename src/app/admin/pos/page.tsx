'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { useTranslation } from '@/components/useTranslation';
import BarcodeWebcam from '@/components/BarcodeWebcam';
import {
  Search, Plus, Minus, Trash2, X, ShoppingCart, LogOut,
  LayoutDashboard, Mail, Calendar, Receipt, Package, Loader2,
  MessageCircle, Wrench, Users, Car, List, Check, Printer, FileText, Camera,
  TrendingUp, DollarSign, Barcode,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  barcode: string | null;
  price: number;
  stock: number;
  category: string;
  image: string | null;
  available: boolean;
}

interface CartItem {
  productId: string;
  barcode: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  type: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  items: InvoiceItem[];
  createdBy: { id: string; username: string };
  createdAt: string;
}

export default function AdminPOS() {
  const { t, language, isRTL } = useTranslation();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'pos' | 'invoices' | 'treasury'>('pos');

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [paid, setPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | ''>('cash');
  const [notes, setNotes] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [confirmSale, setConfirmSale] = useState(false);
  const [completedInvoiceData, setCompletedInvoiceData] = useState<Invoice | null>(null);
  const [receiptHTML, setReceiptHTML] = useState('');
  const [showWebcamScanner, setShowWebcamScanner] = useState(false);
  const [quickCreateBarcode, setQuickCreateBarcode] = useState<string | null>(null);
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [invTypeFilter, setInvTypeFilter] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('');
  const [invPage, setInvPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);
  const [invLoading, setInvLoading] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [treasuryData, setTreasuryData] = useState<{
    todaySales: number;
    todayCount: number;
    cashTotal: number;
    cardTotal: number;
    transferTotal: number;
    todayDiscount: number;
    todayTax: number;
  }>({ todaySales: 0, todayCount: 0, cashTotal: 0, cardTotal: 0, transferTotal: 0, todayDiscount: 0, todayTax: 0 });

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push('/admin/');
        else setLoading(false);
      })
      .catch(() => router.push('/admin/'));
  }, [router]);

  useEffect(() => {
    if (loading) return;
    Promise.all([
      fetch('/api/v1/products/', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/v1/customers/', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([pRes, cRes]) => {
      if (pRes.success) {
        setProducts(pRes.data.products);
        const params = new URLSearchParams(window.location.search);
        const addBc = params.get('addBarcode');
        if (addBc) {
          const product = pRes.data.products.find(
            (p: Product) => p.barcode === addBc && p.available
          );
          if (product) {
            setCart((prev) => {
              const existing = prev.find((item) => item.productId === product.id);
              if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map((item) =>
                  item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
                    : item
                );
              }
              if (product.stock < 1) return prev;
              return [...prev, { productId: product.id, barcode: product.barcode, productName: product.name, unitPrice: product.price, quantity: 1, total: product.price }];
            });
          }
          window.history.replaceState({}, '', '/admin/pos');
        }
      }
      if (cRes.success) setCustomers(cRes.data.customers || []);
    });
  }, [loading]);

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
    const params = new URLSearchParams(window.location.search);
    const newBc = params.get('newBarcode');
    if (newBc) {
      setQuickCreateBarcode(newBc);
      window.history.replaceState({}, '', '/admin/pos');
    }
  }, []);

  const filtered = products.filter((p) => {
    if (!p.available) return false;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(q));
  });

  const handleSelectProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          addToast('error', `${t('pos_insufficient_stock')} ${product.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      if (product.stock < 1) {
        addToast('error', `${t('pos_insufficient_stock')} ${product.name}`);
        return prev;
      }
      return [...prev, { productId: product.id, barcode: product.barcode, productName: product.name, unitPrice: product.price, quantity: 1, total: product.price }];
    });
    setSearch('');
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (!item) return prev;
      const product = products.find((p) => p.id === productId);
      const newQty = item.quantity + delta;
      if (newQty < 1) return prev.filter((i) => i.productId !== productId);
      if (product && newQty > product.stock) {
        addToast('error', `${t('pos_insufficient_stock')} ${product.name}`);
        return prev;
      }
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity: newQty, total: newQty * i.unitPrice } : i
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountNum = discountType === 'percent'
    ? Math.min(subtotal * (discount || 0) / 100, subtotal)
    : Math.min(discount, subtotal);
  const afterDiscount = subtotal - discountNum;
  const taxTotal = afterDiscount * 0.14;
  const total = afterDiscount + taxTotal;
  const paidNum = parseFloat(paid) || 0;
  const change = paidNum >= total ? paidNum - total : 0;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/invoices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'sale',
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          discount: discountNum,
          paid: paidNum || total,
          paymentMethod: paymentMethod || undefined,
          notes: notes || null,
          customerId: selectedCustomer?.id || null,
          customerName: selectedCustomer?.name || null,
        }),
      });
      const d = await res.json();
      if (d.success && d.data.invoice) {
        const inv = d.data.invoice;
        setCompletedInvoiceData({
          id: inv.id,
          number: inv.number,
          type: inv.type,
          status: inv.status,
          subtotal: Number(inv.subtotal),
          taxTotal: Number(inv.taxTotal),
          discount: Number(inv.discount),
          total: Number(inv.total),
          paid: Number(inv.paid),
          change: Number(inv.change),
          paymentMethod: inv.paymentMethod,
          customerName: inv.customerName || selectedCustomer?.name || null,
          customerPhone: selectedCustomer?.phone || null,
          notes: inv.notes || null,
          items: (inv.items || cart).map((item: { productName: string; unitPrice: number; quantity: number; total: number; id?: string; productId?: string }) => ({
            id: item.id || '',
            productId: item.productId || '',
            productName: item.productName,
            unitPrice: Number(item.unitPrice),
            quantity: item.quantity,
            total: Number(item.total),
          })),
          createdBy: { id: '', username: '' },
          createdAt: new Date().toISOString(),
        });
        setCart([]);
        setDiscount(0);
        setPaid('');
        setNotes('');
        setSelectedCustomer(null);
        addToast('success', t('pos_sale_completed'));
      } else {
        addToast('error', d.error || t('pos_sale_failed'));
      }
    } catch {
      addToast('error', t('pos_sale_failed'));
    } finally {
      setSaving(false);
      setConfirmSale(false);
    }
  };

  const handleBarcodeSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search) {
      const match = filtered[0];
      if (match) {
        handleSelectProduct(match);
      } else if (/^[A-Za-z0-9-]+$/.test(search)) {
        setQuickCreateBarcode(search);
        setSearch('');
      }
    }
  };

  const handleBarcodeEnter = (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    const product = products.find((p) => p.barcode === trimmed && p.available);
    if (product) {
      handleSelectProduct(product);
    } else {
      setQuickCreateBarcode(trimmed);
    }
    setManualBarcode('');
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeFromScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode && p.available);
    if (product) {
      handleSelectProduct(product);
      setShowWebcamScanner(false);
    } else {
      setShowWebcamScanner(false);
      setQuickCreateBarcode(barcode);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    router.push('/admin/');
  };

  const loadInvoices = useCallback(async () => {
    setInvLoading(true);
    const params = new URLSearchParams({ page: String(invPage), limit: '20' });
    if (invSearch) params.set('search', invSearch);
    if (invTypeFilter) params.set('type', invTypeFilter);
    if (invStatusFilter) params.set('status', invStatusFilter);
    const res = await fetch(`/api/v1/invoices/?${params}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) {
      setInvoices(d.data.invoices);
      setInvTotalPages(d.data.meta.totalPages);
    }
    setInvLoading(false);
  }, [invPage, invSearch, invTypeFilter, invStatusFilter]);

  useEffect(() => {
    if (loading || activeTab !== 'invoices') return;
    loadInvoices();
  }, [loading, activeTab, loadInvoices]);

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!confirm(`${t('pos_confirm_return')} ${invoice.number}?`)) return;
    const res = await fetch(`/api/v1/invoices/${invoice.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const d = await res.json();
    if (d.success) {
      addToast('success', `${t('pos_cancel_invoice')} ${invoice.number}`);
      await loadInvoices();
    } else {
      addToast('error', d.error || 'Failed');
    }
  };

  const loadTreasury = useCallback(async () => {
    setTreasuryLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/v1/invoices/?limit=500&dateFrom=${today}&dateTo=${today}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) {
      const invoicesData = d.data.invoices as Invoice[];
      const confirmed = invoicesData.filter((inv) => inv.status === 'confirmed' && inv.type === 'sale');
      const data = {
        todaySales: confirmed.reduce((sum, inv) => sum + Number(inv.total), 0),
        todayCount: confirmed.length,
        cashTotal: confirmed.filter((inv) => inv.paymentMethod === 'cash').reduce((sum, inv) => sum + Number(inv.total), 0),
        cardTotal: confirmed.filter((inv) => inv.paymentMethod === 'card').reduce((sum, inv) => sum + Number(inv.total), 0),
        transferTotal: confirmed.filter((inv) => inv.paymentMethod === 'transfer').reduce((sum, inv) => sum + Number(inv.total), 0),
        todayDiscount: confirmed.reduce((sum, inv) => sum + Number(inv.discount), 0),
        todayTax: confirmed.reduce((sum, inv) => sum + Number(inv.taxTotal), 0),
      };
      setTreasuryData(data);
    }
    setTreasuryLoading(false);
  }, []);

  useEffect(() => {
    if (loading || activeTab !== 'treasury') return;
    loadTreasury();
  }, [loading, activeTab, loadTreasury]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-500/10 text-green-400',
    draft: 'bg-amber-500/10 text-amber-400',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  const generateReceiptHtml = (inv: Invoice) => {
    const customerInfo = inv.customerName
      ? `<p style="margin:0;font-size:12px"><strong>${language === 'ar' ? 'العميل' : 'Customer'}:</strong> ${inv.customerName}${inv.customerPhone ? ` | ${inv.customerPhone}` : ''}</p>`
      : '';

    const itemsHtml = inv.items.map((item) =>
      `<tr>
        <td style="padding:4px 0;font-size:11px">${item.productName}</td>
        <td style="padding:4px 0;font-size:11px;text-align:center">${item.quantity}</td>
        <td style="padding:4px 0;font-size:11px;text-align:right">${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:4px 0;font-size:11px;text-align:right">${Number(item.total).toFixed(2)}</td>
      </tr>`
    ).join('');

    return `
      <div class="receipt-print">
        <div class="header">
          <h1>${t('pos_title')}</h1>
          <p>${language === 'ar' ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}</p>
        </div>
        <div class="divider"></div>
        <div class="meta">
          <p><strong>${t('pos_invoice_number')}:</strong> ${inv.number}</p>
          <p><strong>${t('pos_date')}:</strong> ${new Date(inv.createdAt).toLocaleString()}</p>
          <p><strong>${t('pos_payment_method')}:</strong> ${inv.paymentMethod ? t(`pos_${inv.paymentMethod}`) : '-'}</p>
          ${customerInfo}
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'المنتج' : 'Item'}</th>
              <th class="center">${t('pos_quantity')}</th>
              <th class="right">${t('admin_market_price')}</th>
              <th class="right">${t('pos_total')}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="row"><span>${t('pos_subtotal')}</span><span>${Number(inv.subtotal).toFixed(2)} EGP</span></div>
          ${Number(inv.discount) > 0 ? `<div class="row"><span>${t('pos_discount')}</span><span>-${Number(inv.discount).toFixed(2)} EGP</span></div>` : ''}
          <div class="row"><span>${t('pos_tax')} (14%)</span><span>${Number(inv.taxTotal).toFixed(2)} EGP</span></div>
          <div class="row total"><span>${t('pos_total')}</span><span>${Number(inv.total).toFixed(2)} EGP</span></div>
          <div class="row"><span>${t('pos_paid')}</span><span>${Number(inv.paid).toFixed(2)} EGP</span></div>
          ${Number(inv.change) > 0 ? `<div class="row" style="color:#16a34a"><span>${t('pos_change')}</span><span>${Number(inv.change).toFixed(2)} EGP</span></div>` : ''}
        </div>
        <div class="payment">
          <p>${language === 'ar' ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
        <div class="footer">
          <p>${new Date().toLocaleString()}</p>
        </div>
      </div>`;
  };

  const printReceipt = () => {
    const inv = completedInvoiceData;
    if (!inv) return;
    setReceiptHTML(generateReceiptHtml(inv));
    setTimeout(() => {
      window.print();
      window.onafterprint = () => {
        setReceiptHTML('');
        window.onafterprint = null;
      };
      setTimeout(() => setReceiptHTML(''), 1000);
    }, 150);
  };

  const receiptPrintStyles = `
    @page { margin: 0; size: 80mm auto; }
    @media print {
      body > *:not(#receipt-print-area) { display: none !important; }
      #receipt-print-area { display: block !important; padding: 0; margin: 0; }
      #receipt-print-area .receipt-print {
        width: 80mm; padding: 8mm 4mm; font-size: 12px; color: #000;
        font-family: 'Courier New', monospace; box-sizing: border-box;
      }
      #receipt-print-area .receipt-print * { margin: 0; padding: 0; box-sizing: border-box; }
      #receipt-print-area .header { text-align: center; margin-bottom: 12px; }
      #receipt-print-area .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
      #receipt-print-area .header p { font-size: 11px; color: #555; margin: 1px 0; }
      #receipt-print-area .divider { border-top: 1px dashed #000; margin: 8px 0; }
      #receipt-print-area .meta { font-size: 11px; margin-bottom: 8px; }
      #receipt-print-area .meta p { margin: 2px 0; }
      #receipt-print-area table { width: 100%; border-collapse: collapse; font-size: 11px; }
      #receipt-print-area th { text-align: left; padding: 4px 0; border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; }
      #receipt-print-area th.right { text-align: right; }
      #receipt-print-area th.center { text-align: center; }
      #receipt-print-area .totals { margin-top: 8px; }
      #receipt-print-area .totals .row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
      #receipt-print-area .totals .total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
      #receipt-print-area .payment { text-align: center; margin-top: 10px; font-size: 11px; }
      #receipt-print-area .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #888; border-top: 1px dashed #000; padding-top: 8px; }
    }
  `;

  const tabs = [
    { id: 'pos' as const, label: t('pos_title'), icon: ShoppingCart },
    { id: 'invoices' as const, label: t('pos_invoices'), icon: FileText },
    { id: 'treasury' as const, label: t('admin_cashier'), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <aside className="fixed top-0 ltr:left-0 rtl:right-0 h-full w-64 glass ltr:border-r rtl:border-l border-border hidden md:flex flex-col z-30">
        <div className="p-6 border-b border-border">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          <button onClick={() => router.push('/admin/dashboard/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <LayoutDashboard className="w-4 h-4" />{t('admin_overview')}
          </button>
          <button onClick={() => router.push('/admin/dashboard/?tab=messages')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Mail className="w-4 h-4" />{t('admin_messages')}
          </button>
          <button onClick={() => router.push('/admin/dashboard/?tab=bookings')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Calendar className="w-4 h-4" />{t('admin_bookings')}
          </button>
          <button onClick={() => router.push('/admin/pos/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground transition-all">
            <ShoppingCart className="w-4 h-4" />{t('pos_title')}
          </button>
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">CRM</div>
          <button onClick={() => router.push('/admin/market/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Package className="w-4 h-4" />{t('admin_market')}
          </button>
          <button onClick={() => router.push('/admin/customers/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Users className="w-4 h-4" />{t('admin_customers')}
          </button>
          <button onClick={() => router.push('/admin/vehicles/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Car className="w-4 h-4" />{t('admin_vehicles')}
          </button>
          <button onClick={() => router.push('/admin/vehicle-models/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <List className="w-4 h-4" />{t('admin_vehicle_models')}
          </button>
          <button onClick={() => router.push('/admin/work-orders/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Wrench className="w-4 h-4" />{t('wo_title')}
          </button>
          <button onClick={() => router.push('/admin/whatsapp/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <MessageCircle className="w-4 h-4" />{t('admin_whatsapp')}
          </button>
          <button onClick={() => router.push('/admin/settings/')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <LayoutDashboard className="w-4 h-4" />{t('admin_settings')}
          </button>
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all w-full">
            <LogOut className="w-4 h-4" />{t('admin_sign_out')}
          </button>
        </div>
      </aside>

      <main className="ltr:md:ml-64 rtl:md:mr-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="md:hidden glass border-b border-border p-4 flex items-center justify-between">
            <span className="font-bold">{t('pos_title')}</span>
            <button onClick={logout} className="text-muted-foreground"><LogOut className="w-5 h-5" /></button>
          </div>
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'pos' && (
          <>
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder={t('pos_search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleBarcodeSearch}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder={t('pos_manual_barcode')}
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualBarcode) {
                          handleBarcodeEnter(manualBarcode);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <button
                    onClick={() => setShowWebcamScanner(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {t('pos_scan_webcam')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {search && filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{t('pos_no_products')}</p>
                    </div>
                  )}
                  {search && filtered.map((product) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleSelectProduct(product)}
                      className="glass rounded-2xl p-4 text-left hover:bg-white/10 transition-all group"
                      disabled={product.stock < 1}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0 relative">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="56px" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{language === 'ar' && product.nameAr ? product.nameAr : product.name}</p>
                          {product.barcode && <p className="text-xs text-muted-foreground/60 font-mono">{product.barcode}</p>}
                          <p className="text-sm font-bold text-primary mt-0.5">{Number(product.price).toFixed(2)} EGP</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {!search && cart.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-1">{t('pos_title')}</p>
                    <p className="text-sm">{t('pos_search')}</p>
                  </div>
                )}
              </div>

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
                      <span>{t('pos_tax')}</span>
                      <span>{taxTotal.toFixed(2)} EGP</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-1 border-t border-border">
                      <span>{t('pos_total')}</span>
                      <span>{total.toFixed(2)} EGP</span>
                    </div>
                  </div>

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

                  {change > 0 && (
                    <div className="flex justify-between text-sm text-green-400 font-bold">
                      <span>{t('pos_change')}</span>
                      <span>{change.toFixed(2)} EGP</span>
                    </div>
                  )}

                  <button
                    onClick={() => setConfirmSale(true)}
                    disabled={cart.length === 0 || saving}
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
            </div>

            <AnimatePresence>
              {confirmSale && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div key="quick-create-inner" initial={{ scale: 0.95 }} animate={{ scale: 1, transition: { duration: 0.15 } }} exit={{ scale: 0.95, transition: { duration: 0.15 } }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4">{t('pos_confirm_sale')}</h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between"><span>{t('pos_cart')}</span><span>{cart.length} items</span></div>
                      <div className="flex justify-between"><span>{t('pos_subtotal')}</span><span>{subtotal.toFixed(2)} EGP</span></div>
                      <div className="flex justify-between"><span>{t('pos_discount')}</span><span>{discountNum.toFixed(2)} EGP</span></div>
                      <div className="flex justify-between"><span>{t('pos_tax')}</span><span>{taxTotal.toFixed(2)} EGP</span></div>
                      <div className="flex justify-between font-bold text-lg pt-1 border-t border-border"><span>{t('pos_total')}</span><span>{total.toFixed(2)} EGP</span></div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmSale(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">{t('pos_cancel_sale')}</button>
                      <button onClick={handleCompleteSale} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {t('pos_confirm')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCustomerModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold">{t('pos_select_customer')}</h3>
                      <button onClick={() => setShowCustomerModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                    </div>
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
                      <button onClick={() => { setSelectedCustomer(null); setShowCustomerModal(false); }} className="w-full text-left px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-white/5 transition-colors">
                        — {t('pos_cancel_sale')}
                      </button>
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setShowCustomerModal(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors ${selectedCustomer?.id === c.id ? 'bg-white/10' : ''}`}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {activeTab === 'invoices' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('pos_search_invoices')}
                  value={invSearch}
                  onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={invTypeFilter}
                onChange={(e) => { setInvTypeFilter(e.target.value); setInvPage(1); }}
                className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('pos_invoice_type')}</option>
                <option value="sale">{t('pos_type_sale')}</option>
                <option value="return">{t('pos_type_return')}</option>
                <option value="purchase">{t('pos_type_purchase')}</option>
              </select>
              <select
                value={invStatusFilter}
                onChange={(e) => { setInvStatusFilter(e.target.value); setInvPage(1); }}
                className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('pos_invoice_status')}</option>
                <option value="confirmed">{t('pos_status_confirmed')}</option>
                <option value="draft">{t('pos_status_draft')}</option>
                <option value="cancelled">{t('pos_status_cancelled')}</option>
              </select>
            </div>

            {invLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('pos_history_no_invoices')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-4 flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">{inv.number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status] || ''}`}>
                          {inv.status === 'confirmed' ? t('pos_status_confirmed') : inv.status === 'cancelled' ? t('pos_status_cancelled') : inv.status}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                          {inv.type === 'sale' ? t('pos_type_sale') : inv.type === 'return' ? t('pos_type_return') : inv.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                        {inv.customerName && <span>{inv.customerName}</span>}
                        <span>{inv.createdBy.username}</span>
                        {inv.paymentMethod && <span>{t(`pos_${inv.paymentMethod}`)}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{Number(inv.total).toFixed(2)} EGP</p>
                      <p className="text-xs text-muted-foreground">{inv.items.length} items</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setDetailInvoice(inv)} className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors" title={t('pos_view_detail')}>
                        <FileText className="w-4 h-4" />
                      </button>
                      {inv.status === 'confirmed' && (
                        <button onClick={() => handleCancelInvoice(inv)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title={t('pos_cancel_invoice')}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {invTotalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                  disabled={invPage <= 1}
                  className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                  {t('pos_previous')}
                </button>
                <span className="text-sm text-muted-foreground">{invPage} / {invTotalPages}</span>
                <button
                  onClick={() => setInvPage((p) => Math.min(invTotalPages, p + 1))}
                  disabled={invPage >= invTotalPages}
                  className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                  {t('pos_next')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'treasury' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
            {treasuryLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass rounded-2xl p-5 text-center">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{treasuryData.todaySales.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{t('pos_total_sales')}</p>
                  </div>
                  <div className="glass rounded-2xl p-5 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <p className="text-2xl font-bold">{treasuryData.todayCount}</p>
                    <p className="text-xs text-muted-foreground">{t('pos_invoices_count')}</p>
                  </div>
                  <div className="glass rounded-2xl p-5 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p className="text-2xl font-bold">{treasuryData.todayTax.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{t('pos_tax')}</p>
                  </div>
                  <div className="glass rounded-2xl p-5 text-center">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                    <p className="text-2xl font-bold">{treasuryData.todayDiscount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{t('pos_discount')}</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-5">
                  <h3 className="font-bold mb-4">{t('pos_payment_breakdown')}</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'pos_cash', value: treasuryData.cashTotal, color: 'text-green-400' },
                      { label: 'pos_card', value: treasuryData.cardTotal, color: 'text-blue-400' },
                      { label: 'pos_transfer', value: treasuryData.transferTotal, color: 'text-amber-400' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t(item.label)}</span>
                        <span className={`text-sm font-bold ${item.color}`}>{item.value.toFixed(2)} EGP</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-bold">{t('pos_total')}</span>
                      <span className="font-bold text-lg">{treasuryData.todaySales.toFixed(2)} EGP</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {completedInvoiceData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setCompletedInvoiceData(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto"
          >
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-lg font-bold">{t('pos_sale_completed')}</h2>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-4 text-sm font-mono">
              <div className="text-center mb-3 border-b border-dashed border-white/10 pb-3">
                <p className="font-bold text-base">{t('pos_title')}</p>
                <p className="text-xs text-muted-foreground">{t('pos_invoice_number')}: {completedInvoiceData.number}</p>
              </div>
              <div className="space-y-1 mb-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pos_date')}:</span>
                  <span>{new Date(completedInvoiceData.createdAt).toLocaleString()}</span>
                </div>
                {completedInvoiceData.customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('pos_customer')}:</span>
                    <span>{completedInvoiceData.customerName}{completedInvoiceData.customerPhone ? ` (${completedInvoiceData.customerPhone})` : ''}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pos_payment_method')}:</span>
                  <span>{completedInvoiceData.paymentMethod ? t(`pos_${completedInvoiceData.paymentMethod}`) : '-'}</span>
                </div>
              </div>
              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-1 font-medium text-muted-foreground">{t('admin_market_name')}</th>
                    <th className="text-center py-1 font-medium text-muted-foreground">{t('pos_quantity')}</th>
                    <th className="text-right py-1 font-medium text-muted-foreground">{t('admin_market_price')}</th>
                    <th className="text-right py-1 font-medium text-muted-foreground">{t('pos_total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {completedInvoiceData.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="py-1">{item.productName}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-1 text-right">{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-0.5 text-xs border-t border-dashed border-white/10 pt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_subtotal')}</span><span>{Number(completedInvoiceData.subtotal).toFixed(2)} EGP</span></div>
                {Number(completedInvoiceData.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_discount')}</span><span>-{Number(completedInvoiceData.discount).toFixed(2)} EGP</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_tax')} (14%)</span><span>{Number(completedInvoiceData.taxTotal).toFixed(2)} EGP</span></div>
                <div className="flex justify-between font-bold text-sm pt-1"><span>{t('pos_total')}</span><span>{Number(completedInvoiceData.total).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_paid')}</span><span>{Number(completedInvoiceData.paid).toFixed(2)} EGP</span></div>
                {Number(completedInvoiceData.change) > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(completedInvoiceData.change).toFixed(2)} EGP</span></div>}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={printReceipt} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                <Printer className="w-4 h-4" />
                {t('pos_print')}
              </button>
              <button onClick={() => setCompletedInvoiceData(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
                {t('pos_confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {detailInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetailInvoice(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{detailInvoice.number}</h3>
                <button onClick={() => setDetailInvoice(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="text-xs text-muted-foreground mb-4 space-y-1">
                <p>{t('pos_date')}: {new Date(detailInvoice.createdAt).toLocaleString()}</p>
                <p>{t('pos_invoice_type')}: {detailInvoice.type}</p>
                <p>{t('pos_invoice_status')}: {detailInvoice.status}</p>
                <p>{t('pos_customer')}: {detailInvoice.customerName || '-'}</p>
                <p>{t('pos_payment_method')}: {detailInvoice.paymentMethod || '-'}</p>
                {detailInvoice.notes && <p>{t('pos_notes')}: {detailInvoice.notes}</p>}
                <p>{t('admin_cashier')}: {detailInvoice.createdBy.username}</p>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium">{t('admin_market_name')}</th>
                    <th className="text-center pb-2 font-medium">{t('pos_quantity')}</th>
                    <th className="text-right pb-2 font-medium">{t('admin_market_price')}</th>
                    <th className="text-right pb-2 font-medium">{t('pos_total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailInvoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2 text-right font-medium">{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm border-t border-border pt-3">
                <div className="flex justify-between"><span>{t('pos_subtotal')}</span><span>{Number(detailInvoice.subtotal).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span>{t('pos_tax')}</span><span>{Number(detailInvoice.taxTotal).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span>{t('pos_discount')}</span><span>{Number(detailInvoice.discount).toFixed(2)} EGP</span></div>
                <div className="flex justify-between font-bold text-lg"><span>{t('pos_total')}</span><span>{Number(detailInvoice.total).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span>{t('pos_paid')}</span><span>{Number(detailInvoice.paid).toFixed(2)} EGP</span></div>
                {Number(detailInvoice.change) > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(detailInvoice.change).toFixed(2)} EGP</span></div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickCreateBarcode && (
          <motion.div key="quick-create" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setQuickCreateBarcode(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{t('pos_quick_create_title')}</h3>
                <button onClick={() => setQuickCreateBarcode(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = fd.get('name') as string;
                const price = parseFloat(fd.get('price') as string);
                if (!name || isNaN(price)) return;
                setQuickCreateSaving(true);
                try {
                  const res = await fetch('/api/v1/products/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      name,
                      nameAr: (fd.get('nameAr') as string) || null,
                      barcode: quickCreateBarcode,
                      category: (fd.get('category') as string) || 'Spare Parts',
                      price,
                      stock: parseInt(fd.get('stock') as string) || 1,
                    }),
                  });
                  const d = await res.json();
                  if (d.success) {
                    addToast('success', t('pos_quick_created'));
                    setQuickCreateBarcode(null);
                    const pRes = await fetch('/api/v1/products/', { credentials: 'include' });
                    const pData = await pRes.json();
                    if (pData.success) setProducts(pData.data.products);
                    const newProduct = d.data.product;
                    handleSelectProduct({ id: newProduct.id, name: newProduct.name, nameAr: newProduct.nameAr || null, barcode: newProduct.barcode, price: Number(newProduct.price), stock: newProduct.stock, category: newProduct.category || 'Spare Parts', image: newProduct.image || null, available: true });
                  } else {
                    addToast('error', d.error || 'Failed');
                  }
                } catch {
                  addToast('error', 'Failed to create product');
                } finally {
                  setQuickCreateSaving(false);
                }
              }}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_name')} *</label>
                    <input name="name" required className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('pos_quick_create_name')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_name_ar')}</label>
                    <input name="nameAr" className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('pos_quick_create_name_ar')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_price')} *</label>
                    <input name="price" type="number" step="0.01" min="0" required className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_category')}</label>
                    <input name="category" className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('admin_market_category')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_stock')}</label>
                    <input name="stock" type="number" min="0" className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="1" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setQuickCreateBarcode(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
                      {t('pos_quick_create_skip')}
                    </button>
                    <button type="submit" disabled={quickCreateSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
                      {quickCreateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {quickCreateSaving ? t('pos_quick_create_saving') : t('pos_quick_create_save')}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showWebcamScanner && (
        <BarcodeWebcam
          onScan={handleBarcodeFromScan}
          onClose={() => setShowWebcamScanner(false)}
          t={t}
        />
      )}

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </div>

      <style>{receiptPrintStyles}</style>
      {receiptHTML && <div id="receipt-print-area" dangerouslySetInnerHTML={{ __html: receiptHTML }} />}
    </div>
  );
}
