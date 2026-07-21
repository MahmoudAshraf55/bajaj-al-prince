'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import {
  Calendar, Package, Trash2, Plus, Minus,
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  Users, ArrowRight, Bell, X,
} from 'lucide-react';
import Link from 'next/link';
import PageSpinner from '@/components/ui/PageSpinner';

interface ContactMessage {
  id: string; name: string; phone: string; email: string; message: string; createdAt: string;
}
interface Booking {
  id: string; name: string; email?: string; phone: string; model: string; issue: string; date: string; time: string; status: string; createdAt: string;
}
interface Product {
  id: string; name: string; description: string | null; price: number; stock: number; category: string; available: boolean;
}
interface Transaction {
  id: string; type: string; amount: number; description: string | null; createdAt: string;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [loading] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stats, setStats] = useState<{
    today: { sales: number; paid: number; invoiceCount: number; cashSales: number; cardSales: number; transferSales: number; income: number; expenses: number };
    inventory: { totalProducts: number; lowStockCount: number; outOfStockCount: number; inventoryValue: number };
    bookings: { pending: number; total: number; todayNew: number };
    customers: { total: number };
    messages: { total: number };
    recentInvoices: Array<{ id: string; number: string; total: number; paid: number; customerName: string | null; createdAt: string }>;
    recentBookings: Array<{ id: string; name: string; model: string; issue: string; date: string; time: string; status: string; createdAt: string }>;
  } | null>(null);
  const statsRef = useRef(stats);

  useEffect(() => {
    if (loading) return;
    fetch('/api/v1/contact/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setMessages(d.data.messages); }).catch(() => {});
    fetch('/api/v1/bookings/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setBookings(d.data.bookings); }).catch(() => {});
    fetch('/api/v1/products/?limit=1000&admin=true', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setProducts(d.data.products); }).catch(() => {});
    fetch('/api/v1/cashier/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setTransactions(d.data.transactions); }).catch(() => {});
    fetch('/api/v1/dashboard/stats/', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setStats(d.data); }).catch(() => {});
  }, [loading]);

  useEffect(() => { statsRef.current = stats; }, [stats]);

  useEffect(() => {
    if (loading) return;

    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      fetch('/api/v1/dashboard/stats/', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const prev = statsRef.current;
            const prevTodayNew = prev?.bookings.todayNew || 0;
            setStats(d.data);

            if (d.data.bookings.todayNew > prevTodayNew) {
              setNewBookingCount(d.data.bookings.todayNew - prevTodayNew);
              setShowNotification(true);
            }
          }
        });
    };

    intervalRef.current = setInterval(refresh, 30000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loading]);

  const deleteMessage = async (id: string) => {
    const res = await fetch(`/api/v1/contact/${id}/`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/v1/bookings/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (res.ok) setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  };

  const updateStock = async (id: string, delta: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newStock = Math.max(0, product.stock + delta);
    const res = await fetch(`/api/v1/products/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stock: newStock, available: newStock > 0 }),
    });
    if (res.ok) setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: newStock, available: newStock > 0 } : p));
  };

  const addTransaction = async (type: 'income' | 'expense', amount: number, description: string) => {
    const res = await fetch('/api/v1/cashier/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type, amount, description }),
    });
    const data = await res.json();
    if (data.success) {
      setTransactions((prev) => [data.data.transaction, ...prev]);
      return true;
    }
    return false;
  };

  if (loading) {
    return (
      <PageSpinner />
    );
  }

  const totalIncome = stats?.today.income ?? transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = stats?.today.expenses ?? transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="p-6 sm:p-8">
      {/* Notification Banner */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t('admin_new_bookings_today').replace('{count}', String(newBookingCount))}</p>
                <p className="text-xs text-muted-foreground">{t('admin_check_bookings_page')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/bookings"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {t('admin_view_bookings')}
              </Link>
              <button
                onClick={() => setShowNotification(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-2xl font-bold mb-6">{t('admin_dashboard')}</h2>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('admin_total_income') + ' ' + t('admin_today_suffix'), value: stats ? `${stats.today.sales.toLocaleString()} EGP` : '—', icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: t('admin_pending_bookings'), value: stats ? stats.bookings.pending : 0, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-400/10', badge: stats?.bookings.todayNew ? t('admin_today_new_badge').replace('{count}', String(stats.bookings.todayNew)) : undefined },
          { label: t('admin_products'), value: stats ? stats.inventory.totalProducts : products.length, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: t('admin_net_balance'), value: `${balance.toLocaleString()} EGP`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
          { label: t('admin_today_invoices'), value: stats ? stats.today.invoiceCount : 0, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: t('wh_low_stock'), value: stats ? stats.inventory.lowStockCount : 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: t('admin_inventory_value'), value: stats ? `${stats.inventory.inventoryValue.toLocaleString()} EGP` : '—', icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: t('admin_customers'), value: stats ? stats.customers.total : 0, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground text-sm">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              {stat.badge && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {stat.badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Today Payment Breakdown */}
      {stats && (
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="font-semibold mb-4">{t('admin_today_payment_breakdown')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xs text-muted-foreground mb-1">{t('admin_cash')}</p>
              <p className="font-bold text-green-400">{(stats.today.cashSales ?? 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xs text-muted-foreground mb-1">{t('admin_card')}</p>
              <p className="font-bold text-blue-400">{(stats.today.cardSales ?? 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xs text-muted-foreground mb-1">{t('admin_transfer')}</p>
              <p className="font-bold text-purple-400">{(stats.today.transferSales ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { href: '/admin/pos/', label: t('pos_title'), icon: ShoppingCart },
          { href: '/admin/reports/', label: t('rpt_title'), icon: TrendingUp },
          { href: '/admin/purchase-orders/', label: t('po_title'), icon: Package },
          { href: '/admin/accounts/', label: t('acct_chart_title'), icon: DollarSign },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <action.icon className="w-4 h-4" />
            {action.label}
            <ArrowRight className="w-3 h-3 opacity-50" />
          </Link>
        ))}
      </div>

      {/* Recent Invoices & Bookings */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-4">{t('admin_recent_invoices')}</h3>
          <div className="space-y-3">
            {(stats?.recentInvoices || []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <p className="font-mono text-xs font-medium">{inv.number}</p>
                  <p className="text-xs text-muted-foreground">{inv.customerName || t('admin_walk_in')}</p>
                </div>
                <span className="text-sm font-bold">{inv.total.toFixed(2)} EGP</span>
              </div>
            ))}
            {(!stats?.recentInvoices || stats.recentInvoices.length === 0) && <p className="text-muted-foreground text-sm">{t('admin_no_bookings')}</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-4">{t('admin_recent_bookings')}</h3>
          <div className="space-y-3">
            {(stats?.recentBookings || bookings.slice(0, 5)).map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.model} &bull; {b.date} {b.time}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'accepted' ? 'bg-green-500/10 text-green-400' : b.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{t('crm_status_' + b.status)}</span>
              </div>
            ))}
            {(stats ? stats.recentBookings : bookings).length === 0 && <p className="text-muted-foreground text-sm">{t('admin_no_bookings')}</p>}
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="font-semibold mb-4">{t('admin_financial_overview')}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10">
            <span className="text-sm text-muted-foreground">{t('admin_total_income')}</span>
            <span className="font-bold text-green-400">{totalIncome.toLocaleString()} EGP</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
            <span className="text-sm text-muted-foreground">{t('admin_total_expenses')}</span>
            <span className="font-bold text-red-400">{totalExpense.toLocaleString()} EGP</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-sm text-muted-foreground">{t('admin_net_balance')}</span>
            <span className="font-bold text-primary">{balance.toLocaleString()} EGP</span>
          </div>
        </div>
      </div>

      {/* Messages & Inventory — side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Messages */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('admin_messages')}</h3>
            <Link href="/admin/bookings/" className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('admin_view_bookings')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {messages.slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email} &bull; {m.phone}</p>
                </div>
                <button onClick={() => deleteMessage(m.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {messages.length === 0 && <p className="text-muted-foreground text-sm">{t('admin_no_messages')}</p>}
          </div>
        </div>

        {/* Inventory Snapshot */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('admin_inventory')}</h3>
            <Link href="/admin/products/" className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('admin_view_bookings')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {products.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.category} &bull; {p.price.toLocaleString()} EGP</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => updateStock(p.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-red-500/10 transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className={`font-mono font-bold w-8 text-center ${p.stock === 0 ? 'text-red-400' : 'text-foreground'}`}>{p.stock}</span>
                  <button onClick={() => updateStock(p.id, 1)} className="w-8 h-8 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-green-500/10 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {products.length === 0 && <p className="text-muted-foreground text-sm">{t('admin_no_products')}</p>}
          </div>
        </div>
      </div>

      {/* Cashier Quick View */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('admin_cashier')}</h3>
          <Link href="/admin/cashier/" className="text-xs text-primary hover:underline flex items-center gap-1">
            {t('admin_view_bookings')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-green-500/5 border border-green-500/10">
            <p className="text-xs text-muted-foreground mb-1">{t('admin_total_income')}</p>
            <p className="font-bold text-green-400">{totalIncome.toLocaleString()} EGP</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/10">
            <p className="text-xs text-muted-foreground mb-1">{t('admin_total_expenses')}</p>
            <p className="font-bold text-red-400">{totalExpense.toLocaleString()} EGP</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground mb-1">{t('admin_net_balance')}</p>
            <p className="font-bold text-primary">{balance.toLocaleString()} EGP</p>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto space-y-3">
          {transactions.slice(0, 10).map((tx) => (
            <div key={tx.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{tx.description || t('admin_no_description')}</p>
                <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <span className={`font-mono font-bold shrink-0 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} EGP
              </span>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-muted-foreground text-sm">{t('admin_no_transactions')}</p>}
        </div>
      </div>
    </div>
  );
}
