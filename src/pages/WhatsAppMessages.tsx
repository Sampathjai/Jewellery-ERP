import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MessageSquare, Check, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const WhatsAppMessages: React.FC = () => {
  const mockLogs = [
    {
      id: 'wa-1',
      date: new Date().toISOString(),
      customer: 'Anand Ramakrishnan (Sri Lakshmi Jewellery)',
      phone: '+91 94432 11001',
      template: 'Wholesale Consignment Issue Voucher (WI-2026-001)',
      status: 'sent',
    },
    {
      id: 'wa-2',
      date: new Date(Date.now() - 86400000).toISOString(),
      customer: 'Priya Sundaram',
      phone: '+91 98940 44004',
      template: 'Retail Invoice Delivery (SJ-INV-1001)',
      status: 'sent',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Message Delivery Log"
        subtitle="Track WhatsApp click-to-chat shares and Cloud API integration status"
        breadcrumb={['Home', 'WhatsApp Log']}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Recipient Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Document / Message Template</th>
                <th className="p-3">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {mockLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3 font-mono">{formatDate(log.date)}</td>
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{log.customer}</td>
                  <td className="p-3 font-mono text-slate-500">{log.phone}</td>
                  <td className="p-3 font-semibold text-amber-900 dark:text-gold-300">{log.template}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <Check className="h-3 w-3" /> {log.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

