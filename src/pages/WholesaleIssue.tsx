import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { WholesaleIssue, WholesaleIssueItem, WholesaleProfitModel, Customer, Product, BusinessSettings, MetalRate } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { generateWholesaleIssuePDF } from '@/lib/pdfGenerator';
import { AddWholesaleCustomerModal } from '@/components/common/AddWholesaleCustomerModal';
import { useTranslation } from '@/lib/i18n';
import { ArrowLeft, Save, Plus, Trash2, HandCoins, UserPlus, Scale, Coins } from 'lucide-react';

export const WholesaleIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [wholesaleCustomers, setWholesaleCustomers] = useState<Customer[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [metalRatesList, setMetalRatesList] = useState<MetalRate[]>([]);

  const [customerId, setCustomerId] = useState<string>(searchParams.get('customerId') || '');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [agreedProfitModel, setAgreedProfitModel] = useState<WholesaleProfitModel>('model_a_profit_percent');
  const [agreedProfitPercent, setAgreedProfitPercent] = useState<number>(40);
  const [goldRatePerGram, setGoldRatePerGram] = useState<number>(6850);
  const [notes, setNotes] = useState('');

  // Modal State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Selected product item states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [issueQty, setIssueQty] = useState<number>(10);
  const [itemGrossWeight, setItemGrossWeight] = useState<number>(3.680);
  const [itemDeductionWeight, setItemDeductionWeight] = useState<number>(1.000);

  // Payment Settlement initial inputs
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [gold916PaidWeight, setGold916PaidWeight] = useState<number>(0);
  const [gold916Rate, setGold916Rate] = useState<number>(6850);

  const [issueItems, setIssueItems] = useState<WholesaleIssueItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cData, pData, sData, ratesData] = await Promise.all([
          dataService.getCustomers(),
          dataService.getProducts(),
          dataService.getBusinessSettings(),
          dataService.getMetalRates(),
        ]);
        const wCusts = cData.filter((c: Customer) => c.customer_type === 'wholesale');
        setWholesaleCustomers(wCusts);
        setProductsList(pData);
        setSettings(sData);
        setMetalRatesList(ratesData);
        if (ratesData?.[0]?.gold_22k_per_gram) {
          setGold916Rate(ratesData[0].gold_22k_per_gram);
        }
        if (wCusts.length > 0 && !customerId) {
          setCustomerId(wCusts[0].id);
        }
        if (pData.length > 0 && !selectedProductId) {
          setSelectedProductId(pData[0].id);
        }
      } catch (e) {
        console.error('Error loading wholesale issue data:', e);
      }
    };
    loadData();
  }, []);

  // Wholesale Touch States
  const [agreedCustomerTouch, setAgreedCustomerTouch] = useState<number>(50);
  const [itemActualTouch, setItemActualTouch] = useState<number>(40);
  const [itemProfitTouch, setItemProfitTouch] = useState<number>(10);
  const [itemBillingTouch, setItemBillingTouch] = useState<number>(50);

  const selectedCustomer: Customer | undefined = wholesaleCustomers.find((c) => c.id === customerId) || wholesaleCustomers[0];

  // Update touch defaults when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      const custTouch = selectedCustomer.agreed_customer_touch ?? selectedCustomer.agreed_profit_percent ?? 50;
      setAgreedCustomerTouch(custTouch);

      const prod = productsList.find((p) => p.id === selectedProductId);
      const actTouch = prod?.actual_touch ?? selectedCustomer.default_actual_touch ?? 40;
      setItemActualTouch(actTouch);

      const profit = Number((custTouch - actTouch).toFixed(2));
      setItemProfitTouch(profit);
      setItemBillingTouch(Number((actTouch + profit).toFixed(2)));
    }
  }, [customerId, selectedCustomer]);

  // Update item gross weight & actual touch default when selected product or qty changes
  useEffect(() => {
    const prod = productsList.find((p) => p.id === selectedProductId);
    if (prod) {
      setItemGrossWeight(Number((prod.gross_weight_g * issueQty).toFixed(3)));
      setItemDeductionWeight(Number(((prod.deduction_weight_g || 0) * issueQty).toFixed(3)));
      const actTouch = prod.actual_touch ?? 40;
      setItemActualTouch(actTouch);

      const profit = Number((agreedCustomerTouch - actTouch).toFixed(2));
      setItemProfitTouch(profit);
      setItemBillingTouch(Number((actTouch + profit).toFixed(2)));
    }
  }, [selectedProductId, issueQty, productsList, agreedCustomerTouch]);

  // Touch Handlers with Real-time Sync & Manual Override
  const handleActualTouchChange = (actVal: number) => {
    setItemActualTouch(actVal);
    const profit = Number((agreedCustomerTouch - actVal).toFixed(2));
    setItemProfitTouch(profit);
    setItemBillingTouch(Number((actVal + profit).toFixed(2)));
  };

  const handleProfitTouchChange = (profitVal: number) => {
    setItemProfitTouch(profitVal);
    setItemBillingTouch(Number((itemActualTouch + profitVal).toFixed(2)));
  };

  const handleBillingTouchChange = (billingVal: number) => {
    setItemBillingTouch(billingVal);
    const profit = Number((billingVal - itemActualTouch).toFixed(2));
    setItemProfitTouch(profit);
  };

  // Calculations for current item form
  const itemNetWeight = Math.max(0, Number((itemGrossWeight - itemDeductionWeight).toFixed(3)));
  const itemFinalTouch = itemBillingTouch;
  const itemFineGold = Number(((itemNetWeight * itemFinalTouch) / 100).toFixed(3));
  const itemValuation = Number((itemFineGold * goldRatePerGram).toFixed(2));

  const handleAddItem = () => {
    const prod = productsList.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const availQty = prod.quantity ?? 0;
    const existingIssued = issueItems.filter((i) => i.product_id === prod.id).reduce((sum, i) => sum + i.quantity_issued, 0);

    if (availQty <= 0) {
      alert(`Product "${prod.name}" is currently out of stock.`);
      return;
    }

    if (existingIssued + issueQty > availQty) {
      alert(`Cannot issue ${issueQty} Pcs. Available stock for "${prod.name}" is only ${availQty} Pcs.`);
      return;
    }

    const newItem: WholesaleIssueItem = {
      id: `witem-${Date.now()}-${Math.random()}`,
      product_id: prod.id,
      product_name: prod.name,
      product_photo: prod.primary_photo_url,
      sku: prod.sku,
      category: prod.category_name || 'Nose Rings',
      metal_type: prod.metal_type,
      purity: prod.purity,
      quantity_issued: issueQty,
      gross_weight_g: itemGrossWeight,
      deduction_weight_g: itemDeductionWeight,
      stone_weight_g: Number((prod.stone_weight_g * issueQty).toFixed(3)),
      net_weight_g: itemNetWeight,
      actual_touch: itemActualTouch,
      profit_touch: itemProfitTouch,
      billing_touch: itemFinalTouch,
      fine_gold_g: itemFineGold,
      unit_cost_valuation: Number((itemValuation / issueQty).toFixed(2)),
      total_issue_value: itemValuation,
      quantity_sold: 0,
      quantity_returned: 0,
      quantity_remaining: issueQty,
    };

    setIssueItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setIssueItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Aggregated totals
  const totalItemsIssued = issueItems.reduce((sum, i) => sum + i.quantity_issued, 0);
  const totalGrossWeight = Number(issueItems.reduce((sum, i) => sum + i.gross_weight_g, 0).toFixed(3));
  const totalDeductionWeight = Number(issueItems.reduce((sum, i) => sum + i.deduction_weight_g, 0).toFixed(3));
  const totalNetWeight = Number(issueItems.reduce((sum, i) => sum + i.net_weight_g, 0).toFixed(3));
  const totalFineGoldG = Number(issueItems.reduce((sum, i) => sum + i.fine_gold_g, 0).toFixed(3));
  const totalValuationAmount = Number(issueItems.reduce((sum, i) => sum + i.total_issue_value, 0).toFixed(2));

  // Settlement Calculations
  const gold916ValuePaid = Number((gold916PaidWeight * gold916Rate).toFixed(2));
  const totalPaid = cashPaid + gold916ValuePaid;
  const remainingBalance = Math.max(0, Number((totalValuationAmount - totalPaid).toFixed(2)));

  const handleCustomerCreated = (newCust: Customer) => {
    setCustomerId(newCust.id);
    setItemActualTouch(newCust.default_actual_touch ?? 37);
    setItemProfitTouch(newCust.default_profit_touch ?? 10);
    setAgreedProfitPercent(newCust.agreed_customer_touch ?? newCust.agreed_profit_percent ?? 40);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issueItems.length === 0 || !selectedCustomer) return;

    const issueNo = `WI-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const createdIssue = await dataService.createWholesaleIssue({
      id: ensureValidUUID(),
      issue_number: issueNo,
      customer_id: ensureValidUUID(selectedCustomer.id),
      customer_name: selectedCustomer.full_name,
      customer_shop: selectedCustomer.shop_name || 'Dealer',
      issue_date: issueDate,
      expected_return_date: expectedReturnDate,
      total_items_issued: totalItemsIssued,
      total_gross_weight_g: totalGrossWeight,
      total_deduction_weight_g: totalDeductionWeight,
      total_net_weight_g: totalNetWeight,
      total_fine_gold_g: totalFineGoldG,
      gold_rate_per_gram: goldRatePerGram,
      total_cash_value: totalValuationAmount,
      total_valuation_amount: totalValuationAmount,
      agreed_profit_model: agreedProfitModel,
      agreed_profit_percent: agreedProfitPercent,
      cash_paid: cashPaid,
      gold_916_weight_paid_g: gold916PaidWeight,
      gold_916_rate: gold916Rate,
      gold_916_value_paid: gold916ValuePaid,
      remaining_balance: remainingBalance,
      status: remainingBalance === 0 && totalPaid > 0 ? 'settled' : totalPaid > 0 ? 'partially_settled' : 'active',
      items: issueItems,
      notes,
      created_at: new Date().toISOString(),
    });

    generateWholesaleIssuePDF(createdIssue, selectedCustomer, settings || undefined);
    navigate(`/wholesale-issues/${createdIssue.id}`);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('wholesale_issues') || "Custom Touch Wholesale Consignment Issue"}
        subtitle="Issue gold/silver nose rings and ear rings with exact melting touch & profit touch billing"
        breadcrumb={['Home', 'Wholesale Issues', 'New Issue']}
        actionBtn={
          <button
            onClick={() => navigate('/wholesale-customers')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6 max-w-5xl mx-auto">
        {/* Customer Header Bar */}
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-charcoal-800 border border-slate-100 dark:border-charcoal-700 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Wholesale Partner *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-gold-600 hover:text-gold-700 dark:text-gold-400"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  + Add Wholesale Partner
                </button>
              </div>

              <div className="flex items-center gap-3">
                {selectedCustomer?.photo_url ? (
                  <img
                    src={selectedCustomer.photo_url}
                    alt={selectedCustomer.full_name}
                    className="h-10 w-10 rounded-full object-cover border-2 border-gold-400 shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 font-serif font-bold text-charcoal-950">
                    {selectedCustomer?.full_name?.charAt(0) || 'P'}
                  </div>
                )}

                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100 font-bold"
                >
                  {wholesaleCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.shop_name || 'Dealer'}) • {c.phone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-2 rounded-xl bg-gold-50/80 p-3 border border-gold-200 text-xs dark:bg-gold-950/40 dark:border-gold-800/40">
                <div className="text-center px-2">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Agreed Touch</span>
                  <span className="font-mono font-bold text-amber-900 dark:text-gold-300 text-sm">
                    {agreedCustomerTouch}%
                  </span>
                </div>
                <div className="text-center px-2 border-l border-gold-200 dark:border-gold-800">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Actual Touch</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {itemActualTouch}%
                  </span>
                </div>
                <div className="text-center px-2 border-l border-gold-200 dark:border-gold-800">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Profit Touch</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    +{itemProfitTouch}%
                  </span>
                </div>
                <div className="text-center px-2 border-l border-gold-200 dark:border-gold-800">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Billing Touch</span>
                  <span className="font-mono font-bold text-gold-600 text-sm">
                    {itemBillingTouch}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-charcoal-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Expected Reconciliation Date</label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Today Gold Rate (₹/g) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={goldRatePerGram}
                onChange={(e) => setGoldRatePerGram(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100 font-bold font-mono"
              />
            </div>
          </div>
        </div>

        {/* Item Entry Section - Touch Calculation Box */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-gold-600" /> Item Touch & Weight Calculation Input
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              Fine Gold = Net Wt × Billing Touch / 100
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Jewellery Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
              >
                {productsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) • Actual Touch: {p.actual_touch || 40}% • Gross: {formatWeight(p.gross_weight_g)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Quantity (Pcs)</label>
              <input
                type="number"
                min="1"
                value={issueQty}
                onChange={(e) => setIssueQty(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Gross Weight (g)</label>
              <input
                type="number"
                step="0.001"
                value={itemGrossWeight}
                onChange={(e) => setItemGrossWeight(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                Less Cardboard Deduction (g)
              </label>
              <input
                type="number"
                step="0.001"
                value={itemDeductionWeight}
                onChange={(e) => setItemDeductionWeight(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono text-red-600 dark:text-red-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Net Weight (g)</label>
              <input
                type="number"
                readOnly
                value={itemNetWeight}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs text-charcoal-900 dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                Actual Touch (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={itemActualTouch}
                onChange={(e) => handleActualTouchChange(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                Profit Touch (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={itemProfitTouch}
                onChange={(e) => handleProfitTouchChange(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                Billing Touch (%) [Override]
              </label>
              <input
                type="number"
                step="0.1"
                value={itemBillingTouch}
                onChange={(e) => handleBillingTouchChange(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gold-400 p-2 text-xs text-amber-950 bg-gold-50/50 focus:border-gold-600 focus:outline-none dark:border-gold-600 dark:bg-gold-950/40 dark:text-gold-300 font-mono font-bold"
              />
            </div>
          </div>

          {/* Form Auto-calculated Results Bar */}
          <div className="flex flex-wrap items-center justify-between rounded-xl bg-white p-3 border border-gold-300 dark:bg-charcoal-900 dark:border-gold-800 text-xs gap-3">
            <div>
              <span className="text-slate-500">Billing Touch: </span>
              <strong className="font-mono text-sm text-gold-600 dark:text-gold-400">{itemBillingTouch}%</strong>
              <span className="text-[10px] text-slate-400 ml-1">({itemActualTouch}% Actual + {itemProfitTouch}% Profit)</span>
            </div>

            <div>
              <span className="text-slate-500">Fine Gold: </span>
              <strong className="font-mono text-sm text-amber-900 dark:text-gold-300">{itemFineGold} g</strong>
            </div>

            <div>
              <span className="text-slate-500">Valuation: </span>
              <strong className="font-serif text-sm font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(itemValuation)}</strong>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 shrink-0"
            >
              <Plus className="h-4 w-4" /> Add Item to Voucher
            </button>
          </div>
        </div>

        {/* Issued Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-charcoal-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Gross Wt</th>
                <th className="p-3 text-right">Cardboard</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-right">Actual Touch</th>
                <th className="p-3 text-right">Profit Touch</th>
                <th className="p-3 text-right">Billing Touch</th>
                <th className="p-3 text-right">Fine Gold (g)</th>
                <th className="p-3 text-right">Issue Value</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {issueItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400">
                    No consignment items added. Configure touch parameters above and click "+ Add Item to Voucher".
                  </td>
                </tr>
              ) : (
                issueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                      {item.product_name}
                      <span className="block font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                    </td>
                    <td className="p-3 text-right font-bold">{item.quantity_issued} Pcs</td>
                    <td className="p-3 text-right font-mono">{formatWeight(item.gross_weight_g)}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{formatWeight(item.deduction_weight_g)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatWeight(item.net_weight_g)}</td>
                    <td className="p-3 text-right font-mono">{item.actual_touch}%</td>
                    <td className="p-3 text-right font-mono text-emerald-600">+{item.profit_touch}%</td>
                    <td className="p-3 text-right font-mono font-bold text-gold-600">{item.billing_touch}%</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                      {item.fine_gold_g.toFixed(3)} g
                    </td>
                    <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">
                      {formatCurrency(item.total_issue_value)}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Issue Aggregated Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-gold-50/50 p-4 dark:bg-gold-950/20 border border-gold-200 dark:border-gold-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Items & Gross Wt</span>
            <p className="font-mono font-bold text-charcoal-900 dark:text-slate-100 mt-1">
              {totalItemsIssued} Pcs • {formatWeight(totalGrossWeight)}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Net Weight</span>
            <p className="font-mono font-bold text-amber-900 dark:text-gold-300 mt-1">
              {formatWeight(totalNetWeight)}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Fine Gold Equivalent</span>
            <p className="font-mono font-bold text-gold-600 text-sm mt-0.5">
              {totalFineGoldG.toFixed(3)} g
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Consignment Value</span>
            <p className="font-serif text-lg font-bold text-amber-900 dark:text-gold-300 mt-0.5">
              {formatCurrency(totalValuationAmount)}
            </p>
          </div>
        </div>

        {/* Settlement / Initial Payment Section */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-charcoal-800 dark:bg-charcoal-800/50 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-emerald-600" /> Initial Payment / Settlement Received (Optional)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Cash Paid (INR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashPaid}
                onChange={(e) => setCashPaid(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pure 916 Gold Received (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={gold916PaidWeight}
                onChange={(e) => setGold916PaidWeight(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100 font-mono font-bold text-amber-800 dark:text-gold-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pure 916 Rate per Gram (INR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={gold916Rate}
                onChange={(e) => setGold916Rate(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center pt-3 border-t border-slate-200 dark:border-charcoal-700 text-xs">
            <span className="text-slate-500">
              916 Gold Value: <strong className="font-mono text-amber-900 dark:text-gold-300">{formatCurrency(gold916ValuePaid)}</strong>
            </span>
            <span className="text-slate-500">
              Total Payment Received: <strong className="font-serif text-emerald-600 font-bold">{formatCurrency(totalPaid)}</strong>
            </span>
            <span className="text-slate-700 dark:text-slate-200 font-bold">
              Remaining Due Balance: <strong className="font-serif text-red-600 text-sm">{formatCurrency(remainingBalance)}</strong>
            </span>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-charcoal-800">
          <button
            type="submit"
            disabled={issueItems.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-8 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
          >
            <HandCoins className="h-4 w-4" /> Save Wholesale Touch Issue & Generate PDF
          </button>
        </div>
      </form>

      {/* Add Partner Modal */}
      <AddWholesaleCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerAdded={handleCustomerCreated}
      />
    </div>
  );
};
