import React from 'react';
import { cn } from '@/lib/utils';

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

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight = false,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg',
        highlight
          ? 'border-gold-400 bg-gradient-to-br from-gold-50/80 via-white to-amber-50/50 dark:border-gold-700/60 dark:from-gold-950/40 dark:via-charcoal-900 dark:to-gold-900/20'
          : 'border-slate-200/80 bg-white dark:border-charcoal-800 dark:bg-charcoal-900'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
          {title}
        </span>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            highlight
              ? 'bg-gold-500 text-charcoal-950 shadow-gold'
              : 'bg-slate-100 text-slate-700 dark:bg-charcoal-800 dark:text-slate-300'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="font-serif text-2xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
          {value}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}

        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
            <span className={trend.isPositive ? 'text-emerald-600' : 'text-red-600'}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            <span className="text-slate-400 font-normal">vs last period</span>
          </div>
        )}
      </div>
    </div>
  );
};

