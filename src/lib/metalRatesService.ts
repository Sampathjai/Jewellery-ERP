import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { MetalRate } from '@/types';

export interface LiveRateFetchResult {
  success: boolean;
  gold_24k_per_gram: number;
  gold_22k_per_gram: number;
  gold_18k_per_gram: number;
  gold_14k_per_gram: number;
  silver_per_gram: number;
  silver_999_per_gram: number;
  silver_per_kg: number;
  exchange_rate_usd_inr: number;
  gold_usd_per_oz: number;
  silver_usd_per_oz: number;
  source: 'automatic';
  updated_at: string;
  error?: string;
}

// 1 Troy Ounce = 31.1034768 Grams
const TROY_OUNCE_IN_GRAMS = 31.1034768;

/**
 * Fetches real-time market spot rates for Gold (XAU) and Silver (XAG) in USD per troy ounce,
 * fetches USD to INR exchange rate, and converts using:
 * INR per gram = (USD per troy ounce * USD to INR) / 31.1034768
 */
export async function fetchLiveMarketRates(): Promise<LiveRateFetchResult> {
  try {
    // 1. Fetch USD to INR Exchange Rate
    let usdToInr = 86.50; // Fallback estimate
    try {
      const exRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (exRes.ok) {
        const exData = await exRes.json();
        if (exData && exData.rates && exData.rates.INR) {
          usdToInr = Number(exData.rates.INR);
        }
      }
    } catch (e) {
      console.warn('Exchange rate API primary request failed, using fallback exchange rate:', e);
    }

    // 2. Fetch Gold (XAU) and Silver (XAG) spot prices in USD/oz
    let goldUsdPerOz = 0;
    let silverUsdPerOz = 0;

    // Try Primary Metals API (gold-api.com)
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch('https://api.gold-api.com/price/XAU'),
        fetch('https://api.gold-api.com/price/XAG'),
      ]);

      if (goldRes.ok) {
        const gData = await goldRes.json();
        if (gData && gData.price) goldUsdPerOz = Number(gData.price);
      }
      if (silverRes.ok) {
        const sData = await silverRes.json();
        if (sData && sData.price) silverUsdPerOz = Number(sData.price);
      }
    } catch (e) {
      console.warn('Gold API primary failed, trying secondary rate provider:', e);
    }

    // Secondary Provider Fallback
    if (goldUsdPerOz <= 0 || silverUsdPerOz <= 0) {
      try {
        const secRes = await fetch('https://api.fxratesapi.com/latest?currencies=XAU,XAG,INR&base=USD');
        if (secRes.ok) {
          const secData = await secRes.json();
          if (secData && secData.rates) {
            if (secData.rates.INR) usdToInr = Number(secData.rates.INR);
            if (secData.rates.XAU && secData.rates.XAU > 0) {
              const xauVal = Number(secData.rates.XAU);
              goldUsdPerOz = xauVal < 1 ? 1 / xauVal : xauVal;
            }
            if (secData.rates.XAG && secData.rates.XAG > 0) {
              const xagVal = Number(secData.rates.XAG);
              silverUsdPerOz = xagVal < 1 ? 1 / xagVal : xagVal;
            }
          }
        }
      } catch (e) {
        console.warn('Secondary metal rate API failed:', e);
      }
    }

    // Reject invalid or negative values
    if (goldUsdPerOz <= 0 || silverUsdPerOz <= 0 || usdToInr <= 0) {
      throw new Error('Unable to retrieve valid live market rates from external metal APIs.');
    }

    // 3. Unit Conversion Formula:
    // INR per gram (24K Gold) = (USD per troy ounce * USD to INR) / 31.1034768
    const gold24kPerGram = Number(((goldUsdPerOz * usdToInr) / TROY_OUNCE_IN_GRAMS).toFixed(2));
    const silver999PerGram = Number(((silverUsdPerOz * usdToInr) / TROY_OUNCE_IN_GRAMS).toFixed(2));

    // Transparent Purity Calculations:
    // 22K = 24K Rate * 91.6% (0.916)
    // 18K = 24K Rate * 75.0% (0.750)
    // 14K = 24K Rate * 58.33% (0.5833)
    // Silver 925 = Silver 999 * 92.5% (0.925)
    const gold22kPerGram = Number((gold24kPerGram * 0.916).toFixed(2));
    const gold18kPerGram = Number((gold24kPerGram * 0.750).toFixed(2));
    const gold14kPerGram = Number((gold24kPerGram * 0.5833).toFixed(2));
    const silver925PerGram = Number((silver999PerGram * 0.925).toFixed(2));
    const silverPerKg = Number((silver925PerGram * 1000).toFixed(2));

    return {
      success: true,
      gold_24k_per_gram: gold24kPerGram,
      gold_22k_per_gram: gold22kPerGram,
      gold_18k_per_gram: gold18kPerGram,
      gold_14k_per_gram: gold14kPerGram,
      silver_per_gram: silver925PerGram,
      silver_999_per_gram: silver999PerGram,
      silver_per_kg: silverPerKg,
      exchange_rate_usd_inr: usdToInr,
      gold_usd_per_oz: goldUsdPerOz,
      silver_usd_per_oz: silverUsdPerOz,
      source: 'automatic',
      updated_at: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('Fetch Live Market Rates Error:', err);
    return {
      success: false,
      gold_24k_per_gram: 0,
      gold_22k_per_gram: 0,
      gold_18k_per_gram: 0,
      gold_14k_per_gram: 0,
      silver_per_gram: 0,
      silver_999_per_gram: 0,
      silver_per_kg: 0,
      exchange_rate_usd_inr: 0,
      gold_usd_per_oz: 0,
      silver_usd_per_oz: 0,
      source: 'automatic',
      updated_at: new Date().toISOString(),
      error: err?.message || 'Failed to fetch live metal rates from market source.',
    };
  }
}

