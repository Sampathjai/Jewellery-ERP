import { WholesaleProfitModel } from '@/types';

export interface WholesaleCalculationResult {
  totalSaleValue: number;
  totalCostValuation: number;
  grossProfit: number;
  customerProfitShare: number;
  shopProfitShare: number;
  netPayableToShop: number; // cost valuation + shop profit share
}

export function calculateWholesaleProfit(
  totalSaleValue: number,
  totalCostValuation: number,
  profitModel: WholesaleProfitModel,
  agreedPercentOrValue: number
): WholesaleCalculationResult {
  const grossProfit = Math.max(0, totalSaleValue - totalCostValuation);

  let customerProfitShare = 0;
  let shopProfitShare = 0;

  switch (profitModel) {
    case 'model_a_profit_percent':
      // Customer gets agreed % of gross profit (e.g., 40%), shop retains remaining (60%)
      customerProfitShare = (grossProfit * agreedPercentOrValue) / 100;
      shopProfitShare = grossProfit - customerProfitShare;
      break;

    case 'model_b_commission':
      // Customer receives fixed commission per sale or percentage of sale value
      customerProfitShare = (totalSaleValue * agreedPercentOrValue) / 100;
      shopProfitShare = Math.max(0, grossProfit - customerProfitShare);
      break;

    case 'model_c_fixed_margin':
      // Fixed margin deduction
      shopProfitShare = agreedPercentOrValue;
      customerProfitShare = Math.max(0, grossProfit - shopProfitShare);
      break;

    case 'model_d_custom_formula':
    default:
      customerProfitShare = (grossProfit * agreedPercentOrValue) / 100;
      shopProfitShare = grossProfit - customerProfitShare;
      break;
  }

  const netPayableToShop = totalCostValuation + shopProfitShare;

  return {
    totalSaleValue,
    totalCostValuation,
    grossProfit,
    customerProfitShare,
    shopProfitShare,
    netPayableToShop,
  };
}

