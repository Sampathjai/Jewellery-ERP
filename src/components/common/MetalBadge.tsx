import React from 'react';
import { MetalType } from '@/types';

export const MetalBadge: React.FC<{ metal: MetalType }> = ({ metal }) => {
  const styles: Record<MetalType, string> = {
    gold: 'border-gold-300 bg-gold-100/60 text-amber-900 dark:border-gold-800/60 dark:bg-gold-950/60 dark:text-gold-300',
    silver: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    platinum: 'border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    other: 'border-gray-200 bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[metal] || styles.other}`}>
      {metal}
    </span>
  );
};

