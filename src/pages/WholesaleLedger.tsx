import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { openWhatsAppClickToChat, buildWhatsAppPaymentReminder } from '@/lib/whatsapp';
import { RecordWholesalePaymentModal } from '@/components/common/RecordWholesalePaymentModal';
import { generateWholesaleCustomerStatementPDF } from '@/lib/pdfGenerator';
import { MessageSquare, Download, Coins, Scale } from 'lucide-react';

export const WholesaleLedger: React.FC = () => {
  const db = getLocalDb();

  const wholesaleCustomers = db.customers.filter((c) => c.customer_type === 'wholesale');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(wholesaleCustomers[0]?.id || '');
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  const customer = db.customers.find((c) => c.id === selectedCustomerId) || wholesaleCustomers[0];

  const customerIssues = db.wholesaleIssues.filter((i) => i.customer_id === customer?.id);
  const customerPayments = db.wholesalePayments.filter((p) => p.customer_id === customer?.id);

  const totalValuation = customerIssues.reduce((sum, i) => sum + i.total_valuation_amount, 0);
  const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
  const runningBalance = Math.max(0, totalValuation - totalPaid);

  const handleSendReminder = () => {
    if (!customer) return;
    const msg = buildWhatsAppPaymentReminder(customer.full_name, runningBalance, db.settings);
    openWhatsAppClickToChat(customer.whatsapp_number || customer.phone, msg);
  };

  const handleDownloadPDF = () => {
    if (!customer) return;
    generateWholesaleCustomerStatementPDF(customer, customerPayments, customerIssues, db.settings);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Wholesale Partner Account Ledgers"
        subtitle="Running balance, debits, credits, consignment transactions and due payment alerts"
        breadcrumb={['Home', 'Wholesale Ledger']}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <Download className="h-4 w-4" /> Download Statement PDF
            </button>
            <button
              onClick={() => setIsRecordPaymentModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Coins className="h-4 w-4" /> Record Payment
            </button>
            <button
              onClick={handleSendReminder}
              className="flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Balance Reminder
            </button>
          </div>
        }
      />

      {/* Customer Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          {customer?.photo_url ? (
            <img src={customer.photo_url} alt={customer.full_name} className="h-10 w-10 rounded-full object-cover border-2 border-gold-400" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 font-bold font-serif text-charcoal-950">
              {customer?.full_name?.charAt(0) || 'P'}
            </div>
          )}

          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Select Partner:</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              {wholesaleCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.shop_name || 'Dealer'}) • {c.phone}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Container */}
      {customer && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">{customer.full_name}</h3>
              <p className="text-xs text-slate-500">{customer.shop_name} • Phone: {customer.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Outstanding Ledger Balance</span>
              <span className="font-serif text-2xl font-bold text-red-600">{formatCurrency(runningBalance)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Reference / Voucher</th>
                  <th className="p-3">Transaction Details</th>
                  <th className="p-3 text-right">Debit (INR)</th>
                  <th className="p-3 text-right">Credit / Payment (INR)</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {customerIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono">{formatDate(issue.issue_date)}</td>
                    <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{issue.issue_number}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                      Consignment Jewellery Touch Issue ({issue.total_items_issued} Pcs)
                      <span className="block text-[10px] text-slate-400 font-mono">Fine Gold: {(issue.total_fine_gold_g || 0).toFixed(3)}g</span>
                    </td>
                    <td className="p-3 text-right font-bold text-amber-900 dark:text-gold-300">{formatCurrency(issue.total_valuation_amount)}</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(issue.total_valuation_amount)}</td>
                  </tr>
                ))}

                {customerPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50 bg-emerald-50/20">
                    <td className="p-3 font-mono">{formatDate(pay.payment_date)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{pay.reference_number || `PAY-${pay.id}`}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                      {pay.payment_mode === 'gold_916' || pay.payment_mode === 'split' ? (
                        <span className="text-amber-800 dark:text-gold-300">
                          Pure 916 Gold Received: {pay.gold_916_weight_g}g @ ₹{pay.gold_916_rate}/g ({formatCurrency(pay.gold_916_value || 0)})
                        </span>
                      ) : (
                        <span>Cash Payment Received</span>
                      )}
                    </td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(pay.amount)}</td>
                    <td className="p-3 text-right font-bold text-red-600">{formatCurrency(runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {customer && (
        <RecordWholesalePaymentModal
          isOpen={isRecordPaymentModalOpen}
          onClose={() => setIsRecordPaymentModalOpen(false)}
          customer={customer}
        />
      )}
    </div>
  );
};
