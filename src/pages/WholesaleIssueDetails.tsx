import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import {
  generateCustomerWholesaleIssuePDF,
  generateInternalWholesaleIssuePDF,
} from '@/lib/pdfGenerator';
import { openWhatsAppClickToChat, buildWhatsAppWholesaleIssueMessage } from '@/lib/whatsapp';
import {
  ArrowLeft,
  MessageSquare,
  Download,
  Coins,
  Building,
  Eye,
  Lock,
  Sparkles,
  Printer,
  ShieldAlert,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';

export const WholesaleIssueDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = getLocalDb();
  const { role } = useAuth();

  const [viewMode, setViewMode] = useState<'customer' | 'internal'>('customer');

  const isAdmin = role === 'admin' || role === 'manager';

  const issue = db.wholesaleIssues.find((w) => w.id === id);
  const customer = issue ? db.customers.find((c) => c.id === issue.customer_id) : undefined;

  if (!issue || !customer) {
    return (
      <div className="p-6 text-center text-slate-500 font-medium">
        Wholesale Invoice Voucher or Customer Profile not found.
      </div>
    );
  }

  const handleDownloadCustomerPDF = () => {
    generateCustomerWholesaleIssuePDF(issue, customer, db.settings);
  };

  const handleDownloadInternalPDF = () => {
    generateInternalWholesaleIssuePDF(issue, customer, db.settings);
  };

  const handleWhatsApp = () => {
    const msg = buildWhatsAppWholesaleIssueMessage(issue, db.settings);
    openWhatsAppClickToChat(customer.whatsapp_number || customer.phone, msg);
  };

  const cashPaid = issue.cash_paid || 0;
  const goldPaidVal = issue.gold_916_value_paid || 0;
  const currentPaid = cashPaid + goldPaidVal;
  const totalBillVal = issue.total_valuation_amount;
  const prevPaid = 0;
  const totalPaid = prevPaid + currentPaid;
  const remainingBal = issue.remaining_balance ?? Math.max(0, totalBillVal - totalPaid);

  let statusText = 'UNPAID';
  let statusBadgeClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300';
  if (remainingBal === 0 && totalPaid > 0) {
    statusText = 'PAID';
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300';
  } else if (totalPaid > 0) {
    statusText = 'PARTIALLY PAID';
    statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-gold-300';
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Shankar Jewellery Invoice: ${issue.issue_number}`}
        subtitle={`Wholesale Partner: ${customer?.full_name} (${customer?.shop_name || 'Dealer'})`}
        breadcrumb={['Home', 'Wholesale Invoices', issue.issue_number]}
        actionBtn={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/wholesale-customers')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <button
              onClick={handleDownloadCustomerPDF}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Download className="h-4 w-4" /> Customer PDF Invoice
            </button>

            {isAdmin && (
              <button
                onClick={handleDownloadInternalPDF}
                className="flex items-center gap-1.5 rounded-xl border border-charcoal-700 bg-charcoal-900 px-3 py-2 text-xs font-bold text-gold-300 hover:bg-charcoal-800"
              >
                <Lock className="h-3.5 w-3.5" /> Internal Admin Voucher
              </button>
            )}

            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Invoice
            </button>
          </div>
        }
      />

      {/* View Switcher Tabs (Customer View vs Internal Admin View) */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('customer')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewMode === 'customer'
                ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300'
            }`}
          >
            <Sparkles className="h-4 w-4" /> Customer Invoice View (Touch Hidden)
          </button>

          {isAdmin && (
            <button
              onClick={() => setViewMode('internal')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                viewMode === 'internal'
                  ? 'bg-charcoal-900 text-gold-300 border border-gold-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-gold-400" /> Internal Business / Goldsmith View
            </button>
          )}
        </div>

        {viewMode === 'customer' ? (
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Customer Invoice (Internal touch percentages strictly hidden)
          </span>
        ) : (
          <span className="text-[11px] font-mono text-gold-600 dark:text-gold-400 flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" /> Showing Actual Touch, Profit Touch & Fine Gold Valuation
          </span>
        )}
      </div>

      {/* MAIN INVOICE CARD */}
      <div className="rounded-2xl border-2 border-gold-300/80 bg-white p-8 dark:border-gold-800/60 dark:bg-charcoal-900 shadow-xl space-y-6 max-w-5xl mx-auto">
        {/* PREMIUM SHANKAR JEWELLERY HEADER */}
        <div className="flex flex-col md:flex-row justify-between border-b-2 border-slate-100 pb-6 dark:border-charcoal-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 font-serif font-bold text-charcoal-950 shadow-gold">
                SJ
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal-950 dark:text-slate-100">
                Shankar Jewellery
              </h1>
            </div>
            <p className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest mt-1">
              Jewellery Billing & Wholesale Invoice
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {db.settings.address}, {db.settings.city}, {db.settings.state} - {db.settings.pin_code}
            </p>
            <p className="text-xs text-slate-500">
              Phone: {db.settings.phone}{db.settings.gstin && db.settings.gstin.trim() ? ` | GSTIN: ${db.settings.gstin}` : ''}
            </p>
          </div>

          <div className="text-left md:text-right space-y-1">
            <span className="inline-block rounded-lg bg-gold-500/20 px-3 py-1 font-mono text-sm font-bold text-amber-950 dark:text-gold-300 border border-gold-300">
              {issue.issue_number}
            </span>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Invoice Date: <strong className="text-slate-800 dark:text-slate-200">{formatDate(issue.issue_date)}</strong>
            </p>
            <p className="text-xs font-mono text-slate-500">
              Expected Reconciliation: <strong className="text-slate-800 dark:text-slate-200">{formatDate(issue.expected_return_date)}</strong>
            </p>
          </div>
        </div>

        {/* CUSTOMER DETAILS INFORMATION CARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-slate-50/80 p-4 border border-slate-200 dark:bg-charcoal-800 dark:border-charcoal-700 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BILLED TO CUSTOMER:</span>
            <div className="flex items-center gap-2">
              {customer?.photo_url ? (
                <img src={customer.photo_url} alt={customer.full_name} className="h-8 w-8 rounded-full object-cover border border-gold-400" />
              ) : null}
              <h3 className="font-bold text-charcoal-900 dark:text-slate-100 text-sm">{customer?.full_name}</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-400" /> Shop: <strong>{customer?.shop_name || 'Dealer'}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Phone: <strong>{customer?.phone}</strong> • City: <strong>{customer?.city || 'Tamil Nadu'}</strong>
            </p>
          </div>

          <div className="flex flex-col justify-between items-start md:items-end text-left md:text-right space-y-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAYMENT STATUS:</span>
              <span className={`inline-block rounded-md px-3 py-1 text-xs font-bold uppercase border ${statusBadgeClass}`}>
                {statusText}
              </span>
            </div>

            {viewMode === 'internal' && (
              <div className="text-[11px] font-mono bg-gold-50 p-2 rounded-lg border border-gold-200 dark:bg-gold-950/40 dark:border-gold-800">
                <span>Default Customer Touch: <strong>{customer?.default_actual_touch || 37}% + {customer?.default_profit_touch || 10}% = {customer?.default_billing_touch || 47}%</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* JEWELLERY ITEMS TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-charcoal-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-charcoal-950 text-gold-400 font-bold uppercase text-[11px]">
              {viewMode === 'customer' ? (
                /* Customer Table Headers (No Touch columns) */
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Gross Wt</th>
                  <th className="p-3 text-right">Deduction</th>
                  <th className="p-3 text-right">Net Wt</th>
                  <th className="p-3 text-right">Fine Gold</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              ) : (
                /* Internal Business Table Headers (Includes Touch Percentages) */
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Gross Wt</th>
                  <th className="p-3 text-right">Cardboard</th>
                  <th className="p-3 text-right">Net Wt</th>
                  <th className="p-3 text-right">Actual Touch</th>
                  <th className="p-3 text-right">Profit Touch</th>
                  <th className="p-3 text-right">Billing Touch</th>
                  <th className="p-3 text-right">Fine Gold</th>
                  <th className="p-3 text-right">Valuation</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {issue.items.map((item, idx) => {
                const actTouch = item.actual_touch || 37;
                const profTouch = item.profit_touch || 10;
                const billTouch = item.billing_touch || actTouch + profTouch;
                const fineGold = item.fine_gold_g || Number(((item.net_weight_g * billTouch) / 100).toFixed(3));

                if (viewMode === 'customer') {
                  /* Customer Row */
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-semibold">{idx + 1}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                        {item.product_name}
                        <span className="block font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                      </td>
                      <td className="p-3 text-right font-bold">{item.quantity_issued} Pcs</td>
                      <td className="p-3 text-right font-mono">{formatWeight(item.gross_weight_g)}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{formatWeight(item.deduction_weight_g || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatWeight(item.net_weight_g)}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">{fineGold.toFixed(3)} g</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100 text-sm">
                        {formatCurrency(item.total_issue_value)}
                      </td>
                    </tr>
                  );
                } else {
                  /* Internal Business Row */
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-semibold">{idx + 1}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                        {item.product_name}
                        <span className="block font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                      </td>
                      <td className="p-3 text-right font-bold">{item.quantity_issued} Pcs</td>
                      <td className="p-3 text-right font-mono">{formatWeight(item.gross_weight_g)}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{formatWeight(item.deduction_weight_g || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatWeight(item.net_weight_g)}</td>
                      <td className="p-3 text-right font-mono">{actTouch}%</td>
                      <td className="p-3 text-right font-mono text-emerald-600">+{profTouch}%</td>
                      <td className="p-3 text-right font-mono font-bold text-gold-600">{billTouch}%</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">{fineGold.toFixed(3)} g</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100 text-sm">
                        {formatCurrency(item.total_issue_value)}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* AGGREGATED WEIGHT TOTALS BAR */}
        <div className="flex flex-wrap items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-charcoal-800 dark:border-charcoal-700 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Issued Items:</span>
            <strong className="ml-1 text-charcoal-900 dark:text-slate-100">{issue.total_items_issued} Pcs</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Gross Wt:</span>
            <strong className="ml-1 font-mono">{formatWeight(issue.total_gross_weight_g)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Net Wt:</span>
            <strong className="ml-1 font-mono text-amber-900 dark:text-gold-300">{formatWeight(issue.total_net_weight_g)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Fine Gold Equivalent:</span>
            <strong className="ml-1 font-mono text-gold-600 font-bold text-sm">{(issue.total_fine_gold_g || 0).toFixed(3)} g</strong>
          </div>
        </div>

        {/* REDESIGNED PAYMENT & SETTLEMENT SUMMARY CARD */}
        <div className="rounded-2xl border-2 border-gold-400/80 bg-gold-50/40 p-6 dark:border-gold-800 dark:bg-gold-950/20 space-y-4">
          <div className="flex items-center justify-between border-b border-gold-200 pb-3 dark:border-gold-800">
            <h3 className="font-bold text-amber-950 dark:text-gold-300 uppercase tracking-wider text-xs flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" /> Payment & Settlement Summary
            </h3>

            <span className={`rounded-md px-3 py-1 text-xs font-bold uppercase border ${statusBadgeClass}`}>
              Payment Status: {statusText}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left Column: Bill & Cash Totals */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Total Bill Amount:</span>
                <strong className="font-serif text-base font-bold text-charcoal-950 dark:text-slate-100">
                  {formatCurrency(totalBillVal)}
                </strong>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Previously Paid:</span>
                <span className="font-serif font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(prevPaid)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Current Payment Received:</span>
                <span className="font-serif font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(currentPaid)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gold-200 dark:border-gold-800 font-bold text-slate-800 dark:text-slate-200">
                <span>Total Paid:</span>
                <span className="font-serif text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
            </div>

            {/* Right Column: Pure 916 Gold Breakdown & Outstanding Due */}
            <div className="space-y-2.5 bg-white p-4 rounded-xl border border-gold-200 dark:bg-charcoal-900 dark:border-gold-800 flex flex-col justify-between">
              {issue.gold_916_weight_paid_g ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 dark:text-gold-300 uppercase">Pure 916 Gold Payment Received:</span>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {issue.gold_916_weight_paid_g} g @ {formatCurrency(issue.gold_916_rate)} / g
                  </p>
                  <p className="font-serif text-xs font-bold text-emerald-600">
                    Gold Value: {formatCurrency(goldPaidVal)}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">No 916 Pure Gold payment recorded for this bill.</div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-charcoal-700 flex justify-between items-center">
                <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                  Remaining Balance Due:
                </span>
                <span className="font-serif text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(remainingBal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER & TERMS */}
        <div className="pt-4 border-t border-slate-200 dark:border-charcoal-800 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
          <span>Shankar Jewellery — Official Billing Document</span>
          <span>Thank you for choosing Shankar Jewellery</span>
        </div>
      </div>
    </div>
  );
};
