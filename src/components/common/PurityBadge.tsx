import React from 'react';
import { MetalPurity } from '@/types';

export const PurityBadge: React.FC<{ purity: MetalPurity }> = ({ purity }) => {
  const labelMap: Record<MetalPurity, string> = {
    '24k': '24K (99.9%)',
    '22k': '22K (91.6%)',
    '18k': '18K (75.0%)',
    '14k': '14K (58.5%)',
    '925_silver': '925 Silver',
    '999_silver': '999 Fine Silver',
    other: 'Other Purity',
  };

  return (
    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-gold-500/20 dark:text-gold-300">
      {labelMap[purity] || purity}
    </span>
  );
};

