'use client';

import { motion } from 'framer-motion';
import { Upload, X, Loader2, Check, AlertTriangle } from 'lucide-react';
import type { ImportPreview, ImportPreviewRow, ImportResult, ImportDecision } from '@/types/warehouse';

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
  importDecisions: Map<string, ImportDecision>;
  setImportDecisions: React.Dispatch<React.SetStateAction<Map<string, ImportDecision>>>;
}

function setDecision(row: ImportPreviewRow, action: 'update' | 'stock_only', decisions: Map<string, ImportDecision>, setter: React.Dispatch<React.SetStateAction<Map<string, ImportDecision>>>) {
  const key = row.barcode ?? `__row_${row.row}`;
  const next = new Map(decisions);
  if (action === 'stock_only') {
    next.delete(key);
  } else {
    next.set(key, { row: row.row, barcode: row.barcode ?? '', action });
  }
  setter(next);
}

function getDecision(row: ImportPreviewRow, decisions: Map<string, ImportDecision>): 'update' | 'stock_only' {
  const key = row.barcode ?? `__row_${row.row}`;
  return decisions.has(key) ? 'update' : 'stock_only';
}

function PreviewTable({ rows, decisions, setter, t, isExisting }: {
  rows: ImportPreviewRow[];
  decisions: Map<string, ImportDecision>;
  setter: React.Dispatch<React.SetStateAction<Map<string, ImportDecision>>>;
  t: (k: string) => string;
  isExisting: boolean;
}) {
  return (
    <div className="overflow-auto border border-border rounded-xl">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/5">
            <th scope="col" className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_sku')}</th>
            <th scope="col" className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_barcode')}</th>
            <th scope="col" className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_en_name')}</th>
            <th scope="col" className="text-left p-2 font-medium whitespace-nowrap">{t('wh_vehicle_model')}</th>
            <th scope="col" className="text-left p-2 font-medium whitespace-nowrap">{t('admin_market_category')}</th>
            <th scope="col" className="text-right p-2 font-medium whitespace-nowrap">{t('admin_market_price')}</th>
            <th scope="col" className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_cost_price')}</th>
            <th scope="col" className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_stock')}</th>
            {isExisting && (
              <th scope="col" className="text-center p-2 font-medium whitespace-nowrap">{t('wh_import_action') || 'Action'}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={`border-t border-border/50 ${isExisting ? (getDecision(row, decisions) === 'update' ? 'bg-blue-500/5' : 'bg-amber-500/5') : 'bg-green-500/5'}`}>
              <td className="p-2 font-mono">{(row.sku as string) || '-'}</td>
              <td className="p-2 font-mono">{(row.barcode as string) || '-'}</td>
              <td className="p-2">{(row.name as string) || '-'}</td>
              <td className="p-2">{(row.vehicleModel as string) || '-'}</td>
              <td className="p-2">{(row.category as string) || '-'}</td>
              <td className="p-2 text-right font-mono">
                {row.isNew ? (
                  row.price != null ? `${Number(row.price).toFixed(2)}` : '-'
                ) : (
                  <DiffCell
                    diffs={row.diffs}
                    field="price"
                    value={row.price}
                  />
                )}
              </td>
              <td className="p-2 text-right font-mono">
                {row.isNew ? (
                  row.costPrice != null ? `${Number(row.costPrice).toFixed(2)}` : '-'
                ) : (
                  <DiffCell
                    diffs={row.diffs}
                    field="costPrice"
                    value={row.costPrice}
                  />
                )}
              </td>
              <td className="p-2 text-right font-mono">
                {row.isNew ? (
                  row.stock != null ? Number(row.stock) : '-'
                ) : (
                  <DiffCell
                    diffs={row.diffs}
                    field="stock"
                    value={row.stock}
                  />
                )}
              </td>
              {isExisting && (
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setDecision(row, 'update', decisions, setter)}
                      className={`p-1 rounded ${getDecision(row, decisions) === 'update' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'} transition-colors`}
                      title={t('wh_import_update') || 'Update'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDecision(row, 'stock_only', decisions, setter)}
                      className={`p-1 rounded ${getDecision(row, decisions) === 'stock_only' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'} transition-colors`}
                      title={t('wh_import_stock_only') || 'Stock Only'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffCell({ diffs, field, value }: { diffs: Array<{ field: string; oldValue: string | number | null; newValue: string | number | null }>; field: string; value: string | number | null }) {
  const diff = diffs.find(d => d.field === field);
  if (!diff) return <span>{value != null ? Number(value).toFixed(2) : '-'}</span>;

  return (
    <div className="flex flex-col items-end">
      <span className="text-muted-foreground line-through text-[10px]">{diff.oldValue}</span>
      <span className="text-blue-400">{diff.newValue}</span>
    </div>
  );
}

export default function WHImportTab({
  t, fileInputRef, handleImportFile, importPreview, importResult,
  importing, importAborted, handleImportConfirm, handleImportCancel, resetImport,
  importDecisions, setImportDecisions,
}: WHImportTabProps) {
  return (
    <motion.div key="import" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
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
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">{t('wh_import_total')}: <span className="text-foreground font-bold">{importPreview.totalRows}</span></p>
              <p className="text-sm text-green-400">{importPreview.newCount} new</p>
              <p className="text-sm text-amber-400">{importPreview.existingCount} existing</p>
            </div>
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

          {importPreview.sheetCategories && importPreview.sheetCategories.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
              <div>
                <span className="font-medium text-amber-400">{t('wh_categories_found') || 'Categories found:'}</span>{' '}
                {importPreview.sheetCategories.join(', ')}
                <p className="text-muted-foreground mt-0.5">{t('wh_categories_new_warning') || 'New categories will be created automatically'}</p>
              </div>
            </div>
          )}

          {importPreview.missingDataCount && importPreview.missingDataCount > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="font-medium text-amber-400">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {t('wh_missing_data') || 'Missing data:'}
              </span>{' '}
              {importPreview.missingDataCount} {t('wh_products_missing') || 'products missing price/stock'}
            </div>
          )}

          {/* Existing products section */}
          {importPreview.existingCount > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('wh_existing_products') || 'Existing Products'} ({importPreview.existingCount})
                </h3>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => {
                      const next = new Map(importDecisions);
                      for (const row of importPreview.rows.filter(r => !r.isNew)) {
                        const key = row.barcode ?? `__row_${row.row}`;
                        next.set(key, { row: row.row, barcode: row.barcode ?? '', action: 'update' });
                      }
                      setImportDecisions(next);
                    }}
                    className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    {t('wh_approve_all') || 'Approve All'}
                  </button>
                  <button
                    onClick={() => {
                      const next = new Map(importDecisions);
                      for (const row of importPreview.rows.filter(r => !r.isNew)) {
                        next.delete(row.barcode ?? `__row_${row.row}`);
                      }
                      setImportDecisions(next);
                    }}
                    className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                  >
                    {t('wh_stock_only_all') || 'Stock Only All'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {t('wh_existing_hint') || 'For existing products: ✓ = update all fields + add stock, ✗ = add stock only. Click the icon to toggle.'}
              </p>
              <PreviewTable
                rows={importPreview.rows.filter(r => !r.isNew)}
                decisions={importDecisions}
                setter={setImportDecisions}
                t={t}
                isExisting={true}
              />
            </div>
          )}

          {/* New products section */}
          {importPreview.newCount > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {t('wh_new_products') || 'New Products'} ({importPreview.newCount})
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                {t('wh_new_hint') || 'These products will be created automatically.'}
              </p>
              <PreviewTable
                rows={importPreview.rows.filter(r => r.isNew)}
                decisions={importDecisions}
                setter={setImportDecisions}
                t={t}
                isExisting={false}
              />
            </div>
          )}

          {importPreview.totalRows > (importPreview.rows.length) && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('wh_showing_first') || 'Showing first'} {importPreview.rows.length} {t('wh_of') || 'of'} {importPreview.totalRows} {t('wh_rows') || 'rows'}
            </p>
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
