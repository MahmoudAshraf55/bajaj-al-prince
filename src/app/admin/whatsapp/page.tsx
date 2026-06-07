'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import Image from 'next/image';
import {
  MessageCircle, QrCode, Smartphone, Loader2, Unplug,
  Send, RefreshCw, CheckCircle2, XCircle, AlertCircle, Settings, Mail,
} from 'lucide-react';

interface WhatsAppState {
  status: 'initializing' | 'qr' | 'connecting' | 'connected' | 'disconnected';
  qrDataUrl: string | null;
  phone: string | null;
  error: string | null;
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

  useEffect(() => {
    fetchStatus();
    fetchSettings();
    fetchTemplates();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchSettings, fetchTemplates]);

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto p-6 sm:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <MessageCircle className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">{t('admin_whatsapp')}</h1>
        </motion.div>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl px-4 py-3 text-sm border ${
              toast.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {toast.message}
          </motion.div>
        )}

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            {t('wa_connection_status')}
          </h2>

          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('wa_loading')}
            </div>
          ) : current ? (
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${current.bg} ${current.color} ${current.border}`}>
                <current.icon className={`w-4 h-4 ${state?.status === 'connecting' || state?.status === 'initializing' ? 'animate-spin' : ''}`} />
                {current.label}
              </div>

              {state?.phone && (
                <p className="text-sm text-muted-foreground">
                  {t('wa_connected_number')}: <span className="text-foreground font-medium">+{state.phone}</span>
                </p>
              )}

              {state?.error && state.status !== 'connected' && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {state.error}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading || state?.status === 'disconnected'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Unplug className="w-4 h-4" />
                  {t('wa_disconnect')}
                </button>

                <button
                  onClick={handleRunCron}
                  disabled={actionLoading || state?.status !== 'connected'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {t('wa_run_reminders')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('wa_no_status')}</p>
          )}
        </motion.div>

        {/* QR Code Card */}
        {state?.qrDataUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              {t('wa_scan_qr')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t('wa_scan_qr_desc')}
            </p>
            <div className="inline-block p-4 bg-white rounded-2xl">
              <Image src={state.qrDataUrl} alt="WhatsApp QR Code" width={256} height={256} className="w-64 h-64" />
            </div>
          </motion.div>
        )}

        {/* Test Message Card */}
        {state?.status === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="w-4 h-4" />
              {t('wa_test_message')}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('wa_test_phone')}</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder={t('wa_test_phone_placeholder')}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('wa_test_message_text')}</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder={t('wa_test_message_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <button
                onClick={handleSendTest}
                disabled={actionLoading || !testPhone.trim() || !testMessage.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {t('wa_test_send')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Anti-Ban Settings Card */}
        {settings && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('wa_settings_title')}
            </h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{t('wa_settings_delay_min')}</span>
                  <span className="font-medium">{settings.delayMin}s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={300}
                  value={settings.delayMin}
                  disabled={settingsLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings((s) => s ? { ...s, delayMin: val } : s);
                    handleSaveSettings({ delayMin: val });
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{t('wa_settings_delay_max')}</span>
                  <span className="font-medium">{settings.delayMax}s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={600}
                  value={settings.delayMax}
                  disabled={settingsLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings((s) => s ? { ...s, delayMax: val } : s);
                    handleSaveSettings({ delayMax: val });
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{t('wa_settings_daily_cap')}</span>
                  <span className="font-medium">{settings.dailyCap}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={settings.dailyCap}
                  disabled={settingsLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings((s) => s ? { ...s, dailyCap: val } : s);
                    handleSaveSettings({ dailyCap: val });
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{t('wa_settings_batch_size')}</span>
                  <span className="font-medium">{settings.batchSize}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={settings.batchSize}
                  disabled={settingsLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings((s) => s ? { ...s, batchSize: val } : s);
                    handleSaveSettings({ batchSize: val });
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Message Templates Card */}
        {templates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('wa_templates_title')}
            </h2>
            <div className="space-y-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{tmpl.event.replace(/_/g, ' ')}</span>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-muted-foreground">{t('wa_template_active')}</span>
                      <input
                        type="checkbox"
                        checked={tmpl.isActive}
                        disabled={templatesLoading}
                        onChange={(e) => handleUpdateTemplate(tmpl.id, { isActive: e.target.checked })}
                        className="accent-emerald-500 w-4 h-4"
                      />
                    </label>
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
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('wa_template_vars')}: {`{{name}}`}, {`{{model}}`}, {`{{date}}`}, {`{{time}}`}, {`{{issue}}`}, {`{{make}}`}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('wa_how_it_works')}
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">1.</span>
              {t('wa_step_1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">2.</span>
              {t('wa_step_2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">3.</span>
              {t('wa_step_3')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">4.</span>
              {t('wa_step_4')}
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
