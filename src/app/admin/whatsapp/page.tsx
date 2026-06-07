'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import Image from 'next/image';
import {
  MessageCircle, QrCode, Smartphone, Loader2, Unplug,
  Send, CheckCircle2, XCircle, AlertCircle, Mail, CalendarClock,
  Wifi, WifiOff, Shield, AlertTriangle, Info,
} from 'lucide-react';

interface WhatsAppState {
  status: 'initializing' | 'qr' | 'connecting' | 'connected' | 'disconnected';
  qrDataUrl: string | null;
  phone: string | null;
  error: string | null;
}

function PremiumCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 shadow-2xl shadow-black/10 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.03] ${className}`}
    >
      <div className="absolute -right-20 -top-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 mb-6 border-b border-white/[0.06] pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function PremiumToggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      {label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ease-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

export default function WhatsAppAdminPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<WhatsAppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [settings, setSettings] = useState<{ delayMin: number; delayMax: number; dailyCap: number; batchSize: number } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [templates, setTemplates] = useState<{ id: string; event: string; message: string; isActive: boolean }[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const [schedules, setSchedules] = useState<{ id: string; name: string; intervalDays: number; message: string; isActive: boolean }[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/whatsapp/status/', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setState(data.data);
    } catch {
      // ignore polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/whatsapp/settings/', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/whatsapp/templates/', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      } else {
        console.error('Templates API error:', data.error);
      }
    } catch (err) {
      console.error('Templates fetch error:', err);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/whatsapp/reminder-schedules/', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data);
      } else {
        console.error('Schedules API error:', data.error);
      }
    } catch (err) {
      console.error('Schedules fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSettings();
    fetchTemplates();
    fetchSchedules();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchSettings, fetchTemplates, fetchSchedules]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/whatsapp/disconnect/', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', t('wa_disconnect_success'));
        await fetchStatus();
      } else {
        showToast('error', data?.error || t('wa_disconnect_failed'));
      }
    } catch {
      showToast('error', t('wa_network_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunCron = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/cron/reminders/', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `${t('wa_cron_success')}: ${data.data.sent}/${data.data.total}`);
      } else {
        showToast('error', data?.error || t('wa_cron_failed'));
      }
    } catch {
      showToast('error', t('wa_network_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (updates: Partial<typeof settings>) => {
    if (!settings) return;
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/v1/whatsapp/settings/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        showToast('success', t('wa_settings_saved'));
      } else {
        showToast('error', data?.error || t('wa_settings_failed'));
      }
    } catch {
      showToast('error', t('wa_network_error'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateTemplate = async (id: string, updates: { message?: string; isActive?: boolean }) => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(`/api/v1/whatsapp/templates/?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.map((t) => (t.id === id ? data.data : t)));
        showToast('success', t('wa_template_saved'));
      } else {
        showToast('error', data?.error || t('wa_template_failed'));
      }
    } catch {
      showToast('error', t('wa_network_error'));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleUpdateSchedule = async (id: string, updates: { name?: string; intervalDays?: number; message?: string; isActive?: boolean }) => {
    setSchedulesLoading(true);
    try {
      const res = await fetch(`/api/v1/whatsapp/reminder-schedules/?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSchedules((prev) => prev.map((s) => (s.id === id ? data.data : s)));
        showToast('success', t('wa_schedule_saved'));
      } else {
        showToast('error', data?.error || t('wa_schedule_failed'));
      }
    } catch {
      showToast('error', t('wa_network_error'));
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      showToast('error', t('wa_test_fill_fields'));
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/whatsapp/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', t('wa_test_sent'));
        setTestPhone('');
        setTestMessage('');
      } else {
        showToast('error', data?.error || t('wa_test_failed'));
      }
    } catch {
      showToast('error', t('wa_network_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig = {
    initializing: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: t('wa_status_initializing') },
    qr: { icon: QrCode, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: t('wa_status_qr') },
    connecting: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: t('wa_status_connecting') },
    connected: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: t('wa_status_connected') },
    disconnected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: t('wa_status_disconnected') },
  };

  const current = state ? statusConfig[state.status] : null;

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-6 z-50 max-w-md shadow-2xl"
          >
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-6"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                {t('admin_whatsapp')}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">إدارة قوالب الرسائل وتتبع حالة الاتصال وجداول تذكيرات العملاء</p>
            </div>
          </div>
        </motion.div>

        {/* Responsive Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Connection, Actions, QR, Test Message */}
          <div className="lg:col-span-5 space-y-6">
            {/* Status Card */}
            <PremiumCard delay={0.1}>
              <SectionHeader
                icon={Smartphone}
                title={t('wa_connection_status')}
                subtitle="الحالة الفورية لاتصال بوابة الواتساب بالخدمة"
              />

              {loading ? (
                <div className="flex items-center gap-3 py-4 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="text-sm font-medium">{t('wa_loading')}</span>
                </div>
              ) : current ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border ${current.bg} ${current.color} ${current.border}`}>
                      <current.icon className={`w-4 h-4 ${state?.status === 'connecting' || state?.status === 'initializing' ? 'animate-spin' : ''}`} />
                      {current.label}
                    </div>
                    {state?.status === 'connected' ? (
                      <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>

                  {state?.phone && (
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{t('wa_connected_number')}</span>
                      <span className="text-sm font-mono font-semibold text-emerald-400 tracking-wider">+{state.phone}</span>
                    </div>
                  )}

                  {state?.error && state.status !== 'connected' && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{state.error}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleRunCron}
                      disabled={actionLoading || state?.status !== 'connected'}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-sm shadow-lg shadow-emerald-500/15"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {t('wa_run_reminders')}
                    </button>

                    <button
                      onClick={handleDisconnect}
                      disabled={actionLoading || state?.status === 'disconnected'}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] text-red-400 border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 text-sm"
                    >
                      <Unplug className="w-4 h-4" />
                      {t('wa_disconnect')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm py-4">{t('wa_no_status')}</p>
              )}
            </PremiumCard>

            {/* QR Code Card */}
            {state?.qrDataUrl && (
              <PremiumCard delay={0.15} className="border-blue-500/10 bg-blue-500/[0.01]">
                <SectionHeader
                  icon={QrCode}
                  title={t('wa_scan_qr')}
                  subtitle={t('wa_scan_qr_desc')}
                />
                <div className="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl relative group">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent w-full h-0.5 top-0 animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />
                  <div className="p-4 bg-white rounded-2xl shadow-2xl relative z-10 transition-transform duration-300 group-hover:scale-[1.02]">
                    <Image src={state.qrDataUrl} alt="WhatsApp QR Code" width={220} height={250} className="w-56 h-56" />
                  </div>
                  <div className="mt-4 text-xs text-zinc-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span>انتظار مسح الرمز وتحديث الاتصال تلقائياً...</span>
                  </div>
                </div>
              </PremiumCard>
            )}

            {/* Test Message Card */}
            {state?.status === 'connected' && (
              <PremiumCard delay={0.2}>
                <SectionHeader
                  icon={Send}
                  title={t('wa_test_message')}
                  subtitle="اختبر إرسال رسالة واتساب يدويّاً لأي رقم للتأكد من بوابة الإرسال"
                />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">{t('wa_test_phone')}</label>
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder={t('wa_test_phone_placeholder')}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono tracking-wide"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">{t('wa_test_message_text')}</label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder={t('wa_test_message_placeholder')}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <button
                    onClick={handleSendTest}
                    disabled={actionLoading || !testPhone.trim() || !testMessage.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] text-zinc-100 hover:bg-white/[0.08] active:scale-[0.98] transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08]"
                  >
                    <Send className="w-4 h-4 text-emerald-400" />
                    {t('wa_test_send')}
                  </button>
                </div>
              </PremiumCard>
            )}
          </div>

          {/* RIGHT COLUMN: Settings, Templates, Schedules */}
          <div className="lg:col-span-7 space-y-6">

            {/* Anti-Ban Settings Card */}
            {settings && (
              <PremiumCard delay={0.25}>
                <SectionHeader
                  icon={Shield}
                  title={t('wa_settings_title')}
                  subtitle="إعدادات ذكية لمنع حظر الرقم من قبل شركة Meta عبر تحديد فترات انتظار وتدفق دفعات الرسائل"
                />
                <div className="space-y-6">
                  {/* Min Delay Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-zinc-400">{t('wa_settings_delay_min')}</span>
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-mono text-[11px]">{settings.delayMin} ثانية</span>
                    </div>
                    <div className="relative group flex items-center">
                      <input
                        type="range"
                        min={5}
                        max={120}
                        value={settings.delayMin}
                        disabled={settingsLoading}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSettings((s) => s ? { ...s, delayMin: val } : s);
                          handleSaveSettings({ delayMin: val });
                        }}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Max Delay Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-zinc-400">{t('wa_settings_delay_max')}</span>
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-mono text-[11px]">{settings.delayMax} ثانية</span>
                    </div>
                    <div className="relative group flex items-center">
                      <input
                        type="range"
                        min={10}
                        max={300}
                        value={settings.delayMax}
                        disabled={settingsLoading}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSettings((s) => s ? { ...s, delayMax: val } : s);
                          handleSaveSettings({ delayMax: val });
                        }}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Two columns for numbers */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Daily Cap */}
                    <div className="space-y-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-zinc-400">
                        <span>{t('wa_settings_daily_cap')}</span>
                        <span className="text-emerald-400 font-mono">{settings.dailyCap}</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={1000}
                        value={settings.dailyCap}
                        disabled={settingsLoading}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSettings((s) => s ? { ...s, dailyCap: val } : s);
                          handleSaveSettings({ dailyCap: val });
                        }}
                        className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Batch Size */}
                    <div className="space-y-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-zinc-400">
                        <span>{t('wa_settings_batch_size')}</span>
                        <span className="text-emerald-400 font-mono">{settings.batchSize}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={settings.batchSize}
                        disabled={settingsLoading}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSettings((s) => s ? { ...s, batchSize: val } : s);
                          handleSaveSettings({ batchSize: val });
                        }}
                        className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </PremiumCard>
            )}

            {/* Message Templates Card */}
            {templates.length > 0 && (
              <PremiumCard delay={0.3}>
                <SectionHeader
                  icon={Mail}
                  title={t('wa_templates_title')}
                  subtitle="قوالب رسائل تلقائية تُرسل للعميل فوراً عند حدوث إجراء في النظام"
                />
                <div className="space-y-5">
                  {templates.map((tmpl) => {
                    const translated = t(`wa_event_${tmpl.event}`);
                    const label = translated !== `wa_event_${tmpl.event}` ? translated : tmpl.event.replace(/_/g, ' ');
                    return (
                      <div
                        key={tmpl.id}
                        className="group/item relative rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                            {label}
                          </span>
                          <PremiumToggle
                            checked={tmpl.isActive}
                            disabled={templatesLoading}
                            onChange={(checked) => handleUpdateTemplate(tmpl.id, { isActive: checked })}
                            label={t('wa_template_active')}
                          />
                        </div>

                        <textarea
                          value={tmpl.message}
                          disabled={templatesLoading}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTemplates((prev) => prev.map((t) => (t.id === tmpl.id ? { ...t, message: val } : t)));
                          }}
                          onBlur={(e) => handleUpdateTemplate(tmpl.id, { message: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-xs focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/25 transition-all resize-none leading-relaxed text-zinc-300"
                        />

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-zinc-500 ml-1">
                            {t('wa_template_vars')}:
                          </span>
                          {['name', 'model', 'date', 'time', 'issue', 'make'].map((v) => (
                            <button
                              key={v}
                              onClick={() => {
                                navigator.clipboard.writeText(`{{${v}}}`);
                                showToast('success', `تم نسخ {{${v}}} للحافظة`);
                              }}
                              className="text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.05] hover:border-emerald-500/20 hover:text-emerald-400 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                              title="اضغط للنسخ"
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>
            )}

            {/* Reminder Schedules Card */}
            {schedules.length > 0 && (
              <PremiumCard delay={0.35}>
                <SectionHeader
                  icon={CalendarClock}
                  title={t('wa_schedules_title')}
                  subtitle="جدولة رسائل المتابعة وعروض الصيانة بناءً على فترات مخصصة من آخر موعد صيانة"
                />
                <div className="space-y-5">
                  {schedules.map((sch) => (
                    <div
                      key={sch.id}
                      className="group/item relative rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{sch.name}</span>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            {sch.intervalDays > 0 ? `${sch.intervalDays} ${t('wa_schedules_days')}` : t('wa_schedules_manual')}
                          </span>
                        </div>
                        <PremiumToggle
                          checked={sch.isActive}
                          disabled={schedulesLoading}
                          onChange={(checked) => handleUpdateSchedule(sch.id, { isActive: checked })}
                          label={t('wa_schedule_active')}
                        />
                      </div>

                      <textarea
                        value={sch.message}
                        disabled={schedulesLoading}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedules((prev) => prev.map((s) => (s.id === sch.id ? { ...s, message: val } : s)));
                        }}
                        onBlur={(e) => handleUpdateSchedule(sch.id, { message: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-xs focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/25 transition-all resize-none leading-relaxed text-zinc-300"
                      />

                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.03] pt-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={sch.intervalDays}
                            disabled={schedulesLoading}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSchedules((prev) => prev.map((s) => (s.id === sch.id ? { ...s, intervalDays: val } : s)));
                            }}
                            onBlur={(e) => handleUpdateSchedule(sch.id, { intervalDays: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2.5 py-1 rounded-lg bg-black/30 border border-white/[0.08] text-center text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-[11px] font-semibold text-zinc-400">{t('wa_schedules_days_label')}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {['name', 'model'].map((v) => (
                            <button
                              key={v}
                              onClick={() => {
                                navigator.clipboard.writeText(`{{${v}}}`);
                                showToast('success', `تم نسخ {{${v}}} للحافظة`);
                              }}
                              className="text-[10px] font-mono text-zinc-500 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded hover:text-emerald-400 hover:border-emerald-500/10 transition-all"
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            )}

            {/* Info Card */}
            <PremiumCard delay={0.4} className="bg-emerald-500/[0.01]">
              <SectionHeader
                icon={Info}
                title={t('wa_how_it_works')}
                subtitle="كيفية استخدام وإدارة حملات التذكير وجدولة الإرسال"
              />
              <div className="relative border-r-2 border-emerald-500/10 pr-4 space-y-4 text-xs leading-relaxed text-zinc-400">
                <div className="relative">
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#070709] shadow shadow-emerald-500/50" />
                  <p className="font-semibold text-zinc-200 mb-0.5">1. ربط الواتساب</p>
                  <p>امسح الرمز المربع (QR) لتسجيل الدخول، ويجب بقاء الهاتف متصلاً لضمان تسليم فوري وبدون تأخير.</p>
                </div>
                <div className="relative">
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-600 border border-[#070709]" />
                  <p className="font-semibold text-zinc-200 mb-0.5">2. تخصيص القوالب والرسائل</p>
                  <p>استخدم الأقواس مثل {`{{name}}`} و {`{{model}}`} لإدراج بيانات العميل والمركبة تلقائياً وبأقصى درجة دقة.</p>
                </div>
                <div className="relative">
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-600 border border-[#070709]" />
                  <p className="font-semibold text-zinc-200 mb-0.5">3. جدولة التذكيرات (أيام)</p>
                  <p>القيمة &quot;0&quot; تعني إرسال مباشر وعاجل (Broadcast). القيم الأكبر تبحث تلقائياً عن تاريخ آخر حجز مغلق.</p>
                </div>
                <div className="relative">
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-600 border border-[#070709]" />
                  <p className="font-semibold text-zinc-200 mb-0.5">4. منع الحظر التلقائي</p>
                  <p>يتم عشوائياً الانتظار لثوانٍ معدودة بين كل رسالة والأخرى، كما يوجد سقف يومي لحجم الرسائل لحماية حسابك.</p>
                </div>
              </div>
            </PremiumCard>
          </div>
        </div>
      </div>
    </div>
  );
}
