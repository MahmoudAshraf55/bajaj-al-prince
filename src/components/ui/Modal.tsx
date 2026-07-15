'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  zIndex?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  contentClassName = '',
  closeOnBackdrop = true,
  showCloseButton = true,
  zIndex = 'z-50',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${className}`}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className={`glass rounded-2xl p-6 w-full max-w-lg border border-border ${contentClassName}`}
          >
            {title && (
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{title}</h3>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
