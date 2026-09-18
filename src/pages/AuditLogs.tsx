import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AuditLogViewer } from '@/components/common/AuditLogViewer';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { AuditLog } from '@/types';
import { RefreshCw, Search, Shield } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'audit_logs' || tableName === 'general') {
        loadAuditLogs();
      }
    });
    return () => unsubscribe();
  }, [loadAuditLogs]);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      (log.user_name && log.user_name.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(term)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Track critical administrative operations, price modifications, permissions changes, and cancellations"
        breadcrumb={['Home', 'Audit Logs']}
        actionBtn={
          <button
            onClick={loadAuditLogs}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 text-gold-600 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Audit Trail
          </button>
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user, action type, entity or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>
      </div>

      <AuditLogViewer logs={filteredLogs} />
    </div>
  );
};


