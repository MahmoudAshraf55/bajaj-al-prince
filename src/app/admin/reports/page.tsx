'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import BackButton from '@/components/BackButton';
import { useToast } from '@/components/ToastContext';
import {
  DollarSign, Package, Users, Download, TrendingUp,
} from 'lucide-react';

type Tab = 'financial' | 'inventory' | 'customers';
type FinancialReport = 'pnl' | 'balance' | 'cashflow';
type InventoryReport = 'summary' | 'low_stock' | 'stock_value';
type CustomerReport = 'top' | 'activity';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('financial');
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [finReport, setFinReport] = useState<FinancialReport>('pnl');
  const [invReport, setInvReport] = useState<InventoryReport>('summary');
  const [custReport, setCustReport] = useState<CustomerReport>('top');

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ success: false })))
      .then((d) => {
        if (!d?.success) router.push('/admin/');
        else setLoading(false);
      })
      .catch(() => router.push('/admin/'));
  }, [router]);

  const generateReport = useCallback(async () => {
    setLoadingReport(true);
    setReportData(null);
    try {
      let url = '';
      if (tab === 'financial') {
        url = `/api/v1/reports/financial/?type=${finReport}`;
      } else if (tab === 'inventory') {
        url = `/api/v1/reports/inventory/?type=${invReport}`;
      } else {
        url = `/api/v1/reports/customers/?type=${custReport}`;
      }
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;

      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      } else {
        addToast('error', data.error || t('rpt_no_data'));
      }
    } catch {
      addToast('error', t('rpt_no_data'));
    } finally {
      setLoadingReport(false);
    }
  }, [tab, finReport, invReport, custReport, fromDate, toDate, t, addToast]);

  const exportExcel = () => {
    let url = '';
    if (tab === 'financial') return; // Financial uses JSON only for now
    if (tab === 'inventory') {
      url = `/api/v1/reports/inventory/?type=${invReport}&format=excel`;
    } else {
      url = `/api/v1/reports/customers/?type=${custReport}&format=excel`;
    }
    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/admin/dashboard/" />
          <h2 className="text-2xl font-bold">{t('rpt_title')}</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { id: 'financial', icon: DollarSign, label: t('rpt_financial') },
            { id: 'inventory', icon: Package, label: t('rpt_inventory') },
            { id: 'customers', icon: Users, label: t('rpt_customers') },
          ] as const).map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id); setReportData(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === tb.id ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <tb.icon className="w-4 h-4" />
              {tb.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="glass rounded-2xl p-4 border border-border">
          <div className="flex flex-wrap items-end gap-3">
            {/* Sub-report selector */}
            {tab === 'financial' && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('rpt_title')}</label>
                <select value={finReport} onChange={(e) => setFinReport(e.target.value as FinancialReport)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="pnl">{t('rpt_profit_loss')}</option>
                  <option value="balance">{t('rpt_balance_sheet')}</option>
                  <option value="cashflow">{t('rpt_cash_flow')}</option>
                </select>
              </div>
            )}
            {tab === 'inventory' && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('rpt_title')}</label>
                <select value={invReport} onChange={(e) => setInvReport(e.target.value as InventoryReport)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="summary">{t('rpt_stock_summary')}</option>
                  <option value="low_stock">{t('rpt_low_stock')}</option>
                  <option value="stock_value">{t('rpt_stock_value')}</option>
                </select>
              </div>
            )}
            {tab === 'customers' && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('rpt_title')}</label>
                <select value={custReport} onChange={(e) => setCustReport(e.target.value as CustomerReport)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="top">{t('rpt_top_customers')}</option>
                  <option value="activity">{t('rpt_customer_activity')}</option>
                </select>
              </div>
            )}

            {/* Date range */}
            {tab !== 'inventory' && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{t('rpt_from')}</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{t('rpt_to')}</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </>
            )}

            <button
              onClick={generateReport}
              disabled={loadingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loadingReport ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              {t('rpt_generate')}
            </button>

            {tab !== 'financial' && reportData && (
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-foreground text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('export_excel')}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {reportData && (
          <div className="glass rounded-2xl p-6 border border-border">
            {tab === 'financial' && finReport === 'pnl' && <PnLReport data={reportData} t={t} />}
            {tab === 'financial' && finReport === 'balance' && <BalanceReport data={reportData} t={t} />}
            {tab === 'financial' && finReport === 'cashflow' && <CashFlowReport data={reportData} t={t} />}
            {tab === 'inventory' && invReport === 'summary' && <InventorySummary data={reportData} t={t} />}
            {tab === 'inventory' && invReport === 'low_stock' && <LowStockReport data={reportData} t={t} />}
            {tab === 'inventory' && invReport === 'stock_value' && <StockValueReport data={reportData} t={t} />}
            {tab === 'customers' && <CustomerReportView data={reportData} t={t} type={custReport} />}
          </div>
        )}

        {!reportData && !loadingReport && (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground border border-border">
            {t('rpt_no_data')}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PnLReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as Record<string, number>;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">{t('rpt_profit_loss')}</h3>
      <div className="space-y-1.5 text-sm">
        <Row label="Revenue" value={d.revenue} />
        <Row label="Returns" value={-d.returns} negative />
        <Row label="Net Sales" value={d.netSales} bold />
        <Row label="COGS" value={-d.cogs} negative />
        <Row label="Gross Profit" value={d.grossProfit} bold highlight />
        <Row label="Gross Margin" value={d.grossMargin} suffix="%" />
        <hr className="border-border my-2" />
        <Row label="Other Income" value={d.otherIncome} />
        <Row label="Operating Expenses" value={-d.operatingExpenses} negative />
        <Row label="Work Order Costs" value={-d.workOrderCosts} negative />
        <hr className="border-border my-2" />
        <Row label="Net Profit" value={d.netProfit} bold highlight />
        <Row label="Net Margin" value={d.netMargin} suffix="%" />
      </div>
    </div>
  );
}

function BalanceReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { assets: Record<string, number>; liabilities: Record<string, number>; equity: number };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_balance_sheet')}</h3>
      <div>
        <h4 className="font-bold text-sm mb-2 text-blue-400">Assets</h4>
        <div className="space-y-1 text-sm">
          <Row label="Cash" value={d.assets?.cash || 0} />
          <Row label="Accounts Receivable" value={d.assets?.accountsReceivable || 0} />
          <Row label="Inventory" value={d.assets?.inventory || 0} />
          <Row label="Total Assets" value={d.assets?.total || 0} bold />
        </div>
      </div>
      <div>
        <h4 className="font-bold text-sm mb-2 text-orange-400">Liabilities</h4>
        <div className="space-y-1 text-sm">
          <Row label="Accounts Payable" value={d.liabilities?.accountsPayable || 0} />
          <Row label="Total Liabilities" value={d.liabilities?.total || 0} bold />
        </div>
      </div>
      <div>
        <Row label="Equity" value={d.equity} bold highlight />
      </div>
    </div>
  );
}

function CashFlowReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { operating: Record<string, number>; netCashFlow: number };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">{t('rpt_cash_flow')}</h3>
      <div className="space-y-1.5 text-sm">
        <Row label="Cash Sales" value={d.operating?.cashSales || 0} />
        <Row label="Card Sales" value={d.operating?.cardSales || 0} />
        <Row label="Transfer Sales" value={d.operating?.transferSales || 0} />
        <Row label="Other Income" value={d.operating?.otherIncome || 0} />
        <Row label="Expenses" value={-(d.operating?.expenses || 0)} negative />
        <Row label="Purchase Payments" value={-(d.operating?.purchasePayments || 0)} negative />
        <hr className="border-border my-2" />
        <Row label="Net Cash Flow" value={d.netCashFlow} bold highlight />
      </div>
    </div>
  );
}

function InventorySummary({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { totalProducts: number; totalStock: number; lowStockCount: number; outOfStockCount: number; totalStockValue: number };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_stock_summary')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card label="Total Products" value={d.totalProducts} />
        <Card label="Total Stock Units" value={d.totalStock} />
        <Card label="Low Stock Items" value={d.lowStockCount} color="amber" />
        <Card label="Out of Stock" value={d.outOfStockCount} color="red" />
        <Card label="Stock Value (EGP)" value={d.totalStockValue.toFixed(2)} color="green" />
      </div>
    </div>
  );
}

function LowStockReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { count: number; products: Array<Record<string, unknown>> };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_low_stock')} ({d.count})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left py-2 px-2">Name</th>
              <th scope="col" className="text-center py-2 px-2">Stock</th>
              <th scope="col" className="text-center py-2 px-2">Reorder Point</th>
              <th scope="col" className="text-center py-2 px-2">Shortfall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.products.map((p, i) => (
              <tr key={i}>
                <td className="py-2 px-2">{p.name as string}</td>
                <td className="py-2 px-2 text-center text-red-400">{p.stock as number}</td>
                <td className="py-2 px-2 text-center">{p.lowStockThreshold as number}</td>
                <td className="py-2 px-2 text-center text-amber-400">{p.shortfall as number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockValueReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { totalProducts: number; totalStockValue: number; totalRetailValue: number; potentialProfit: number; byCategory: Array<Record<string, unknown>> };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_stock_value')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Products" value={d.totalProducts} />
        <Card label="Stock Value" value={d.totalStockValue.toFixed(2)} color="blue" />
        <Card label="Retail Value" value={d.totalRetailValue.toFixed(2)} color="green" />
        <Card label="Potential Profit" value={d.potentialProfit.toFixed(2)} color="green" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left py-2 px-2">Category</th>
              <th scope="col" className="text-center py-2 px-2">Items</th>
              <th scope="col" className="text-right py-2 px-2">Stock Value</th>
              <th scope="col" className="text-right py-2 px-2">Retail Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.byCategory.map((c, i) => (
              <tr key={i}>
                <td className="py-2 px-2">{c.category as string}</td>
                <td className="py-2 px-2 text-center">{c.count as number}</td>
                <td className="py-2 px-2 text-right">{(c.stockValue as number).toFixed(2)}</td>
                <td className="py-2 px-2 text-right">{(c.retailValue as number).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerReportView({ data, t, type }: { data: Record<string, unknown>; t: (k: string) => string; type: string }) {
  const d = data as { count: number; customers: Array<Record<string, unknown>> };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{type === 'top' ? t('rpt_top_customers') : t('rpt_customer_activity')} ({d.count})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left py-2 px-2">Name</th>
              <th scope="col" className="text-right py-2 px-2">Total Spent</th>
              <th scope="col" className="text-center py-2 px-2">Invoices</th>
              <th scope="col" className="text-center py-2 px-2">Bookings</th>
              <th scope="col" className="text-center py-2 px-2">Vehicles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.customers.slice(0, 20).map((c, i) => (
              <tr key={i}>
                <td className="py-2 px-2">{c.name as string}</td>
                <td className="py-2 px-2 text-right font-medium">{(c.totalSpent as number).toFixed(2)}</td>
                <td className="py-2 px-2 text-center">{c.invoiceCount as number}</td>
                <td className="py-2 px-2 text-center">{c.bookingCount as number}</td>
                <td className="py-2 px-2 text-center">{c.vehiclesCount as number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, bold, highlight, negative, suffix }: { label: string; value?: number | null; bold?: boolean; highlight?: boolean; negative?: boolean; suffix?: string }) {
  const safeValue = value ?? 0;
  return (
    <div className={`flex justify-between ${bold ? 'font-bold pt-1' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={`${highlight ? (safeValue >= 0 ? 'text-green-400' : 'text-red-400') : ''} ${negative ? 'text-red-400' : ''}`}>
        {Math.round(safeValue * 100) / 100}{suffix || ''}
      </span>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-400',
    red: 'text-red-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
  };
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color ? colors[color] : ''}`}>{value}</p>
    </div>
  );
}
