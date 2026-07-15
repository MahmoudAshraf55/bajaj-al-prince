'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { ShoppingCart, FileText, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BarcodeWebcam from '@/components/BarcodeWebcam';
import PageSpinner from '@/components/ui/PageSpinner';
import { Product, Customer, Invoice } from '@/types/pos';
import type { WorkOrder } from '@/types';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSInvoiceList from '@/components/pos/POSInvoiceList';
import POSTreasury from '@/components/pos/POSTreasury';
import POSPaymentModal from '@/components/pos/POSPaymentModal';
import POSCustomerModal from '@/components/pos/POSCustomerModal';
import POSWorkOrderModal from '@/components/pos/POSWorkOrderModal';
import POSCompletedInvoiceModal from '@/components/pos/POSCompletedInvoiceModal';
import POSInvoiceDetailModal from '@/components/pos/POSInvoiceDetailModal';
import POSQuickCreateModal from '@/components/pos/POSQuickCreateModal';
import { POSReceiptStyles, POSReceipt } from '@/components/pos/POSReceipt';
import { parseBarcodeFormat } from '@/lib/barcode-utils';
import { playScanSound } from '@/lib/scan-sound';
import { usePOSStore } from '@/store/posStore';
import { computePOSTotals } from '@/components/pos/POSTotals';

