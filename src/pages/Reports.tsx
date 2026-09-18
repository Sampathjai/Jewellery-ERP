import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { MetalBadge } from '@/components/common/MetalBadge';
import { RetailInvoice, Purchase, WholesaleIssue, WholesalePayment, Expense, Product, Customer } from '@/types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Calendar,
  Filter,
  Coins,
  Truck,
  Receipt,
  Scale,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export type DateFilterType =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'fy_2025_26'
  | 'fy_2024_25'
  | 'custom';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<string>('overview');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [rawInvoices, setRawInvoices] = useState<RetailInvoice[]>([]);
  const [rawPurchases, setRawPurchases] = useState<Purchase[]>([]);
  const [rawWholesaleIssues, setRawWholesaleIssues] = useState<WholesaleIssue[]>([]);
  const [rawWholesalePayments, setRawWholesalePayments] = useState<WholesalePayment[]>([]);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invs, purchs, issues, payms, exps, prods, custs] = await Promise.all([
        dataService.getRetailInvoices(),
        dataService.getPurchases(),
        dataService.getWholesaleIssues(),
        dataService.getWholesalePayments(),
        dataService.getExpenses(),
        dataService.getProducts(),
        dataService.getCustomers(),
      ]);
      setRawInvoices(invs);
      setRawPurchases(purchs);
      setRawWholesaleIssues(issues);
      setRawWholesalePayments(payms);
      setRawExpenses(exps);
      setProducts(prods);
      setCustomers(custs);
    } catch (e) {
      console.error('Failed to load live reports data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = syncEngine.subscribeDataChange(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  const wholesaleCustomers = customers.filter((c) => c.customer_type === 'wholesale');

  // Date Filtering Helper
  const isDateInRange = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'this_week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return itemDate >= weekAgo && itemDate <= now;
    }
    if (dateFilter === 'this_month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
    }
    if (dateFilter === 'this_year') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'fy_2025_26') {
      const start = new Date('2025-04-01T00:00:00');
      const end = new Date('2026-03-31T23:59:59');
      return itemDate >= start && itemDate <= end;
    }
    if (dateFilter === 'fy_2024_25') {
      const start = new Date('2024-04-01T00:00:00');
      const end = new Date('2025-03-31T23:59:59');
      return itemDate >= start && itemDate <= end;
    }
    if (dateFilter === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
      return itemDate >= start && itemDate <= end;
    }
    return true;
  };

  // Filtered Datasets
  const retailInvoices = rawInvoices.filter((i) => isDateInRange(i.invoice_date));
  const purchases = rawPurchases.filter((p) => isDateInRange(p.purchase_date));
  const wholesaleIssues = rawWholesaleIssues.filter((w) => isDateInRange(w.issue_date));
  const wholesalePayments = rawWholesalePayments.filter((p) => isDateInRange(p.payment_date));
  const expenses = rawExpenses.filter((e) => isDateInRange(e.expense_date));

  // Category Summaries
  const totalRetailSales = retailInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalRetailPaid = retailInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalRetailPending = retailInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  const totalGoldPurchasedWeight = purchases
    .filter((p) => p.metal_type === 'gold')
    .reduce((sum, p) => sum + p.net_weight_g, 0);

  const totalSilverPurchasedWeight = purchases
    .filter((p) => p.metal_type === 'silver')
    .reduce((sum, p) => sum + p.net_weight_g, 0);

  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalPurchasePaid = purchases.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalPurchasePayable = purchases.reduce((sum, p) => sum + p.balance_payable, 0);

  const totalGoldStockWeight = products
    .filter((p) => p.metal_type === 'gold')
    .reduce((sum, p) => sum + p.net_weight_g * p.quantity, 0);

  const totalSilverStockWeight = products
    .filter((p) => p.metal_type === 'silver')
    .reduce((sum, p) => sum + p.net_weight_g * p.quantity, 0);

  const totalGoldStockValue = products
    .filter((p) => p.metal_type === 'gold')
    .reduce((sum, p) => sum + p.retail_price * p.quantity, 0);

  const totalSilverStockValue = products
    .filter((p) => p.metal_type === 'silver')
    .reduce((sum, p) => sum + p.retail_price * p.quantity, 0);

  const totalWholesaleIssuedValuation = wholesaleIssues.reduce((sum, i) => sum + (i.total_valuation_amount || 0), 0);
  const totalWholesalePaymentsReceived = wholesalePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalWholesaleCashReceivable = Math.max(0, totalWholesaleIssuedValuation - totalWholesalePaymentsReceived);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netSalesRevenue = totalRetailSales - totalExpenses;

  // Indian Accounting & Tax Summaries
  const grossTurnover = totalRetailSales + totalWholesalePaymentsReceived;
  const cogsPurchases = totalPurchaseCost;
  const grossProfit = grossTurnover - cogsPurchases;
  const netProfitBeforeTax = grossProfit - totalExpenses;
  const outputGstEstimated = grossTurnover * 0.03; // 3% GST on jewellery sales
  const inputGstEstimated = totalPurchaseCost * 0.03; // 3% Input Tax Credit
  const netGstPayable = Math.max(0, outputGstEstimated - inputGstEstimated);

  // Chart Dataset Generators
  const purchaseMap = new Map<string, { date: string; goldCost: number; silverCost: number; totalCost: number }>();
  purchases.forEach((p) => {
    const d = p.purchase_date;
    const existing = purchaseMap.get(d) || { date: d, goldCost: 0, silverCost: 0, totalCost: 0 };
    if (p.metal_type === 'gold') existing.goldCost += p.total_cost;
    if (p.metal_type === 'silver') existing.silverCost += p.total_cost;
    existing.totalCost += p.total_cost;
    purchaseMap.set(d, existing);
  });
  const purchaseTrendData = Array.from(purchaseMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const purchaseWeightMap = new Map<string, { date: string; goldGrams: number; silverGrams: number }>();
  purchases.forEach((p) => {
    const d = p.purchase_date;
    const existing = purchaseWeightMap.get(d) || { date: d, goldGrams: 0, silverGrams: 0 };
    if (p.metal_type === 'gold') existing.goldGrams += p.net_weight_g;
    if (p.metal_type === 'silver') existing.silverGrams += p.net_weight_g;
    purchaseWeightMap.set(d, existing);
  });
  const purchaseWeightData = Array.from(purchaseWeightMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const salesMap = new Map<string, { date: string; sales: number; invoicesCount: number }>();
  retailInvoices.forEach((inv) => {
    const d = inv.invoice_date;
    const existing = salesMap.get(d) || { date: d, sales: 0, invoicesCount: 0 };
    existing.sales += inv.total_amount || 0;
    existing.invoicesCount += 1;
    salesMap.set(d, existing);
  });
  const salesTrendData = Array.from(salesMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const supplierShareMap = new Map<string, number>();
  purchases.forEach((p) => {
    supplierShareMap.set(p.supplier_name, (supplierShareMap.get(p.supplier_name) || 0) + p.total_cost);
  });
  const supplierShareData = Array.from(supplierShareMap.entries()).map(([name, value]) => ({ name, value }));

  const stockMixData = [
    { name: '22K/24K Gold Stock', weight: totalGoldStockWeight, value: totalGoldStockValue },
    { name: '925 Silver Stock', weight: totalSilverStockWeight, value: totalSilverStockValue },
  ];

  const PIE_COLORS = ['#d4af37', '#94a3b8', '#3b82f6', '#10b981'];

  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = `shankar_jewellery_${reportType}_report.csv`;

    if (reportType === 'tax_accounting') {
      rows.push(['Shankar Jewellery - Indian Financial Year P&L & Tax Audit']);
      rows.push(['Period / Filter', dateFilter]);
      rows.push([]);
      rows.push(['Metric Description', 'Amount (INR)']);
      rows.push(['Gross Retail Turnover', String(totalRetailSales)]);
      rows.push(['Wholesale Settlements Received', String(totalWholesalePaymentsReceived)]);
      rows.push(['Total Gross Revenue', String(grossTurnover)]);
      rows.push(['Cost of Goods (Raw Metal Purchases)', String(cogsPurchases)]);
      rows.push(['Gross Profit', String(grossProfit)]);
      rows.push(['Operating Expenses', String(totalExpenses)]);
      rows.push(['Net Profit Before Tax (NPBT)', String(netProfitBeforeTax)]);
      rows.push([]);
      rows.push(['Estimated Output GST (3%)', String(outputGstEstimated)]);
      rows.push(['Estimated Input GST Credit (3%)', String(inputGstEstimated)]);
      rows.push(['Net GST Payable', String(netGstPayable)]);
    } else if (reportType === 'sales') {
      rows.push(['Invoice Number', 'Customer Name', 'Date', 'Gross Wt (g)', 'Net Wt (g)', 'Grand Total (INR)']);
      retailInvoices.forEach((inv) => {
        const gross = inv.items?.reduce((sum, item) => sum + (item.gross_weight_g || 0), 0) || 0;
        const net = inv.items?.reduce((sum, item) => sum + (item.net_weight_g || 0), 0) || 0;
        rows.push([
          inv.invoice_number,
          inv.customer_name || 'Walk-in Customer',
          new Date(inv.invoice_date).toLocaleDateString('en-IN'),
          String(gross),
          String(net),
          String(inv.total_amount || 0),
        ]);
      });
    } else if (reportType === 'purchases') {
      rows.push(['Purchase No', 'Date', 'Supplier Name', 'Bill No', 'Metal', 'Purity', 'Net Wt (g)', 'Total Cost (INR)', 'Paid (INR)', 'Balance (INR)']);
      purchases.forEach((p) => {
        rows.push([
          p.purchase_number,
          p.purchase_date,
          p.supplier_name,
          p.supplier_invoice_number,
          p.metal_type,
          p.purity,
          String(p.net_weight_g),
          String(p.total_cost),
          String(p.amount_paid),
          String(p.balance_payable),
        ]);
      });
    } else if (reportType === 'inventory') {
      rows.push(['SKU', 'Product Name', 'Metal', 'Purity', 'Stock Qty', 'Net Wt / Pc (g)', 'Total Weight (g)', 'Valuation (INR)']);
      products.forEach((p) => {
        rows.push([
          p.sku,
          p.name,
          p.metal_type,
          p.purity,
          String(p.quantity),
          String(p.net_weight_g),
          String(p.net_weight_g * p.quantity),
          String(p.retail_price * p.quantity),
        ]);
      });
    } else if (reportType === 'wholesale_pnl') {
      rows.push(['Customer Name', 'Shop / Firm', 'Phone', 'Agreed Customer Touch (%)', 'Total Issued (INR)', 'Total Paid (INR)', 'Outstanding (INR)']);
      wholesaleCustomers.forEach((c) => {
        const cIssues = wholesaleIssues.filter((i) => i.customer_id === c.id);
        const cPay = wholesalePayments.filter((p) => p.customer_id === c.id);
        const issued = cIssues.reduce((sum, i) => sum + (i.total_valuation_amount || 0), 0);
        const paid = cPay.reduce((sum, p) => sum + (p.amount || 0), 0);
        rows.push([
          c.full_name,
          c.shop_name || 'N/A',
          c.phone,
          String(c.agreed_customer_touch ?? c.agreed_profit_percent ?? 40),
          String(issued),
          String(paid),
          String(Math.max(0, issued - paid)),
        ]);
      });
    } else if (reportType === 'expenses') {
      rows.push(['Category', 'Vendor / Description', 'Date', 'Payment Mode', 'Amount (INR)']);
      expenses.forEach((exp) => {
        rows.push([
          exp.category,
          exp.vendor_name || exp.notes || 'General Expense',
          new Date(exp.expense_date).toLocaleDateString('en-IN'),
          exp.payment_mode || 'Cash',
          String(exp.amount),
        ]);
      });
    }

    const csvString = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvString);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Income Tax Analytics"
        subtitle="Comprehensive financial, sales, raw metal purchases, Indian Financial Year P&L, GST audit, and stock valuation reports"
        breadcrumb={['Home', 'Reports']}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV / Excel
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Printer className="h-4 w-4" /> Print Report
            </button>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gold-600" />
          <span className="font-bold text-charcoal-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Analytics Horizon Filter:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'fy_2025_26', label: 'FY 2025-26 (Apr-Mar)' },
            { id: 'fy_2024_25', label: 'FY 2024-25 (Apr-Mar)' },
            { id: 'custom', label: 'Custom Range' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as DateFilterType)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                dateFilter === f.id
                  ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Retail Sales</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
            {formatCurrency(totalRetailSales)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">{retailInvoices.length} Invoices Filtered</p>
        </div>

        <div className="rounded-2xl border border-gold-300 bg-gold-50/50 p-5 dark:border-gold-800 dark:bg-gold-950/30">
          <div className="flex items-center gap-2 text-amber-900 dark:text-gold-300 mb-1">
            <Truck className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Purchases Cost</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-amber-900 dark:text-gold-300">
            {formatCurrency(totalPurchaseCost)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
            Gold: {formatWeight(totalGoldPurchasedWeight)} | Silver: {formatWeight(totalSilverPurchasedWeight)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Wholesale Receivables</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
            {formatCurrency(totalWholesaleCashReceivable)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Unsettled dealer balance</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Net Sales Revenue</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(netSalesRevenue)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Sales minus expenses ({formatCurrency(totalExpenses)})</p>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-charcoal-800 overflow-x-auto">
        {[
          { id: 'overview', label: 'Executive Analytics & Charts' },
          { id: 'tax_accounting', label: 'Tax & Accounting (FY P&L & GST)' },
          { id: 'purchases', label: 'Gold & Silver Purchases' },
          { id: 'sales', label: 'Retail Sales' },
          { id: 'inventory', label: 'Stock Valuation Audit' },
          { id: 'wholesale_pnl', label: 'Wholesale Receivables' },
          { id: 'expenses', label: 'Operating Expenses' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              reportType === tab.id
                ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tax & Accounting P&L Report Tab */}
      {reportType === 'tax_accounting' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gold-300/80 bg-white p-6 dark:border-gold-800/40 dark:bg-charcoal-900 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-charcoal-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 font-bold">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    Indian Financial Year Profit & Loss (P&L) Audit Statement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated for selected period horizon ({dateFilter}) • Income Tax & GST Compliance Ready
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                FY Accounting Ready
              </span>
            </div>

            {/* Income & Expenditure Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Section */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/30">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-slate-200 pb-2 dark:border-charcoal-700">
                  1. Business Income & Revenue
                </h4>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-300">Retail Sales Turnover (GST Bills):</span>
                  <strong className="font-mono text-charcoal-900 dark:text-slate-100">{formatCurrency(totalRetailSales)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-300">Wholesale Consignment Realizations:</span>
                  <strong className="font-mono text-charcoal-900 dark:text-slate-100">{formatCurrency(totalWholesalePaymentsReceived)}</strong>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-200 font-bold text-emerald-800 dark:text-emerald-300 dark:border-charcoal-700">
                  <span>Gross Business Revenue (A):</span>
                  <span className="font-mono text-sm">{formatCurrency(grossTurnover)}</span>
                </div>
              </div>

              {/* Expenses & Cost Section */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/30">
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-700 dark:text-red-400 border-b border-slate-200 pb-2 dark:border-charcoal-700">
                  2. Cost of Goods & Operating Outlays
                </h4>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-300">Raw Gold/Silver Stock Purchases:</span>
                  <strong className="font-mono text-charcoal-900 dark:text-slate-100">{formatCurrency(cogsPurchases)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-300">Operating Expenses (Salary, Rent, Power):</span>
                  <strong className="font-mono text-charcoal-900 dark:text-slate-100">{formatCurrency(totalExpenses)}</strong>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-200 font-bold text-red-800 dark:text-red-300 dark:border-charcoal-700">
                  <span>Total Operational Cost (B):</span>
                  <span className="font-mono text-sm">{formatCurrency(cogsPurchases + totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Profit Summary & GST Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-gold-400 bg-gold-50/60 p-4 dark:border-gold-800 dark:bg-gold-950/40">
                <span className="text-[11px] font-bold text-amber-900 dark:text-gold-300 uppercase">Gross Profit (Margin)</span>
                <h4 className="font-serif text-xl font-bold text-amber-950 dark:text-gold-200 mt-1">
                  {formatCurrency(grossProfit)}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Gross Turnover minus Stock Purchases</p>
              </div>

              <div className="rounded-xl border border-emerald-400 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase">Net Profit Before Tax (NPBT)</span>
                <h4 className="font-serif text-xl font-bold text-emerald-950 dark:text-emerald-200 mt-1">
                  {formatCurrency(netProfitBeforeTax)}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Gross Profit minus Operating Expenses</p>
              </div>

              <div className="rounded-xl border border-blue-400 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-950/40">
                <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase">Net GST Payable (3%)</span>
                <h4 className="font-serif text-xl font-bold text-blue-950 dark:text-blue-200 mt-1">
                  {formatCurrency(netGstPayable)}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Output GST ({formatCurrency(outputGstEstimated)}) - Input GST ({formatCurrency(inputGstEstimated)})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Analytics Charts Dashboard */}
      {reportType === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Trend Chart (INR) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                    Raw Metal Purchase Trend (₹ Total Cost)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gold and Silver refinery purchase entries in INR
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                {purchaseTrendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No purchase entries recorded in selected date range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={purchaseTrendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" stroke="#888888" fontSize={10} />
                      <YAxis stroke="#888888" fontSize={10} tickFormatter={(val) => `₹${val / 1000}k`} />
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Bar dataKey="goldCost" fill="#d4af37" name="Gold Purchase (₹)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="silverCost" fill="#94a3b8" name="Silver Purchase (₹)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Retail Sales Trend Chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                    Retail Counter Billing Trend (₹ Revenue)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Daily showroom billing revenue
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                {salesTrendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No retail sales invoices recorded in selected date range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" stroke="#888888" fontSize={10} />
                      <YAxis stroke="#888888" fontSize={10} tickFormatter={(val) => `₹${val / 1000}k`} />
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Area type="monotone" dataKey="sales" fill="#10b981" stroke="#059669" name="Retail Sales (₹)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Weight Breakdown Chart (Grams) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mb-1">
                Purchased Weight Breakdown (g)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Net weight of raw Gold and Silver bullion acquired
              </p>
              <div className="h-64 w-full">
                {purchaseWeightData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No purchase weight records.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={purchaseWeightData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" stroke="#888888" fontSize={10} />
                      <YAxis stroke="#888888" fontSize={10} tickFormatter={(val) => `${val}g`} />
                      <Tooltip formatter={(val: any) => formatWeight(Number(val))} />
                      <Legend />
                      <Bar dataKey="goldGrams" fill="#d4af37" name="Gold Purchased (g)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="silverGrams" fill="#64748b" name="Silver Purchased (g)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Current Showroom Stock Weight Distribution */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mb-1">
                Current Inventory Weight & Value Mix
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Gold vs Silver available stock ratio in showroom
              </p>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockMixData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {stockMixData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-xs mt-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-amber-500" />
                  <span>Gold: <strong>{formatWeight(totalGoldStockWeight)}</strong> ({formatCurrency(totalGoldStockValue)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-slate-400" />
                  <span>Silver: <strong>{formatWeight(totalSilverStockWeight)}</strong> ({formatCurrency(totalSilverStockValue)})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchases Report Master Table */}
      {reportType === 'purchases' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Gold & Silver Purchases Ledger
            </h3>
            <span className="text-xs font-mono font-bold text-amber-900 dark:text-gold-300">
              Total Cost: {formatCurrency(totalPurchaseCost)}
            </span>
          </div>

          {purchases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No purchases recorded in the selected date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">Purchase No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Bill No</th>
                    <th className="p-3">Metal / Purity</th>
                    <th className="p-3 text-right">Net Wt</th>
                    <th className="p-3 text-right">Rate / g</th>
                    <th className="p-3 text-right">Total Cost</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-gold-600">{p.purchase_number}</td>
                      <td className="p-3 font-mono text-slate-500">{formatDate(p.purchase_date)}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{p.supplier_name}</td>
                      <td className="p-3 font-mono text-slate-500 font-semibold">#{p.supplier_invoice_number}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MetalBadge metal={p.metal_type} />
                          <span className="text-[10px] font-bold uppercase">{p.purity}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                        {formatWeight(p.net_weight_g)}
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.purchase_rate_per_gram)}</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">
                        {formatCurrency(p.total_cost)}
                      </td>
                      <td className="p-3 text-right font-serif font-semibold text-emerald-600">
                        {formatCurrency(p.amount_paid)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-red-600">
                        {formatCurrency(p.balance_payable)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Retail Sales Master Table */}
      {reportType === 'sales' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
            Retail Sales Invoices Master
          </h3>
          {retailInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No retail sales invoices recorded in selected date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Items</th>
                    <th className="p-3 text-right">Gross Wt</th>
                    <th className="p-3 text-right">Net Wt</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {retailInvoices.map((inv) => {
                    const gross = inv.items?.reduce((sum, item) => sum + (item.gross_weight_g || 0), 0) || 0;
                    const net = inv.items?.reduce((sum, item) => sum + (item.net_weight_g || 0), 0) || 0;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                        <td className="p-3 font-mono font-bold text-gold-600">{inv.invoice_number}</td>
                        <td className="p-3 font-semibold text-charcoal-900 dark:text-slate-100">
                          {inv.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="p-3 text-slate-500">{formatDate(inv.invoice_date)}</td>
                        <td className="p-3 text-right font-semibold">{inv.items?.length || 0} Pcs</td>
                        <td className="p-3 text-right font-mono">{formatWeight(gross)}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatWeight(net)}</td>
                        <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">
                          {formatCurrency(inv.total_amount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Valuation Master Table */}
      {reportType === 'inventory' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
            Current Stock Valuation Audit
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Metal / Purity</th>
                  <th className="p-3 text-right">Net Wt / Pc</th>
                  <th className="p-3 text-right">Stock Qty</th>
                  <th className="p-3 text-right">Total Weight</th>
                  <th className="p-3 text-right">Retail Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">{p.sku}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{p.name}</td>
                    <td className="p-3">
                      <MetalBadge metal={p.metal_type} />
                    </td>
                    <td className="p-3 text-right font-mono">{formatWeight(p.net_weight_g)}</td>
                    <td className="p-3 text-right font-bold">{p.quantity} Pcs</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                      {formatWeight(p.net_weight_g * p.quantity)}
                    </td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(p.retail_price * p.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wholesale Balances Ledger */}
      {reportType === 'wholesale_pnl' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
            Wholesale Ledger Balances & Receivables
          </h3>
          {wholesaleCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No wholesale dealers registered in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">Dealer Name</th>
                    <th className="p-3">Shop / Firm</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Agreed Customer Touch (%)</th>
                    <th className="p-3 text-right">Total Issued</th>
                    <th className="p-3 text-right">Total Paid</th>
                    <th className="p-3 text-right">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {wholesaleCustomers.map((c) => {
                    const cIssues = wholesaleIssues.filter((i) => i.customer_id === c.id);
                    const cPay = wholesalePayments.filter((p) => p.customer_id === c.id);
                    const issued = cIssues.reduce((sum, i) => sum + (i.total_valuation_amount || 0), 0);
                    const paid = cPay.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const balance = Math.max(0, issued - paid);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                        <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{c.full_name}</td>
                        <td className="p-3 text-slate-500">{c.shop_name || '—'}</td>
                        <td className="p-3 font-mono">{c.phone}</td>
                        <td className="p-3 text-right font-semibold">
                          {c.agreed_customer_touch ?? c.agreed_profit_percent ?? 40}%
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">{formatCurrency(issued)}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">{formatCurrency(paid)}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                          {formatCurrency(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expenses Log */}
      {reportType === 'expenses' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
            Showroom Operating Expenses Log
          </h3>
          {expenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No operational expenses recorded in selected date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Vendor / Description</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100 capitalize">{exp.category}</td>
                      <td className="p-3 text-slate-500">{exp.vendor_name || exp.notes || 'General Expense'}</td>
                      <td className="p-3 font-mono">{formatDate(exp.expense_date)}</td>
                      <td className="p-3 capitalize">{exp.payment_mode || 'Cash'}</td>
                      <td className="p-3 text-right font-serif font-bold text-red-600">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
