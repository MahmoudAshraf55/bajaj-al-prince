'use client';

import { motion } from 'framer-motion';
import { History, Plus, Minus, AlertTriangle } from 'lucide-react';
import type { StockMovement } from '@/types/warehouse';

interface WHMovementsListProps {
  movements: StockMovement[];
  t: (k: string) => string;
}

export default function WHMovementsList({ movements, t }: WHMovementsListProps) {
  return (
    <motion.div key="movements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {movements.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('wh_movements')}</p>
        </div>
      )}
      <div className="space-y-2">
        {movements.slice(0, 100).map((m) => (
          <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              m.type === 'in' ? 'bg-green-500/10 text-green-400' : m.type === 'out' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {m.type === 'in' ? <Plus className="w-4 h-4" /> : m.type === 'out' ? <Minus className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.product.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.type === 'in' ? t('wh_add_stock') : m.type === 'out' ? t('wh_remove_stock') : t('wh_adjustment')} — {m.quantity} {m.reference && `(${m.reference})`}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
              <p>{m.createdBy.username}</p>
              <p>{new Date(m.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
