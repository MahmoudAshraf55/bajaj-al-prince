'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Send, CheckCircle, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', phone: '', email: '', message: '' });
      } else {
        setStatus('error');
        const data = await res.json().catch(() => ({}));
        const msg = data.error
          || (data.errors?.length ? data.errors.map((e: { message: string }) => e.message).join('. ') : undefined)
          || 'Something went wrong. Please try again.';
        setErrorMsg(msg);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  return (
    <section id="contact" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,107,0,0.04),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
            <span className="text-accent text-xs font-semibold tracking-[0.3em] uppercase">Get In Touch</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight">
            Contact <span className="gradient-text">BAJAJ AL PRINCE</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Have questions or need assistance? Reach out and our team will get back to you promptly.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="glass rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1">Phone</h3>
                <a href="tel:+20123456789" className="text-muted-foreground hover:text-primary transition-colors">+20 123 456 789</a>
              </div>
            </div>
            <div className="glass rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1">Email</h3>
                <a href="mailto:info@bajajalprince.com" className="text-muted-foreground hover:text-primary transition-colors">info@bajajalprince.com</a>
              </div>
            </div>
            <div className="glass rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1">Location</h3>
                <p className="text-muted-foreground">Cairo, Egypt</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="+20 123 456 789"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              {status === 'success' && (
                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Message sent successfully!</span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