/**
 * Fetches live market rates and saves them to central Supabase `metal_rates` table
 */
export async function syncLiveRatesToSupabase(): Promise<MetalRate> {
  const live = await fetchLiveMarketRates();
  if (!live.success) {
    throw new Error(live.error || 'Live rate fetch failed.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const payload: Partial<MetalRate> = {
    rate_date: todayStr,
    gold_24k_per_gram: live.gold_24k_per_gram,
    gold_22k_per_gram: live.gold_22k_per_gram,
    gold_18k_per_gram: live.gold_18k_per_gram,
    gold_14k_per_gram: live.gold_14k_per_gram,
    silver_per_gram: live.silver_per_gram,
    silver_per_kg: live.silver_per_kg,
    source: 'automatic',
    notes: `Live Market Rate (Gold-API $${live.gold_usd_per_oz}/oz, Silver $${live.silver_usd_per_oz}/oz, USD/INR = ₹${live.exchange_rate_usd_inr})`,
  };

  const saved = await dataService.saveMetalRates(payload);
  return saved;
}

/**
 * Saves shop-specific manual override rate to Supabase `metal_rates` table
 */
export async function saveManualShopRatesToSupabase(input: {
  effectiveDate?: string;
  gold24kRate: number;
  silver925Rate: number;
  notes?: string;
}): Promise<MetalRate> {
  const dateStr = input.effectiveDate || new Date().toISOString().split('T')[0];
  const gold24k = Number(input.gold24kRate);
  const silver925 = Number(input.silver925Rate);

  const gold22k = Number((gold24k * 0.916).toFixed(2));
  const gold18k = Number((gold24k * 0.750).toFixed(2));
  const gold14k = Number((gold24k * 0.5833).toFixed(2));
  const silverKg = Number((silver925 * 1000).toFixed(2));

  const payload: Partial<MetalRate> = {
    rate_date: dateStr,
    gold_24k_per_gram: gold24k,
    gold_22k_per_gram: gold22k,
    gold_18k_per_gram: gold18k,
    gold_14k_per_gram: gold14k,
    silver_per_gram: silver925,
    silver_per_kg: silverKg,
    source: 'manual',
    notes: input.notes || 'Shankar Jewellery Shop Selling Rate (Manual Override)',
  };

  const saved = await dataService.saveMetalRates(payload);
  return saved;
}

/**
 * Gets the current active metal rate from central Supabase
 */
export async function fetchCurrentMetalRate(): Promise<MetalRate | null> {
  try {
    const rates = await dataService.getMetalRates();
    if (rates && rates.length > 0) {
      return rates[0];
    }
    // Fallback to local DB cache if network offline
    const localRates = getLocalDb().metalRates;
    return localRates?.[0] || null;
  } catch (e) {
    console.error('Error fetching current metal rate:', e);
    const localRates = getLocalDb().metalRates;
    return localRates?.[0] || null;
  }
}
