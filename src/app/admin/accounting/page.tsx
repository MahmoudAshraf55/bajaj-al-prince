'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import type { AccountingSummary, AccountingTransaction, AccountingPeriod } from '@/types';
import {
  ArrowUpRight, ArrowDownRight, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';

type PeriodTab = { key: AccountingPeriod; label: string; days: number };

interface TrialBalanceAccount {
  code: string;
  name: string;
  nameAr: string;
  debit: number;
  credit: number;
}
interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
}

interface BalanceSheetAccount {
  code: string;
  name: string;
  nameAr: string;
  balance: number;
}
interface BalanceSheetData {
  assets: BalanceSheetAccount[];
  liabilities: BalanceSheetAccount[];
  equity: BalanceSheetAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface IncomeStatementAccount {
  code: string;
  name: string;
  nameAr: string;
  balance: number;
}
interface IncomeStatementData {
  revenue: IncomeStatementAccount[];
  expenses: IncomeStatementAccount[];
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

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
  const [activeView, setActiveView] = useState<'summary' | 'transactions' | 'trial-balance' | 'balance-sheet' | 'income-statement'>('summary');
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(false);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [balanceSheetLoading, setBalanceSheetLoading] = useState(false);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [incomeStatementLoading, setIncomeStatementLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { router.push('/admin/'); return; }
        setUser(d.data);
        setLoading(false);
      })
      .catch(() => router.push('/admin/'));
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

