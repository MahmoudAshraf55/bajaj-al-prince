'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/useTranslation';
import { Calendar, Clock, Wrench, FileText, Car, Bell, Loader2 } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'booking' | 'invoice' | 'vehicle' | 'work_order' | 'reminder';
  date?: string;
  time?: string;
  createdAt?: string;
  issue?: string;
  number?: string;
  total?: number;
  status?: string;
  description?: string;
  cost?: number | null;
  make?: string;
  model?: string;
  message?: string;
  sentAt?: string;
}

export default function CustomerTimeline({ customerId }: { customerId: string }) {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/customers/${customerId}/timeline/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.timeline) {
          const all: TimelineEvent[] = [
            ...res.data.timeline.bookings,
            ...res.data.timeline.invoices,
            ...res.data.timeline.vehicles,
            ...res.data.timeline.workOrders,
            ...res.data.timeline.reminders,
          ];
          all.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || a.sentAt || 0).getTime();
            const dateB = new Date(b.date || b.createdAt || b.sentAt || 0).getTime();
            return dateB - dateA;
          });
          setEvents(all);
        }
      })
      .catch((err) => {
        console.error('[CustomerTimeline] Failed to load timeline', err);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{t('crm_no_timeline')}</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'booking': return Wrench;
      case 'invoice': return FileText;
      case 'vehicle': return Car;
      case 'work_order': return Wrench;
      case 'reminder': return Bell;
      default: return Calendar;
    }
  };

  const getEventColor = (type: string, status?: string) => {
    if (status === 'completed' || status === 'confirmed') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (status === 'cancelled' || status === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (status === 'pending') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    switch (type) {
      case 'booking': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'invoice': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'vehicle': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'reminder': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border/50" />
        {events.map((event, i) => {
          const Icon = getEventIcon(event.type);
          return (
            <motion.div
              key={`${event.type}-${event.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative flex items-start gap-4 pl-0"
            >
              <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${getEventColor(event.type, event.status)}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 glass rounded-xl p-4 -ml-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {event.type === 'booking' && t('crm_event_booking')}
                    {event.type === 'invoice' && t('crm_event_invoice')}
                    {event.type === 'vehicle' && t('crm_event_vehicle')}
                    {event.type === 'work_order' && t('crm_event_work_order')}
                    {event.type === 'reminder' && t('crm_event_reminder')}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <Calendar className="w-3 h-3" />
                    {formatDate(event.date || event.createdAt || event.sentAt)}
                  </div>
                </div>
                {event.type === 'booking' && (
                  <>
                    <p className="text-sm font-medium">{event.issue}</p>
                    {event.time && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </div>
                    )}
                  </>
                )}
                {event.type === 'invoice' && (
                  <>
                    <p className="text-sm font-medium">{event.number}</p>
                    <p className="text-sm font-bold text-primary">
                      {event.total?.toLocaleString()} EGP
                    </p>
                  </>
                )}
                {event.type === 'vehicle' && (
                  <p className="text-sm font-medium">{event.make} {event.model}</p>
                )}
                {event.type === 'work_order' && (
                  <>
                    <p className="text-sm font-medium">{event.description}</p>
                    {event.cost !== null && event.cost !== undefined && (
                      <p className="text-sm font-bold text-primary mt-1">
                        {event.cost.toLocaleString()} EGP
                      </p>
                    )}
                  </>
                )}
                {event.type === 'reminder' && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.message}</p>
                )}
                {event.status && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${getEventColor(event.type, event.status)}`}>
                    {event.status}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
