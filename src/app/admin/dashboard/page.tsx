'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import {
  LayoutDashboard, Mail, Calendar, Package, Receipt, LogOut,
  Trash2, CheckCircle, XCircle, Search, ArrowLeft, Plus, Minus,
  AlertTriangle, TrendingUp, Users, DollarSign, MessageSquare,
} from 'lucide-react';

interface ContactMessage {
  id: string; name: string; phone: string; email: string; message: string; createdAt: string;
}
interface Booking {
  id: string; name: string; phone: string; model: string; issue: string; date: string; time: string; status: string; createdAt: string;
}
interface Product {
  id: string; name: string; description: string | null; price: number; stock: number; category: string; available: boolean;
}
interface Transaction {
  id: string; type: string; amount: number; description: string | null; createdAt: string;
}

type Tab = 'overview' | 'messages' | 'bookings' | 'inventory' | 'cashier';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  useEffect(() => {
    if (!token) { router.push('/admin/'); return; }
    fetch('/api/auth/me/', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!d.success) router.push('/admin/'); else setLoading(false); });
  }, [token, router]);

  useEffect(() => {
    if (loading) return;
    fetch('/api/contact/', { headers: { Authorization: `Bearer ${token || ''}` } }).then((r) => r.json()).then((d) => { if (d.success) setMessages(d.messages); });
    fetch('/api/bookings/', { headers: { Authorization: `Bearer ${token || ''}` } }).then((r) => r.json()).then((d) => { if (d.success) setBookings(d.bookings); });
    fetch('/api/products/', { headers: { Authorization: `Bearer ${token || ''}` } }).then((r) => r.json()).then((d) => { if (d.success) setProducts(d.products); });
    fetch('/api/cashier/', { headers: { Authorization: `Bearer ${token || ''}` } }).then((r) => r.json()).then((d) => { if (d.success) setTransactions(d.transactions); });
  }, [loading, token]);

  const logout = () => { localStorage.removeItem('admin_token'); router.push('/admin/'); };

  const deleteMessage = async (id: string) => {
    await fetch(`/api/contact/${id}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${token || ''}` } });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await fetch(`/api/bookings/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify({ status }) });
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  };

  const updateStock = async (id: string, delta: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newStock = Math.max(0, product.stock + delta);
    await fetch(`/api/products/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify({ stock: newStock }) });
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: newStock, available: newStock > 0 } : p));
  };

  const addTransaction = async (type: 'income' | 'expense', amount: number, description: string) => {
    const res = await fetch('/api/cashier/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ type, amount, description }),
    });
    const data = await res.json();
    if (data.success) setTransactions((prev) => [data.transaction, ...prev]);
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

  const navItems: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'cashier', label: 'Cashier', icon: Receipt },
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
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all w-full">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="md:hidden glass border-b border-border p-4 flex items-center justify-between">
          <span className="font-bold">Admin Dashboard</span>
          <button onClick={logout} className="text-muted-foreground"><LogOut className="w-5 h-5" /></button>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Messages', value: messages.length, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Pending Bookings', value: pendingBookings, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Products', value: products.length, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    { label: 'Balance', value: `${balance.toLocaleString()} EGP`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
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
                    <h3 className="font-semibold mb-4">Recent Bookings</h3>
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
                      {bookings.length === 0 && <p className="text-muted-foreground text-sm">No bookings yet.</p>}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">Financial Overview</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                        <span className="text-sm text-muted-foreground">Total Income</span>
                        <span className="font-bold text-green-400">{totalIncome.toLocaleString()} EGP</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <span className="text-sm text-muted-foreground">Total Expenses</span>
                        <span className="font-bold text-red-400">{totalExpense.toLocaleString()} EGP</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <span className="text-sm text-muted-foreground">Net Balance</span>
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
                  <h2 className="text-2xl font-bold">Messages</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
                  {messages.length === 0 && <p className="text-muted-foreground">No messages.</p>}
                </div>
              </motion.div>
            )}

            {tab === 'bookings' && (
              <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">Bookings</h2>
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="glass rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold">{b.name} <span className="text-muted-foreground font-normal">&bull; {b.phone}</span></p>
                          <p className="text-sm text-muted-foreground">{b.model} &bull; {b.date} at {b.time}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(b.id, 'accepted')} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">Accept</button>
                          <button onClick={() => updateBookingStatus(b.id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">Reject</button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3">{b.issue}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'accepted' ? 'bg-green-500/10 text-green-400' : b.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <p className="text-muted-foreground">No bookings.</p>}
                </div>
              </motion.div>
            )}

            {tab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">Inventory</h2>
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
                        <span className={`text-xs px-2 py-1 rounded-full ${p.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.available ? 'Available' : 'Out of Stock'}</span>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <p className="text-muted-foreground">No products.</p>}
                </div>
              </motion.div>
            )}

            {tab === 'cashier' && (
              <motion.div key="cashier" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold">Cashier</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CashierForm type="income" label="Add Income" onSubmit={addTransaction} />
                  <CashierForm type="expense" label="Add Expense" onSubmit={addTransaction} />
                </div>
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">Transactions</h3>
                    <span className="text-sm text-muted-foreground">{transactions.length} records</span>
                  </div>
                  <div className="divide-y divide-border">
                    {transactions.map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t.description || 'No description'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`font-mono font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} EGP
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="p-4 text-muted-foreground text-sm">No transactions.</p>}
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

function CashierForm({ type, label, onSubmit }: { type: 'income' | 'expense'; label: string; onSubmit: (type: 'income' | 'expense', amount: number, desc: string) => void }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    onSubmit(type, val, desc);
    setAmount('');
    setDesc('');
  };

  return (
    <form onSubmit={handle} className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-sm">{label}</h3>
      <input required type="number" min="1" step="0.01" placeholder="Amount (EGP)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      <input type="text" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      <button type="submit" className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${type === 'income' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>{label}</button>
    </form>
  );
}
