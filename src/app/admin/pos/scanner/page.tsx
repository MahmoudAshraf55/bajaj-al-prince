'use client';

import { useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/useTranslation';
import { X, Loader2, CheckCircle2, AlertCircle, Camera, RefreshCw } from 'lucide-react';

interface ScannedProduct {
  id: string;
  name: string;
  nameAr: string | null;
  barcode: string;
  price: number;
  stock: number;
  unit: string;
}

export default function MobileScannerPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'found' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState<ScannedProduct | null>(null);
  const [lastBarcode, setLastBarcode] = useState('');

  const startScanning = useCallback(async () => {
    setStatus('starting');
    setErrorMsg('');
    setLastResult(null);
    setLastBarcode('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('error');
      setErrorMsg(language === 'ar'
        ? 'الكاميرا تحتاج HTTPS. استخدم localhost أو شغّل HTTPS'
        : 'Camera requires HTTPS. Use localhost or enable HTTPS');
      return;
    }

    try {
      const scanner = new Html5Qrcode('mobile-scanner-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          try { scanner.stop(); } catch {}
          setStatus('found');
          try {
            const res = await fetch('/api/v1/barcode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ barcode: decodedText, source: 'MobileCamera' }),
            });
            const data = await res.json();
            if (data.success && data.data.found) {
              setLastResult(data.data.product);
              setLastBarcode('');
            } else {
              setLastResult(null);
              setLastBarcode(decodedText);
            }
          } catch {
            setLastResult(null);
            setLastBarcode(decodedText);
          }
        },
        () => {}
      );
      setStatus('scanning');
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setErrorMsg(language === 'ar'
            ? 'تم رفض صلاحية الكاميرا. يرجى السماح بالكاميرا في إعدادات المتصفح'
            : 'Camera permission denied. Please allow camera access in browser settings');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg(t('pos_camera_not_found'));
        } else if (err.name === 'NotReadableError') {
          setErrorMsg(t('pos_camera_busy'));
        } else {
          setErrorMsg(`${t('pos_camera_start_error')}: ${err.message}`);
        }
      } else {
        setErrorMsg(t('pos_camera_start_error'));
      }
    }
  }, [t, language]);

  const addToCart = useCallback((barcode: string) => {
    router.push(`/admin/pos?addBarcode=${encodeURIComponent(barcode)}`);
  }, [router]);

  const addNewProduct = useCallback((barcode: string) => {
    router.push(`/admin/pos?newBarcode=${encodeURIComponent(barcode)}`);
  }, [router]);

  const handleClose = () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
    }
    router.push('/admin/pos');
  };

  const resetScanner = () => {
    setLastResult(null);
    setLastBarcode('');
    setErrorMsg('');
    startScanning();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        <div className="relative flex-1 rounded-xl overflow-hidden bg-black m-2">
          <div id="mobile-scanner-reader" className="w-full h-full" />

          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center px-6">
                <Camera className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <h1 className="text-white text-xl font-bold mb-2">{t('pos_scan_mobile')}</h1>
                <p className="text-gray-400 text-sm mb-8">{t('pos_point_camera')}</p>
                <button
                  onClick={startScanning}
                  className="px-10 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  {t('pos_start_scan')}
                </button>
                {errorMsg && (
                  <p className="text-red-400 text-sm mt-4 text-center">{errorMsg}</p>
                )}
              </div>
            </div>
          )}

          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-white mx-auto mb-3" />
                <p className="text-white text-sm">{t('pos_starting_camera')}</p>
              </div>
            </div>
          )}

          {status === 'found' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center px-6">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-white text-sm mb-4">{errorMsg}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={startScanning}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('pos_retry')}
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    {t('pos_cancel_sale')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'scanning' && (
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {status === 'found' && lastResult && (
            <motion.div
              key="result"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="mx-2 mb-2 glass rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-lg">{language === 'ar' && lastResult.nameAr ? lastResult.nameAr : lastResult.name}</p>
                  <p className="text-xs text-muted-foreground">{lastResult.barcode}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{Number(lastResult.price).toFixed(2)} EGP</p>
                  <p className="text-xs text-muted-foreground">{t('wh_stock')}: {lastResult.stock} {lastResult.unit}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addToCart(lastResult.barcode)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  {t('pos_add_to_cart')}
                </button>
                <button
                  onClick={resetScanner}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('pos_scan_another')}
                </button>
              </div>
            </motion.div>
          )}

          {status === 'found' && lastBarcode && (
            <motion.div
              key="not-found"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="mx-2 mb-2 glass rounded-2xl p-4"
            >
              <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl p-3 text-sm text-center mb-3">
                {t('pos_barcode_not_found')}: {lastBarcode}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addNewProduct(lastBarcode)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  {t('pos_add_new_product')}
                </button>
                <button
                  onClick={resetScanner}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('pos_scan_another')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
