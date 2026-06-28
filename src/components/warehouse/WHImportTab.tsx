'use client';

import { motion } from 'framer-motion';
import { Upload, X, Loader2 } from 'lucide-react';
import type { ImportPreview, ImportResult } from '@/types/warehouse';

interface WHImportTabProps {
  t: (k: string) => string;
  fileInputRef: { readonly current: HTMLInputElement | null };
  handleImportFile: (file: File) => void;
  importPreview: ImportPreview | null;
  importResult: ImportResult | null;
  importing: boolean;
  importAborted: boolean;
  handleImportConfirm: () => void;
  handleImportCancel: () => void;
  resetImport: () => void;
}

export default function WHImportTab({
  t, fileInputRef, handleImportFile, importPreview, importResult,
  importing, importAborted, handleImportConfirm, handleImportCancel, resetImport,
}: WHImportTabProps) {
  return (
    <motion.div key="import" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      {!importPreview && !importResult && (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">{t('wh_import_drop')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            {t('wh_import_browse')}
          </button>
        </div>
      )}

      {importPreview && !importResult && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{t('wh_import_total')}: <span className="text-foreground font-bold">{importPreview.totalRows}</span></p>
            <div className="flex gap-2">
              {importing && (
                <button
                  onClick={handleImportCancel}
                  disabled={importAborted}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                  {t('wh_import_cancel')}
                </button>
              )}
              <button
                onClick={handleImportConfirm}
                disabled={importing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? t('wh_import_processing') : `${t('wh_import_confirm')} (${importPreview.totalRows})`}
              </button>
            </div>
          </div>
          {importing && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-primary mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {importAborted ? t('wh_import_cancelling') : t('wh_import_processing')}
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full bg-primary transition-all ${importAborted ? 'w-0' : 'w-full animate-pulse'}`} />
              </div>
            </div>
          )}
          <div className="overflow-auto max-h-80 border border-border rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_sku')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_barcode')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_en_name')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_ar_name')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_vehicle_model')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('admin_market_category')}</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">{t('admin_market_price')}</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_cost_price')}</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_stock')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_unit')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_tax_rate')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_description')}</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.preview.map((row, idx) => (
                  <tr key={idx} className="border-t border-border/50">
                    <td className="p-2 font-mono">{(row.sku as string) || '-'}</td>
                    <td className="p-2 font-mono">{(row.barcode as string) || '-'}</td>
                    <td className="p-2">{(row.name as string) || '-'}</td>
                    <td className="p-2">{(row.nameAr as string) || '-'}</td>
                    <td className="p-2">{(row.vehicleModel as string) || '-'}</td>
                    <td className="p-2">{(row.category as string) || '-'}</td>
                    <td className="p-2 text-right">{row.price != null ? `${Number(row.price).toFixed(2)}` : '-'}</td>
                    <td className="p-2 text-right">{row.costPrice != null ? `${Number(row.costPrice).toFixed(2)}` : '-'}</td>
                    <td className="p-2 text-right">{row.stock != null ? Number(row.stock) : '-'}</td>
                    <td className="p-2">{(row.unit as string) || '-'}</td>
                    <td className="p-2">{row.taxRate != null ? `${Number(row.taxRate)}%` : '-'}</td>
                    <td className="p-2 max-w-[120px] truncate" title={(row.description as string) || ''}>{(row.description as string) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importPreview.totalRows > 10 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 10 of {importPreview.totalRows} rows</p>
          )}
        </div>
      )}

      {importResult && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-green-500" />
          </div>
          <h4 className="text-lg font-bold mb-2">{t('wh_import_success')}</h4>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-green-400">{importResult.created}</p>
              <p className="text-muted-foreground">{t('wh_import_created')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{importResult.updated}</p>
              <p className="text-muted-foreground">{t('wh_import_updated')}</p>
            </div>
            {importResult.skipped > 0 && (
              <div>
                <p className="text-2xl font-bold text-red-400">{importResult.skipped}</p>
                <p className="text-muted-foreground">{t('wh_import_skipped')}</p>
              </div>
            )}
            <div>
              <p className="text-2xl font-bold">{importResult.total}</p>
              <p className="text-muted-foreground">{t('wh_import_total')}</p>
            </div>
          </div>
          <button
            onClick={resetImport}
            className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            {t('pos_confirm')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
