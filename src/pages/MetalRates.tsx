import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { MetalRate } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  syncLiveRatesToSupabase,
  saveManualShopRatesToSupabase,
  fetchLiveMarketRates,
} from '@/lib/metalRatesService';
import {
  Coins,
  Save,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Info,
  Clock,
  Globe,
  Sliders,
  Building,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MetalRates: React.FC = () => {
  const [ratesList, setRatesList] = useState<MetalRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeRate = ratesList[0] || null;

  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [gold24kRate, setGold24kRate] = useState<number>(15583);
  const [silver925Rate, setSilver925Rate] = useState<number>(180);
  const [notes, setNotes] = useState<string>('Shankar Jewellery Shop Selling Rate');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getMetalRates();
      setRatesList(data);
      if (data.length > 0) {
        const top = data[0];
        setGold24kRate(top.gold_24k_per_gram || 15583);
        setSilver925Rate(top.silver_per_gram || 180);
        if (top.notes) setNotes(top.notes);
      }
    } catch (e: any) {
      console.error('Error loading metal rates from Supabase:', e);
      showNotification('error', e?.message || 'Failed to load metal rates from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'metal_rates' || tableName === 'general') {
        loadRates();
      }
    });
    return () => unsubscribe();
  }, [loadRates]);

  const handleFetchChennaiMarketRates = async () => {
    setIsRefreshingLive(true);
    try {
      const savedRate = await syncLiveRatesToSupabase();
      await loadRates();
      showNotification(
        'success',
        `Chennai market rates updated! 24K Gold = ₹${savedRate.gold_24k_per_gram}/g, 22K (916) = ₹${savedRate.gold_22k_per_gram}/g, Silver = ₹${savedRate.silver_per_gram}/g`
      );
    } catch (err: any) {
      console.error('Chennai rate fetch failed:', err);
      showNotification(
        'error',
        err?.message || 'Unable to refresh Chennai market rates. Last valid rate preserved.'
      );
    } finally {
      setIsRefreshingLive(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gold24kRate || gold24kRate <= 0 || !silver925Rate || silver925Rate <= 0) {
      showNotification('error', 'Please enter valid positive gold and silver rates.');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const saved = await saveManualShopRatesToSupabase({
        effectiveDate,
        gold24kRate,
        silver925Rate,
        notes: notes || 'Shop Manual Override Rate',
      });
      await loadRates();
      showNotification(
        'success',
        `Shop rates saved for ${effectiveDate}: Gold 24K = ₹${saved.gold_24k_per_gram}/g, 22K = ₹${saved.gold_22k_per_gram}/g, Silver = ₹${saved.silver_per_gram}/g`
      );
    } catch (err: any) {
      console.error('Manual rate save error:', err);
      showNotification('error', err?.message || 'Failed to save shop rates to Supabase database.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const chartData = [...ratesList].reverse().map((r) => ({
    date: formatDate(r.rate_date),
    gold24k: r.gold_24k_per_gram,
    gold22k: r.gold_22k_per_gram,
    silver925: r.silver_per_gram,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metal Rates & Price Management"
        subtitle="Chennai Local Market Gold & Silver Rates and shop-specific manual price override system"
        breadcrumb={['Home', 'Metal Rates']}
        actionBtn={
          <button
            onClick={handleFetchChennaiMarketRates}
            disabled={isRefreshingLive}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingLive ? 'animate-spin' : ''}`} />
            {isRefreshingLive ? 'Fetching Chennai Market Rates...' : 'Fetch Chennai Market Rates'}
          </button>
        }
      />

      {notification && (
        <div
          className={`rounded-2xl border p-4 text-xs font-bold shadow-sm flex items-center gap-2.5 ${
            notification.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ACTIVE BILLING RATE BANNER — CHENNAI LOCAL MARKET RATE */}
      {activeRate ? (
        <div className="rounded-2xl border border-gold-400/50 bg-gradient-to-r from-gold-50/90 via-amber-50/50 to-white p-6 dark:border-gold-800/40 dark:bg-gradient-to-r dark:from-gold-950/40 dark:to-charcoal-900 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 font-serif font-bold text-2xl text-charcoal-950 shadow-gold shrink-0">
                ₹
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    Active Shop Rates ({formatDate(activeRate.rate_date)})
                  </h3>
                  <span
                    className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      activeRate.source === 'manual'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                    }`}
                  >
                    {activeRate.source === 'manual' ? 'SHOP MANUAL OVERRIDE ACTIVE' : 'CHENNAI LOCAL MARKET RATE'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    RATE SOURCE: <strong>{activeRate.source === 'manual' ? 'Manual Shop Override' : 'Chennai Local Market'}</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>
                    Last Updated: {activeRate.created_at ? new Date(activeRate.created_at).toLocaleString() : 'Today'}
                  </span>
                  {activeRate.notes && <span className="text-slate-400">• {activeRate.notes}</span>}
                </p>
              </div>
            </div>

            <button
              onClick={handleFetchChennaiMarketRates}
              disabled={isRefreshingLive}
              className="flex items-center gap-1.5 shrink-0 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-charcoal-950 hover:bg-gold-600 shadow-gold transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingLive ? 'animate-spin' : ''}`} />
              Sync Chennai Rate Now
            </button>
          </div>

          {/* Detailed Metal Rates Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="rounded-xl bg-white/90 dark:bg-charcoal-800/90 p-3 border border-slate-200 dark:border-charcoal-700 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Gold 24K (99.9%)</span>
              <strong className="font-serif text-base text-gold-600 dark:text-gold-400 font-bold block mt-0.5">
                {formatCurrency(activeRate.gold_24k_per_gram)}/g
              </strong>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-charcoal-800/90 p-3 border border-amber-300 dark:border-gold-800/60 shadow-sm">
              <span className="block text-[10px] font-bold text-amber-800 dark:text-gold-400 uppercase">Gold 22K (91.6%)</span>
              <strong className="font-serif text-base text-amber-950 dark:text-gold-300 font-bold block mt-0.5">
                {formatCurrency(activeRate.gold_22k_per_gram)}/g
              </strong>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-charcoal-800/90 p-3 border border-slate-200 dark:border-charcoal-700 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Gold 18K (75.0%)</span>
              <strong className="font-serif text-base text-slate-800 dark:text-slate-200 font-bold block mt-0.5">
                {formatCurrency(activeRate.gold_18k_per_gram)}/g
              </strong>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-charcoal-800/90 p-3 border border-slate-200 dark:border-charcoal-700 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Gold 14K (58.3%)</span>
              <strong className="font-serif text-base text-slate-800 dark:text-slate-200 font-bold block mt-0.5">
                {formatCurrency(activeRate.gold_14k_per_gram || Math.round(activeRate.gold_24k_per_gram * 0.5833))}/g
              </strong>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-charcoal-800/90 p-3 border border-slate-200 dark:border-charcoal-700 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Silver 925 / g</span>
              <strong className="font-serif text-base text-slate-800 dark:text-slate-200 font-bold block mt-0.5">
                {formatCurrency(activeRate.silver_per_gram)}/g
              </strong>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-charcoal-800/90 p-3 border border-slate-200 dark:border-charcoal-700 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Silver 925 / Kg</span>
              <strong className="font-serif text-base text-slate-800 dark:text-slate-200 font-bold block mt-0.5">
                {formatCurrency(activeRate.silver_per_kg)}/kg
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-bold text-sm mb-1">⚠️ No Active Metal Rates Found in Database</p>
          <p className="text-xs">Click "Fetch Chennai Market Rates" above or configure shop selling rates below.</p>
        </div>
      )}

      {/* SECONDARY SECTION: INTERNATIONAL MARKET REFERENCE */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40 shadow-sm text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
          <Globe className="h-4 w-4 text-blue-600" />
          <span className="uppercase tracking-wider">International Market Reference (Secondary Benchmark)</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          The rates below represent international raw spot benchmarks (XAU/XAG in USD/oz & USD/INR exchange rates). International spot rates are kept as market reference data only and are <strong>NOT used as the Chennai shop selling rate</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Spot Gold (XAU/USD)</span>
            <strong className="font-mono text-sm text-slate-800 dark:text-slate-200 block mt-0.5">
              ~$2,750 - $3,050 / oz
            </strong>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Spot Silver (XAG/USD)</span>
            <strong className="font-mono text-sm text-slate-800 dark:text-slate-200 block mt-0.5">
              ~$32.50 - $35.00 / oz
            </strong>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">USD / INR Exchange Rate</span>
            <strong className="font-mono text-sm text-slate-800 dark:text-slate-200 block mt-0.5">
              ₹86.50 / USD
            </strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SHOP MANUAL OVERRIDE FORM */}
        <form
          onSubmit={handleManualSubmit}
          className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-gold-600" />
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                Shop Selling Rate Override
              </h3>
            </div>
            <span className="rounded bg-gold-100 dark:bg-gold-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300">
              Manual Override
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Effective Date *</label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Gold 24K Rate per Gram (INR) *
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="1"
                required
                value={gold24kRate}
                onChange={(e) => setGold24kRate(Number(e.target.value))}
                placeholder="15583"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <span className="mt-1 block text-[11px] text-slate-500">
              Calculated 22K (916): ₹{Math.round(gold24kRate * 0.916)}/g
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Silver 925 Rate per Gram (INR) *
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.1"
                required
                value={silver925Rate}
                onChange={(e) => setSilver925Rate(Number(e.target.value))}
                placeholder="180"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <span className="mt-1 block text-[11px] text-slate-500">
              Silver per KG: ₹{formatCurrency(silver925Rate * 1000)}/kg
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shankar Jewellery Counter Selling Rate"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingManual}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" /> {isSubmittingManual ? 'Saving Rates...' : `Save Rates for ${effectiveDate}`}
          </button>
        </form>

        {/* RATE HISTORY CHART & SUPABASE AUDIT LOG */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mb-4">
              Chennai Gold Rate Trend (24K & 22K)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Line type="monotone" dataKey="gold24k" stroke="#d4af37" strokeWidth={3} name="Chennai Gold 24K / g" />
                  <Line type="monotone" dataKey="gold22k" stroke="#b8860b" strokeWidth={2} strokeDasharray="4 4" name="Chennai Gold 22K (916) / g" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mb-3">
              Supabase Metal Rates Central History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Gold 24K</th>
                    <th className="p-2.5">Gold 22K (916)</th>
                    <th className="p-2.5">Silver 925</th>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {ratesList.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-bold font-mono">{formatDate(r.rate_date)}</td>
                      <td className="p-2.5 font-bold text-gold-600 dark:text-gold-400">{formatCurrency(r.gold_24k_per_gram)}/g</td>
                      <td className="p-2.5 font-bold text-amber-950 dark:text-gold-300">{formatCurrency(r.gold_22k_per_gram)}/g</td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{formatCurrency(r.silver_per_gram)}/g</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            r.source === 'manual'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {r.source === 'manual' ? 'MANUAL' : 'CHENNAI LOCAL'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-[160px]">{r.notes}</td>
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