export default function AdminPOS() {
  const { t, language, isRTL } = useTranslation();
  const { addToast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'pos' | 'invoices' | 'treasury'>('pos');
  const [loading] = useState(false);
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
    heldDrafts, holdCart, loadDraft, removeDraft,
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
  const [manualBarcode, setManualBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [serviceFilter, setServiceFilter] = useState<'all' | 'parts' | 'service'>('all');

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [showWorkOrderSelect, setShowWorkOrderSelect] = useState(false);

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
    todaySales: number; todayCount: number; cashTotal: number;
    cardTotal: number; transferTotal: number; todayDiscount: number; todayTax: number;
  }>({ todaySales: 0, todayCount: 0, cashTotal: 0, cardTotal: 0, transferTotal: 0, todayDiscount: 0, todayTax: 0 });

  const handleOpenInvoice = useCallback((inv: Invoice | null) => {
    if (inv === null) { setDetailInvoice(null); return; }
    if (detailInvoice?.id === inv.id) return;
    setDetailInvoice(null);
    setTimeout(() => setDetailInvoice(inv), 0);
  }, [detailInvoice]);

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
          const product = pRes.data.products.find((p: Product) => p && p.barcode === addBc && p.available);
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
        if (!isNaN(rate) && rate >= 0 && rate <= 100) setTaxRate(rate);
      }
    });
  }, [loading, setCart, setTaxRate]);

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
    const params = new URLSearchParams(window.location.search);
    const newBc = params.get('newBarcode');
    if (newBc) { setQuickCreateBarcode(newBc); window.history.replaceState({}, '', '/admin/pos'); }
  }, []);

  useEffect(() => {
    fetch('/api/v1/work-orders?status=pending,in_progress', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setWorkOrders(d.data.workOrders || []); })
      .catch(() => setWorkOrders([]));
  }, []);

  useEffect(() => {
    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
    if (!manualBarcode) return;
    const { isValid } = parseBarcodeFormat(manualBarcode);
    if (!isValid) return;
    const isCompleteDigitBarcode = /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(manualBarcode.trim());
    if (!isCompleteDigitBarcode) return;
    barcodeDebounceRef.current = setTimeout(() => { handleBarcodeEnter(manualBarcode); }, 500);
    return () => { if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualBarcode]);

  const filtered = products.filter((p) => {
    if (!p || !p.available) return false;
    if (serviceFilter === 'parts' && p.isService) return false;
    if (serviceFilter === 'service' && !p.isService) return false;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)) || (p.nameAr && p.nameAr.toLowerCase().includes(q));
  });

  const handleSelectProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { addToast('error', `${t('pos_insufficient_stock')} ${product.name}`); return prev; }
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item);
      }
      if (product.stock < 1) { addToast('error', `${t('pos_insufficient_stock')} ${product.name}`); return prev; }
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
      if (product && newQty > product.stock) { addToast('error', `${t('pos_insufficient_stock')} ${product.name}`); return prev; }
      return prev.map((i) => i.productId === productId ? { ...i, quantity: newQty, total: newQty * i.unitPrice } : i);
    });
  };

  const removeFromCart = (productId: string) => { setCart((prev) => prev.filter((i) => i.productId !== productId)); };

  const { subtotal, discountNum, taxTotal, total, paidNum, remaining, change } = computePOSTotals(cart, discount, discountType, taxRate, paid, splitPayments);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/invoices/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          type: isReturn ? 'return' : 'sale',
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          discount: discountNum, paid: paidNum >= 0 ? paidNum : total,
          paymentMethod: paymentMethod || undefined,
          payments: splitPayments.length > 0 ? splitPayments.filter((p) => parseFloat(p.amount) > 0).map((p) => ({ method: p.method, amount: parseFloat(p.amount) })) : undefined,
          notes: notes || null, customerId: selectedCustomer?.id || null, customerName: selectedCustomer?.name || null,
          workOrderId: selectedWorkOrderId || null,
        }),
      });
      const d = await res.json();
      if (d.success && d.data.invoice) {
        const inv = d.data.invoice;
        setCompletedInvoiceData({
          id: inv.id, number: inv.number, type: inv.type, status: inv.status,
          subtotal: Number(inv.subtotal), taxTotal: Number(inv.taxTotal), discount: Number(inv.discount),
          total: Number(inv.total), paid: Number(inv.paid), change: Number(inv.change),
          paymentMethod: inv.paymentMethod, customerName: inv.customerName || selectedCustomer?.name || null,
          customerPhone: selectedCustomer?.phone || null, notes: inv.notes || null,
          items: (inv.items || cart).map((item: { productName: string; unitPrice: number; quantity: number; total: number; id?: string; productId?: string }) => ({
            id: item.id || '', productId: item.productId || '', productName: item.productName,
            unitPrice: Number(item.unitPrice), quantity: item.quantity, total: Number(item.total),
          })),
          createdBy: { id: '', username: '' }, createdAt: new Date().toISOString(),
        });
        setCart([]); setDiscount(0); setPaid(''); setSplitPayments([]); setNotes(''); setSelectedCustomer(null);
        addToast('success', t('pos_sale_completed'));
      } else { addToast('error', d.error || t('pos_sale_failed')); }
    } catch { addToast('error', t('pos_sale_failed')); }
    finally { setSaving(false); setConfirmSale(false); }
  };

  const handleBarcodeSearch = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search) {
      const match = filtered[0];
      if (match) { handleSelectProduct(match); setSearch(''); return; }
      if (/^[A-Za-z0-9-]+$/.test(search)) {
        try {
          const res = await fetch('/api/v1/barcode/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ barcode: search.trim(), source: 'HH400' }) });
          const d = await res.json();
          if (d.success && d.data.found && d.data.product) {
            const scannedProduct: Product = d.data.product;
            if (!scannedProduct.available) addToast('error', t('pos_product_unavailable'));
            else handleSelectProduct(scannedProduct);
          } else { setQuickCreateBarcode(search.trim()); }
        } catch { setQuickCreateBarcode(search.trim()); }
        setSearch('');
      }
    }
  };

  const handleBarcodeEnter = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    const { isValid } = parseBarcodeFormat(trimmed);
    if (!isValid) { addToast('error', t('pos_invalid_barcode')); playScanSound(false); return; }
    const product = products.find((p) => p && p.barcode === trimmed && p.available);
    if (product) { handleSelectProduct(product); playScanSound(true); setManualBarcode(''); barcodeInputRef.current?.focus(); return; }
    try {
      const res = await fetch('/api/v1/barcode/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ barcode: trimmed, source: 'HH400' }) });
      const d = await res.json();
      if (d.success && d.data.found && d.data.product) {
        const scannedProduct: Product = d.data.product;
        if (!scannedProduct.available) { addToast('error', t('pos_product_unavailable')); playScanSound(false); }
        else { handleSelectProduct(scannedProduct); playScanSound(true); }
      } else { playScanSound(false); setQuickCreateBarcode(trimmed); }
    } catch { playScanSound(false); setQuickCreateBarcode(trimmed); }
    setManualBarcode(''); barcodeInputRef.current?.focus();
  };

  const handleBarcodeFromScan = async (barcode: string) => {
    const trimmed = barcode.trim();
    const { isValid } = parseBarcodeFormat(trimmed);
    if (!isValid) { addToast('error', t('pos_invalid_barcode')); playScanSound(false); setShowWebcamScanner(false); return; }
    const product = products.find((p) => p && p.barcode === trimmed && p.available);
    if (product) { handleSelectProduct(product); playScanSound(true); setShowWebcamScanner(false); return; }
    try {
      const res = await fetch('/api/v1/barcode/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ barcode: trimmed, source: 'Webcam' }) });
      const d = await res.json();
      if (d.success && d.data.found && d.data.product) {
        const scannedProduct: Product = d.data.product;
        if (!scannedProduct.available) { addToast('error', t('pos_product_unavailable')); playScanSound(false); }
        else { handleSelectProduct(scannedProduct); playScanSound(true); }
      } else { playScanSound(false); setQuickCreateBarcode(trimmed); }
    } catch { playScanSound(false); setQuickCreateBarcode(trimmed); }
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
    if (d.success) { setInvoices(d.data.invoices); setInvTotalPages(d.data.meta.totalPages); }
    setInvLoading(false);
  }, [invPage, invSearch, invTypeFilter, invStatusFilter]);

  useEffect(() => { if (loading || activeTab !== 'invoices') return; loadInvoices(); }, [loading, activeTab, loadInvoices]);

  const handleReturnInvoice = async (orig: Invoice) => {
    if (orig.type !== 'sale') { addToast('error', t('pos_return_sale_only')); return; }
    if (orig.status !== 'confirmed') { addToast('error', t('pos_return_confirmed_only', { status: orig.status })); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/invoices/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          type: 'return', items: orig.items.filter((item) => item.productId).map((item) => ({ productId: item.productId!, quantity: item.quantity })),
          paid: Number(orig.total), paymentMethod: orig.paymentMethod || 'cash', notes: `Return for ${orig.number}`,
          customerName: orig.customerName, returnInvoiceId: orig.id,
        }),
      });
      const d = await res.json();
      if (d.success) { addToast('success', t('pos_return_created', { number: d.data.invoice.number })); setDetailInvoice(null); await loadInvoices(); }
      else { addToast('error', d.error || t('pos_return_failed')); }
    } catch { addToast('error', t('pos_network_error')); }
    finally { setSaving(false); }
  };

  const loadTreasury = useCallback(async () => {
    setTreasuryLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/v1/accounting/treasury/?from=${today}&to=${today}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) setTreasuryData(d.data);
    setTreasuryLoading(false);
  }, []);

  useEffect(() => { if (loading || activeTab !== 'treasury') return; loadTreasury(); }, [loading, activeTab, loadTreasury]);

  if (loading) {
    return (
      <PageSpinner className="bg-background" />
    );
  }

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
              search={search} setSearch={setSearch}
              manualBarcode={manualBarcode} setManualBarcode={setManualBarcode}
              filtered={filtered} handleSelectProduct={handleSelectProduct}
              handleBarcodeEnter={handleBarcodeEnter} handleBarcodeSearch={handleBarcodeSearch}
              setShowWebcamScanner={setShowWebcamScanner}
              searchRef={searchRef} barcodeInputRef={barcodeInputRef}
              t={t} language={language} cart={cart}
              serviceFilter={serviceFilter} setServiceFilter={setServiceFilter}
            />
            <POSCart
              isReturn={isReturn} setIsReturn={setIsReturn}
              cart={cart} t={t} subtotal={subtotal} taxTotal={taxTotal} total={total}
              paid={paid} setPaid={setPaid}
              paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
              splitPayments={splitPayments} setSplitPayments={setSplitPayments}
              remaining={remaining} discount={discount} setDiscount={setDiscount}
              discountType={discountType} setDiscountType={setDiscountType}
              taxRate={taxRate} selectedCustomer={selectedCustomer}
              setShowCustomerModal={setShowCustomerModal} setConfirmSale={setConfirmSale}
              saving={saving} updateQuantity={updateQuantity} removeFromCart={removeFromCart}
              change={change} selectedWorkOrderId={selectedWorkOrderId}
              setShowWorkOrderSelect={setShowWorkOrderSelect}
              heldDrafts={heldDrafts} holdCart={holdCart} loadDraft={loadDraft} removeDraft={removeDraft}
            />
          </div>

          <POSPaymentModal
            open={confirmSale} onClose={() => setConfirmSale(false)} onConfirm={handleCompleteSale}
            saving={saving} cart={cart} subtotal={subtotal} discountNum={discountNum}
            taxTotal={taxTotal} taxRate={taxRate} total={total} t={t}
          />

          <POSCustomerModal
            open={showCustomerModal} onClose={() => setShowCustomerModal(false)}
            customers={customers} customerSearch={customerSearch} setCustomerSearch={setCustomerSearch}
            selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer} t={t}
          />

          <POSWorkOrderModal
            open={showWorkOrderSelect} onClose={() => setShowWorkOrderSelect(false)}
            workOrders={workOrders} selectedWorkOrderId={selectedWorkOrderId}
            setSelectedWorkOrderId={setSelectedWorkOrderId} t={t}
          />
        </>
      )}

      {activeTab === 'invoices' && (
        <POSInvoiceList
          invLoading={invLoading} invoices={invoices}
          invSearch={invSearch} setInvSearch={setInvSearch}
          invTypeFilter={invTypeFilter} setInvTypeFilter={setInvTypeFilter}
          invStatusFilter={invStatusFilter} setInvStatusFilter={setInvStatusFilter}
          invPage={invPage} setInvPage={setInvPage} invTotalPages={invTotalPages}
          handleReturnInvoice={handleReturnInvoice} setDetailInvoice={handleOpenInvoice}
          t={t}
        />
      )}

      {activeTab === 'treasury' && (
        <POSTreasury treasuryLoading={treasuryLoading} treasuryData={treasuryData} t={t} />
      )}

      {completedInvoiceData && (
        <POSCompletedInvoiceModal
          invoice={completedInvoiceData} onClose={() => setCompletedInvoiceData(null)}
          setReceiptHTML={setReceiptHTML} taxRate={taxRate} t={t} language={language}
        />
      )}

      <POSInvoiceDetailModal
        invoice={detailInvoice} onClose={() => setDetailInvoice(null)}
        onReturn={handleReturnInvoice} taxRate={taxRate} t={t}
      />

      <POSQuickCreateModal
        barcode={quickCreateBarcode} onClose={() => setQuickCreateBarcode(null)}
        onProductCreated={handleSelectProduct} t={t} addToast={addToast}
      />

      {showWebcamScanner && (
        <BarcodeWebcam onScan={handleBarcodeFromScan} onClose={() => setShowWebcamScanner(false)} t={t} />
      )}

      <POSReceiptStyles />
      <POSReceipt receiptHTML={receiptHTML} />
    </div>
  );
}
