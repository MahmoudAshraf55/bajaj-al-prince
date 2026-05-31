'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetch('/api/auth/me/', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.success) router.push('/admin/dashboard/'); });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        router.push('/admin/dashboard/');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="glass rounded-2xl p-8 border-glow-animated">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">BAJAJ AL PRINCE Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted-foreground text-xs mt-6">
            Default: admin / admin123
          </p>
        </div>
      </motion.div>
    </div>
  );
}
