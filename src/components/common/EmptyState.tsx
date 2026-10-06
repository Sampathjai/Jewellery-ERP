import React from 'react';
import { motion } from 'motion/react';
import { PackageOpen } from 'lucide-react';
import { fadeUp } from '@/animations/variants';
import { useMotionSafe } from '@/animations/motionConfig';

interface EmptyStateProps {
  title: string;
  description: string;
  actionBtn?: React.ReactNode;
  icon?: React.ElementType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionBtn,
  icon: Icon = PackageOpen,
}) => {
  const { prefersReduced } = useMotionSafe();

  return (
    <motion.div
      variants={prefersReduced ? undefined : fadeUp}
      initial={prefersReduced ? undefined : 'hidden'}
      animate={prefersReduced ? undefined : 'visible'}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-charcoal-800 dark:bg-charcoal-900"
    >
      <motion.div
        whileHover={prefersReduced ? {} : { scale: 1.08, rotate: 6 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-gold-600 dark:bg-gold-950/40 dark:text-gold-400 shadow-sm"
      >
        <Icon className="h-8 w-8" />
      </motion.div>
      <h3 className="mt-4 font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      {actionBtn && <div className="mt-6">{actionBtn}</div>}
    </motion.div>
  );
};
