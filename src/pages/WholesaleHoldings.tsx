import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight } from '@/lib/utils';
import {
  PackageCheck,
  Search,
  Building2,
  User,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Coins,
  CheckCircle2,
} from 'lucide-react';

export const WholesaleHoldings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [metalFilter, setMetalFilter] = useState<'all' | 'gold' | 'silver'>('all');

  const db = getLocalDb();
  const wholesaleIssues = db.wholesaleIssues || [];
  const customers = db.customers || [];

  // Filter active consignment issues (where status is active or remaining items > 0)
  const activeHoldings = useMemo(() => {
    return wholesaleIssues.flatMap((issue) => {
      const customer = customers.find((c) => c.id === issue.customer_id);
      const items = issue.items || [];
      const activeItems = items.filter((item) => (item.quantity_remaining ?? item.quantity_issued) > 0);

      if (activeItems.length === 0 && issue.status !== 'active') return [];

      return activeItems.map((item) => {
        const agreedTouch = customer?.agreed_customer_touch ?? item.actual_touch ?? 0;
        const netW = item.net_weight_g || (item.gross_weight_g - item.deduction_weight_g) || 0;
        const fineW = item.fine_gold_g || (netW * agreedTouch) / 100;
        const remainingQty = item.quantity_remaining ?? item.quantity_issued;
        const proportionalNetW = (netW / (item.quantity_issued || 1)) * remainingQty;
        const proportionalFineW = (fineW / (item.quantity_issued || 1)) * remainingQty;

        return {
          issueId: issue.id,
          issueNumber: issue.issue_number,
          issueDate: issue.issue_date,
          customerId: issue.customer_id,
          customerName: issue.customer_name,
          dealerShop: customer?.shop_name || issue.customer_name || 'Wholesale Partner',
          customerCity: customer?.city || 'Trichy',
          agreedTouch,
          item,
          remainingQty,
          proportionalNetW,
          proportionalFineW,
          totalValuation: item.unit_cost_valuation ? item.unit_cost_valuation * remainingQty : item.total_issue_value,
        };
      });
    });
  }, [wholesaleIssues, customers]);

  const filteredHoldings = useMemo(() => {
    return activeHoldings.filter((h) => {
      const custName = (h.customerName || '').toLowerCase();
      const shopName = (h.dealerShop || '').toLowerCase();
      const prodName = (h.item.product_name || '').toLowerCase();
      const issueNum = (h.issueNumber || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        custName.includes(query) ||
        shopName.includes(query) ||
        prodName.includes(query) ||
        issueNum.includes(query);

      const matchesMetal = metalFilter === 'all' || h.item.metal_type === metalFilter;
      return matchesSearch && matchesMetal;
    });
  }, [activeHoldings, searchQuery, metalFilter]);

  // Aggregated Summary Statistics
  const stats = useMemo(() => {
    let totalFineGoldG = 0;
    let totalFineSilverG = 0;
    let totalValuationINR = 0;
    let totalItemsCount = 0;

    filteredHoldings.forEach((h) => {
      totalItemsCount += h.remainingQty;
      totalValuationINR += h.totalValuation;
      if (h.item.metal_type === 'gold') {
        totalFineGoldG += h.proportionalFineW;
      } else if (h.item.metal_type === 'silver') {
        totalFineSilverG += h.proportionalFineW;
      }
    });

    return {
      totalFineGoldG,
      totalFineSilverG,
      totalValuationINR,
      totalItemsCount,
      uniqueDealersCount: new Set(filteredHoldings.map((h) => h.customerId)).size,
    };
  }, [filteredHoldings]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Consignment Holdings"
        subtitle="Real-time live tracking of active gold & silver jewellery consignment stock held with wholesale partners"
        breadcrumb={['Home', 'Wholesale Consignment', 'Holdings']}
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Holdings Fine Gold
            </p>
            <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
              {formatWeight(stats.totalFineGoldG)}
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              Across active consignment batches
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Holdings Fine Silver
            </p>
            <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
              {formatWeight(stats.totalFineSilverG)}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Pending wholesale settlement
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Valuation Exposure
            </p>
            <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
              {formatCurrency(stats.totalValuationINR)}
            </h3>
            <p className="text-[11px] text-gold-600 dark:text-gold-400 font-semibold mt-0.5">
              Estimated wholesale valuation
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Dealer Partners
            </p>
            <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
              {stats.uniqueDealersCount} Partners
            </h3>
            <p className="text-[11px] text-blue-500 font-semibold mt-0.5">
              {stats.totalItemsCount} pieces in market
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by dealer shop, customer name, product..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Metal Filter:</span>
          <button
            onClick={() => setMetalFilter('all')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              metalFilter === 'all'
                ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-400'
            }`}
          >
            All Metals
          </button>
          <button
            onClick={() => setMetalFilter('gold')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              metalFilter === 'gold'
                ? 'bg-amber-500 text-charcoal-950 shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-400'
            }`}
          >
            Gold Only
          </button>
          <button
            onClick={() => setMetalFilter('silver')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              metalFilter === 'silver'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-400'
            }`}
          >
            Silver Only
          </button>
        </div>
      </div>

      {/* Holdings Content Table or Empty State */}
      {filteredHoldings.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <PackageCheck className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              No Wholesale Holdings Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              There are currently no active consignment holdings matching your filter. All issued wholesale items have either been fully settled or returned to inventory.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-gold-600" />
              Active Dealer Consignment Batches ({filteredHoldings.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="py-3 px-4">Dealer / Customer</th>
                  <th className="py-3 px-4">Issue Details</th>
                  <th className="py-3 px-4">Product & Category</th>
                  <th className="py-3 px-4">Remaining Qty</th>
                  <th className="py-3 px-4">Agreed Touch (%)</th>
                  <th className="py-3 px-4">Net Weight (g)</th>
                  <th className="py-3 px-4">Fine Gold / Silver (g)</th>
                  <th className="py-3 px-4">Est. Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {filteredHoldings.map((h, idx) => (
                  <tr key={`${h.issueId}-${h.item.id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-charcoal-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/10 text-gold-600 font-bold">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-charcoal-900 dark:text-slate-100">
                            {h.dealerShop}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {h.customerName} • {h.customerCity}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-gold-600 dark:text-gold-400 font-bold">{h.issueNumber}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {h.issueDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-charcoal-900 dark:text-slate-100">{h.item.product_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {(h.item.metal_type || 'gold').toUpperCase()} ({h.item.purity || '22k'}) • {h.item.sku}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        {h.remainingQty} of {h.item.quantity_issued} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gold-600 dark:text-gold-400">
                      {h.agreedTouch}% Touch
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {formatWeight(h.proportionalNetW)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                      {formatWeight(h.proportionalFineW)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-charcoal-900 dark:text-slate-100">
                      {formatCurrency(h.totalValuation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
