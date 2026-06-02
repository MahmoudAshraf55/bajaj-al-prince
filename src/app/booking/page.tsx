'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Bike, Wrench, Send, CheckCircle, AlertCircle,
  User, Phone, Hash, Gauge, ChevronDown,
} from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';
import type { VehicleModel } from '@/types';

export default function BookingPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '', phone: '', model: '', issue: '', date: '', time: '',
    make: '', year: '', plateNumber: '', chassisNumber: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [today, setToday] = useState('');
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [isCustomModel, setIsCustomModel] = useState(false);

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
    fetch('/api/vehicle-models/')
      .then((r) => r.json().catch(() => ({ success: false, data: { models: [] } })))
      .then((d) => {
        if (d?.success && Array.isArray(d?.data?.models)) {
          setModels(d.data.models);
        }
      })
      .catch(() => setModels([]));
  }, []);

  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 10; h < 22; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        model: form.model,
        issue: form.issue,
        date: form.date,
        time: form.time,
      };
      if (form.make.trim()) payload.make = form.make.trim();
      if (form.year.trim()) payload.year = parseInt(form.year, 10);
      if (form.plateNumber.trim()) payload.plateNumber = form.plateNumber.trim();
      if (form.chassisNumber.trim()) payload.chassisNumber = form.chassisNumber.trim();

      const res = await fetch('/api/bookings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) {
        setStatus('success');
        setForm({
          name: '', phone: '', model: '', issue: '', date: '', time: '',
          make: '', year: '', plateNumber: '', chassisNumber: '',
        });
        setIsCustomModel(false);
      } else {
        setStatus('error');
        const msg = data?.error
          || (data?.errors?.length ? data.errors.map((e: { message: string }) => e.message).join('. ') : undefined)
          || t('booking_failed');
        setErrorMsg(msg);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t('booking_network_error'));
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-primary" />
            <span className="text-primary text-xs font-semibold tracking-[0.3em] uppercase">{t('booking_tag')}</span>
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">{t('booking_title')}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('booking_desc')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          {status === 'success' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('booking_success_title')}</h2>
              <p className="text-muted-foreground mb-6">{t('booking_success_desc')}</p>
              <button
                onClick={() => {
                  setStatus('idle');
                  setForm({
                    name: '', phone: '', model: '', issue: '', date: '', time: '',
                    make: '', year: '', plateNumber: '', chassisNumber: '',
                  });
                  setIsCustomModel(false);
                }}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                {t('booking_book_another')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> {t('booking_name')}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('booking_name_ph')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {t('booking_phone')}
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('booking_phone_ph')}
                  />
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Bike className="w-4 h-4" /> {t('booking_model')}
                </label>
                <div className="relative">
                  <select
                    required
                    value={isCustomModel ? '__other__' : form.model}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__other__') {
                        setIsCustomModel(true);
                        setForm({ ...form, model: '', make: '' });
                      } else {
                        setIsCustomModel(false);
                        const selected = models.find((m) => m.name === val);
                        setForm({
                          ...form,
                          model: val,
                          make: selected?.make || '',
                        });
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-10"
                  >
                    <option value="">{t('booking_select_model')}</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    <option value="__other__">{t('booking_model_other')}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Custom Model Input */}
              {isCustomModel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Bike className="w-4 h-4" /> {t('booking_custom_model')}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('booking_model_ph')}
                  />
                </motion.div>
              )}

              {/* Make + Year */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    {t('booking_make')}
                  </label>
                  <input
                    type="text"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Bajaj"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    {t('booking_year')}
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="2023"
                  />
                </div>
              </div>

              {/* Plate + Chassis */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" /> {t('booking_plate')}
                  </label>
                  <input
                    type="text"
                    value={form.plateNumber}
                    onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="ABC-1234"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Gauge className="w-4 h-4" /> {t('booking_chassis')}
                  </label>
                  <input
                    type="text"
                    value={form.chassisNumber}
                    onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    placeholder="MLHJC..."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> {t('booking_issue')}
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.issue}
                  onChange={(e) => setForm({ ...form, issue: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder={t('booking_issue_ph')}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {t('booking_date')}
                  </label>
                  <input
                    required
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {t('booking_time')}
                  </label>
                  <select
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option value="">{t('booking_select_time')}</option>
                    {generateTimeSlots().map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{t('booking_working_hours')}</span>
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {t('booking_processing')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('booking_request')}
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
