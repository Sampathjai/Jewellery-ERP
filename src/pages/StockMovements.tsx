import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatWeight, formatDate } from '@/lib/utils';
import { History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const StockMovements: React.FC = () => {
  const db = getLocalDb();

  const mockMovements = [
    {
      id: 'mov-1',
      date: new Date().toISOString(),
      product: 'Traditional Gold Mukku Poodu Nose Pin (NR-G22-001)',
      type: 'wholesale_issue',
      qtyChange: -50,
      weightChange: -20.0,
      reference: 'WI-2026-001',
      user: 'Sampath Kumar (Owner)',
      notes: 'Consignment issue to Sri Lakshmi Jewellery',
    },
    {
      id: 'mov-2',
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      product: '925 Sterling Silver Peacock Studs (ER-S92-001)',
      type: 'wholesale_return',
      qtyChange: 15,
      weightChange: 7.5,
      reference: 'WR-2026-001',
      user: 'Sampath Kumar (Owner)',
      notes: 'Unsold consignment return verified',
    },
    {
      id: 'mov-3',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      product: '22K Daily Wear Gold Stud Earrings (ER-G22-002)',
      type: 'retail_sale',
      qtyChange: -1,
      weightChange: -3.0,
      reference: 'SJ-INV-1001',
      user: 'Billing Staff',
      notes: 'Counter POS checkout',
    },
    {
      id: 'mov-4',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      product: 'Traditional Gold Mukku Poodu Nose Pin (NR-G22-001)',
      type: 'manufacturing_entry',
      qtyChange: 50,
      weightChange: 20.0,
      reference: 'JC-2026-001',
      user: 'Senior Goldsmith',
      notes: 'New manufacturing batch entry',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements & Audit Ledger"
        subtitle="Complete transactional audit history of stock additions, sales, wholesale issues and returns"
        breadcrumb={['Home', 'Inventory', 'Stock Movements']}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Product Spec</th>
                <th className="p-3">Movement Action</th>
                <th className="p-3 text-right">Qty Change</th>
                <th className="p-3 text-right">Weight Change</th>
                <th className="p-3">Reference / Order</th>
                <th className="p-3">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {mockMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                  <td className="p-3 font-mono text-slate-500">{formatDate(m.date)}</td>
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{m.product}</td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-charcoal-800 dark:text-slate-300 uppercase">
                      {m.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${m.qtyChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange} Pcs
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${m.weightChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.weightChange > 0 ? `+${formatWeight(m.weightChange)}` : formatWeight(m.weightChange)}
                  </td>
                  <td className="p-3 font-mono font-semibold text-gold-600 dark:text-gold-400">{m.reference}</td>
                  <td className="p-3 text-slate-500">{m.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

