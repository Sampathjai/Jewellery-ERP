import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-charcoal-800" />
      <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-charcoal-800" />
    </div>
    <div className="h-7 w-36 rounded bg-slate-200 dark:bg-charcoal-800" />
    <div className="h-3 w-48 rounded bg-slate-100 dark:bg-charcoal-800/60" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-5 w-48 rounded bg-slate-200 dark:bg-charcoal-800" />
      <div className="h-8 w-32 rounded-xl bg-slate-200 dark:bg-charcoal-800" />
    </div>
    <div className="space-y-3 pt-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-charcoal-800">
          <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-charcoal-800" />
          <div className="h-4 w-1/5 rounded bg-slate-200 dark:bg-charcoal-800" />
          <div className="h-4 w-1/6 rounded bg-slate-200 dark:bg-charcoal-800" />
          <div className="h-4 w-1/8 rounded bg-slate-200 dark:bg-charcoal-800" />
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm animate-pulse space-y-4">
    <div className="h-5 w-56 rounded bg-slate-200 dark:bg-charcoal-800" />
    <div className="h-3 w-40 rounded bg-slate-100 dark:bg-charcoal-800/60" />
    <div className="h-64 w-full rounded-xl bg-slate-100 dark:bg-charcoal-800/40" />
  </div>
);