  const fetchTrialBalance = useCallback(async (customF?: string, customT?: string) => {
    setTrialBalanceLoading(true);
    const asOfDate = customT || new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/v1/accounting/trial-balance?asOfDate=${asOfDate}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) setTrialBalance(d.data);
    setTrialBalanceLoading(false);
  }, []);

  const fetchBalanceSheet = useCallback(async (customF?: string, customT?: string) => {
    setBalanceSheetLoading(true);
    const asOfDate = customT || new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/v1/accounting/balance-sheet?asOfDate=${asOfDate}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) setBalanceSheet(d.data);
    setBalanceSheetLoading(false);
  }, []);

  const fetchIncomeStatement = useCallback(async (customF?: string, customT?: string) => {
    setIncomeStatementLoading(true);
    const fromDate = customF || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = customT || new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/v1/accounting/income-statement?fromDate=${fromDate}&toDate=${toDate}`, { credentials: 'include' });
    const d = await res.json();
    if (d.success) setIncomeStatement(d.data);
    setIncomeStatementLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      if (activeView === 'summary') {
        fetchSummary(periodTab, customFrom || undefined, customTo || undefined);
      } else if (activeView === 'transactions') {
        fetchTxns(periodTab, txnPage, customFrom || undefined, customTo || undefined);
      } else if (activeView === 'trial-balance') {
        fetchTrialBalance(customFrom || undefined, customTo || undefined);
      } else if (activeView === 'balance-sheet') {
        fetchBalanceSheet(customFrom || undefined, customTo || undefined);
      } else if (activeView === 'income-statement') {
        fetchIncomeStatement(customFrom || undefined, customTo || undefined);
      }
    }
  }, [user, activeView, periodTab, customFrom, customTo, txnPage, fetchSummary, fetchTxns, fetchTrialBalance, fetchBalanceSheet, fetchIncomeStatement]);

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
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-bold text-lg">{t('admin_accounting')}</h1>
          <p className="text-sm text-muted-foreground">{user?.username}</p>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {/* View Tabs */}
        <div className="flex gap-2 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveView('summary')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'summary' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
          >
            {t('acc_summary')}
          </button>
          <button
            onClick={() => setActiveView('transactions')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'transactions' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
          >
            {t('acc_transactions')}
          </button>
          <button
            onClick={() => setActiveView('trial-balance')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'trial-balance' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
          >
            Trial Balance
          </button>
          <button
            onClick={() => setActiveView('balance-sheet')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'balance-sheet' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setActiveView('income-statement')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'income-statement' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
          >
            Income Statement
          </button>
        </div>

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

        {/* Summary View */}
        {activeView === 'summary' && (
          <>
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
                    <th scope="col" className="text-left py-2 px-2 font-medium">{t('acc_category')}</th>
                    <th scope="col" className="text-right py-2 px-2 font-medium">{t('acc_revenue')}</th>
                    <th scope="col" className="text-right py-2 px-2 font-medium">{t('acc_cogs')}</th>
                    <th scope="col" className="text-right py-2 px-2 font-medium">{t('acc_profit')}</th>
                    <th scope="col" className="text-right py-2 px-2 font-medium">{t('acc_margin')}</th>
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
        </>
        )}

        {/* Transactions View */}
        {activeView === 'transactions' && (
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
        )}

        {/* Trial Balance View */}
        {activeView === 'trial-balance' && (
          <div className="glass rounded-2xl p-4">
            <h2 className="font-bold mb-3">Trial Balance</h2>
            {trialBalanceLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : trialBalance ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left py-2 px-2 font-medium">Account Code</th>
                        <th scope="col" className="text-left py-2 px-2 font-medium">Account Name</th>
                        <th scope="col" className="text-right py-2 px-2 font-medium">Debit</th>
                        <th scope="col" className="text-right py-2 px-2 font-medium">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts.map((acc: TrialBalanceAccount) => (
                        <tr key={acc.code} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2 font-mono">{acc.code}</td>
                          <td className="py-2 px-2">{language === 'ar' ? acc.nameAr : acc.name}</td>
                          <td className="text-right py-2 px-2">{acc.debit > 0 ? acc.debit.toLocaleString() : '-'}</td>
                          <td className="text-right py-2 px-2">{acc.credit > 0 ? acc.credit.toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-bold">
                        <td colSpan={2} className="py-2 px-2">Total</td>
                        <td className="text-right py-2 px-2">{trialBalance.totalDebit.toLocaleString()} EGP</td>
                        <td className="text-right py-2 px-2">{trialBalance.totalCredit.toLocaleString()} EGP</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {trialBalance.totalDebit !== trialBalance.totalCredit && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    Trial Balance is not balanced! Debit: {trialBalance.totalDebit.toLocaleString()}, Credit: {trialBalance.totalCredit.toLocaleString()}
                  </div>
                )}
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No trial balance data available</p>
            )}
          </div>
        )}

        {/* Balance Sheet View */}
        {activeView === 'balance-sheet' && (
          <div className="glass rounded-2xl p-4">
            <h2 className="font-bold mb-3">Balance Sheet</h2>
            {balanceSheetLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : balanceSheet ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Assets */}
                <div>
                  <h3 className="font-semibold mb-3 text-green-400">Assets</h3>
                  <div className="space-y-2">
                    {balanceSheet.assets.map((acc: BalanceSheetAccount) => (
                      <div key={acc.code} className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{language === 'ar' ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">{acc.balance.toLocaleString()} EGP</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 font-bold">
                      <span>Total Assets</span>
                      <span>{balanceSheet.totalAssets.toLocaleString()} EGP</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div>
                  <h3 className="font-semibold mb-3 text-red-400">Liabilities</h3>
                  <div className="space-y-2 mb-4">
                    {balanceSheet.liabilities.map((acc: BalanceSheetAccount) => (
                      <div key={acc.code} className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{language === 'ar' ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">{acc.balance.toLocaleString()} EGP</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 font-bold">
                      <span>Total Liabilities</span>
                      <span>{balanceSheet.totalLiabilities.toLocaleString()} EGP</span>
                    </div>
                  </div>

                  <h3 className="font-semibold mb-3 text-blue-400">Equity</h3>
                  <div className="space-y-2">
                    {balanceSheet.equity.map((acc: BalanceSheetAccount) => (
                      <div key={acc.code} className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{language === 'ar' ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">{acc.balance.toLocaleString()} EGP</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 font-bold">
                      <span>Total Equity</span>
                      <span>{balanceSheet.totalEquity.toLocaleString()} EGP</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 font-bold">
                    <span>Total Liabilities + Equity</span>
                    <span>{(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()} EGP</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No balance sheet data available</p>
            )}
          </div>
        )}

        {/* Income Statement View */}
        {activeView === 'income-statement' && (
          <div className="glass rounded-2xl p-4">
            <h2 className="font-bold mb-3">Income Statement</h2>
            {incomeStatementLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : incomeStatement ? (
              <div className="space-y-6">
                {/* Revenue */}
                <div>
                  <h3 className="font-semibold mb-3 text-green-400">Revenue</h3>
                  <div className="space-y-2">
                    {incomeStatement.revenue.map((acc: IncomeStatementAccount) => (
                      <div key={acc.code} className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{language === 'ar' ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">{acc.balance.toLocaleString()} EGP</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 font-bold">
                      <span>Total Revenue</span>
                      <span>{incomeStatement.totalRevenue.toLocaleString()} EGP</span>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <h3 className="font-semibold mb-3 text-red-400">Expenses</h3>
                  <div className="space-y-2">
                    {incomeStatement.expenses.map((acc: IncomeStatementAccount) => (
                      <div key={acc.code} className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{language === 'ar' ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">{acc.balance.toLocaleString()} EGP</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 font-bold">
                      <span>Total Expenses</span>
                      <span>{incomeStatement.totalExpenses.toLocaleString()} EGP</span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Gross Profit</p>
                    <p className="text-2xl font-bold">{incomeStatement.grossProfit.toLocaleString()} EGP</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${incomeStatement.netProfit >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                    <p className="text-2xl font-bold">{incomeStatement.netProfit.toLocaleString()} EGP</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No income statement data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
