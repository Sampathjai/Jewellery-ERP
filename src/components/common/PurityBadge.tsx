import React from 'react';
import { MetalPurity } from '@/types';

interface PurityBadgeProps {
  purity?: MetalPurity | string;
  actualTouch?: number;
  touch?: number;
}

export const PurityBadge: React.FC<PurityBadgeProps> = ({ purity, actualTouch, touch }) => {
  const displayTouch = touch ?? actualTouch;

  const labelMap: Record<string, string> = {
    '24k': '24K (99.9%)',
    '22k': '22K (91.6%)',
    '18k': '18K (75.0%)',
    '14k': '14K (58.5%)',
    '925_silver': '925 Silver',
    '999_silver': '999 Fine Silver',
    '70_touch': '70% Touch',
    '40_touch': '40% Touch',
    '37_touch': '37% Touch',
    other: 'Custom Touch',
  };

  let displayText = labelMap[purity || ''] || purity || 'Touch';
  if (displayTouch !== undefined && displayTouch !== null) {
    displayText = `${displayTouch}% Touch`;
  }

  return (
    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold font-mono text-amber-900 dark:bg-gold-500/20 dark:text-gold-300">
      {displayText}
    </span>
  );
};

