'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';
import BackButton from '@/components/BackButton';
import {
  Save, Loader2, Percent, Settings2, Package, Bell,
  AlertTriangle, Globe, MapPin, Phone, Upload, X,
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
  const { t, isRTL } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
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
  const [brandLogo, setBrandLogo] = useState('');
  const [brandLogoSaving, setBrandLogoSaving] = useState(false);

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
    let cancelled = false;
    fetch('/api/auth/me/', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.success) { router.push('/admin/'); return; }
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
              setBrandLogo(s.brand_logo ?? '');
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
          .finally(() => { if (!cancelled) setLoading(false); });
      })
      .catch(() => { if (!cancelled) router.push('/admin/'); });
    return () => { cancelled = true; };
  }, [router]);

  const handleSaveAll = async () => {
    setSaving(true);
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      addToast('error', t('settings_tax_rate_invalid'));
      setSaving(false);
      return;
    }
    const threshold = parseInt(lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      addToast('error', t('settings_low_stock_invalid'));
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/settings/batch/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: [
            { key: 'tax_rate', value: taxRate },
            { key: 'low_stock_threshold', value: lowStockThreshold },
            { key: 'notify_on_low_stock', value: notifyOnLowStock ? 'true' : 'false' },
            { key: 'notify_on_booking', value: notifyOnBooking ? 'true' : 'false' },
            { key: 'brand_name', value: brandName },
            { key: 'brand_tagline', value: brandTagline },
            { key: 'brand_logo', value: brandLogo },
            { key: 'location_address', value: locationAddress },
            { key: 'location_map_url', value: locationMapUrl },
            { key: 'contact_phone1', value: contactPhone1 },
            { key: 'contact_phone2', value: contactPhone2 },
            { key: 'contact_email', value: contactEmail },
            { key: 'contact_facebook', value: contactFacebook },
            { key: 'contact_instagram', value: contactInstagram },
            { key: 'contact_tiktok', value: contactTiktok },
            { key: 'contact_whatsapp', value: contactWhatsapp },
          ],
        }),
      });
      const d = await res.json();
      if (d.success) {
        addToast('success', t('admin_settings_saved'));
        setDirty(false);
      } else {
        addToast('error', d.error || t('admin_settings_save_error'));
      }
    } catch {
      addToast('error', t('admin_settings_save_error'));
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
                    <h2 className="font-bold">{t('settings_general_title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings_general_desc')}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_tax_rate')}</label>
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
                  <p className="text-xs text-muted-foreground mt-1">{t('settings_tax_hint')}</p>
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
                    <h2 className="font-bold">{t('settings_inventory_title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings_inventory_desc')}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_low_stock_threshold')}</label>
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
                  <p className="text-xs text-muted-foreground mt-1">{t('settings_low_stock_hint')}</p>
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
                    <h2 className="font-bold">{t('settings_notifications_title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings_notifications_desc')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-sm">{t('settings_low_stock_alert')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings_low_stock_alert_desc')}</p>
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
                      <p className="font-medium text-sm">{t('settings_new_booking_notification')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings_new_booking_notification_desc')}</p>
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
                    <h2 className="font-bold">{t('settings_branding_title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings_branding_desc')}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_site_name')}</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => { setBrandName(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="El Prince Bajaj"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_tagline')}</label>
                  <input
                    type="text"
                    value={brandTagline}
                    onChange={(e) => { setBrandTagline(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('settings_tagline_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_logo')}</label>
                  <div className="flex items-center gap-4">
                    {(brandLogo || '/Logo.png') && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-border">
                        <img
                          src={brandLogo || '/Logo.png'}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer">
                      {brandLogoSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {t('settings_logo_upload')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={brandLogoSaving}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBrandLogoSaving(true);
                          try {
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('prefix', 'logo');
                            const res = await fetch('/api/v1/upload/', { method: 'POST', credentials: 'include', body: fd });
                            const d = await res.json();
                            if (d.success) {
                              setBrandLogo(d.data.url);
                              setDirty(true);
                            } else {
                              addToast('error', d.error || 'Upload failed');
                            }
                          } catch {
                            addToast('error', 'Network error');
                          } finally {
                            setBrandLogoSaving(false);
                          }
                        }}
                      />
                    </label>
                    {brandLogo && (
                      <button
                        onClick={() => { setBrandLogo(''); setDirty(true); }}
                        className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                    <h2 className="font-bold">{t('settings_location_title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings_location_desc')}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_address')}</label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => { setLocationAddress(e.target.value); setDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="35JH+PC مركز أوسيم"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings_google_maps_url')}</label>
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
                    <h2 className="font-bold">{t('settings_contact_title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings_contact_desc')}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings_phone_1')}</label>
                    <input
                      type="text"
                      value={contactPhone1}
                      onChange={(e) => { setContactPhone1(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings_phone_2')}</label>
                    <input
                      type="text"
                      value={contactPhone2}
                      onChange={(e) => { setContactPhone2(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2">{t('settings_email')}</label>
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
                    <label className="block text-sm font-medium mb-2">{t('settings_facebook')}</label>
                    <input
                      type="url"
                      value={contactFacebook}
                      onChange={(e) => { setContactFacebook(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings_instagram')}</label>
                    <input
                      type="url"
                      value={contactInstagram}
                      onChange={(e) => { setContactInstagram(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings_tiktok')}</label>
                    <input
                      type="url"
                      value={contactTiktok}
                      onChange={(e) => { setContactTiktok(e.target.value); setDirty(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings_whatsapp')}</label>
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
          {saving ? t('settings_saving') : t('settings_save_all')}
        </button>
      </motion.div>
    </div>
  );
}
