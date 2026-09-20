import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { dataService } from '@/lib/dataService';
import { Customer, WholesaleIssue, WholesalePayment } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { DollarSign, Coins, Save, CheckCircle } from 'lucide-react';

interface RecordWholesalePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  issue?: WholesaleIssue;
  onPaymentRecorded?: (payment: WholesalePayment) => void;
}

export const RecordWholesalePaymentModal: React.FC<RecordWholesalePaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  issue,
  onPaymentRecorded,
}) => {
  const { t, language } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gold_916' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState<number>(20000);
  const [goldWeightG, setGoldWeightG] = useState<number>(2.0);
  const [goldRate, setGoldRate] = useState<number>(6830);

  useEffect(() => {
    if (isOpen) {
      dataService.getMetalRates().then((rates) => {
        if (rates && rates.length > 0) {
          setGoldRate(rates[0].gold_22k_per_gram || 6830);
        }
      });
    }
  }, [isOpen]);
  const [referenceNumber, setReferenceNumber] = useState('NEFT/891237');
  const [notes, setNotes] = useState('Payment settlement received');

  const goldValue = Number((goldWeightG * goldRate).toFixed(2));
  const totalPaymentValue =
    paymentMethod === 'cash'
      ? cashAmount
      : paymentMethod === 'gold_916'
      ? goldValue
      : cashAmount + goldValue;

  const issuePaid = issue ? Number(issue.cash_paid || 0) + Number(issue.gold_916_value_paid || 0) : 0;
  const currentDue = issue
    ? (issue.remaining_balance ?? Math.max(0, Number(issue.total_valuation_amount || issue.total_cash_value || 0) - issuePaid))
    : 0;
  const newRemainingBalance = Math.max(0, currentDue - totalPaymentValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newPayment: WholesalePayment = {
      id: `wpay-${Date.now()}`,
      customer_id: customer.id,
      issue_id: issue?.id,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      amount: totalPaymentValue,
      cash_amount: paymentMethod === 'gold_916' ? 0 : cashAmount,
      gold_weight_g: paymentMethod === 'cash' ? 0 : goldWeightG,
      gold_purity: '916',
      gold_rate: goldRate,
      gold_value: paymentMethod === 'cash' ? 0 : goldValue,
      payment_mode: paymentMethod === 'gold_916' ? 'gold_916' : 'cash',
      reference_number: referenceNumber,
      notes,
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await dataService.createWholesalePayment(newPayment);
      if (onPaymentRecorded) {
        onPaymentRecorded(saved);
      }
    } catch (err) {
      console.warn('Could not save wholesale payment to Supabase:', err);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ta' ? 'மொத்த வியாபார செலுத்துதல் (Payment)' : 'Record Wholesale Settlement Payment'}
      subtitle={`Customer: ${customer.full_name} (${customer.shop_name || 'Dealer'})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Method Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            {language === 'ta' ? 'செலுத்துதல் முறை (Payment Method)' : 'Select Settlement Method'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-bold transition-all ${
                paymentMethod === 'cash'
                  ? 'border-gold-500 bg-gold-50 text-charcoal-950 shadow-gold dark:bg-gold-950/60 dark:text-gold-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              <DollarSign className="h-4 w-4 mb-1 text-emerald-600" />
              <span>{t('cash_payment')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('gold_916')}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-bold transition-all ${
                paymentMethod === 'gold_916'
                  ? 'border-gold-500 bg-gold-50 text-charcoal-950 shadow-gold dark:bg-gold-950/60 dark:text-gold-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              <Coins className="h-4 w-4 mb-1 text-gold-600" />
              <span>{t('gold_916_payment')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('split')}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-bold transition-all ${
                paymentMethod === 'split'
                  ? 'border-gold-500 bg-gold-50 text-charcoal-950 shadow-gold dark:bg-gold-950/60 dark:text-gold-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              <CheckCircle className="h-4 w-4 mb-1 text-amber-600" />
              <span>{t('split_payment')}</span>
            </button>
          </div>
        </div>

        {/* Cash Section */}
        {(paymentMethod === 'cash' || paymentMethod === 'split') && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              Cash Amount Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Cash Amount (INR)</label>
                <input
                  type="number"
                  required
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Txn / Bank Ref</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pure 916 Gold Payment Section */}
        {(paymentMethod === 'gold_916' || paymentMethod === 'split') && (
          <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-4 dark:border-gold-800 dark:bg-gold-950/20 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
              Pure 916 Gold Received Details
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Gold Weight (g)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={goldWeightG}
                  onChange={(e) => setGoldWeightG(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">916 Gold Rate / g</label>
                <input
                  type="number"
                  required
                  value={goldRate}
                  onChange={(e) => setGoldRate(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Calculated Gold Value</label>
                <input
                  type="number"
                  readOnly
                  value={goldValue}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs font-serif font-bold text-amber-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Calculation Summary Footer */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Current Outstanding Balance:</span>
            <strong className="font-mono">{formatCurrency(currentDue)}</strong>
          </div>
          <div className="flex justify-between font-bold text-emerald-600">
            <span>Total Payment Value:</span>
            <span className="font-serif text-sm">{formatCurrency(totalPaymentValue)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-charcoal-800 font-bold text-amber-900 dark:text-gold-300">
            <span>Remaining Balance Due:</span>
            <span className="font-serif text-base">{formatCurrency(newRemainingBalance)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Confirm Payment & Update Ledger
          </button>
        </div>
      </form>
    </Modal>
  );
};

