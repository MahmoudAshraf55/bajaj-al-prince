'use client';

import { useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertCircle, Camera, RefreshCw } from 'lucide-react';

interface BarcodeWebcamProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export default function BarcodeWebcam({ onScan, onClose, t }: BarcodeWebcamProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'found' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const startCamera = useCallback(async () => {
    setStatus('starting');
    setErrorMsg('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('error');
      setErrorMsg('🔒 Camera requires HTTPS. Use localhost or enable SSL.\nCamera permission is unavailable on HTTP.');
      return;
    }

    try {
      const scanner = new Html5Qrcode('barcode-webcam-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          setStatus('found');
          setTimeout(() => onScan(decodedText), 500);
        },
        () => {}
      );
      setStatus('scanning');
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setErrorMsg(err.message || t('pos_camera_denied'));
        } else if (err.name === 'NotFoundError') {
          setErrorMsg(t('pos_camera_not_found'));
        } else if (err.name === 'NotReadableError') {
          setErrorMsg(t('pos_camera_busy'));
        } else if (err.message?.includes('https') || err.message?.includes('secure')) {
          setErrorMsg(`${t('pos_camera_start_error')} — HTTPS required. Use localhost or enable HTTPS.`);
        } else {
          setErrorMsg(`${t('pos_camera_start_error')}: ${err.message}`);
        }
      } else {
        setErrorMsg(t('pos_camera_start_error'));
      }
    }
  }, [onScan, t]);

  const handleClose = () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="relative bg-background rounded-2xl p-4 w-full max-w-md mx-4"
        >
          <button onClick={handleClose} className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>

          <h3 className="font-bold text-lg mb-3 text-center">{t('pos_scan_webcam')}</h3>

          <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
            <div id="barcode-webcam-reader" className="w-full h-full" />

            {status === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center px-6">
                  <Camera className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70 text-sm mb-4">{t('pos_point_camera')}</p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {t('pos_start_scan')}
                  </button>
                </div>
              </div>
            )}

            {status === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                  <p className="text-white text-sm">{t('pos_starting_camera')}</p>
                </div>
              </div>
            )}

            {status === 'found' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-green-500/20"
              >
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </motion.div>
            )}

            {status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center px-6">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-white text-sm mb-3">{errorMsg}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t('pos_retry')}
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                    >
                      {t('pos_cancel_sale')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3">
            {status === 'scanning' ? t('pos_point_camera') : ''}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
