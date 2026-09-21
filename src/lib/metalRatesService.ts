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
  source: 'chennai_local' | 'manual';
  updated_at: string;
  error?: string;
}

// 1 Troy Ounce = 31.1034768 Grams
const TROY_OUNCE_IN_GRAMS = 31.1034768;

/**
 * Chennai Local Market Duty & Tax Adjustment Factor (Import Duty 6% + AIDC + GST 3% + Chennai Bullion Premium)
 * Converts raw spot rate to published Chennai local jewellery market retail rate.
 */
const CHENNAI_MARKET_LOCAL_PREMIUM_MULTIPLIER = 1.1585;

/**
 * Fetches real-time Chennai Local Market Gold & Silver rates.
 * Incorporates Indian local import tariffs, customs duty, and 3% GST to reflect actual Chennai retail market rates.
 */
export async function fetchLiveMarketRates(): Promise<LiveRateFetchResult> {
  try {
    // 1. Fetch USD to INR Exchange Rate
    let usdToInr = 86.50;
    try {
      const exRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (exRes.ok) {
        const exData = await exRes.json();
        if (exData && exData.rates && exData.rates.INR) {
          usdToInr = Number(exData.rates.INR);
        }
      }
    } catch (e) {
      console.warn('Exchange rate API request failed, using estimate:', e);
    }

    // 2. Fetch Gold (XAU) and Silver (XAG) spot prices in USD/oz
    let goldUsdPerOz = 0;
    let silverUsdPerOz = 0;

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
      console.warn('Gold API primary failed, trying secondary provider:', e);
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

    // Check raw spot data
    if (goldUsdPerOz <= 0 || silverUsdPerOz <= 0 || usdToInr <= 0) {
      throw new Error('Unable to retrieve valid live market rates from metal providers.');
    }

    // 3. Compute Chennai Local Market Gold & Silver Rates (INR/gram)
    // Raw spot conversion = (USD/oz * USD/INR) / 31.1034768
    const rawSpotGoldInrPerGram = (goldUsdPerOz * usdToInr) / TROY_OUNCE_IN_GRAMS;
    const rawSpotSilverInrPerGram = (silverUsdPerOz * usdToInr) / TROY_OUNCE_IN_GRAMS;

    // Apply Chennai local retail market premium factor (Duty + Tax + Local Market Margin)
    const gold24kPerGram = Math.round(rawSpotGoldInrPerGram * CHENNAI_MARKET_LOCAL_PREMIUM_MULTIPLIER);
    const gold22kPerGram = Math.round(gold24kPerGram * 0.916);
    const gold18kPerGram = Math.round(gold24kPerGram * 0.750);
    const gold14kPerGram = Math.round(gold24kPerGram * 0.5833);

    const silver999PerGram = Number((rawSpotSilverInrPerGram * CHENNAI_MARKET_LOCAL_PREMIUM_MULTIPLIER).toFixed(2));
    const silver925PerGram = Number((silver999PerGram * 0.925).toFixed(2));
    const silverPerKg = Math.round(silver925PerGram * 1000);

    // Validation Guard: Ensure reasonable Indian retail market range
    if (gold24kPerGram < 10000 || gold24kPerGram > 40000 || gold22kPerGram < 9000 || gold22kPerGram > 38000) {
      throw new Error(`Fetched rate ₹${gold24kPerGram}/g is outside valid Chennai market bounds.`);
    }

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
      source: 'chennai_local',
      updated_at: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('Fetch Chennai Local Market Rates Error:', err);
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
      source: 'chennai_local',
      updated_at: new Date().toISOString(),
      error: err?.message || 'Failed to fetch Chennai local market rates.',
    };
  }
}

/**
 * Fetches Chennai market rates and saves them to central Supabase `metal_rates` table.
 * On error, preserves last valid stored rate without corrupting database.
 */
export async function syncLiveRatesToSupabase(): Promise<MetalRate> {
  const live = await fetchLiveMarketRates();
  if (!live.success) {
    // Preserve existing rate on failure
    const existing = await fetchCurrentMetalRate();
    if (existing) {
      console.warn('Chennai rate fetch failed; preserving existing valid rate.');
      return existing;
    }
    throw new Error(live.error || 'Chennai local market rate fetch failed.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const payload: Partial<MetalRate> = {
    rate_date: todayStr,
    gold_24k_per_gram: live.gold_24k_per_gram,
    gold_22k_per_gram: live.gold_22k_per_gram,
    gold_18k_per_gram: live.gold_18k_per_gram,
    silver_per_gram: live.silver_per_gram,
    silver_per_kg: live.silver_per_kg,
    source: 'chennai_local',
    notes: `Chennai Local Market Rate (Spot Ref: $${live.gold_usd_per_oz}/oz, USD/INR = ₹${live.exchange_rate_usd_inr})`,
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

  const gold22k = Math.round(gold24k * 0.916);
  const gold18k = Math.round(gold24k * 0.750);
  const silverKg = Math.round(silver925 * 1000);

  const payload: Partial<MetalRate> = {
    rate_date: dateStr,
    gold_24k_per_gram: gold24k,
    gold_22k_per_gram: gold22k,
    gold_18k_per_gram: gold18k,
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
    const localRates = getLocalDb().metalRates;
    return localRates?.[0] || null;
  } catch (e) {
    console.error('Error fetching current metal rate:', e);
    const localRates = getLocalDb().metalRates;
    return localRates?.[0] || null;
  }
}
