'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BarcodeWebcam from '@/components/BarcodeWebcam';
import {
  Search, X, ShoppingCart, Loader2,
  Check, Printer, FileText, TrendingUp,
} from 'lucide-react';
import { Product, Customer, Invoice } from '@/types/pos';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSInvoiceList from '@/components/pos/POSInvoiceList';
import POSTreasury from '@/components/pos/POSTreasury';
import { printReceipt, POSReceiptStyles, POSReceipt } from '@/components/pos/POSReceipt';
import { parseBarcodeFormat } from '@/lib/barcode-utils';
import { playScanSound } from '@/lib/scan-sound';
import { usePOSStore } from '@/store/posStore';

export default function AdminPOS() {
  const { t, language, isRTL } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'pos' | 'invoices' | 'treasury'>('pos');

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  const {
    cart, setCart,
    discount, setDiscount,
    discountType, setDiscountType,
    paid, setPaid,
    paymentMethod, setPaymentMethod,
    splitPayments, setSplitPayments,
    notes, setNotes,
    taxRate, setTaxRate,
    selectedCustomer, setSelectedCustomer,
    isReturn, setIsReturn,
  } = usePOSStore();

  const [saving, setSaving] = useState(false);
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
  const barcodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      fetch('/api/v1/products/?limit=500', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/v1/customers/', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/v1/settings/', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([pRes, cRes, sRes]) => {
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
      if (sRes.success && sRes.data?.settings?.tax_rate != null) {
        const rate = parseFloat(sRes.data.settings.tax_rate);
        if (!isNaN(rate) && rate >= 0 && rate <= 100) {
          setTaxRate(rate);
        }
      }
    });
  }, [loading, setCart, setTaxRate]);

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
    const params = new URLSearchParams(window.location.search);
    const newBc = params.get('newBarcode');
    if (newBc) {
      setQuickCreateBarcode(newBc);
      window.history.replaceState({}, '', '/admin/pos');
    }
  }, []);

  useEffect(() => {
    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
    if (!manualBarcode) return;
    const { isValid } = parseBarcodeFormat(manualBarcode);
    if (!isValid) return;
    barcodeDebounceRef.current = setTimeout(() => {
      handleBarcodeEnter(manualBarcode);
    }, 150);
    return () => {
      if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualBarcode]);

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
  const taxTotal = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxTotal;

  const splitTotal = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const paidNum = splitPayments.length > 0 ? splitTotal : (parseFloat(paid) || 0);
  const remaining = Math.max(0, total - paidNum);
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
          type: isReturn ? 'return' : 'sale',
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          discount: discountNum,
          paid: paidNum || total,
          paymentMethod: paymentMethod || undefined,
          payments: splitPayments.length > 0
            ? splitPayments
                .filter((p) => parseFloat(p.amount) > 0)
                .map((p) => ({ method: p.method, amount: parseFloat(p.amount) }))
            : undefined,
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
        setSplitPayments([]);
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

  const handleBarcodeSearch = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search) {
      const match = filtered[0];
      if (match) {
        handleSelectProduct(match);
        setSearch('');
        return;
      }
      if (/^[A-Za-z0-9-]+$/.test(search)) {
        try {
          const res = await fetch('/api/v1/barcode/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ barcode: search.trim(), source: 'HH400' }),
          });
          const d = await res.json();
          if (d.success && d.data.found && d.data.product) {
            const scannedProduct: Product = d.data.product;
            if (!scannedProduct.available) {
              addToast('error', t('pos_product_unavailable'));
            } else {
              handleSelectProduct(scannedProduct);
            }
          } else {
            setQuickCreateBarcode(search.trim());
          }
        } catch {
          setQuickCreateBarcode(search.trim());
        }
        setSearch('');
      }
    }
  };

  const handleBarcodeEnter = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    const { isValid } = parseBarcodeFormat(trimmed);
    if (!isValid) {
      addToast('error', t('pos_invalid_barcode'));
      playScanSound(false);
      return;
    }
    const product = products.find((p) => p.barcode === trimmed && p.available);
    if (product) {
      handleSelectProduct(product);
      playScanSound(true);
      setManualBarcode('');
      barcodeInputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch('/api/v1/barcode/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ barcode: trimmed, source: 'HH400' }),
      });
      const d = await res.json();
      if (d.success && d.data.found && d.data.product) {
        const scannedProduct: Product = d.data.product;
        if (!scannedProduct.available) {
          addToast('error', t('pos_product_unavailable'));
          playScanSound(false);
        } else {
          handleSelectProduct(scannedProduct);
          playScanSound(true);
        }
      } else {
        playScanSound(false);
        setQuickCreateBarcode(trimmed);
      }
    } catch {
      playScanSound(false);
      setQuickCreateBarcode(trimmed);
    }
    setManualBarcode('');
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeFromScan = async (barcode: string) => {
    const trimmed = barcode.trim();
    const { isValid } = parseBarcodeFormat(trimmed);
    if (!isValid) {
      addToast('error', t('pos_invalid_barcode'));
      playScanSound(false);
      setShowWebcamScanner(false);
      return;
    }
    const product = products.find((p) => p.barcode === trimmed && p.available);
    if (product) {
      handleSelectProduct(product);
      playScanSound(true);
      setShowWebcamScanner(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/barcode/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ barcode: trimmed, source: 'Webcam' }),
      });
      const d = await res.json();
      if (d.success && d.data.found && d.data.product) {
        const scannedProduct: Product = d.data.product;
        if (!scannedProduct.available) {
          addToast('error', t('pos_product_unavailable'));
          playScanSound(false);
        } else {
          handleSelectProduct(scannedProduct);
          playScanSound(true);
        }
      } else {
        playScanSound(false);
        setQuickCreateBarcode(trimmed);
      }
    } catch {
      playScanSound(false);
      setQuickCreateBarcode(trimmed);
    }
    setShowWebcamScanner(false);
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

  const handleReturnInvoice = async (orig: Invoice) => {
    if (!confirm(`Create return for ${orig.number}? Refund total: ${Number(orig.total).toFixed(2)} EGP`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/invoices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'return',
          items: orig.items.map((item) => ({ productId: item.productId || '', quantity: item.quantity })),
          paid: Number(orig.total),
          paymentMethod: orig.paymentMethod || 'cash',
          notes: `Return for ${orig.number}`,
          customerName: orig.customerName,
        }),
      });
      const d = await res.json();
      if (d.success) {
        addToast('success', `Return ${d.data.invoice.number} created`);
        setDetailInvoice(null);
        await loadInvoices();
      } else {
        addToast('error', d.error || 'Return failed');
      }
    } catch {
      addToast('error', 'Network error');
    } finally {
      setSaving(false);
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



  const tabs = [
    { id: 'pos' as const, label: t('pos_title'), icon: ShoppingCart },
    { id: 'invoices' as const, label: t('pos_invoices'), icon: FileText },
    { id: 'treasury' as const, label: t('admin_cashier'), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
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
              <POSProductGrid
                search={search}
                setSearch={setSearch}
                manualBarcode={manualBarcode}
                setManualBarcode={setManualBarcode}
                filtered={filtered}
                handleSelectProduct={handleSelectProduct}
                handleBarcodeEnter={handleBarcodeEnter}
                handleBarcodeSearch={handleBarcodeSearch}
                setShowWebcamScanner={setShowWebcamScanner}
                searchRef={searchRef}
                barcodeInputRef={barcodeInputRef}
                t={t}
                language={language}
                cart={cart}
              />

              <POSCart
                isReturn={isReturn}
                setIsReturn={setIsReturn}
                cart={cart}
                t={t}
                subtotal={subtotal}
                taxTotal={taxTotal}
                total={total}
                paid={paid}
                setPaid={setPaid}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
                remaining={remaining}
                discount={discount}
                setDiscount={setDiscount}
                discountType={discountType}
                setDiscountType={setDiscountType}
                taxRate={taxRate}
                selectedCustomer={selectedCustomer}
                setShowCustomerModal={setShowCustomerModal}
                setConfirmSale={setConfirmSale}
                saving={saving}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                change={change}
              />
            </div>

            <AnimatePresence>
              {confirmSale && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div key="quick-create-inner" initial={{ scale: 0.95 }} animate={{ scale: 1, transition: { duration: 0.15 } }} exit={{ scale: 0.95, transition: { duration: 0.15 } }} onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true" className="glass rounded-2xl p-6 w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4">{t('pos_confirm_sale')}</h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between"><span>{t('pos_cart')}</span><span>{cart.length} items</span></div>
                      <div className="flex justify-between"><span>{t('pos_subtotal')}</span><span>{subtotal.toFixed(2)} EGP</span></div>
                      <div className="flex justify-between"><span>{t('pos_discount')}</span><span>{discountNum.toFixed(2)} EGP</span></div>
                      <div className="flex justify-between"><span>{t('pos_tax')} ({taxRate}%)</span><span>{taxTotal.toFixed(2)} EGP</span></div>
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
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true" className="glass rounded-2xl p-6 w-full max-w-sm">
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
          <POSInvoiceList
            invLoading={invLoading}
            invoices={invoices}
            invSearch={invSearch}
            setInvSearch={setInvSearch}
            invTypeFilter={invTypeFilter}
            setInvTypeFilter={setInvTypeFilter}
            invStatusFilter={invStatusFilter}
            setInvStatusFilter={setInvStatusFilter}
            invPage={invPage}
            setInvPage={setInvPage}
            invTotalPages={invTotalPages}
            handleCancelInvoice={handleCancelInvoice}
            setDetailInvoice={setDetailInvoice}
            statusColors={statusColors}
            t={t}
          />
        )}

        {activeTab === 'treasury' && (
          <POSTreasury
            treasuryLoading={treasuryLoading}
            treasuryData={treasuryData}
            t={t}
          />
        )}

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
              role="dialog"
              aria-modal="true"
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
                    <th scope="col" className="text-left py-1 font-medium text-muted-foreground">{t('admin_market_name')}</th>
                    <th scope="col" className="text-center py-1 font-medium text-muted-foreground">{t('pos_quantity')}</th>
                    <th scope="col" className="text-right py-1 font-medium text-muted-foreground">{t('admin_market_price')}</th>
                    <th scope="col" className="text-right py-1 font-medium text-muted-foreground">{t('pos_total')}</th>
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
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_tax')} ({taxRate}%)</span><span>{Number(completedInvoiceData.taxTotal).toFixed(2)} EGP</span></div>
                <div className="flex justify-between font-bold text-sm pt-1"><span>{t('pos_total')}</span><span>{Number(completedInvoiceData.total).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('pos_paid')}</span><span>{Number(completedInvoiceData.paid).toFixed(2)} EGP</span></div>
                {Number(completedInvoiceData.change) > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(completedInvoiceData.change).toFixed(2)} EGP</span></div>}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => printReceipt(completedInvoiceData, setReceiptHTML, t, language, taxRate)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
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
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true" className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
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
                    <th scope="col" className="text-left pb-2 font-medium">{t('admin_market_name')}</th>
                    <th scope="col" className="text-center pb-2 font-medium">{t('pos_quantity')}</th>
                    <th scope="col" className="text-right pb-2 font-medium">{t('admin_market_price')}</th>
                    <th scope="col" className="text-right pb-2 font-medium">{t('pos_total')}</th>
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
                <div className="flex justify-between"><span>{t('pos_tax')} ({taxRate}%)</span><span>{Number(detailInvoice.taxTotal).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span>{t('pos_discount')}</span><span>{Number(detailInvoice.discount).toFixed(2)} EGP</span></div>
                <div className="flex justify-between font-bold text-lg"><span>{t('pos_total')}</span><span>{Number(detailInvoice.total).toFixed(2)} EGP</span></div>
                <div className="flex justify-between"><span>{t('pos_paid')}</span><span>{Number(detailInvoice.paid).toFixed(2)} EGP</span></div>
                {Number(detailInvoice.change) > 0 && <div className="flex justify-between text-green-400"><span>{t('pos_change')}</span><span>{Number(detailInvoice.change).toFixed(2)} EGP</span></div>}
              </div>
              {detailInvoice.type === 'sale' && detailInvoice.status === 'confirmed' && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { handleReturnInvoice(detailInvoice); }}
                    className="flex-1 py-2 rounded-xl bg-orange-500/80 text-white text-sm font-medium hover:bg-orange-500 transition-colors">
                    Return Items
                  </button>
                  <button onClick={() => { setDetailInvoice(null); handleCancelInvoice(detailInvoice); }}
                    className="flex-1 py-2 rounded-xl bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-colors">
                    {t('pos_cancel_invoice')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickCreateBarcode && (
          <motion.div key="quick-create" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }} className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setQuickCreateBarcode(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true" className="glass rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{t('pos_quick_create_title')}</h3>
                <button onClick={() => setQuickCreateBarcode(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('pos_barcode_not_found')} <span className="font-mono text-foreground">{quickCreateBarcode}</span>
              </p>
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
                      barcode: (fd.get('barcode') as string) || quickCreateBarcode,
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
                    <label className="text-xs text-muted-foreground mb-1 block">{t('pos_quick_create_barcode')}</label>
                    <input name="barcode" defaultValue={quickCreateBarcode} className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('pos_quick_create_barcode')} dir="ltr" />
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

      <POSReceiptStyles />
      <POSReceipt receiptHTML={receiptHTML} />
    </div>
  );
}
