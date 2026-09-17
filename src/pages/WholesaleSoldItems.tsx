import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { WholesaleSale, Customer } from '@/types';
import { calculateWholesaleProfit } from '@/lib/profitEngine';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { CircleDot, Plus, Save, Search } from 'lucide-react';

export const WholesaleSoldItems: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesList, setSalesList] = useState<WholesaleSale[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [buyerShopName, setBuyerShopName] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [soldQty, setSoldQty] = useState<number>(0);
  const [soldWeight, setSoldWeight] = useState<number>(0);
  const [totalSaleValue, setTotalSaleValue] = useState<number>(0);
  const [totalCostValuation, setTotalCostValuation] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [custs, sales] = await Promise.all([
        dataService.getCustomers(),
        dataService.getWholesaleSales(),
      ]);
      const wholesaleCusts = custs.filter((c) => c.customer_type === 'wholesale');
      setCustomers(wholesaleCusts);
      setSalesList(sales);
      if (wholesaleCusts.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(wholesaleCusts[0].id);
      }
    } catch (err) {
      console.warn('Error loading wholesale sales data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const profitCalc = calculateWholesaleProfit(
    totalSaleValue,
    totalCostValuation,
    selectedCustomer?.profit_sharing_model || 'model_a_profit_percent',
    selectedCustomer?.agreed_profit_percent || 40
  );

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const newSale = await dataService.createWholesaleSale({
        sale_number: `WS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.full_name,
        sale_date: new Date().toISOString().split('T')[0],
        buyer_shop_name: buyerShopName,
        buyer_location: buyerLocation,
        total_quantity_sold: soldQty,
        total_weight_sold_g: soldWeight,
        total_sale_value: totalSaleValue,
        total_cost_valuation: totalCostValuation,
        gross_profit: profitCalc.grossProfit,
        customer_profit_share: profitCalc.customerProfitShare,
        shop_profit_share: profitCalc.shopProfitShare,
      });

      setToastMessage(`Sale ${newSale.sale_number} recorded successfully!`);
      setTimeout(() => setToastMessage(null), 3500);

      setBuyerShopName('');
      setBuyerLocation('');
      setSoldQty(0);
      setSoldWeight(0);
      setTotalSaleValue(0);
      setTotalCostValuation(0);
      loadData();
    } catch (err: any) {
      alert(`Sale record failed: ${err?.message || 'Error'}`);
    }
  };

  const filteredSales = salesList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.customer_name || '').toLowerCase().includes(q) ||
      (s.buyer_shop_name || '').toLowerCase().includes(q) ||
      (s.sale_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-charcoal-900 text-gold-400 px-4 py-3 shadow-xl text-xs font-bold border border-gold-500/40 flex items-center gap-2">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <PageHeader
        title="Wholesale Consignment Sales Reports"
        subtitle="Record jewellery sales reported by wholesale partners and calculate profit sharing"
        breadcrumb={['Home', 'Wholesale Sold Items']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Sales Report Form */}
        <form onSubmit={handleRecordSale} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <CircleDot className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
              Record Partner Sales Report
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Wholesale Partner *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.shop_name || 'Dealer'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Buyer Shop Name</label>
              <input
                type="text"
                value={buyerShopName}
                onChange={(e) => setBuyerShopName(e.target.value)}
                placeholder="Retailer Shop"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Buyer Location</label>
              <input
                type="text"
                value={buyerLocation}
                onChange={(e) => setBuyerLocation(e.target.value)}
                placeholder="City / Town"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Qty Sold (Pcs)</label>
              <input
                type="number"
                min="1"
                required
                value={soldQty}
                onChange={(e) => setSoldQty(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Total Net Wt (g)</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                required
                value={soldWeight}
                onChange={(e) => setSoldWeight(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Total Sale Value (INR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={totalSaleValue}
                onChange={(e) => setTotalSaleValue(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Cost / Valuation (INR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={totalCostValuation}
                onChange={(e) => setTotalCostValuation(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Profit Split Calculation Preview */}
          <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-3 text-xs dark:border-gold-800 dark:bg-gold-950/20 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Profit:</span>
              <strong className="font-mono">{formatCurrency(profitCalc.grossProfit)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Partner Profit Share ({selectedCustomer?.agreed_profit_percent ?? 40}%):</span>
              <strong className="font-mono text-emerald-600">{formatCurrency(profitCalc.customerProfitShare)}</strong>
            </div>
            <div className="flex justify-between font-bold border-t border-gold-200 pt-1 dark:border-gold-800 text-amber-900 dark:text-gold-300">
              <span>Shop Profit Share:</span>
              <span className="font-serif">{formatCurrency(profitCalc.shopProfitShare)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Save Reported Sales
          </button>
        </form>

        {/* History Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Wholesale Consignment Sales History
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search partner or sale no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
                <tr>
                  <th className="p-3">Sale No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Wholesale Partner</th>
                  <th className="p-3">Buyer Shop</th>
                  <th className="p-3 text-right">Qty Sold</th>
                  <th className="p-3 text-right">Gross Profit</th>
                  <th className="p-3 text-right">Partner Share</th>
                  <th className="p-3 text-right">Shop Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      No wholesale sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{s.sale_number}</td>
                      <td className="p-3 font-mono">{formatDate(s.sale_date)}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{s.customer_name || 'Wholesale Partner'}</td>
                      <td className="p-3">{s.buyer_shop_name || 'Retailer'}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{s.total_quantity_sold} Pcs</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(s.gross_profit)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(s.customer_profit_share)}</td>
                      <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">{formatCurrency(s.shop_profit_share)}</td>
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

