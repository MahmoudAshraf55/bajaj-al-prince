'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import {
  Save, Loader2, Percent, Settings2, Package, Bell,
  AlertTriangle, Globe, MapPin, Phone,
} from 'lucide-react';

type TabId = 'general' | 'inventory' | 'notifications' | 'branding' | 'location' | 'contact';

const tabs: { id: TabId; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', icon: Settings2 },
  { id: 'inventory', icon: Package },
  { id: 'notifications', icon: Bell },
  { id: 'branding', icon: Globe },
  { id: 'location', icon: MapPin },
  { id: 'contact', icon: Phone },
];

export default function SettingsPage() {
  const { t, language, isRTL } = useTranslation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [dirty, setDirty] = useState(false);

  const [taxRate, setTaxRate] = useState('14');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [notifyOnLowStock, setNotifyOnLowStock] = useState(true);
  const [notifyOnBooking, setNotifyOnBooking] = useState(true);

  const [brandName, setBrandName] = useState('El Prince Bajaj');
  const [brandTagline, setBrandTagline] = useState('');

  const [locationAddress, setLocationAddress] = useState('35JH+PC مركز أوسيم');
  const [locationMapUrl, setLocationMapUrl] = useState('https://maps.app.goo.gl/fh1AgzDpB6K87iAs5');

  const [contactPhone1, setContactPhone1] = useState('0122 137 0120');
  const [contactPhone2, setContactPhone2] = useState('0155 123 3908');
  const [contactEmail, setContactEmail] = useState('');
  const [contactFacebook, setContactFacebook] = useState('https://www.facebook.com/elprince.bajaj');
  const [contactInstagram, setContactInstagram] = useState('https://www.instagram.com/elprincebajaj');
  const [contactTiktok, setContactTiktok] = useState('https://www.tiktok.com/@elprince.bajajj');
  const [contactWhatsapp, setContactWhatsapp] = useState('201221370120');

  useEffect(() => {
    fetch('/api/v1/settings/', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.settings) {
          const s = res.data.settings;
          setTaxRate(s.tax_rate ?? '14');
          setLowStockThreshold(s.low_stock_threshold ?? '5');
          setNotifyOnLowStock(s.notify_on_low_stock !== 'false');
          setNotifyOnBooking(s.notify_on_booking !== 'false');
          setBrandName(s.brand_name ?? 'El Prince Bajaj');
          setBrandTagline(s.brand_tagline ?? '');
          setLocationAddress(s.location_address ?? '35JH+PC مركز أوسيم');
          setLocationMapUrl(s.location_map_url ?? 'https://maps.app.goo.gl/fh1AgzDpB6K87iAs5');
          setContactPhone1(s.contact_phone1 ?? '0122 137 0120');
          setContactPhone2(s.contact_phone2 ?? '0155 123 3908');
          setContactEmail(s.contact_email ?? '');
          setContactFacebook(s.contact_facebook ?? 'https://www.facebook.com/elprince.bajaj');
          setContactInstagram(s.contact_instagram ?? 'https://www.instagram.com/elprincebajaj');
          setContactTiktok(s.contact_tiktok ?? 'https://www.tiktok.com/@elprince.bajajj');
          setContactWhatsapp(s.contact_whatsapp ?? '201221370120');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveSetting = useCallback(async (key: string, value: string) => {
    const res = await fetch('/api/v1/settings/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key, value }),
    });
    return res.json();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      addToast('error', language === 'ar' ? 'معدل الضريبة يجب أن يكون بين 0 و 100' : 'Tax rate must be between 0 and 100');
      setSaving(false);
      return;
    }
    const threshold = parseInt(lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      addToast('error', language === 'ar' ? 'حد المخزون المنخفض يجب أن يكون 0 أو أكثر' : 'Low stock threshold must be 0 or greater');
      setSaving(false);
      return;
    }
    try {
      await Promise.all([
        saveSetting('tax_rate', taxRate),
        saveSetting('low_stock_threshold', lowStockThreshold),
        saveSetting('notify_on_low_stock', notifyOnLowStock ? 'true' : 'false'),
        saveSetting('notify_on_booking', notifyOnBooking ? 'true' : 'false'),
        saveSetting('brand_name', brandName),
        saveSetting('brand_tagline', brandTagline),
        saveSetting('location_address', locationAddress),
        saveSetting('location_map_url', locationMapUrl),
        saveSetting('contact_phone1', contactPhone1),
        saveSetting('contact_phone2', contactPhone2),
        saveSetting('contact_email', contactEmail),
        saveSetting('contact_facebook', contactFacebook),
        saveSetting('contact_instagram', contactInstagram),
        saveSetting('contact_tiktok', contactTiktok),
        saveSetting('contact_whatsapp', contactWhatsapp),
      ]);
      addToast('success', language === 'ar' ? 'تم حفظ جميع الإعدادات' : 'All settings saved');
      setDirty(false);
    } catch {
      addToast('error', language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/admin/dashboard/" />
          <h1 className="text-2xl font-bold">{t('admin_settings')}</h1>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(`settings_tab_${tab.id}`)}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="glass rounded-2xl p-6 space-y-5"
          >
            {activeTab === 'general' && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">{language === 'ar' ? 'عام' : 'General'}</h2>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الإعدادات العامة للنظام' : 'General system settings'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'معدل الضريبة (%)' : 'Tax Rate (%)'}</label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => { setTaxRate(e.target.value); setDirty(true); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-input border border-border text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'القيمة الافتراضية 14%. أدخل 0 لإلغاء الضريبة.' : 'Default 14%. Enter 0 to disable tax.'}
                  </p>
                </div>
              </>
            )}

            {activeTab === 'inventory' && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">{language === 'ar' ? 'المخزون' : 'Inventory'}</h2>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إعدادات إدارة المخزون والمنتجات' : 'Inventory and product management settings'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'حد المخزون المنخفض' : 'Low Stock Threshold'}</label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="0"
                      value={lowStockThreshold}
                      onChange={(e) => { setLowStockThreshold(e.target.value); setDirty(true); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-input border border-border text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar'
                      ? 'عند وصول المخزون لهذا الحد أو أقل، يظهر تحذير في لوحة التحكم.'
                      : 'When stock reaches this value or below, a warning appears on the dashboard.'}
                  </p>
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h2>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إعدادات الإشعارات والتنبيهات' : 'Notification and alert settings'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-sm">{language === 'ar' ? 'تنبيه المخزون المنخفض' : 'Low Stock Alert'}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'إرسال إشعار عند انخفاض مخزون المنتج عن الحد المحدد.' : 'Send notification when product stock goes below threshold.'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyOnLowStock}
                      onChange={(e) => { setNotifyOnLowStock(e.target.checked); setDirty(true); }}
                      className="w-5 h-5 rounded-md accent-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-sm">{language === 'ar' ? 'إشعار الحجوزات الجديدة' : 'New Booking Notification'}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'إشعار عند تقديم عميل حجز جديد عبر الموقع.' : 'Notify when a customer submits a new booking via the website.'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyOnBooking}
                      onChange={(e) => { setNotifyOnBooking(e.target.checked); setDirty(true); }}
                      className="w-5 h-5 rounded-md accent-primary"
                    />
                  </label>
                </div>
              </>
            )}

            {activeTab === 'branding' && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">{language === 'ar' ? 'العلامة التجارية' : 'Branding'}</h2>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'بيانات العلامة التجارية الرئيسية للموقع' : 'Main brand information for the website'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'اسم الموقع' : 'Site Name'}</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => { setBrandName(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="El Prince Bajaj"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'الشعار النصي' : 'Tagline'}</label>
                  <input
                    type="text"
                    value={brandTagline}
                    onChange={(e) => { setBrandTagline(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={language === 'ar' ? 'شعار الموقع' : 'Site tagline'}
                  />
                </div>
              </>
            )}

            {activeTab === 'location' && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">{language === 'ar' ? 'الموقع' : 'Location'}</h2>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'بيانات عنوان الشركة وخريطة الموقع' : 'Company address and map settings'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'العنوان' : 'Address'}</label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => { setLocationAddress(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="35JH+PC مركز أوسيم"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'رابط خرائط Google' : 'Google Maps URL'}</label>
                  <input
                    type="url"
                    value={locationMapUrl}
                    onChange={(e) => { setLocationMapUrl(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              </>
            )}

            {activeTab === 'contact' && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">{language === 'ar' ? 'جهات الاتصال' : 'Contact Info'}</h2>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'أرقام الهواتف وروابط التواصل الاجتماعي' : 'Phone numbers and social media links'}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'رقم الهاتف 1' : 'Phone 1'}</label>
                    <input
                      type="text"
                      value={contactPhone1}
                      onChange={(e) => { setContactPhone1(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'رقم الهاتف 2' : 'Phone 2'}</label>
                    <input
                      type="text"
                      value={contactPhone2}
                      onChange={(e) => { setContactPhone2(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => { setContactEmail(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                      placeholder="info@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Facebook</label>
                    <input
                      type="url"
                      value={contactFacebook}
                      onChange={(e) => { setContactFacebook(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Instagram</label>
                    <input
                      type="url"
                      value={contactInstagram}
                      onChange={(e) => { setContactInstagram(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">TikTok</label>
                    <input
                      type="url"
                      value={contactTiktok}
                      onChange={(e) => { setContactTiktok(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">WhatsApp</label>
                    <input
                      type="text"
                      value={contactWhatsapp}
                      onChange={(e) => { setContactWhatsapp(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                      placeholder="201221370120"
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={handleSaveAll}
          disabled={saving || !dirty}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving
            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
            : (language === 'ar' ? 'حفظ جميع الإعدادات' : 'Save All Settings')}
        </button>
      </motion.div>
    </div>
  );
}
