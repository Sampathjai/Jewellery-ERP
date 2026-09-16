import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Purchase, PurchasePayment } from '@/types';
import { recordPurchasePayment } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Save, Calendar, FileText } from 'lucide-react';

interface RecordPurchasePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase: Purchase | null;
}

export const RecordPurchasePaymentModal: React.FC<RecordPurchasePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchase,
}) => {
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'card' | 'gold_916' | 'split'>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (purchase) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setAmount(purchase.balance_payable);
      setPaymentMode('bank_transfer');
      setReferenceNumber('');
      setNotes('');
    }
  }, [purchase, isOpen]);

  if (!purchase) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = typeof amount === 'number' ? amount : 0;
    if (payNum <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }

    const newPayment: PurchasePayment = {
      id: `pur-pay-${Date.now()}`,
      purchase_id: purchase.id,
      payment_date: paymentDate,
      amount: payNum,
      payment_mode: paymentMode,
      reference_number: referenceNumber,
      notes,
      created_at: new Date().toISOString(),
    };

    recordPurchasePayment(newPayment);
    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Supplier Payment (${purchase.supplier_name})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
        {/* Invoice Summary Banner */}
        <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-3.5 space-y-1 dark:border-gold-800 dark:bg-gold-950/30">
          <div className="flex justify-between items-center text-amber-900 dark:text-gold-300">
            <span className="font-semibold">Purchase Ref:</span>
            <span className="font-mono font-bold">{purchase.purchase_number}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Supplier Bill:</span>
            <span className="font-mono font-semibold">{purchase.supplier_invoice_number}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Total Purchase Cost:</span>
            <span className="font-serif font-bold">{formatCurrency(purchase.total_cost)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Already Paid:</span>
            <span className="font-serif font-bold text-emerald-600">{formatCurrency(purchase.amount_paid)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gold-200 dark:border-gold-800 text-amber-900 dark:text-gold-300 font-bold">
            <span>Current Balance Payable:</span>
            <span className="font-serif text-sm text-red-600">{formatCurrency(purchase.balance_payable)}</span>
          </div>
        </div>

        {/* Payment Fields */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Payment Amount (₹) *
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="Enter payment amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
            max={purchase.balance_payable}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-emerald-600 dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-emerald-400"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Payment Mode *
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold capitalize dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
          >
            <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="cash">Cash Payment</option>
            <option value="upi">UPI / GPay / PhonePe</option>
            <option value="card">Credit / Debit Card</option>
            <option value="gold_916">916 Fine Gold Return Settlement</option>
            <option value="split">Split Payment</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Transaction Reference / UTR Number
          </label>
          <input
            type="text"
            placeholder="e.g. NEFT/SBI/9812739182"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Notes / Payment Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. Partial settlement for raw bar purchase"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-charcoal-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <Save className="h-4 w-4" />
            Record Payment
          </button>
        </div>
      </form>
    </Modal>
  );
};
