'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import Image from 'next/image';
import {
  MessageCircle, QrCode, Smartphone, Loader2, Unplug,
  Send, RefreshCw, CheckCircle2, XCircle, AlertCircle,
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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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

              {state?.error && (
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
