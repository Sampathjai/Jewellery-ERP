import React from 'react';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export const AuditLogViewer: React.FC<{ logs: AuditLog[]; error?: string | null }> = ({ logs, error }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-charcoal-800">
        <ShieldAlert className="h-5 w-5 text-gold-600" />
        <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
          Security Audit Trails
        </h3>
      </div>

      <div className="space-y-3">
        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Database Audit Logs Query Error</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-400">No recent audit activity recorded.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-charcoal-800 dark:bg-charcoal-800/40"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-charcoal-900 dark:text-slate-100">{log.user_name}</span>
                  <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300">
                    {log.action}
                  </span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  Entity: {log.entity_type} ({log.entity_id || 'N/A'})
                </p>
                {log.details && (
                  <pre className="mt-1.5 rounded bg-slate-200/50 p-1.5 text-[10px] text-slate-700 dark:bg-charcoal-950 dark:text-slate-300">
                    {JSON.stringify(log.details)}
                  </pre>
                )}
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{formatDateTime(log.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

