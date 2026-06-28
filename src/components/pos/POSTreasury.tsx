'use client';

import { motion } from 'framer-motion';
import { DollarSign, FileText, TrendingUp, Receipt, Loader2 } from 'lucide-react';
import { TreasuryData } from '@/types/pos';

interface POSTreasuryProps {
  treasuryLoading: boolean;
  treasuryData: TreasuryData;
  t: (key: string) => string;
}

export default function POSTreasury({
  treasuryLoading,
  treasuryData,
  t,
}: POSTreasuryProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      {treasuryLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-5 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{treasuryData.todaySales.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{t('pos_total_sales')}</p>
            </div>
            <div className="glass rounded-2xl p-5 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{treasuryData.todayCount}</p>
              <p className="text-xs text-muted-foreground">{t('pos_invoices_count')}</p>
            </div>
            <div className="glass rounded-2xl p-5 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold">{treasuryData.todayTax.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{t('pos_tax')}</p>
            </div>
            <div className="glass rounded-2xl p-5 text-center">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p className="text-2xl font-bold">{treasuryData.todayDiscount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{t('pos_discount')}</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold mb-4">{t('pos_payment_breakdown')}</h3>
            <div className="space-y-3">
              {[
                { label: 'pos_cash', value: treasuryData.cashTotal, color: 'text-green-400' },
                { label: 'pos_card', value: treasuryData.cardTotal, color: 'text-blue-400' },
                { label: 'pos_transfer', value: treasuryData.transferTotal, color: 'text-amber-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t(item.label)}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value.toFixed(2)} EGP</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-bold">{t('pos_total')}</span>
                <span className="font-bold text-lg">{treasuryData.todaySales.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
