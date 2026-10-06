import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm animate-[pulse_2.2s_ease-in-out_infinite] space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-charcoal-800" />
      <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-charcoal-800" />
    </div>
    <div className="h-7 w-36 rounded bg-slate-200 dark:bg-charcoal-800" />
    <div className="h-3 w-48 rounded bg-slate-100 dark:bg-charcoal-800/60" />
  </div>
);

export const KPICardSkeleton = CardSkeleton;

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4 animate-[pulse_2.2s_ease-in-out_infinite]">
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

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-72' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm animate-[pulse_2.2s_ease-in-out_infinite] space-y-4 ${height}`}>
    <div className="h-5 w-56 rounded bg-slate-200 dark:bg-charcoal-800" />
    <div className="h-3 w-40 rounded bg-slate-100 dark:bg-charcoal-800/60" />
    <div className="h-52 w-full rounded-xl bg-slate-100 dark:bg-charcoal-800/40" />
  </div>
);

export const SectionSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-3 animate-[pulse_2.2s_ease-in-out_infinite]">
    <div className="h-4 w-40 rounded bg-slate-200 dark:bg-charcoal-800" />
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-3 rounded bg-slate-100 dark:bg-charcoal-800/60 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-[pulse_2.2s_ease-in-out_infinite]">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-6 w-36 rounded bg-slate-200 dark:bg-charcoal-800" />
        <div className="h-3 w-64 rounded bg-slate-100 dark:bg-charcoal-800/60" />
      </div>
      <div className="h-9 w-32 rounded-xl bg-slate-200 dark:bg-charcoal-800" />
    </div>

    {/* Quick actions strip */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-charcoal-800 mb-4" />
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-charcoal-800/60" />
        ))}
      </div>
    </div>

    {/* Stat cards row 1 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
    </div>

    {/* Stat cards row 2 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ChartSkeleton height="h-80" />
      </div>
      <div>
        <ChartSkeleton height="h-80" />
      </div>
    </div>
  </div>
);
