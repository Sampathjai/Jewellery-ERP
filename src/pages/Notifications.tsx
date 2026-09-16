import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const Notifications: React.FC = () => {
  const db = getLocalDb();
  const notifications = db.notifications || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-App Notification Center"
        subtitle="Stock alerts, overdue wholesale consignment return alerts, and system notices"
        breadcrumb={['Home', 'Notifications']}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-3 max-w-3xl">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs dark:border-charcoal-800 dark:bg-charcoal-800/40">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-charcoal-900 dark:text-slate-100 text-sm">{n.title}</h4>
              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</p>
              <span className="mt-2 block text-[10px] text-slate-400">{formatDateTime(n.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

