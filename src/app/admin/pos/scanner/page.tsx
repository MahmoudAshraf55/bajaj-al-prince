'use client';

import { useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/useTranslation';

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
  const scanningRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [lastResult, setLastResult] = useState<ScannedProduct | null>(null);
  const [lastBarcode, setLastBarcode] = useState('');
  const [error, setError] = useState('');

  const startScanning = async () => {
    setStarting(true);
    setError('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStarting(false);
      setError(language === 'ar'
        ? '🔒 الكاميرا تحتاج HTTPS. صل من localhost أو استخدم شهادة SSL.\nالسماح بالكاميرا غير متاح على HTTP.'
        : '🔒 Camera requires HTTPS. Use localhost or enable SSL.\nCamera permission is unavailable on HTTP.');
      return;
    }

    setLastResult(null);
    try {
      const scanner = new Html5Qrcode('scanner-element');
      scannerRef.current = scanner;

      scanningRef.current = true;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          if (!scanningRef.current) return;
          scanningRef.current = false;
          try { scanner.stop(); } catch {}
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
              setError('');
            } else {
              setLastResult(null);
              setLastBarcode(decodedText);
              setError(t('pos_barcode_not_found'));
            }
          } catch {
            setError(t('pos_network_error'));
          }
        },
        () => {}
      );
      setScanning(true);
      setStarting(false);
    } catch (err) {
      setStarting(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError(language === 'ar'
            ? 'تم رفض صلاحية الكاميرا. يرجى السماح بالكاميرا في إعدادات المتصفح'
            : 'Camera permission denied. Please allow camera access in browser settings');
        } else if (err.name === 'NotFoundError') {
          setError(t('pos_camera_not_found'));
        } else if (err.name === 'NotReadableError') {
          setError(t('pos_camera_busy'));
        } else if (err.message?.includes('https') || err.message?.includes('secure')) {
          setError(language === 'ar'
            ? 'الكاميرا تحتاج HTTPS. استخدم localhost أو شغّل HTTPS'
            : 'Camera requires HTTPS. Use localhost or enable HTTPS');
        } else {
          setError(`${t('pos_camera_start_error')}: ${err.message}`);
        }
      } else {
        setError(t('pos_camera_start_error'));
      }
    }
  };

  const stopScanning = () => {
    scanningRef.current = false;
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setScanning(false);
      }).catch(() => setScanning(false));
    }
  };

  const scanBarcode = useCallback((barcode: string) => {
    router.push(`/admin/pos?newBarcode=${encodeURIComponent(barcode)}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-black" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-md mx-auto" style={{ height: '100dvh' }}>
        <div id="scanner-element" className="w-full h-full" />

        {!scanning && !starting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
            <h1 className="text-white text-xl font-bold mb-2">{t('pos_scan_mobile')}</h1>
            <p className="text-gray-400 text-sm mb-8 text-center">{t('pos_point_camera')}</p>
            <button
              onClick={startScanning}
              className="px-10 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity"
            >
              {t('pos_start_scan')}
            </button>
            {error && (
              <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
            )}
          </div>
        )}

        {starting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">{t('pos_starting_camera')}</p>
          </div>
        )}

        {scanning && (
          <>
            <button
              onClick={stopScanning}
              className="absolute top-4 right-4 z-10 px-4 py-2 rounded-xl bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-colors"
            >
              {t('pos_stop')}
            </button>

            {lastResult && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-4 z-10"
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
                    onClick={() => scanBarcode(lastResult.barcode)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    {t('pos_add_to_cart')}
                  </button>
                  <button
                    onClick={startScanning}
                    className="py-2.5 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {t('pos_scan_another')}
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl p-3 text-sm text-center mb-2">
                  {error}: {lastBarcode}
                </div>
                {lastBarcode && (
                  <button
                    onClick={() => router.push(`/admin/pos?newBarcode=${encodeURIComponent(lastBarcode)}`)}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    {t('pos_add_new_product')}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
