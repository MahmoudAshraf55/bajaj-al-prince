'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import {
  Settings, Menu, ShoppingBag, ClipboardList, BarChart3, Package,
  MessageCircle, Wrench, Users, Car, List, DollarSign,
  Save, Loader2, X, Percent, Camera,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, isRTL } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxRate, setTaxRate] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: number; type: string; message: string }>>([]);

  const addToast = useCallback((type: string, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    fetch('/api/v1/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.settings?.tax_rate) {
          setTaxRate(res.data.settings.tax_rate);
        } else {
          setTaxRate('14');
        }
      })
      .catch(() => setTaxRate('14'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rate = parseFloat(taxRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        addToast('error', language === 'ar' ? 'معدل الضريبة يجب أن يكون بين 0 و 100' : 'Tax rate must be between 0 and 100');
        setSaving(false);
        return;
      }
      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tax_rate', value: taxRate }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
      } else {
        addToast('error', data.error || 'Failed to save');
      }
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sidebarLinks = [
    { href: '/admin/dashboard', icon: BarChart3, labelKey: 'admin_dashboard' },
    { href: '/admin/accounting', icon: DollarSign, labelKey: 'admin_accounting' },
    { href: '/admin/market', icon: ShoppingBag, labelKey: 'admin_market' },
    { href: '/admin/pos', icon: ClipboardList, labelKey: 'admin_pos' },
    { href: '/admin/warehouse', icon: Package, labelKey: 'admin_warehouse' },
    { href: '/admin/customers', icon: Users, labelKey: 'admin_customers' },
    { href: '/admin/vehicles', icon: Car, labelKey: 'admin_vehicles' },
    { href: '/admin/vehicle-models', icon: List, labelKey: 'admin_vehicle_models' },
    { href: '/admin/work-orders', icon: Wrench, labelKey: 'admin_work_orders' },
    { href: '/admin/whatsapp', icon: MessageCircle, labelKey: 'admin_whatsapp' },
    { href: '/admin/devices', icon: Camera, labelKey: 'admin_devices' },
    { href: '/admin/settings', icon: Settings, labelKey: 'admin_settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-y-0 ${language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} border-border/50 bg-background/80 backdrop-blur-xl z-50 w-64 transform transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : language === 'ar' ? 'translate-x-full' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{t('admin_title')}</h2>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {sidebarLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => { router.push(link.href); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${link.href === '/admin/settings' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              {t(link.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={`${language === 'ar' ? 'md:mr-64' : 'md:ml-64'} min-h-screen`}>
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold">{t('admin_settings')}</h1>
            <div className="w-6" />
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold">{language === 'ar' ? 'إعدادات الضريبة' : 'Tax Settings'}</h2>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'تعديل معدل ضريبة القيمة المضافة' : 'Modify the VAT (Value Added Tax) rate'}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'معدل الضريبة (%)' : 'Tax Rate (%)'}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-input border border-border text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar'
                    ? 'القيمة الافتراضية 14%. أدخل 0 لإلغاء الضريبة.'
                    : 'Default 14%. Enter 0 to disable tax.'}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')}
              </button>
            </motion.div>
          )}
        </main>
      </div>

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
                toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
