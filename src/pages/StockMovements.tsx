import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { InventoryMovement } from '@/types';
import { formatWeight, formatDate } from '@/lib/utils';
import { History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const StockMovements: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  useEffect(() => {
    async function loadMovements() {
      try {
        const live = await dataService.getInventoryMovements();
        setMovements(live);
      } catch (err) {
        console.warn('Could not load inventory movements:', err);
      }
    }
    loadMovements();
  }, []);

  const defaultMovements = [
    {
      id: 'mov-1',
      created_at: new Date().toISOString(),
      product_name: 'Traditional Gold Mukku Poodu Nose Pin (NR-G22-001)',
      movement_type: 'wholesale_issue',
      quantity_change: -50,
      weight_change_g: -20.0,
      reference_number: 'WI-2026-001',
      created_by: 'Sampath Kumar (Owner)',
      notes: 'Consignment issue to Sri Lakshmi Jewellery',
    },
    {
      id: 'mov-2',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      product_name: '925 Sterling Silver Peacock Studs (ER-S92-001)',
      movement_type: 'wholesale_return',
      quantity_change: 15,
      weight_change_g: 7.5,
      reference_number: 'WR-2026-001',
      created_by: 'Sampath Kumar (Owner)',
      notes: 'Unsold consignment return verified',
    },
  ];

  const displayList = movements.length > 0 ? movements : (defaultMovements as any[]);

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
                <th className="p-3">Reference / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {displayList.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                  <td className="p-3 font-mono text-slate-500">{formatDate(m.created_at || m.date || new Date().toISOString())}</td>
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{m.product_name || m.product || 'Stock Item'}</td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-charcoal-800 dark:text-slate-300 uppercase">
                      {(m.movement_type || m.type || 'adjustment').replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${(m.quantity_change ?? m.qtyChange ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(m.quantity_change ?? m.qtyChange ?? 0) > 0 ? `+${m.quantity_change ?? m.qtyChange}` : (m.quantity_change ?? m.qtyChange ?? 0)} Pcs
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${(m.weight_change_g ?? m.weightChange ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(m.weight_change_g ?? m.weightChange ?? 0) > 0 ? `+${formatWeight(m.weight_change_g ?? m.weightChange)}` : formatWeight(m.weight_change_g ?? m.weightChange ?? 0)}
                  </td>
                  <td className="p-3 font-mono font-semibold text-gold-600 dark:text-gold-400">
                    {m.reference_number || m.reference || m.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

