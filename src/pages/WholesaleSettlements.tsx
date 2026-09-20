import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { WholesaleSettlement, Customer, BusinessSettings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateWholesaleSettlementPDF, buildWholesaleSettlementPDFDoc } from '@/lib/pdfGenerator';
import { sharePdfDocument } from '@/lib/pdfSharing';
import { openWhatsAppClickToChat, buildWhatsAppSettlementMessage } from '@/lib/whatsapp';
import { BadgePercent, Plus, Download, MessageSquare, Check, Save, RefreshCw, FileText, Share2 } from 'lucide-react';

export const WholesaleSettlements: React.FC = () => {
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [settlementsList, setSettlementsList] = useState<WholesaleSettlement[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [grossSales, setGrossSales] = useState<number>(0);
  const [valuationCost, setValuationCost] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cData, sData, settingsData] = await Promise.all([
        dataService.getCustomers(),
        dataService.getWholesaleSettlements(),
        dataService.getBusinessSettings(),
      ]);
      setCustomersList(cData.filter((c) => c.customer_type === 'wholesale'));
      setSettlementsList(sData);
      setSettings(settingsData);
      if (cData.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(cData[0].id);
      }
    } catch (e) {
      console.error('Error loading settlements data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'wholesale_settlements' || tableName === 'customers' || tableName === 'general') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const selectedCustomer = customersList.find((c) => c.id === selectedCustomerId);

  const grossProfit = Math.max(0, grossSales - valuationCost);
  const customerShare = selectedCustomer ? (grossProfit * (selectedCustomer.agreed_profit_percent || 40)) / 100 : 0;
  const shopShare = grossProfit - customerShare;
  const netPayableToShop = valuationCost + shopShare;
  const balanceDue = Math.max(0, netPayableToShop - amountPaid);

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const newSettlement = await dataService.createWholesaleSettlement({
      id: ensureValidUUID(),
      settlement_number: `WST-2026-${Math.floor(100 + Math.random() * 900)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      customer_shop: selectedCustomer.shop_name,
      settlement_date: new Date().toISOString().split('T')[0],
      period_start: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      total_gross_sales: grossSales,
      total_cost_valuation: valuationCost,
      gross_profit: grossProfit,
      customer_profit_share: customerShare,
      shop_profit_share: shopShare,
      adjustments_amount: 0,
      net_payable_to_customer: customerShare,
      net_payable_to_shop: netPayableToShop,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status: 'approved',
      created_at: new Date().toISOString(),
    });

    await loadData();
  };

  const handleShareSettlementPDF = async (s: WholesaleSettlement, targetCust?: Customer) => {
    const cust = targetCust || selectedCustomer || undefined;
    const doc = buildWholesaleSettlementPDFDoc(s, cust, settings || undefined);
    await sharePdfDocument({
      doc,
      filename: `Shankar-Jewellery-Settlement-${s.settlement_number}.pdf`,
      title: `Shankar Jewellery Settlement ${s.settlement_number}`,
      text: `Shankar Jewellery Wholesale Settlement Statement ${s.settlement_number}`,
    });
  };

  const handleWhatsApp = (s: WholesaleSettlement) => {
    if (!selectedCustomer) return;
    const msg = buildWhatsAppSettlementMessage(s, settings || undefined);
    openWhatsAppClickToChat(selectedCustomer.whatsapp_number || selectedCustomer.phone, msg);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Profit Settlements"
        subtitle="Generate periodic settlement statements, calculate shop profit vs customer share, and print PDF"
        breadcrumb={['Home', 'Wholesale Settlements']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Settlement Form */}
        <form onSubmit={handleCreateSettlement} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-charcoal-800">
            <BadgePercent className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
              Generate Settlement Statement
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Wholesale Partner *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            >
              {customersList
                .filter((c) => c.customer_type === 'wholesale')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.shop_name || 'Dealer'})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Total Gross Sales (INR)</label>
              <input
                type="number"
                value={grossSales}
                onChange={(e) => setGrossSales(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Valuation Cost (INR)</label>
              <input
                type="number"
                value={valuationCost}
                onChange={(e) => setValuationCost(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Amount Received to Date (INR)</label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 font-bold dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          {/* Breakdown Preview */}
          <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-4 text-xs dark:border-gold-800 dark:bg-gold-950/20 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Profit:</span>
              <strong className="font-mono">{formatCurrency(grossProfit)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Partner Profit Share ({selectedCustomer?.agreed_profit_percent ?? 40}%):</span>
              <strong className="font-mono text-emerald-600">{formatCurrency(customerShare)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shop Net Profit Share:</span>
              <strong className="font-mono text-amber-900 dark:text-gold-300">{formatCurrency(shopShare)}</strong>
            </div>
            <div className="flex justify-between border-t border-gold-200 pt-2 dark:border-gold-800 font-bold text-red-600">
              <span>Outstanding Due:</span>
              <span className="font-serif text-sm">{formatCurrency(balanceDue)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Finalize & Print Settlement Statement
          </button>
        </form>

        {/* History Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            Finalized Profit Settlements Archive
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
                <tr>
                  <th className="p-3">Settlement No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Wholesale Partner</th>
                  <th className="p-3 text-right">Gross Sales</th>
                  <th className="p-3 text-right">Partner Share</th>
                  <th className="p-3 text-right">Shop Profit</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {settlementsList.map((s) => {
                  const targetCust = customersList.find((c) => c.id === s.customer_id) || selectedCustomer;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{s.settlement_number}</td>
                      <td className="p-3 font-mono">{formatDate(s.settlement_date)}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{s.customer_name}</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(s.total_gross_sales)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(s.customer_profit_share)}</td>
                      <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">{formatCurrency(s.shop_profit_share)}</td>
                      <td className="p-3 text-right font-bold text-red-600">{formatCurrency(s.balance_due)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {targetCust && (
                            <>
                              <button
                                onClick={() => handleShareSettlementPDF(s, targetCust)}
                                className="text-gold-600 hover:text-gold-700"
                                title="Share as PDF"
                                aria-label="Share invoice as PDF"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => generateWholesaleSettlementPDF(s, targetCust)}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-300"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        <button
                          onClick={() => handleWhatsApp(s)}
                          className="text-emerald-600 hover:text-emerald-700"
                          title="WhatsApp Statement"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

