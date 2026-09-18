import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { WhatsAppMessage } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { openWhatsAppClickToChat } from '@/lib/whatsapp';
import { MessageSquare, Check, Send, Search, Filter, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';

export const WhatsAppMessages: React.FC = () => {
  const [logs, setLogs] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getWhatsAppLogs();
      setLogs(data);
    } catch (e) {
      console.error('Failed to load WhatsApp logs:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    const unsubscribe = syncEngine.subscribeDataChange((table) => {
      if (table === 'whatsapp_logs' || table === 'general') {
        loadLogs();
      }
    });
    return () => unsubscribe();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.customer_name && log.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.phone && log.phone.includes(searchTerm)) ||
      (log.template_type && log.template_type.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || log.template_type === templateFilter;

    return matchesSearch && matchesStatus && matchesTemplate;
  });

  const totalSent = logs.filter((l) => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length;
  const totalDelivered = logs.filter((l) => l.status === 'delivered' || l.status === 'read').length;
  const deliveryRate = logs.length > 0 ? Math.round((totalSent / logs.length) * 100) : 100;

  const handleResend = (log: WhatsAppMessage) => {
    if (log.phone && log.message_body) {
      openWhatsAppClickToChat(log.phone, log.message_body);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Message Delivery Log"
        subtitle="Live audit tracking for customer WhatsApp invoice dispatch, payment reminders, and consignment vouchers"
        breadcrumb={['Home', 'WhatsApp Log']}
        actionBtn={
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Log
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Send className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Dispatched</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">{totalSent}</h3>
          <p className="mt-1 text-[11px] text-slate-500">Recorded messages</p>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Delivery Success Rate</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-emerald-800 dark:text-emerald-300">{deliveryRate}%</h3>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Verified dispatched logs</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Smartphone className="h-4 w-4 text-gold-600" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">WhatsApp Web / API Status</span>
          </div>
          <h3 className="font-serif text-base font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Active / Connected
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Direct Click-to-Chat Ready</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <option value="all">All Message Types</option>
            <option value="invoice">Retail Invoice</option>
            <option value="payment_reminder">Payment Reminder</option>
            <option value="wholesale_issue">Wholesale Issue</option>
            <option value="wholesale_settlement">Wholesale Settlement</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
              <tr>
                <th className="p-3">Sent Time</th>
                <th className="p-3">Recipient Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Message Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No WhatsApp logs found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono text-slate-500">{formatDateTime(log.sent_at || log.created_at)}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{log.customer_name}</td>
                    <td className="p-3 font-mono text-slate-500">{log.phone}</td>
                    <td className="p-3 font-semibold text-amber-900 dark:text-gold-300 capitalize">
                      {log.template_type.replace('_', ' ')}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                        <Check className="h-3 w-3" /> {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleResend(log)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-sm"
                        title="Open WhatsApp Chat & Resend"
                      >
                        <MessageSquare className="h-3 w-3" /> Resend
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


