import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Purchase, PurchasePayment } from '@/types';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import { Building2, Calendar, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ViewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export const ViewPurchaseModal: React.FC<ViewPurchaseModalProps> = ({
  isOpen,
  onClose,
  purchase,
}) => {
  if (!purchase) return null;

  const db = getLocalDb();
  const payments: PurchasePayment[] = (db.purchasePayments || []).filter(
    (p) => p.purchase_id === purchase.id
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Breakdown — ${purchase.purchase_number}`}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Supplier & Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              <h3 className="font-bold text-sm text-charcoal-900 dark:text-slate-100">
                {purchase.supplier_name}
              </h3>
            </div>
            {purchase.supplier_phone && (
              <p className="mt-1 text-slate-500 font-mono">Contact: {purchase.supplier_phone}</p>
            )}
            <p className="mt-0.5 text-slate-500 font-mono">Supplier Invoice: #{purchase.supplier_invoice_number}</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="font-mono text-slate-500 block">Date: {formatDate(purchase.purchase_date)}</span>
            <span
              className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                purchase.payment_status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : purchase.payment_status === 'partial'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {purchase.payment_status}
            </span>
          </div>
        </div>

        {/* Metal Commodity Specifications */}
        <div className="rounded-xl border border-gold-300 bg-gold-50/30 p-4 space-y-3 dark:border-gold-800/40 dark:bg-gold-950/20">
          <h4 className="font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider text-[10px]">
            Metal & Weight Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Metal & Purity</span>
              <div className="mt-1 flex items-center gap-1">
                <MetalBadge metal={purchase.metal_type} />
                <PurityBadge purity={purchase.purity} />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Gross Weight</span>
              <span className="font-mono font-bold text-charcoal-900 dark:text-slate-100">
                {formatWeight(purchase.gross_weight_g)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Deduction / Wastage</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">
                {formatWeight(purchase.deduction_weight_g)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Net Wt Purchased</span>
              <span className="font-mono font-bold text-amber-900 dark:text-gold-300">
                {formatWeight(purchase.net_weight_g)}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-800 dark:bg-charcoal-900">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Purchase Rate / g</span>
            <p className="font-mono text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {formatCurrency(purchase.purchase_rate_per_gram)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-800 dark:bg-charcoal-900">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Purchase Cost</span>
            <p className="font-serif text-base font-bold text-amber-900 dark:text-gold-300 mt-0.5">
              {formatCurrency(purchase.total_cost)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-800 dark:bg-charcoal-900">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Remaining Balance</span>
            <p
              className={`font-serif text-base font-bold mt-0.5 ${
                purchase.balance_payable > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(purchase.balance_payable)}
            </p>
          </div>
        </div>

        {/* Supplier Payment History Ledger */}
        <div className="space-y-3">
          <h4 className="font-bold text-charcoal-900 dark:text-slate-100 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gold-600" />
            Supplier Payment History ({payments.length})
          </h4>

          {payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400 text-xs">
              No payments recorded for this purchase yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-charcoal-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Payment Mode</th>
                    <th className="p-2.5">Reference / UTR</th>
                    <th className="p-2.5 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2.5 font-mono">{formatDate(p.payment_date)}</td>
                      <td className="p-2.5 font-semibold capitalize">{p.payment_mode.replace('_', ' ')}</td>
                      <td className="p-2.5 font-mono text-slate-500">{p.reference_number || '—'}</td>
                      <td className="p-2.5 text-right font-serif font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {purchase.notes && (
          <div className="rounded-lg bg-slate-100 p-3 text-slate-600 dark:bg-charcoal-800 dark:text-slate-400 italic">
            "{purchase.notes}"
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-charcoal-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
