import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { modalBackdrop, modalContent } from '@/animations/variants';
import { useMotionSafe } from '@/animations/motionConfig';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  const { prefersReduced } = useMotionSafe();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const widthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with fade animation */}
          <motion.div
            variants={prefersReduced ? undefined : modalBackdrop}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal-950/60 backdrop-blur-sm"
          />

          {/* Modal Box with spring scale & elevation */}
          <motion.div
            variants={prefersReduced ? undefined : modalContent}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`relative z-10 w-full ${widthMap[maxWidth]} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-charcoal-800 dark:bg-charcoal-900 max-h-[90vh] flex flex-col`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-charcoal-800">
              <div>
                <h3 id="modal-title" className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                  {title}
                </h3>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <motion.button
                onClick={onClose}
                whileHover={prefersReduced ? {} : { scale: 1.1, rotate: 90 }}
                whileTap={prefersReduced ? {} : { scale: 0.9 }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-charcoal-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
