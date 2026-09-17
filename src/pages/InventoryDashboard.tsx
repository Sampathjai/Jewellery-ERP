import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { Product, InventoryMovement } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import { Boxes, History, Plus, AlertTriangle, Layers, Edit3, Check, X } from 'lucide-react';

export const InventoryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [db, setDb] = useState(getLocalDb());

  const loadInventory = useCallback(async () => {
    try {
      const liveProds = await dataService.getProducts();
      setProductsList(liveProds);
      setDb(getLocalDb());
    } catch (e) {
      console.warn('Error loading live inventory from Supabase:', e);
      setProductsList(getLocalDb().products);
    }
  }, []);

  useEffect(() => {
    loadInventory();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'products' || tableName === 'inventory_movements' || tableName === 'general') {
        loadInventory();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadInventory]);

  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Stock Audit Adjustment');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const prods = productsList.length > 0 ? productsList : db.products;
  const goldProducts = prods.filter((p) => p.metal_type === 'gold');
  const silverProducts = prods.filter((p) => p.metal_type === 'silver');

  const totalGoldWeight = goldProducts.reduce((sum, p) => sum + (p.net_weight_g || 0) * (p.quantity || 0), 0);
  const totalSilverWeight = silverProducts.reduce((sum, p) => sum + (p.net_weight_g || 0) * (p.quantity || 0), 0);
  const totalStockValue = prods.reduce((sum, p) => sum + (p.retail_price || 0) * (p.quantity || 0), 0);

  const lowStockItems = prods.filter((p) => (p.quantity || 0) <= (p.minimum_stock || 0));

  const handleOpenAdjust = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustQty(p.quantity);
    setAdjustReason('Stock Audit Adjustment');
  };

  const handleSaveStockAdjustment = async () => {
    if (!adjustingProduct) return;

    const diff = adjustQty - adjustingProduct.quantity;
    if (diff === 0) {
      setAdjustingProduct(null);
      return;
    }

    try {
      const updated = await dataService.updateProduct(adjustingProduct.id, {
        quantity: Math.max(0, adjustQty),
        status: adjustQty > 0 ? 'in_stock' : 'sold',
      });

      await dataService.createInventoryMovement({
        product_id: adjustingProduct.id,
        product_name: adjustingProduct.name,
        sku: adjustingProduct.sku,
        movement_type: diff > 0 ? 'purchase' : 'stock_adjustment',
        quantity_change: diff,
        weight_change_g: diff * (adjustingProduct.net_weight_g || 0),
        notes: adjustReason,
      });

      showToast(`Stock updated for "${updated.name}" to ${adjustQty} Pcs.`);
      loadInventory();
    } catch (err: any) {
      showToast(`Failed to update stock: ${err?.message || 'Error'}`);
    }

    setAdjustingProduct(null);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-charcoal-900 text-gold-400 px-4 py-3 shadow-xl text-xs font-bold border border-gold-500/40 flex items-center gap-2">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <PageHeader
        title="Stock & Inventory Audit"
        subtitle="Track gold/silver weight balances, stock valuation, and low stock thresholds"
        breadcrumb={['Home', 'Inventory']}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/stock-movements')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <History className="h-4 w-4 text-gold-600" />
              Stock Movement Ledger
            </button>
            <button
              onClick={() => navigate('/products/add')}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Plus className="h-4 w-4" />
              Add Stock Item
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gold-300 bg-gold-50/50 p-5 dark:border-gold-800 dark:bg-gold-950/30">
          <span className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase">Total Gold Stock Weight</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-amber-900 dark:text-gold-300">
            {formatWeight(totalGoldWeight)}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{goldProducts.length} Gold SKUs in showroom</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Silver Stock Weight</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-slate-800 dark:text-slate-100">
            {formatWeight(totalSilverWeight)}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{silverProducts.length} Silver SKUs in showroom</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Retail Stock Valuation</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
            {formatCurrency(totalStockValue)}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Retail market stock value</p>
        </div>
      </div>

      {/* Low Stock Warning Alert */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Low Stock Alert ({lowStockItems.length} Products need reordering)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {lowStockItems.map((item) => (
              <div key={item.id} className="rounded-xl bg-white p-2.5 border border-red-100 dark:bg-charcoal-900 dark:border-charcoal-800 flex justify-between items-center">
                <span className="font-semibold text-charcoal-900 dark:text-slate-100 truncate">{item.name}</span>
                <span className="font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded text-[10px]">
                  {item.quantity} Left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Stock List Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
          Showroom Stock Inventory Master
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Metal / Purity</th>
                <th className="p-3 text-right">Net Wt / Pc</th>
                <th className="p-3 text-right">In Stock Qty</th>
                <th className="p-3 text-right">Total Metal Wt</th>
                <th className="p-3 text-right">Valuation</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {prods.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                  <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">{p.sku}</td>
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{p.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <MetalBadge metal={p.metal_type} />
                      <PurityBadge purity={p.purity} />
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">{formatWeight(p.net_weight_g)}</td>
                  <td className="p-3 text-right font-bold">
                    <span className={p.quantity <= p.minimum_stock ? 'text-red-600 font-bold' : ''}>
                      {p.quantity} Pcs
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                    {formatWeight(p.net_weight_g * p.quantity)}
                  </td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(p.retail_price * p.quantity)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenAdjust(p)}
                      className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-gold-50 hover:border-gold-300 hover:text-gold-700 dark:bg-charcoal-800 dark:border-charcoal-700 dark:text-slate-300"
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-charcoal-800 pb-3 mb-4">
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                Adjust Stock — {adjustingProduct.name}
              </h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Current In-Stock Quantity:</span>
                <strong className="text-charcoal-900 dark:text-slate-100 font-serif text-lg">
                  {adjustingProduct.quantity} Pcs
                </strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Adjusted Quantity (Pcs) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Reason / Notes *
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-charcoal-800 pt-4 mt-4">
                <button
                  onClick={() => setAdjustingProduct(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStockAdjustment}
                  className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
                >
                  <Check className="h-4 w-4" /> Save Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
