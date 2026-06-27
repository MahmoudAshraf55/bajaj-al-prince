'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import Logo from '@/components/ui/Logo';
import type { AccountingSummary, AccountingTransaction, AccountingPeriod } from '@/types';
import {
  LayoutDashboard, Mail, Calendar, Receipt, Package, ShoppingCart,
  MessageCircle, Wrench, Users, Car, TrendingUp, DollarSign,
  LogOut, ArrowUpRight, ArrowDownRight, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';

type PeriodTab = { key: AccountingPeriod; label: string; days: number };

const PERIODS: PeriodTab[] = [
  { key: 'day', label: 'acc_daily', days: 1 },
  { key: 'month', label: 'acc_monthly', days: 30 },
  { key: 'quarter', label: 'acc_quarterly', days: 90 },
  { key: 'year', label: 'acc_yearly', days: 365 },
];

export default function AccountingPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [periodTab, setPeriodTab] = useState<AccountingPeriod>('day');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [txns, setTxns] = useState<AccountingTransaction[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnLoading, setTxnLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push('/admin/');
        else setUser(d.data);
      })
      .catch(() => router.push('/admin/'))
      .finally(() => setLoading(false));
  }, [router]);

  const getDateRange = useCallback((period: AccountingPeriod, customF?: string, customT?: string) => {
    const now = new Date();
    if (customF && customT) {
      return { from: customF, to: customT };
    }
    switch (period) {
      case 'day':
        return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      case 'month':
        return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      case 'quarter': {
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        return { from: new Date(now.getFullYear(), qStart, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      }
      case 'year':
        return { from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
  }, []);

  const fetchSummary = useCallback(async (period: AccountingPeriod, customF?: string, customT?: string) => {
    const range = getDateRange(period, customF, customT);
    const res = await fetch(`/api/v1/accounting/summary?from=${range.from}&to=${range.to}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) setSummary(d.data);
  }, [getDateRange]);

  const fetchTxns = useCallback(async (period: AccountingPeriod, page: number, customF?: string, customT?: string) => {
    setTxnLoading(true);
    const range = getDateRange(period, customF, customT);
    const res = await fetch(`/api/v1/accounting/transactions?from=${range.from}&to=${range.to}&page=${page}&limit=20`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) { setTxns(d.data); setTxnTotal(d.meta?.total || 0); }
    setTxnLoading(false);
  }, [getDateRange]);

  useEffect(() => {
    if (user) {
      fetchSummary(periodTab, customFrom || undefined, customTo || undefined);
      fetchTxns(periodTab, txnPage, customFrom || undefined, customTo || undefined);
    }
  }, [user, periodTab, customFrom, customTo, txnPage, fetchSummary, fetchTxns]);

  const handlePeriodChange = (key: AccountingPeriod) => {
    setPeriodTab(key);
    setCustomFrom('');
    setCustomTo('');
    setTxnPage(1);
  };

  const handleCustomDate = () => {
    if (customFrom && customTo) {
      setPeriodTab('day');
      setTxnPage(1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'admin_overview' },
    { href: '/admin/accounting', icon: DollarSign, label: 'admin_accounting' },
    { href: '/admin/pos', icon: ShoppingCart, label: 'admin_pos' },
    { href: '/admin/warehouse', icon: Package, label: 'admin_warehouse' },
    { href: '/admin/market', icon: TrendingUp, label: 'admin_market' },
    { href: '/admin/customers', icon: Users, label: 'admin_customers' },
    { href: '/admin/vehicles', icon: Car, label: 'admin_vehicles' },
    { href: '/admin/vehicle-models', icon: Car, label: 'admin_vehicle_models' },
    { href: '/admin/work-orders', icon: Wrench, label: 'admin_work_orders' },
    { href: '/admin/whatsapp', icon: MessageCircle, label: 'admin_whatsapp' },
    { href: '/admin/booking', icon: Calendar, label: 'admin_bookings' },
    { href: '/admin/devices', icon: Mail, label: 'admin_scan_logs' },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const Card = ({ label, value, color, icon: Icon, sub }: { label: string; value: string; color: string; icon?: React.ComponentType<{ className?: string }>; sub?: string }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${color}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm opacity-80">{label}</p>
        {Icon && <Icon className="w-5 h-5 opacity-60" />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </motion.div>
  );

  const typeColors: Record<string, string> = {
    SALE: 'text-green-400', RETURN: 'text-red-400', PURCHASE: 'text-orange-400',
    EXPENSE: 'text-red-400', INCOME: 'text-green-400', STOCK_ADJUSTMENT: 'text-blue-400',
  };

  const typeLabels: Record<string, string> = {
    SALE: 'acc_sale', RETURN: 'acc_return', PURCHASE: 'acc_purchase',
    EXPENSE: 'acc_expense', INCOME: 'acc_income', STOCK_ADJUSTMENT: 'acc_stock_adjustment',
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex">
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass border-l border-border transform transition-transform duration-200 ${showSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto overflow-y-auto`}>
          <div className="p-4 border-b border-border">
            <Logo />
          </div>
          <nav className="p-2 space-y-1">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${item.href === '/admin/accounting' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                <item.icon className="w-4 h-4" />
                {t(item.label)}
              </a>
            ))}
          </nav>
          <div className="p-4 border-t border-border mt-4">
            <button onClick={() => { fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' }); router.push('/admin/'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
              <LogOut className="w-4 h-4" />
              {t('admin_logout')}
            </button>
          </div>
        </aside>

        <main className="flex-1 min-h-screen">
          <header className="sticky top-0 z-30 glass border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden p-2 rounded-xl hover:bg-muted">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h1 className="font-bold text-lg">{t('admin_accounting')}</h1>
              </div>
              <p className="text-sm text-muted-foreground">{user?.username}</p>
            </div>
          </header>

          <div className="p-4 max-w-6xl mx-auto space-y-4">
            {/* Period Selector */}
            <div className="flex flex-wrap gap-2 items-center">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => handlePeriodChange(p.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${periodTab === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                  {t(p.label)}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm" />
                <span className="text-muted-foreground">-</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-2 rounded-xl bg-input border border-border text-sm" />
                <button onClick={handleCustomDate} disabled={!customFrom || !customTo} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-40 transition-colors">
                  {t('acc_filter')}
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card label={t('acc_revenue')} value={`${Number(summary.revenue).toLocaleString()} EGP`} color="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20" icon={ArrowUpRight} sub={summary.period.label} />
                <Card label={t('acc_cogs')} value={`${Number(summary.cogs).toLocaleString()} EGP`} color="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20" icon={ArrowDownRight} sub={`${summary.invoiceCount} invoices`} />
                <Card label={t('acc_gross_profit')} value={`${Number(summary.grossProfit).toLocaleString()} EGP`} color="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20" sub={`${summary.grossMargin}% margin`} />
                <Card label={t('acc_expenses')} value={`${Number(summary.expenses).toLocaleString()} EGP`} color="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20" icon={ArrowDownRight} />
                <Card label={t('acc_net_profit')} value={`${Number(summary.netProfit).toLocaleString()} EGP`} color={summary.netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20' : 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20'} sub={`${summary.netMargin}% margin`} />
                <Card label={t('acc_taxes')} value={`${Number(summary.taxes).toLocaleString()} EGP`} color="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20" sub={`${t('acc_discounts')}: ${Number(summary.discounts).toLocaleString()}`} />
              </div>
            )}

            {/* Payment Method Breakdown */}
            {summary && summary.byPaymentMethod.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <h2 className="font-bold mb-3">{t('acc_payment_breakdown')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {summary.byPaymentMethod.map((pm) => (
                    <div key={pm.method} className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground capitalize">{pm.method}</p>
                      <p className="text-lg font-bold">{Number(pm.amount).toLocaleString()} EGP</p>
                      <p className="text-xs text-muted-foreground">{pm.count} {t('acc_transactions')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {summary && summary.byCategory.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <h2 className="font-bold mb-3">{t('acc_category_breakdown')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 font-medium">{t('acc_category')}</th>
                        <th className="text-right py-2 px-2 font-medium">{t('acc_revenue')}</th>
                        <th className="text-right py-2 px-2 font-medium">{t('acc_cogs')}</th>
                        <th className="text-right py-2 px-2 font-medium">{t('acc_profit')}</th>
                        <th className="text-right py-2 px-2 font-medium">{t('acc_margin')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byCategory.map((cat) => (
                        <tr key={cat.category} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2">{cat.category}</td>
                          <td className="text-right py-2 px-2">{Number(cat.revenue).toLocaleString()}</td>
                          <td className="text-right py-2 px-2">{Number(cat.cogs).toLocaleString()}</td>
                          <td className={`text-right py-2 px-2 font-medium ${cat.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{Number(cat.profit).toLocaleString()}</td>
                          <td className="text-right py-2 px-2">{cat.revenue > 0 ? `${Math.round((cat.profit / cat.revenue) * 100)}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">{t('acc_transactions')}</h2>
                <p className="text-xs text-muted-foreground">{txnTotal} {t('acc_records')}</p>
              </div>

              {txnLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : txns.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">{t('acc_no_transactions')}</p>
              ) : (
                <div className="space-y-2">
                  {txns.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 shrink-0 ${typeColors[txn.type] || 'text-muted-foreground'}`}>
                          {txn.type === 'SALE' || txn.type === 'INCOME' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{txn.description || t(typeLabels[txn.type] || txn.type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(txn.date)}
                            {txn.referenceNumber && <span className="ml-2">• {txn.referenceNumber}</span>}
                            {txn.paymentMethod && <span className="ml-2">• {txn.paymentMethod}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={`text-sm font-bold ${txn.type === 'SALE' || txn.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                          {txn.type === 'SALE' || txn.type === 'INCOME' ? '+' : '-'}{Number(txn.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{t(typeLabels[txn.type] || txn.type)}</p>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {txnTotal > 20 && (
                    <div className="flex items-center justify-center gap-2 pt-3">
                      <button onClick={() => setTxnPage(Math.max(1, txnPage - 1))} disabled={txnPage === 1} className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-muted-foreground">{txnPage} / {Math.ceil(txnTotal / 20)}</span>
                      <button onClick={() => setTxnPage(txnPage + 1)} disabled={txnPage >= Math.ceil(txnTotal / 20)} className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
