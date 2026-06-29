'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import {
  Save, Loader2, Percent,
} from 'lucide-react';

export default function SettingsPage() {
  const { t, language, isRTL } = useTranslation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxRate, setTaxRate] = useState('');

  useEffect(() => {
    fetch('/api/v1/settings/', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.settings?.tax_rate != null) {
          setTaxRate(String(res.data.settings.tax_rate));
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
      const res = await fetch('/api/v1/settings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background" dir={isRTL ? 'rtl' : 'ltr'}>
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
                <h1 className="font-bold">{t('admin_settings')}</h1>
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
  );
}
