'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, Loader2, Upload } from 'lucide-react';
import { useTranslation } from '@/components/useTranslation';
import { useToast } from '@/components/ToastContext';

interface PdfPreviewRow {
  row: number;
  sku: string | null;
  barcode: string | null;
  name: string;
  price: number | null;
  stock: number | null;
}

interface PdfPreview {
  totalRows: number;
  preview: PdfPreviewRow[];
  textSample: string;
}

interface PdfResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

export default function WHPdfImportTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [result, setResult] = useState<PdfResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setPreview(null);
    setResult(null);

    const fd = new FormData();
    fd.append('file', f);
    fd.append('action', 'preview');

    try {
      const res = await fetch('/api/v1/products/import-pdf/', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const d = await res.json();
      if (d.success) {
        setPreview(d.data);
      } else {
        addToast('error', d.error || 'Failed to parse PDF');
      }
    } catch {
      addToast('error', 'Failed to parse PDF');
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setImporting(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('action', 'confirm');

    try {
      const res = await fetch('/api/v1/products/import-pdf/', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const d = await res.json();
      if (d.success) {
        setResult(d.data);
        addToast('success', `PDF import: ${d.data.created} created, ${d.data.updated} updated`);
      } else {
        addToast('error', d.error || 'Import failed');
      }
    } catch {
      addToast('error', 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      {!preview && !result && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">{t('wh_pdf_import_drop') || 'Upload a product PDF catalogue'}</p>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="pdf-import-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <label
            htmlFor="pdf-import-input"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {t('wh_import_browse')}
          </label>
        </div>
      )}

      {preview && !result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {t('wh_import_total')}: <span className="text-foreground font-bold">{preview.totalRows}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={reset}
                disabled={importing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
                {t('wh_import_cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? t('wh_import_processing') : `${t('wh_import_confirm')} (${preview.totalRows})`}
              </button>
            </div>
          </div>

          {importing && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-primary mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('wh_import_processing')}
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-primary w-full animate-pulse" />
              </div>
            </div>
          )}

          <div className="overflow-auto max-h-80 border border-border rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left p-2 font-medium whitespace-nowrap">#</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_sku')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_barcode')}</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">{t('wh_import_en_name')}</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">{t('admin_market_price')}</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">{t('wh_import_stock')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, idx) => (
                  <tr key={idx} className="border-t border-border/50">
                    <td className="p-2">{row.row}</td>
                    <td className="p-2 font-mono">{row.sku || '-'}</td>
                    <td className="p-2 font-mono">{row.barcode || '-'}</td>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2 text-right">{row.price != null ? `${row.price.toFixed(2)}` : '-'}</td>
                    <td className="p-2 text-right">{row.stock ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.totalRows > 10 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 10 of {preview.totalRows} rows</p>
          )}
        </div>
      )}

      {result && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-500" />
          </div>
          <h4 className="text-lg font-bold mb-2">{t('wh_import_success')}</h4>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-green-400">{result.created}</p>
              <p className="text-muted-foreground">{t('wh_import_created')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{result.updated}</p>
              <p className="text-muted-foreground">{t('wh_import_updated')}</p>
            </div>
            {result.skipped > 0 && (
              <div>
                <p className="text-2xl font-bold text-red-400">{result.skipped}</p>
                <p className="text-muted-foreground">{t('wh_import_skipped')}</p>
              </div>
            )}
            <div>
              <p className="text-2xl font-bold">{result.total}</p>
              <p className="text-muted-foreground">{t('wh_import_total')}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            {t('pos_confirm')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
