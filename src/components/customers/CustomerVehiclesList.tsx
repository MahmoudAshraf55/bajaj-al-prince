'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Car, Plus, Pencil, X, Hash, Gauge, ChevronDown, AlertCircle, Wrench,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Vehicle, VehicleModel } from '@/types';

interface CustomerVehiclesListProps {
  vehicles: Vehicle[];
  vehicleModels: VehicleModel[];
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (v: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
  onCreateWorkOrder: () => void;
  showVehicleModal: boolean;
  editingVehicle: Vehicle | null;
  form: { make: string; model: string; year: string; chassisNumber: string; plateNumber: string };
  setForm: React.Dispatch<React.SetStateAction<{ make: string; model: string; year: string; chassisNumber: string; plateNumber: string }>>;
  formError: string;
  isCustomModel: boolean;
  setIsCustomModel: (v: boolean) => void;
  submitting: boolean;
  onSaveVehicle: (e: React.FormEvent) => void;
  onCloseModal: () => void;
}

export default function CustomerVehiclesList({
  vehicles, vehicleModels, t, onAdd, onEdit, onDelete, onCreateWorkOrder,
  showVehicleModal, editingVehicle, form, setForm, formError, isCustomModel,
  setIsCustomModel, submitting, onSaveVehicle, onCloseModal,
}: CustomerVehiclesListProps) {
  const maxYear = useMemo(() => new Date().getFullYear() + 1, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          {t('crm_garage')} ({vehicles.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onCreateWorkOrder}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            {t('wo_create')}
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('crm_add_vehicle')}
          </button>
        </div>
      </div>

      {vehicles.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v: Vehicle) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-5 relative group"
            >
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(v)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title={t('crm_edit_vehicle')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(v.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  title={t('crm_remove_vehicle')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{v.make} {v.model}</p>
                  {v.year && <p className="text-xs text-muted-foreground">{v.year}</p>}
                </div>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                {v.plateNumber && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    <span className="font-mono">{v.plateNumber}</span>
                  </div>
                )}
                {v.chassisNumber && (
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3 h-3" />
                    <span className="font-mono">{v.chassisNumber}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t('crm_no_vehicles_garage')}</p>
          <button
            onClick={onAdd}
            className="mt-3 text-sm text-primary font-medium hover:underline"
          >
            {t('crm_add_first_vehicle')}
          </button>
        </div>
      )}

      <Modal isOpen={showVehicleModal} onClose={onCloseModal} title={editingVehicle ? t('crm_edit_vehicle') : t('crm_add_vehicle')}>
        <form onSubmit={onSaveVehicle} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle_make')}</label>
            <input
              readOnly
              value="Bajaj"
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground focus:outline-none cursor-not-allowed text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle_model')}</label>
            <div className="relative">
              <select
                required
                value={isCustomModel ? '__other__' : form.model}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__other__') {
                    setIsCustomModel(true);
                    setForm((f) => ({ ...f, model: '' }));
                  } else {
                    setIsCustomModel(false);
                    setForm((f) => ({ ...f, model: val }));
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-10 text-sm"
              >
                <option value="">{t('booking_select_model')}</option>
                {vehicleModels.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
                <option value="__other__">{t('booking_model_other')}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {isCustomModel && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('booking_custom_model')}</label>
              <input
                required
                type="text"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="Pulsar 150"
              />
            </motion.div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_vehicle_year')}</label>
              <input
                type="number"
                min="1900"
                max={maxYear}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="2023"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_plate_number')}</label>
              <input
                value={form.plateNumber}
                onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="ABC-1234"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('crm_chassis_number')}</label>
            <input
              value={form.chassisNumber}
              onChange={(e) => setForm((f) => ({ ...f, chassisNumber: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
              placeholder="MLHJC..."
            />
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {formError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              editingVehicle ? t('crm_update_vehicle_btn') : t('crm_add_vehicle_btn')
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
