import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { RecordWholesalePaymentModal } from '@/components/common/RecordWholesalePaymentModal';
import { generateWholesaleCustomerStatementPDF } from '@/lib/pdfGenerator';
import { ArrowLeft, HandCoins, RotateCcw, Building, Eye, Coins, Download, Scale } from 'lucide-react';

export const WholesaleCustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = getLocalDb();

  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  const customer = db.customers.find((c) => c.id === id);

  if (!customer) {
    return <div className="p-6 text-center text-slate-500">Wholesale partner not found.</div>;
  }

  const issues = db.wholesaleIssues.filter((w) => w.customer_id === customer.id);
  const payments = db.wholesalePayments.filter((p) => p.customer_id === customer.id);

  const totalIssuedQty = issues.reduce((sum, i) => sum + i.total_items_issued, 0);
  const totalValuation = issues.reduce((sum, i) => sum + i.total_valuation_amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingDue = Math.max(0, totalValuation - totalPaid);

  const handleDownloadLedger = () => {
    generateWholesaleCustomerStatementPDF(customer, payments, issues, db.settings);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`${customer.full_name} (${customer.shop_name || 'Dealer'})`}
        subtitle={`Wholesale Partner • Agreed Customer Touch: ${customer.agreed_customer_touch ?? customer.agreed_profit_percent ?? 40}%`}
        breadcrumb={['Home', 'Wholesale Partners', customer.full_name]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wholesale-customers')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <button
              onClick={handleDownloadLedger}
              className="flex items-center gap-1.5 rounded-xl border border-gold-400 bg-gold-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-gold-100 dark:bg-gold-950/40 dark:text-gold-300"
            >
              <Download className="h-4 w-4" /> PDF Statement
            </button>

            <button
              onClick={() => setIsRecordPaymentModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Coins className="h-4 w-4" /> Record Payment
            </button>

            <button
              onClick={() => navigate(`/wholesale-issues/new?customerId=${customer.id}`)}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> Issue Jewellery Stock
            </button>
          </div>
        }
      />

      {/* Customer Header Card with Photo & Default Touch Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {customer.photo_url ? (
              <img
                src={customer.photo_url}
                alt={customer.full_name}
                className="h-16 w-16 rounded-full object-cover border-2 border-gold-400 shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 font-serif font-bold text-xl text-charcoal-950">
                {customer.full_name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gold-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900 dark:text-gold-300">
                  {customer.customer_code}
                </span>
                <h2 className="font-serif text-xl font-bold text-charcoal-900 dark:text-slate-100">
                  {customer.full_name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Building className="h-3.5 w-3.5" /> {customer.shop_name || 'Dealer'} • Phone: {customer.phone} • {customer.city || 'Tamil Nadu'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gold-300 bg-gold-50/50 p-5 dark:border-gold-800 dark:bg-gold-950/30">
          <span className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase">Total Items Issued</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-amber-900 dark:text-gold-300">
            {totalIssuedQty} Pcs
          </h3>
          <p className="text-xs text-slate-500">Gold nose rings & ear rings</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Consignment Valuation</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
            {formatCurrency(totalValuation)}
          </h3>
          <p className="text-xs text-slate-500">Total bill amounts issued</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Payments Received</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-emerald-600">
            {formatCurrency(totalPaid)}
          </h3>
          <p className="text-xs text-slate-500">Cash & 916 Pure Gold paid</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900">
          <span className="text-xs font-bold text-slate-500 uppercase">Pending Due Balance</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-red-600">
            {formatCurrency(pendingDue)}
          </h3>
          <p className="text-xs text-slate-500">Outstanding balance due</p>
        </div>
      </div>

      {/* Consignment Issue Vouchers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            Consignment Touch Bills & Issues
          </h3>
          <button
            onClick={() => navigate('/wholesale-returns/new')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            <RotateCcw className="h-4 w-4 text-gold-600" /> Record Return
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Issue No</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-right">Fine Gold</th>
                <th className="p-3 text-right">Valuation (INR)</th>
                <th className="p-3 text-right">Paid (INR)</th>
                <th className="p-3 text-right">Remaining</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">No transactions yet.</p>
                    <p className="text-xs">Transactions created for this customer will appear here.</p>
                  </td>
                </tr>
              ) : (
                issues.map((i) => {
                const iCash = i.cash_paid || 0;
                const iGold = i.gold_916_value_paid || 0;
                const iPaid = iCash + iGold;
                const iRem = i.remaining_balance ?? Math.max(0, i.total_valuation_amount - iPaid);

                return (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{i.issue_number}</td>
                    <td className="p-3 font-mono">{formatDate(i.issue_date)}</td>
                    <td className="p-3 text-right font-bold">{i.total_items_issued} Pcs</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">{formatWeight(i.total_net_weight_g)}</td>
                    <td className="p-3 text-right font-mono font-bold text-gold-600">{(i.total_fine_gold_g || 0).toFixed(3)} g</td>
                    <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(i.total_valuation_amount)}</td>
                    <td className="p-3 text-right font-serif font-bold text-emerald-600">{formatCurrency(iPaid)}</td>
                    <td className="p-3 text-right font-serif font-bold text-red-600">{formatCurrency(iRem)}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        iRem === 0 && iPaid > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate(`/wholesale-issues/${i.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-gold-600 dark:text-slate-300"
                      >
                        <Eye className="h-4 w-4" /> View Voucher
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordWholesalePaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        customer={customer}
      />
    </div>
  );
};
