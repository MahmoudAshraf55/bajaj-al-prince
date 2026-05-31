'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Bike, Wrench, Send, CheckCircle, AlertCircle, User, Phone } from 'lucide-react';

export default function BookingPage() {
  const [form, setForm] = useState({ name: '', phone: '', model: '', issue: '', date: '', time: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const today = new Date().toISOString().split('T')[0];

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
      const res = await fetch('/api/bookings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setForm({ name: '', phone: '', model: '', issue: '', date: '', time: '' });
      } else {
        setStatus('error');
        const msg = data.error
          || (data.errors?.length ? data.errors.map((e: { message: string }) => e.message).join('. ') : undefined)
          || 'Booking failed';
        setErrorMsg(msg);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
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
            <span className="text-primary text-xs font-semibold tracking-[0.3em] uppercase">Service Booking</span>
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">Book <span className="gradient-text">Service</span></h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Schedule your motorcycle service with BAJAJ AL PRINCE expert technicians.</p>
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
              <h2 className="text-2xl font-bold mb-2">Booking Requested!</h2>
              <p className="text-muted-foreground mb-6">We will contact you shortly to confirm your appointment.</p>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Book Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> Customer Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+20 123 456 789"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Bike className="w-4 h-4" /> Motorcycle Model
                </label>
                <input
                  required
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Bajaj Pulsar 180"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Issue Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.issue}
                  onChange={(e) => setForm({ ...form, issue: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Describe the issue or service needed..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Preferred Date
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
                    <Clock className="w-4 h-4" /> Preferred Time
                  </label>
                  <select
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option value="">Select time</option>
                    {generateTimeSlots().map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Working hours: 10:00 AM - 10:00 PM. Friday is closed. Official holidays are unavailable.</span>
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
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Request Booking
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
