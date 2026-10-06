import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, PackageOpen, RefreshCw } from 'lucide-react';
import { useMotionSafe } from '@/animations/motionConfig';
import { scaleIn, fadeIn } from '@/animations/variants';

// ─── 1. Success Animation ─────────────────────────────────────────────────────

export const SuccessAnimation: React.FC<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ message = 'Operation Completed', size = 'md', className = '' }) => {
  const { prefersReduced } = useMotionSafe();
  const iconSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';

  return (
    <motion.div
      variants={prefersReduced ? undefined : scaleIn}
      initial={prefersReduced ? undefined : 'hidden'}
      animate={prefersReduced ? undefined : 'visible'}
      className={`flex flex-col items-center justify-center text-center gap-2 ${className}`}
    >
      <div className="relative flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 p-2 shadow-sm">
        <CheckCircle2 className={iconSize} />
      </div>
      {message && (
        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
          {message}
        </span>
      )}
    </motion.div>
  );
};

// ─── 2. Error Animation ───────────────────────────────────────────────────────

export const ErrorAnimation: React.FC<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ message = 'An error occurred', size = 'md', className = '' }) => {
  const { prefersReduced } = useMotionSafe();
  const iconSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';

  return (
    <motion.div
      variants={prefersReduced ? undefined : scaleIn}
      initial={prefersReduced ? undefined : 'hidden'}
      animate={prefersReduced ? undefined : 'visible'}
      className={`flex flex-col items-center justify-center text-center gap-2 ${className}`}
    >
      <div className="relative flex items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 p-2 shadow-sm">
        <AlertCircle className={iconSize} />
      </div>
      {message && (
        <span className="text-xs font-bold text-red-900 dark:text-red-300">
          {message}
        </span>
      )}
    </motion.div>
  );
};

// ─── 3. Empty State Animation ─────────────────────────────────────────────────

export const EmptyStateAnimation: React.FC<{
  title?: string;
  description?: string;
  className?: string;
}> = ({ title = 'No Data Found', description, className = '' }) => {
  const { prefersReduced } = useMotionSafe();

  return (
    <motion.div
      variants={prefersReduced ? undefined : fadeIn}
      initial={prefersReduced ? undefined : 'hidden'}
      animate={prefersReduced ? undefined : 'visible'}
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-gold-600 dark:bg-gold-950/40 dark:text-gold-400 mb-3 shadow-sm">
        <PackageOpen className="h-8 w-8" />
      </div>
      <h4 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">{title}</h4>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    </motion.div>
  );
};

// ─── 4. Sync Animation ────────────────────────────────────────────────────────

export const SyncAnimation: React.FC<{
  isSyncing: boolean;
  className?: string;
}> = ({ isSyncing, className = '' }) => {
  const { prefersReduced } = useMotionSafe();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <motion.div
        animate={isSyncing && !prefersReduced ? { rotate: 360 } : { rotate: 0 }}
        transition={
          isSyncing && !prefersReduced
            ? { repeat: Infinity, duration: 1.2, ease: 'linear' }
            : { duration: 0.2 }
        }
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'text-gold-600 dark:text-gold-400' : 'text-slate-400'}`} />
      </motion.div>
      <span className="text-[11px] font-semibold text-slate-500">
        {isSyncing ? 'Syncing...' : 'Synced'}
      </span>
    </div>
  );
};
