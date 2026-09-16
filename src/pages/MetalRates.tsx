import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { MetalRate } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Coins, Save, TrendingUp, History, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MetalRates: React.FC = () => {
  const [db, setDb] = useState(getLocalDb());
  const todayRate = db.metalRates[0] || {
    id: 'rate-1',
    rate_date: new Date().toISOString().split('T')[0],
    gold_24k_per_gram: 7450,
    gold_22k_per_gram: 6830,
    gold_18k_per_gram: 5600,
    silver_per_gram: 89.5,
    silver_per_kg: 89500,
    source: 'manual',
    notes: 'Official Shankar Jewellery Rate',
  };

  const [rateSource, setRateSource] = useState<'automatic' | 'manual'>(
    (todayRate.source as 'automatic' | 'manual') || 'manual'
  );

  const [effectiveDate, setEffectiveDate] = useState<string>(
    todayRate.rate_date || new Date().toISOString().split('T')[0]
  );

  const [gold24kRate, setGold24kRate] = useState<number>(todayRate.gold_24k_per_gram || 7450);
  const [silver925Rate, setSilver925Rate] = useState<number>(todayRate.silver_per_gram || 89.5);
  const [notes, setNotes] = useState<string>(todayRate.notes || 'Shankar Jewellery Daily Rate');

  const [notification, setNotification] = useState<string | null>(null);

  const handleGold24kChange = (val: number) => {
    setGold24kRate(val);
  };

  const handleSilver925Change = (val: number) => {
    setSilver925Rate(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const gold22 = Number((gold24kRate * 0.916).toFixed(2));
    const gold18 = Number((gold24kRate * 0.75).toFixed(2));
    const silverKg = Number((silver925Rate * 1000).toFixed(2));

    const newRate: MetalRate = {
      id: `rate-${Date.now()}`,
      rate_date: effectiveDate,
      gold_24k_per_gram: gold24kRate,
      gold_22k_per_gram: gold22,
      gold_18k_per_gram: gold18,
      silver_per_gram: silver925Rate,
      silver_per_kg: silverKg,
      source: rateSource,
      notes: notes || (rateSource === 'manual' ? 'Admin Manual Override Rate' : 'Automatic Live Market Rate'),
      created_at: new Date().toISOString(),
    };

    // Replace existing rate for same date or prepend
    const updatedRates = [newRate, ...db.metalRates.filter((r) => r.rate_date !== effectiveDate)];
    db.metalRates = updatedRates;
    saveLocalDb(db);
    setDb({ ...db });

    setNotification(
      `Rates updated successfully for ${effectiveDate} (${rateSource.toUpperCase()} Mode: Gold 24K = ₹${gold24kRate}/g, Silver 925 = ₹${silver925Rate}/g)`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSwitchToAutomatic = () => {
    setRateSource('automatic');
    // Default market rates benchmark
    setGold24kRate(7450);
    setSilver925Rate(89.5);
    setNotification('Switched to Automatic Live Market Rates.');
    setTimeout(() => setNotification(null), 3000);
  };

  const chartData = [...db.metalRates].reverse().map((r) => ({
    date: formatDate(r.rate_date),
    gold24k: r.gold_24k_per_gram,
    silver925: r.silver_per_gram * 100,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metal Rates Settings & Daily Override"
        subtitle="Configure automatic market rates or set manual Gold 24K and Silver 925 prices for billing priority"
        breadcrumb={['Home', 'Metal Rates']}
      />

      {notification && (
        <div className="rounded-2xl border border-gold-400 bg-gold-50 p-4 text-xs font-bold text-amber-950 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300 flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-4 w-4 text-gold-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Active Rate Banner */}
      <div className="rounded-2xl border border-gold-400/50 bg-gradient-to-r from-gold-50/80 via-amber-50/50 to-white p-5 dark:border-gold-800/40 dark:bg-gradient-to-r dark:from-gold-950/40 dark:to-charcoal-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-500 font-serif font-bold text-xl text-charcoal-950 shadow-gold">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                Active Billing Rates ({formatDate(todayRate.rate_date)})
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  todayRate.source === 'manual'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                }`}
              >
                {todayRate.source === 'manual' ? 'MANUAL OVERRIDE ACTIVE' : 'AUTOMATIC LIVE RATE'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              These rates will be applied automatically in Retail POS, Wholesale Billing, and Inventory Valuation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/80 dark:bg-charcoal-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-charcoal-700">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Gold 24K</span>
            <strong className="font-serif text-sm text-gold-600 dark:text-gold-400 font-bold">
              {formatCurrency(todayRate.gold_24k_per_gram)}/g
            </strong>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-charcoal-700" />
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Silver 925</span>
            <strong className="font-serif text-sm text-slate-700 dark:text-slate-200 font-bold">
              {formatCurrency(todayRate.silver_per_gram)}/g
            </strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* METAL RATES ENTRY FORM */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-gold-600" />
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                Rate Configuration & Override
              </h3>
            </div>
          </div>

          {/* Rate Source Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Rate Source Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-all ${
                  rateSource === 'automatic'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="rateSource"
                  value="automatic"
                  checked={rateSource === 'automatic'}
                  onChange={() => handleSwitchToAutomatic()}
                  className="sr-only"
                />
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Automatic
              </label>

              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-all ${
                  rateSource === 'manual'
                    ? 'border-gold-500 bg-gold-50/70 text-amber-950 dark:border-gold-700 dark:bg-gold-950/40 dark:text-gold-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="rateSource"
                  value="manual"
                  checked={rateSource === 'manual'}
                  onChange={() => setRateSource('manual')}
                  className="sr-only"
                />
                <Coins className="h-4 w-4 text-gold-600" />
                Manual Override
              </label>
            </div>
          </div>

          {/* Effective Date */}
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

          {/* Gold 24K Rate */}
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
                onChange={(e) => handleGold24kChange(Number(e.target.value))}
                placeholder="7450"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <span className="mt-1 block text-[11px] text-slate-500">
              Calculated 22K Equivalent: ₹{Number((gold24kRate * 0.916).toFixed(2))}/g
            </span>
          </div>

          {/* Silver 925 Rate */}
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
                onChange={(e) => handleSilver925Change(Number(e.target.value))}
                placeholder="89.5"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <span className="mt-1 block text-[11px] text-slate-500">
              Silver per KG Equivalent: ₹{formatCurrency(silver925Rate * 1000)}/kg
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Official Trichy Market Opening Rate"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <Save className="h-4 w-4" /> Save Rates for {effectiveDate}
          </button>
        </form>

        {/* Rate History Chart & Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
              Gold 24K Price History Trend
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Line type="monotone" dataKey="gold24k" stroke="#d4af37" strokeWidth={3} name="Gold 24K / g" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mb-3">
              Metal Rates Audit & Priority Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Gold 24K</th>
                    <th className="p-2.5">Silver 925</th>
                    <th className="p-2.5">Rate Source</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {db.metalRates.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-bold font-mono">{formatDate(r.rate_date)}</td>
                      <td className="p-2.5 font-bold text-amber-900 dark:text-gold-300">{formatCurrency(r.gold_24k_per_gram)}/g</td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{formatCurrency(r.silver_per_gram)}/g</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            r.source === 'manual'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {r.source || 'manual'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{r.notes}</td>
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
