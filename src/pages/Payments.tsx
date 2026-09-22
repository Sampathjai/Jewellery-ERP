import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RetailPayment, RetailInvoice } from '@/types';
import { DollarSign, Plus, Save } from 'lucide-react';

export const Payments: React.FC = () => {
  const [paymentsList, setPaymentsList] = useState<RetailPayment[]>([]);
  const [invoicesList, setInvoicesList] = useState<RetailInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState<number>(5000);
  const [paymentMode, setPaymentMode] = useState<string>('upi');
  const [refNo, setRefNo] = useState('UPI/9182746192');

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pData, iData] = await Promise.all([
        dataService.getRetailPayments(),
        dataService.getRetailInvoices(),
      ]);
      setPaymentsList(pData);
      setInvoicesList(iData);
    } catch (e) {
      console.warn('Fallback to local payments db:', e);
      const db = getLocalDb();
      setPaymentsList(db.retailPayments || []);
      setInvoicesList(db.retailInvoices || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'retail_payments' || tableName === 'retail_invoices' || tableName === 'general') {
        loadPayments();
      }
    });
    return () => unsubscribe();
  }, [loadPayments]);

  const db = getLocalDb();
  const rawPayments = paymentsList.length > 0 ? paymentsList : (db.retailPayments || []);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const newPay: RetailPayment = {
      id: `pay-${Date.now()}`,
      invoice_id: invoicesList[0]?.id || 'inv-1001',
      payment_date: new Date().toISOString().split('T')[0],
      amount,
      payment_mode: paymentMode as any,
      reference_number: refNo,
      created_at: new Date().toISOString(),
    };
    db.retailPayments.unshift(newPay);
    saveLocalDb(db);
    setPaymentsList([newPay, ...rawPayments]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Collection & Receipts"
        subtitle="Record retail payments, wholesale settlement deposits, and generate receipt vouchers"
        breadcrumb={['Home', 'Payments']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleRecordPayment} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <DollarSign className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
              Record Collection Payment
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Payment Amount (INR) *</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="card">Credit/Debit Card</option>
              <option value="exchange_gold">Old Gold Exchange</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Reference / Txn ID</label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Save Receipt & Update Ledger
          </button>
        </form>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            Recent Payment Receipts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Receipt Ref</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Amount Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {rawPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono">{formatDate(p.payment_date)}</td>
                    <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{p.reference_number || 'Cash Receipt'}</td>
                    <td className="p-3 uppercase font-bold text-[10px] text-slate-600">{p.payment_mode}</td>
                    <td className="p-3 text-right font-serif font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

