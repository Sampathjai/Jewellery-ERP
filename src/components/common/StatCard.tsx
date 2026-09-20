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
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-105',
            highlight
              ? 'bg-gold-500 text-charcoal-950 shadow-gold font-bold'
              : 'bg-slate-100 text-slate-700 dark:bg-charcoal-800 dark:text-slate-300'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3">
        <h3
          className={cn(
            'font-serif text-2xl font-bold tracking-tight',
            highlight ? 'text-amber-950 dark:text-gold-200' : 'text-charcoal-900 dark:text-slate-100'
          )}
        >
          {value}
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
    </div>
  );
};

