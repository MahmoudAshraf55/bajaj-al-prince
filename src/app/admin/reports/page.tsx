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
type CustomerReport = 'top' | 'activity' | 'smart';

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
      } else if (custReport === 'smart') {
        url = '/api/v1/reports/customers/smart/';
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
    if (tab === 'financial') {
      addToast('error', t('rpt_excel_coming_soon'));
      return;
    }
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
                  <option value="smart">{t('rpt_smart_analysis') || 'Smart Analysis'}</option>
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
            {tab === 'customers' && custReport === 'smart' && <SmartCustomerReport data={reportData} t={t} />}
            {tab === 'customers' && custReport !== 'smart' && <CustomerReportView data={reportData} t={t} type={custReport} />}
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
        <Row label={t('rpt_revenue')} value={d.revenue} />
        <Row label={t('rpt_returns')} value={-d.returns} negative />
        <Row label={t('rpt_net_sales')} value={d.netSales} bold />
        <Row label={t('rpt_cogs')} value={-d.cogs} negative />
        <Row label={t('rpt_gross_profit')} value={d.grossProfit} bold highlight />
        <Row label={t('rpt_gross_margin')} value={d.grossMargin} suffix="%" />
        <hr className="border-border my-2" />
        <Row label={t('rpt_other_income')} value={d.otherIncome} />
        <Row label={t('rpt_operating_expenses')} value={-d.operatingExpenses} negative />
        <Row label={t('rpt_work_order_costs')} value={-d.workOrderCosts} negative />
        <hr className="border-border my-2" />
        <Row label={t('rpt_net_profit')} value={d.netProfit} bold highlight />
        <Row label={t('rpt_net_margin')} value={d.netMargin} suffix="%" />
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
        <h4 className="font-bold text-sm mb-2 text-blue-400">{t('rpt_assets')}</h4>
        <div className="space-y-1 text-sm">
          <Row label={t('rpt_cash')} value={d.assets?.cash || 0} />
          <Row label={t('rpt_accounts_receivable')} value={d.assets?.accountsReceivable || 0} />
          <Row label={t('rpt_inventory_label')} value={d.assets?.inventory || 0} />
          <Row label={t('rpt_total_assets')} value={d.assets?.total || 0} bold />
        </div>
      </div>
      <div>
        <h4 className="font-bold text-sm mb-2 text-orange-400">{t('rpt_liabilities')}</h4>
        <div className="space-y-1 text-sm">
          <Row label={t('rpt_accounts_payable')} value={d.liabilities?.accountsPayable || 0} />
          <Row label={t('rpt_total_liabilities')} value={d.liabilities?.total || 0} bold />
        </div>
      </div>
      <div>
        <Row label={t('rpt_equity')} value={d.equity} bold highlight />
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
        <Row label={t('rpt_cash_sales')} value={d.operating?.cashSales || 0} />
        <Row label={t('rpt_card_sales')} value={d.operating?.cardSales || 0} />
        <Row label={t('rpt_transfer_sales')} value={d.operating?.transferSales || 0} />
        <Row label={t('rpt_other_income')} value={d.operating?.otherIncome || 0} />
        <Row label={t('rpt_expenses')} value={-(d.operating?.expenses || 0)} negative />
        <Row label={t('rpt_purchase_payments')} value={-(d.operating?.purchasePayments || 0)} negative />
        <hr className="border-border my-2" />
        <Row label={t('rpt_net_cash_flow')} value={d.netCashFlow} bold highlight />
      </div>
    </div>
  );
}

function InventorySummary({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { totalProducts?: number; totalStock?: number; lowStockCount?: number; outOfStockCount?: number; totalStockValue?: number };
  const stockVal = typeof d.totalStockValue === 'number' ? d.totalStockValue : 0;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_stock_summary')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card label={t('rpt_total_products')} value={d.totalProducts ?? 0} />
        <Card label={t('rpt_total_stock_units')} value={d.totalStock ?? 0} />
        <Card label={t('rpt_low_stock_items')} value={d.lowStockCount ?? 0} color="amber" />
        <Card label={t('rpt_out_of_stock')} value={d.outOfStockCount ?? 0} color="red" />
        <Card label={t('rpt_stock_value_egp')} value={stockVal.toFixed(2)} color="green" />
      </div>
    </div>
  );
}

function LowStockReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { count?: number; products?: Array<Record<string, unknown>> };
  const count = typeof d.count === 'number' ? d.count : 0;
  const products = Array.isArray(d.products) ? d.products : [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_low_stock')} ({count})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left py-2 px-2">{t('rpt_name')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_stock')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_reorder_point')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_shortfall')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p, i) => (
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
  const d = data as { totalProducts?: number; totalStockValue?: number; totalRetailValue?: number; potentialProfit?: number; byCategory?: Array<Record<string, unknown>> };
  const products = typeof d.totalProducts === 'number' ? d.totalProducts : 0;
  const stockVal = typeof d.totalStockValue === 'number' ? d.totalStockValue : 0;
  const retailVal = typeof d.totalRetailValue === 'number' ? d.totalRetailValue : 0;
  const profit = typeof d.potentialProfit === 'number' ? d.potentialProfit : 0;
  const cats = Array.isArray(d.byCategory) ? d.byCategory : [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_stock_value')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label={t('rpt_products')} value={products} />
        <Card label={t('rpt_stock_value_label')} value={stockVal.toFixed(2)} color="blue" />
        <Card label={t('rpt_retail_value')} value={retailVal.toFixed(2)} color="green" />
        <Card label={t('rpt_potential_profit')} value={profit.toFixed(2)} color="green" />
      </div>
      {cats.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left py-2 px-2">{t('rpt_category')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_items')}</th>
              <th scope="col" className="text-right py-2 px-2">{t('rpt_stock_value_label')}</th>
              <th scope="col" className="text-right py-2 px-2">{t('rpt_retail_value')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cats.map((c, i) => (
              <tr key={i}>
                <td className="py-2 px-2">{(c.category as string) || '-'}</td>
                <td className="py-2 px-2 text-center">{typeof c.count === 'number' ? c.count : 0}</td>
                <td className="py-2 px-2 text-right">{typeof c.stockValue === 'number' ? c.stockValue.toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 text-right">{typeof c.retailValue === 'number' ? c.retailValue.toFixed(2) : '0.00'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function CustomerReportView({ data, t, type }: { data: Record<string, unknown>; t: (k: string) => string; type: string }) {
  const d = data as { count?: number; customers?: Array<Record<string, unknown>> };
  const count = typeof d.count === 'number' ? d.count : 0;
  const customers = Array.isArray(d.customers) ? d.customers : [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{type === 'top' ? t('rpt_top_customers') : t('rpt_customer_activity')} ({count})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left py-2 px-2">{t('rpt_name')}</th>
              <th scope="col" className="text-right py-2 px-2">{t('rpt_total_spent')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_invoices')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_bookings')}</th>
              <th scope="col" className="text-center py-2 px-2">{t('rpt_vehicles')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.slice(0, 20).map((c, i) => (
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

function SmartCustomerReport({ data, t }: { data: Record<string, unknown>; t: (k: string) => string }) {
  const d = data as { count?: number; customers?: Array<Record<string, unknown>>; thresholds?: Record<string, unknown> };
  const count = typeof d.count === 'number' ? d.count : 0;
  const customers = Array.isArray(d.customers) ? d.customers : [];
  const thresholds = (d.thresholds as Record<string, { min: number; max?: number; label: string }>) || {};

  const colorMap: Record<string, string> = { green: 'bg-green-500/10 text-green-400 border-green-500/20', blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20', amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20', gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('rpt_smart_analysis') || 'Smart Customer Analysis'} ({count})</h3>
      {/* Thresholds info */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(thresholds).map(([key, th]) => (
          <div key={key} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5 border border-border/50">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-medium">{th.label}</span>
            <span className="text-muted-foreground">
              ≥ {th.min} EGP{th.max ? ` – ${th.max} EGP` : ''}
            </span>
          </div>
        ))}
      </div>
      {/* Customers table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-white/5 text-muted-foreground">
              <th scope="col" className="text-left py-2.5 px-3 font-medium">{t('rpt_name')}</th>
              <th scope="col" className="text-center py-2.5 px-3 font-medium">{t('rpt_visits') || 'Visits'}</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium">{t('rpt_revenue') || 'Revenue'}</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium">{t('rpt_profit') || 'Profit'}</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium">{t('rpt_avg_profit') || 'Avg/Visit'}</th>
              <th scope="col" className="text-left py-2.5 px-3 font-medium">{t('rpt_recommendation') || 'Recommendation'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {customers.map((c, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="py-2.5 px-3">
                  <span className="font-medium">{c.name as string}</span>
                  {typeof c.phone === 'string' && c.phone && <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>}
                </td>
                <td className="py-2.5 px-3 text-center font-medium">{c.totalVisits as number}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{typeof c.totalRevenue === 'number' ? c.totalRevenue.toFixed(2) : '0.00'}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-medium text-green-400">{typeof c.totalProfit === 'number' ? c.totalProfit.toFixed(2) : '0.00'}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{typeof c.avgProfitPerVisit === 'number' ? c.avgProfitPerVisit.toFixed(2) : '0.00'}</td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorMap[c.recommendationColor as string] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {c.recommendationLabel as string || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customers.length === 0 && <p className="text-center text-muted-foreground py-8">{t('rpt_no_data')}</p>}
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
