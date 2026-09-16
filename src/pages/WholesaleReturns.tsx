import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PhotoUploader } from '@/components/common/PhotoUploader';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { WholesaleReturn } from '@/types';
import { formatWeight, formatDate } from '@/lib/utils';
import { RotateCcw, Check, Save } from 'lucide-react';

export const WholesaleReturns: React.FC = () => {
  const [db, setDb] = useState(getLocalDb());
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(db.customers[0]?.id || '');
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnWeight, setReturnWeight] = useState<number>(0);
  const [conditionNotes, setConditionNotes] = useState('');

  const selectedCustomer = db.customers.find((c) => c.id === selectedCustomerId);

  const handleRecordReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const newReturn: WholesaleReturn = {
      id: `wret-${Date.now()}`,
      return_number: `WR-2026-${Math.floor(100 + Math.random() * 900)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      return_date: new Date().toISOString().split('T')[0],
      total_quantity_returned: returnQty,
      total_weight_returned_g: returnWeight,
      condition_notes: conditionNotes,
      created_at: new Date().toISOString(),
    };

    db.wholesaleReturns.unshift(newReturn);

    // Increase stock in db.products and record inventory movement for wholesale return
    if (db.products.length > 0) {
      const prod = db.products[0];
      prod.quantity += returnQty;
      prod.status = 'in_stock';
    }

    db.inventoryMovements.unshift({
      id: `mov-${Date.now()}-${Math.random()}`,
      product_id: db.products[0]?.id || 'prod-1',
      product_name: 'Returned Wholesale Item Batch',
      sku: 'RET-WR-STOCK',
      movement_type: 'wholesale_return',
      quantity_change: returnQty,
      weight_change_g: returnWeight,
      reference_id: newReturn.return_number,
      notes: `Wholesale Return Verified & Restored from ${selectedCustomer.full_name}`,
      created_at: new Date().toISOString(),
    });

    saveLocalDb(db);
    setDb({ ...db });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Stock Returns"
        subtitle="Receive and audit unsold jewellery items returned by wholesale credit partners"
        breadcrumb={['Home', 'Wholesale Returns']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Return Form */}
        <form onSubmit={handleRecordReturn} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <RotateCcw className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
              Receive Return Batch
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Wholesale Partner *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              {db.customers
                .filter((c) => c.customer_type === 'wholesale')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.shop_name || 'Dealer'})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Returned Qty (Pcs) *</label>
              <input
                type="number"
                required
                value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Returned Net Wt (g) *</label>
              <input
                type="number"
                step="0.001"
                required
                value={returnWeight}
                onChange={(e) => setReturnWeight(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Condition Audit Notes</label>
            <textarea
              rows={3}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Verify & Restore to Showroom Stock
          </button>
        </form>

        {/* History Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            Wholesale Return Audit History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
                <tr>
                  <th className="p-3">Return No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Wholesale Partner</th>
                  <th className="p-3 text-right">Returned Qty</th>
                  <th className="p-3 text-right">Returned Net Wt</th>
                  <th className="p-3">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {db.wholesaleReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{r.return_number}</td>
                    <td className="p-3 font-mono">{formatDate(r.return_date)}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{r.customer_name}</td>
                    <td className="p-3 text-right font-bold text-blue-600">{r.total_quantity_returned} Pcs</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                      {formatWeight(r.total_weight_returned_g)}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <Check className="h-3 w-3" /> Verified & Restored
                      </span>
                    </td>
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

