'use client';

import { motion } from 'framer-motion';
import {
  ClipboardList, Calendar, Clock, Wrench, AlertCircle, CheckCircle2,
  Pencil, Car, Bell,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Customer, Booking, Vehicle } from '@/types';
import CustomerTimeline from '@/components/CustomerTimeline';

interface CustomerActivityTimelineProps {
  customer: Customer;
  customerId: string;
  t: (key: string) => string;
  historyTab: 'bookings' | 'timeline' | 'invoices';
  setHistoryTab: (tab: 'bookings' | 'timeline' | 'invoices') => void;
  onMarkCompleted: (bookingId: string) => void;
  onOpenIssueEdit: (b: Booking) => void;
  showBookingModal: boolean;
  editingBooking: Booking | null;
  bookingForm: { issue: string };
  setBookingForm: (form: { issue: string }) => void;
  onSaveIssue: (e: React.FormEvent) => void;
  onCloseBookingModal: () => void;
  showWorkOrderModal: boolean;
  setShowWorkOrderModal: (show: boolean) => void;
  workOrderForm: { vehicleId: string; description: string };
  setWorkOrderForm: (form: { vehicleId: string; description: string }) => void;
  workOrderSubmitting: boolean;
  onCreateWorkOrder: () => void;
  submitting: boolean;
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'accepted': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getNextVisitDate(bookings: Booking[]) {
  if (!bookings || bookings.length === 0) return null;
  const lastDate = bookings[0].date;
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + 30);
  return nextDate.toISOString().split('T')[0];
}

function isOverdue(nextDateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(nextDateStr);
  return nextDate < today;
}

export default function CustomerActivityTimeline({
  customer, customerId, t, historyTab, setHistoryTab,
  onMarkCompleted, onOpenIssueEdit,
  showBookingModal, editingBooking, bookingForm, setBookingForm,
  onSaveIssue, onCloseBookingModal,
  showWorkOrderModal, setShowWorkOrderModal,
  workOrderForm, setWorkOrderForm, workOrderSubmitting, onCreateWorkOrder,
  submitting,
}: CustomerActivityTimelineProps) {
  return (
    <>
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setHistoryTab('bookings')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            historyTab === 'bookings'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          {t('crm_service_history')} ({customer?.bookings?.length ?? 0})
        </button>
        <button
          onClick={() => setHistoryTab('timeline')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            historyTab === 'timeline'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t('crm_timeline')}
        </button>
      </div>

      {historyTab === 'timeline' ? (
        <CustomerTimeline customerId={customerId} />
      ) : (
        <>
          {customer?.bookings && customer.bookings.length > 0 && (
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {t('crm_next_visit')}: <span className="text-primary font-medium">{getNextVisitDate(customer.bookings)}</span>
                </span>
              </div>
            </div>
          )}

          {customer?.bookings && customer.bookings.length > 0 && (() => {
            const nextDate = getNextVisitDate(customer.bookings);
            if (!nextDate) return null;
            const overdue = isOverdue(nextDate);
            return (
              <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
                overdue
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-primary/5 border-primary/20'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  overdue ? 'bg-red-500/10' : 'bg-primary/10'
                }`}>
                  <Calendar className={`w-5 h-5 ${overdue ? 'text-red-400' : 'text-primary'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${overdue ? 'text-red-400' : 'text-primary'}`}>
                    {overdue ? t('crm_overdue_visit') : t('crm_upcoming_visit')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overdue
                      ? t('crm_overdue_visit_desc').replace('{date}', nextDate)
                      : t('crm_upcoming_visit_desc').replace('{date}', nextDate)
                    }
                  </p>
                </div>
              </div>
            );
          })()}

          {customer?.bookings && customer.bookings.length > 0 ? (
            <div className="space-y-3">
              {customer.bookings.map((b: Booking, idx: number) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{b.model}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{b.date}</span>
                          <Clock className="w-3 h-3 ml-1" />
                          <span>{b.time}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(b.status)}`}>
                      {b.status === 'pending' && t('crm_status_pending')}
                      {b.status === 'accepted' && t('crm_status_accepted')}
                      {b.status === 'completed' && t('crm_status_completed')}
                      {b.status === 'rejected' && t('crm_status_rejected')}
                    </span>
                  </div>

                  <div className={`rounded-xl p-3 ${
                    b.status === 'completed'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-secondary/30'
                  }`}>
                    <p className={`text-xs mb-1 flex items-center gap-1 ${
                      b.status === 'completed' ? 'text-green-400' : 'text-muted-foreground'
                    }`}>
                      <AlertCircle className="w-3 h-3" /> {t('crm_issue_description')}
                    </p>
                    <p className={`text-sm ${b.status === 'completed' ? 'text-green-300' : 'text-foreground'}`}>
                      {b.issue}
                    </p>
                  </div>

                  {b.status !== 'completed' && b.status !== 'rejected' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => onMarkCompleted(b.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium hover:bg-green-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {t('crm_maintenance_done')}
                      </button>
                      <button
                        onClick={() => onOpenIssueEdit(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        {t('crm_issue_changed')}
                      </button>
                    </div>
                  )}

                  {b.vehicle && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Car className="w-3 h-3" />
                      <span>{b.vehicle.make} {b.vehicle.model}</span>
                      {b.vehicle.plateNumber && (
                        <span className="font-mono">· {b.vehicle.plateNumber}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t('crm_no_service_history')}</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                {t('crm_no_service_history_desc')}
              </p>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showBookingModal && !!editingBooking} onClose={onCloseBookingModal} title={t('crm_actual_issue')}>
        <form onSubmit={onSaveIssue} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t('crm_issue_description')}
            </label>
            <textarea
              required
              rows={4}
              value={bookingForm.issue}
              onChange={(e) => setBookingForm({ issue: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              placeholder={t('booking_issue_ph')}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCloseBookingModal}
              className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/80 transition-colors"
            >
              {t('crm_cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-600/90 transition-colors disabled:opacity-50"
            >
              {t('crm_save_actual_issue')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showWorkOrderModal} onClose={() => setShowWorkOrderModal(false)} title={t('wo_create')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle')}</label>
            <select
              required
              value={workOrderForm.vehicleId}
              onChange={(e) => setWorkOrderForm({ ...workOrderForm, vehicleId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="">{t('wo_select_vehicle')}</option>
              {customer?.vehicles?.map((v: Vehicle) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} {v.plateNumber ? `(${v.plateNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_description')}</label>
            <textarea
              required
              rows={4}
              value={workOrderForm.description}
              onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              placeholder={t('wo_describe_work')}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowWorkOrderModal(false)}
              className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/80 transition-colors"
            >
              {t('crm_cancel')}
            </button>
            <button
              onClick={onCreateWorkOrder}
              disabled={workOrderSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {workOrderSubmitting ? t('wo_creating') : t('wo_create')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
