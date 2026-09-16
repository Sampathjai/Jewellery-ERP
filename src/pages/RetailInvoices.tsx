import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingCart, Eye, FileText, Search, Plus } from 'lucide-react';

export const RetailInvoices: React.FC = () => {
  const navigate = useNavigate();
  const db = getLocalDb();
  const [searchTerm, setSearchTerm] = useState('');

  const invoices = db.retailInvoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retail Invoices"
        subtitle="View finalized retail bills, receipts, and print PDF invoices"
        breadcrumb={['Home', 'Retail Invoices']}
        actionBtn={
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Plus className="h-4 w-4" /> New POS Bill
          </button>
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Invoice No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Paid Amount</th>
                <th className="p-3">Payment Status</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                  <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{inv.invoice_number}</td>
                  <td className="p-3 font-mono">{formatDate(inv.invoice_date)}</td>
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{inv.customer_name || 'Walk-in Customer'}</td>
                  <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">{formatCurrency(inv.total_amount)}</td>
                  <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(inv.paid_amount)}</td>
                  <td className="p-3">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                      {inv.payment_status}
                    </span>
                  </td>
                  <td className="p-3 uppercase font-bold text-[10px] text-slate-500">{inv.status}</td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-gold-600 dark:text-slate-300"
                    >
                      <Eye className="h-4 w-4" /> View Invoice
                    </Link>
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

