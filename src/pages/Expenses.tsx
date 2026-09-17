import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { getLocalDb } from '@/lib/supabase';
import { syncEngine } from '@/lib/syncEngine';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Receipt, Plus, Save } from 'lucide-react';

export const Expenses: React.FC = () => {
  const [db, setDb] = useState(getLocalDb());
  const [expensesList, setExpensesList] = useState<Expense[]>(db.expenses || []);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState('Goldsmith labour');
  const [amount, setAmount] = useState<number>(3500);
  const [vendor, setVendor] = useState('Murugan Goldsmiths');
  const [notes, setNotes] = useState('Labour charges for 20 nose pins batch');

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getExpenses();
      setExpensesList(data);
      setDb(getLocalDb());
    } catch (e) {
      console.warn('Error loading expenses:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'expenses' || tableName === 'general') {
        loadExpenses();
      }
    });
    return () => unsubscribe();
  }, [loadExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    await dataService.createExpense({
      id: ensureValidUUID(),
      expense_number: `EXP-${Date.now().toString().slice(-6)}`,
      category,
      amount,
      expense_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      vendor_name: vendor,
      notes,
      created_at: new Date().toISOString(),
    });

    await loadExpenses();
  };

  const totalExpenses = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Expenses & P&L Costs"
        subtitle="Track shop operating costs, goldsmith labour charges, electricity, rent, and packaging"
        breadcrumb={['Home', 'Expenses']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleAddExpense} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <Receipt className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
              Add Expense Entry
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              <option value="Electricity">Electricity</option>
              <option value="Goldsmith labour">Goldsmith labour</option>
              <option value="Rent">Shop Rent</option>
              <option value="Salary">Staff Salary</option>
              <option value="Packaging">Packaging Boxes</option>
              <option value="Repairs">Showroom Repairs</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Amount (INR) *</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Vendor / Payee Name</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Save Expense Record
          </button>
        </form>

        {/* History & Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Total Expenses Recorded</span>
              <h3 className="font-serif text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</h3>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mb-3">
              Expense Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">Exp No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {expensesList.map((e) => (
                    <tr key={e.id}>
                      <td className="p-3 font-mono font-bold text-slate-600">{e.expense_number || e.id.slice(0, 8)}</td>
                      <td className="p-3 font-mono">{formatDate(e.expense_date)}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{e.category}</td>
                      <td className="p-3 text-slate-500">{e.vendor_name || '-'}</td>
                      <td className="p-3 text-right font-serif font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

