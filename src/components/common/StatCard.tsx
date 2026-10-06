import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { cardHoverPreset } from '@/animations/presets';
import { kpiCardVariant } from '@/animations/variants';
import { useMotionSafe } from '@/animations/motionConfig';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlight?: boolean;
}

/** Smooth numeric transition for metric numbers */
function useAnimatedValue(rawValue: string | number): string {
  const [displayed, setDisplayed] = useState(String(rawValue));
  const prevRef = useRef(String(rawValue));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const next = String(rawValue);
    if (next === prevRef.current) return;

    const prevNum = parseFloat(prevRef.current.replace(/[^0-9.]/g, ''));
    const nextNum = parseFloat(next.replace(/[^0-9.]/g, ''));
    const prefix = next.match(/^[^\d]*/)?.[0] ?? '';

    if (isNaN(prevNum) || isNaN(nextNum) || Math.abs(nextNum - prevNum) < 0.01) {
      setDisplayed(next);
      prevRef.current = next;
      return;
    }

    const startTime = performance.now();
    const DURATION_MS = 500;
    const diff = nextNum - prevNum;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const current = prevNum + diff * eased;

      const hasCurrency = /[₹$€£]/.test(next);
      const hasDecimal = next.includes('.');
      const formatted = hasCurrency
        ? new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: hasDecimal ? 2 : 0,
            maximumFractionDigits: hasDecimal ? 2 : 0,
          }).format(current)
        : next.includes('g') || next.includes('kg')
        ? `${current.toFixed(3)}g`
        : next.includes('pcs') || next.includes('Pcs')
        ? `${Math.round(current)} Pcs`
        : `${Math.round(current)}`;

      setDisplayed(prefix + formatted.replace(/^[₹$€£]/, ''));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(next);
        prevRef.current = next;
      }
    };

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [rawValue]);

  return displayed;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight = false,
}) => {
  const { prefersReduced } = useMotionSafe();
  const animatedValue = prefersReduced ? String(value) : useAnimatedValue(value);

  return (
    <motion.div
      variants={prefersReduced ? undefined : kpiCardVariant}
      {...(prefersReduced ? {} : cardHoverPreset)}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 cursor-default',
        'transition-shadow duration-200',
        highlight
          ? 'border-gold-400/90 bg-gradient-to-br from-amber-50/90 via-gold-50/50 to-white dark:border-gold-500/70 dark:from-gold-950/50 dark:via-charcoal-900 dark:to-charcoal-900 shadow-md shadow-gold-500/10'
          : 'border-slate-200/80 bg-white dark:border-charcoal-800 dark:bg-charcoal-900'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            highlight ? 'text-amber-800 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {title}
        </span>
        <motion.div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            highlight
              ? 'bg-gold-500 text-charcoal-950 shadow-gold font-bold'
              : 'bg-slate-100 text-slate-700 dark:bg-charcoal-800 dark:text-slate-300'
          )}
          whileHover={prefersReduced ? {} : { scale: 1.1, rotate: 6, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>

      <div className="mt-3">
        <h3
          className={cn(
            'font-serif text-2xl font-bold tracking-tight tabular-nums',
            highlight ? 'text-amber-950 dark:text-gold-200' : 'text-charcoal-900 dark:text-slate-100'
          )}
        >
          {animatedValue}
        </h3>
        {subtitle && (
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              highlight ? 'text-amber-700/90 dark:text-gold-400/90' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {subtitle}
          </p>
        )}

        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
            <span className={trend.isPositive ? 'text-emerald-600' : 'text-red-600'}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            <span className="text-slate-400 font-normal">vs last period</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
