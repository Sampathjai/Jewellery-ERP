import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { WholesaleReturn, WholesaleIssue, Customer } from '@/types';
import { formatWeight, formatDate } from '@/lib/utils';
import { RotateCcw, Check, Save, AlertCircle } from 'lucide-react';

export const WholesaleReturns: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [issues, setIssues] = useState<WholesaleIssue[]>([]);
  const [returnsList, setReturnsList] = useState<WholesaleReturn[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnWeight, setReturnWeight] = useState<number>(0);
  const [conditionNotes, setConditionNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [custs, wIssues, rets] = await Promise.all([
        dataService.getCustomers(),
        dataService.getWholesaleIssues(),
        dataService.getWholesaleReturns(),
      ]);
      const wholesaleCusts = custs.filter((c) => c.customer_type === 'wholesale');
      setCustomers(wholesaleCusts);
      setIssues(wIssues);
      setReturnsList(rets);
      if (wholesaleCusts.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(wholesaleCusts[0].id);
      }
    } catch (err) {
      console.warn('Error loading wholesale returns data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerIssues = issues.filter((i) => i.customer_id === selectedCustomerId);
  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  const handleRecordReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCustomer) {
      setErrorMsg('Please select a wholesale customer.');
      return;
    }

    if (returnQty <= 0) {
      setErrorMsg('Return quantity must be greater than 0 Pcs.');
      return;
    }

    if (selectedIssue && selectedIssue.total_items_issued < returnQty) {
      setErrorMsg(`Cannot return ${returnQty} Pcs. Total items originally issued: ${selectedIssue.total_items_issued} Pcs.`);
      return;
    }

    try {
      const newReturn = await dataService.createWholesaleReturn({
        return_number: `WR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        issue_id: selectedIssueId || undefined,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.full_name,
        return_date: new Date().toISOString().split('T')[0],
        total_quantity_returned: returnQty,
        total_weight_returned_g: returnWeight,
        condition_notes: conditionNotes,
      });

      // Record inventory movement to restore stock
      await dataService.createInventoryMovement({
        product_name: selectedIssue ? `Returned Batch from ${selectedIssue.issue_number}` : 'Wholesale Consignment Return Batch',
        sku: 'RET-WR-STOCK',
        movement_type: 'wholesale_return',
        quantity_change: returnQty,
        weight_change_g: returnWeight,
        reference_id: newReturn.return_number,
        notes: `Wholesale Return Verified & Restored from ${selectedCustomer.full_name}`,
      });

      setToastMessage(`Return ${newReturn.return_number} recorded & stock restored!`);
      setTimeout(() => setToastMessage(null), 3500);

      setReturnQty(0);
      setReturnWeight(0);
      setConditionNotes('');
      loadData();
    } catch (err: any) {
      setErrorMsg(`Return record failed: ${err?.message || 'Error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-charcoal-900 text-gold-400 px-4 py-3 shadow-xl text-xs font-bold border border-gold-500/40 flex items-center gap-2">
          <span>✓</span> {toastMessage}
        </div>
      )}

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

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 flex items-center gap-2 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Wholesale Partner *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedIssueId('');
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.shop_name || 'Dealer'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Link to Wholesale Issue Voucher (Optional)</label>
            <select
              value={selectedIssueId}
              onChange={(e) => setSelectedIssueId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              <option value="">-- General Customer Stock Return --</option>
              {customerIssues.map((i) => (
                <option key={i.id} value={i.id}>
                  Voucher #{i.issue_number} ({i.total_items_issued} Pcs • Issued: {formatDate(i.issue_date)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Returned Qty (Pcs) *</label>
              <input
                type="number"
                min="1"
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
                min="0.001"
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
              placeholder="Damage status, tag verification notes..."
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
                {returnsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No wholesale stock returns recorded yet.
                    </td>
                  </tr>
                ) : (
                  returnsList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{r.return_number}</td>
                      <td className="p-3 font-mono">{formatDate(r.return_date)}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{r.customer_name || 'Wholesale Partner'}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

