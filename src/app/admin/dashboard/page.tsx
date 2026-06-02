'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { useTranslation } from '@/components/useTranslation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Mail, Calendar, Package, Receipt, LogOut,
  Trash2, Search, Plus, Minus,
  DollarSign, MessageSquare, Users, Car, List,
} from 'lucide-react';

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

type Tab = 'overview' | 'messages' | 'bookings' | 'inventory' | 'cashier';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { router.push('/admin/'); }
        else { setLoading(false); }
      });
  }, [router]);

  useEffect(() => {
    if (loading) return;
    fetch('/api/contact/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setMessages(d.data.messages); });
    fetch('/api/bookings/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setBookings(d.data.bookings); });
    fetch('/api/products/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setProducts(d.data.products); });
    fetch('/api/cashier/?limit=1000', { credentials: 'include' }).then((r) => r.json()).then((d) => { if (d.success) setTransactions(d.data.transactions); });
  }, [loading]);

  const logout = async () => {
    await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    router.push('/admin/');
  };

  const deleteMessage = async (id: string) => {
    const res = await fetch(`/api/contact/${id}/`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/bookings/${id}/`, {
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
    const res = await fetch(`/api/products/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stock: newStock, available: newStock > 0 }),
    });
    if (res.ok) setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: newStock, available: newStock > 0 } : p));
  };

  const addTransaction = async (type: 'income' | 'expense', amount: number, description: string) => {
    const res = await fetch('/api/cashier/', {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;

  const navItems: { id: Tab; labelKey: string; icon: LucideIcon }[] = [
    { id: 'overview', labelKey: 'admin_overview', icon: LayoutDashboard },
    { id: 'messages', labelKey: 'admin_messages', icon: Mail },
    { id: 'bookings', labelKey: 'admin_bookings', icon: Calendar },
    { id: 'inventory', labelKey: 'admin_inventory', icon: Package },
    { id: 'cashier', labelKey: 'admin_cashier', icon: Receipt },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 glass border-r border-border flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {t(item.labelKey as string)}
            </button>
          ))}
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            CRM
          </div>
          <button
            onClick={() => router.push('/admin/customers/')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <Users className="w-4 h-4" />
            {t('admin_customers')}
          </button>
          <button
            onClick={() => router.push('/admin/vehicles/')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <Car className="w-4 h-4" />
            {t('admin_vehicles')}
          </button>
          <button
            onClick={() => router.push('/admin/vehicle-models/')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <List className="w-4 h-4" />
            {t('admin_vehicle_models')}
          </button>
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all w-full">
            <LogOut className="w-4 h-4" />
            {t('admin_sign_out')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="md:hidden glass border-b border-border p-4 flex items-center justify-between">
          <span className="font-bold">{t('admin_dashboard')}</span>
          <button onClick={logout} className="text-muted-foreground"><LogOut className="w-5 h-5" /></button>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">{t('admin_dashboard')}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: t('admin_total_messages'), value: messages.length, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: t('admin_pending_bookings'), value: pendingBookings, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: t('admin_products'), value: products.length, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    { label: t('admin_balance'), value: `${balance.toLocaleString()} EGP`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-muted-foreground text-sm">{stat.label}</span>
                        <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="glass rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">{t('admin_recent_bookings')}</h3>
                    <div className="space-y-3">
                      {bookings.slice(0, 5).map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                          <div>
                            <p className="font-medium text-sm">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.model} &bull; {b.date} {b.time}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'accepted' ? 'bg-green-500/10 text-green-400' : b.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{b.status}</span>
                        </div>
                      ))}
                      {bookings.length === 0 && <p className="text-muted-foreground text-sm">{t('admin_no_bookings')}</p>}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">{t('admin_financial_overview')}</h3>
                    <div className="space-y-4">
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
                </div>
              </motion.div>
            )}

            {tab === 'messages' && (
              <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{t('admin_messages')}</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" placeholder={t('admin_search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="space-y-3">
                  {messages.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())).map((m) => (
                    <div key={m.id} className="glass rounded-2xl p-5 group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email} &bull; {m.phone}</p>
                        </div>
                        <button onClick={() => deleteMessage(m.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-muted-foreground">{t('admin_no_messages')}</p>}
                </div>
              </motion.div>
            )}

            {tab === 'bookings' && (
              <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">{t('admin_bookings')}</h2>
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="glass rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold">{b.name} <span className="text-muted-foreground font-normal">&bull; {b.phone}</span></p>
                          <p className="text-sm text-muted-foreground">{b.model} &bull; {b.date} at {b.time}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(b.id, 'accepted')} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">{t('admin_accept')}</button>
                          <button onClick={() => updateBookingStatus(b.id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">{t('admin_reject')}</button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3">{b.issue}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'accepted' ? 'bg-green-500/10 text-green-400' : b.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <p className="text-muted-foreground">{t('admin_no_bookings2')}</p>}
                </div>
              </motion.div>
            )}

            {tab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">{t('admin_inventory')}</h2>
                <div className="space-y-3">
                  {products.map((p) => (
                    <div key={p.id} className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{p.category} &bull; {p.price.toLocaleString()} EGP</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateStock(p.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-red-500/10 transition-colors"><Minus className="w-4 h-4" /></button>
                        <span className={`font-mono font-bold w-8 text-center ${p.stock === 0 ? 'text-red-400' : 'text-foreground'}`}>{p.stock}</span>
                        <button onClick={() => updateStock(p.id, 1)} className="w-8 h-8 rounded-lg bg-white/5 border border-border flex items-center justify-center hover:bg-green-500/10 transition-colors"><Plus className="w-4 h-4" /></button>
                        <span className={`text-xs px-2 py-1 rounded-full ${p.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.available ? t('admin_available') : t('admin_out_of_stock')}</span>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <p className="text-muted-foreground">{t('admin_no_products')}</p>}
                </div>
              </motion.div>
            )}

            {tab === 'cashier' && (
              <motion.div key="cashier" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">{t('admin_cashier')}</h2>

                {/* Totals cards - visible right in the cashier tab */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass rounded-2xl p-4 text-center border border-green-500/10">
                    <p className="text-xs text-muted-foreground mb-1">{t('admin_total_income')}</p>
                    <p className="text-xl font-bold text-green-400">{totalIncome.toLocaleString()} EGP</p>
                  </div>
                  <div className="glass rounded-2xl p-4 text-center border border-red-500/10">
                    <p className="text-xs text-muted-foreground mb-1">{t('admin_total_expenses')}</p>
                    <p className="text-xl font-bold text-red-400">{totalExpense.toLocaleString()} EGP</p>
                  </div>
                  <div className="glass rounded-2xl p-4 text-center border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">{t('admin_net_balance')}</p>
                    <p className="text-xl font-bold text-primary">{balance.toLocaleString()} EGP</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <CashierForm type="income" label={t('admin_add_income')} onSubmit={addTransaction} t={t} />
                  <CashierForm type="expense" label={t('admin_add_expense')} onSubmit={addTransaction} t={t} />
                </div>
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">{t('admin_transactions')}</h3>
                    <span className="text-sm text-muted-foreground">{transactions.length} {t('admin_records')}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{tx.description || t('admin_no_description')}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} EGP
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="p-4 text-muted-foreground text-sm">{t('admin_no_transactions')}</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function CashierForm({ type, label, onSubmit, t }: { type: 'income' | 'expense'; label: string; onSubmit: (type: 'income' | 'expense', amount: number, desc: string) => Promise<boolean>; t: (key: string) => string }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    const ok = await onSubmit(type, val, desc);
    setLoading(false);
    if (ok) {
      setAmount('');
      setDesc('');
    } else {
      setError(t('admin_add_failed') || 'Failed to add');
    }
  };

  return (
    <form onSubmit={handle} className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-sm">{label}</h3>
      <input required type="number" min="1" step="0.01" placeholder={t('admin_amount_egp')} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      <input type="text" placeholder={t('admin_description')} value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${type === 'income' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
        {loading ? '...' : label}
      </button>
    </form>
  );
}
