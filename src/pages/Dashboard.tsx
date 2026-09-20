import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { useLanguage } from '@/lib/i18n';
import { formatCurrency, formatWeight } from '@/lib/utils';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart,
  TrendingUp,
  Boxes,
  HandCoins,
  RotateCcw,
  BadgePercent,
  Receipt,
  Users,
  DollarSign,
  AlertTriangle,
  Coins,
  Sparkles,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [wholesaleIssuesList, setWholesaleIssuesList] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [wholesaleSettlementsList, setWholesaleSettlementsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cData, pData, rData, wData, eData, sData] = await Promise.all([
        dataService.getCustomers(),
        dataService.getProducts(),
        dataService.getRetailInvoices(),
        dataService.getWholesaleIssues(),
        dataService.getExpenses(),
        dataService.getWholesaleSettlements(),
      ]);
      setCustomersList(cData);
      setProductsList(pData);
      setInvoicesList(rData);
      setWholesaleIssuesList(wData);
      setExpensesList(eData);
      setWholesaleSettlementsList(sData);
    } catch (e) {
      console.error('Error loading live dashboard metrics:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = syncEngine.subscribeDataChange(() => {
      loadDashboardData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadDashboardData]);

  // Aggregate metrics from live Supabase data
  const todaySales = (invoicesList || [])
    .filter((i) => i.invoice_date === new Date().toISOString().split('T')[0])
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const monthSales = (invoicesList || []).reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const totalGoldWeight = (productsList || [])
    .filter((p) => p.metal_type === 'gold')
    .reduce((sum, p) => sum + (p.net_weight_g || 0) * (p.quantity || 1), 0);

  const totalSilverWeight = (productsList || [])
    .filter((p) => p.metal_type === 'silver')
    .reduce((sum, p) => sum + (p.net_weight_g || 0) * (p.quantity || 1), 0);

  const totalStockValue = (productsList || []).reduce((sum, p) => sum + (p.retail_price || 0) * (p.quantity || 1), 0);

  const activeWholesaleCustomers = (customersList || []).filter((c) => c.customer_type === 'wholesale').length;

  const totalWholesaleIssuedItems = (wholesaleIssuesList || [])
    .filter((w) => w.status === 'active')
    .reduce((sum, w) => sum + (w.total_items_issued || 0), 0);

  const totalPendingReturns = (wholesaleIssuesList || [])
    .filter((w) => w.status === 'active')
    .reduce(
      (sum, w) =>
        sum +
        (Array.isArray(w.items) ? w.items.reduce((iSum: number, item: any) => iSum + (item.quantity_remaining || 0), 0) : 0),
      0
    );

  const outstandingWholesaleBalances = (wholesaleSettlementsList || [])
    .filter((s) => s.status !== 'paid')
    .reduce((sum, s) => sum + (s.balance_due || 0), 0);

  const totalExpenses = (expensesList || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // Compute real gross profit from actual database invoices and wholesale settlements
  const retailGrossProfit = (invoicesList || []).reduce((sum, inv) => {
    const invCost = (inv.items || []).reduce((iSum: number, item: any) => iSum + (item.metal_value || 0), 0);
    const profit = Math.max(0, (inv.total_amount || 0) - invCost);
    return sum + profit;
  }, 0);

  const wholesaleGrossProfit = (wholesaleSettlementsList || []).reduce((sum, s) => sum + (s.shop_profit_share || 0), 0);

  const grossProfit = retailGrossProfit + wholesaleGrossProfit;
  const netProfit = Math.max(0, grossProfit - totalExpenses);

  const pendingRetailPayments = (invoicesList || [])
    .filter((i) => i.status !== 'cancelled' && i.status !== 'refunded' && i.payment_status !== 'paid')
    .reduce((sum, i) => {
      const due = i.balance_due !== undefined && i.balance_due !== null
        ? Number(i.balance_due)
        : Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0));
      return sum + Math.max(0, due);
    }, 0);

  const pendingWholesalePayments = (wholesaleSettlementsList || [])
    .filter((s) => s.status !== 'paid')
    .reduce((sum, s) => {
      const due = s.balance_due !== undefined && s.balance_due !== null
        ? Number(s.balance_due)
        : Math.max(0, Number(s.net_payable_to_shop || 0) - Number(s.amount_paid || 0));
      return sum + Math.max(0, due);
    }, 0);

  // Dynamic Stock & Settlement Alerts from Database
  const lowStockProducts = (productsList || []).filter((p) => (p.quantity || 0) <= (p.minimum_stock || 5));
  const overdueWholesaleIssues = (wholesaleIssuesList || []).filter(
    (w) => w.status === 'active' && w.expected_return_date && new Date(w.expected_return_date) < new Date()
  );
  const pendingWholesaleSettlements = (wholesaleSettlementsList || []).filter((s) => (s.balance_due || 0) > 0);

  // Dynamic Chart Data from DB
  const daysOfWeek = [
    { key: 1, labelEn: 'Mon', labelTa: 'திங்கள்' },
    { key: 2, labelEn: 'Tue', labelTa: 'செவ்வாய்' },
    { key: 3, labelEn: 'Wed', labelTa: 'புதன்' },
    { key: 4, labelEn: 'Thu', labelTa: 'வியாழன்' },
    { key: 5, labelEn: 'Fri', labelTa: 'வெள்ளி' },
    { key: 6, labelEn: 'Sat', labelTa: 'சனி' },
    { key: 0, labelEn: 'Sun', labelTa: 'ஞாயிறு' },
  ];

  const dailySalesTrendData = daysOfWeek.map((d) => {
    const retailTotal = (invoicesList || [])
      .filter((i) => {
        const dt = new Date(i.invoice_date);
        return dt.getDay() === d.key;
      })
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);

    const wholesaleTotal = (wholesaleIssuesList || [])
      .filter((w) => {
        const dt = new Date(w.issue_date);
        return dt.getDay() === d.key;
      })
      .reduce((sum, w) => sum + (w.total_valuation_amount || 0), 0);

    return {
      day: language === 'ta' ? d.labelTa : d.labelEn,
      retail: retailTotal,
      wholesale: wholesaleTotal,
    };
  });

  const catCountMap = new Map<string, number>();
  (productsList || []).forEach((p) => {
    const cName = p.category_name || 'Jewellery';
    catCountMap.set(cName, (catCountMap.get(cName) || 0) + (p.quantity || 0));
  });

  const totalProdQty = (productsList || []).reduce((sum, p) => sum + (p.quantity || 0), 0);
  const categoryDistribution = totalProdQty > 0
    ? Array.from(catCountMap.entries()).slice(0, 4).map(([name, qty]) => ({
        name,
        value: Math.round((qty / totalProdQty) * 100),
      }))
    : [];

  const COLORS = ['#d4af37', '#b8860b', '#f59e0b', '#3c3e4a'];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard')}
        subtitle={language === 'ta' ? 'விற்பனை, நகை இருப்பு மற்றும் மொத்த வியாபார நிலவரங்கள்' : 'Live metrics for retail sales, goldsmith inventory, and wholesale credit consignment'}
        actionBtn={
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            {t('new_retail_bill')}
          </button>
        }
      />

      {/* Quick Action Shortcuts */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">
          {t('quick_actions')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <ShoppingCart className="h-4 w-4 text-gold-600 mb-1" />
            {t('new_retail_bill')}
          </button>
          <button
            onClick={() => navigate('/products/add')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <Boxes className="h-4 w-4 text-gold-600 mb-1" />
            {t('add_product')}
          </button>
          <button
            onClick={() => navigate('/customers/add')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <Users className="h-4 w-4 text-gold-600 mb-1" />
            {t('add_customer')}
          </button>
          <button
            onClick={() => navigate('/wholesale-issues/new')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <HandCoins className="h-4 w-4 text-gold-600 mb-1" />
            {t('new_wholesale_issue')}
          </button>
          <button
            onClick={() => navigate('/wholesale-returns')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <RotateCcw className="h-4 w-4 text-gold-600 mb-1" />
            {t('receive_return')}
          </button>
          <button
            onClick={() => navigate('/payments')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <DollarSign className="h-4 w-4 text-gold-600 mb-1" />
            {t('record_payment')}
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <Receipt className="h-4 w-4 text-gold-600 mb-1" />
            {t('add_expense')}
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <TrendingUp className="h-4 w-4 text-gold-600 mb-1" />
            {t('reports_analytics')}
          </button>
        </div>
      </div>

      {/* SECTION 1: RETAIL SALES */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-slate-200/80 pb-2 dark:border-charcoal-800">
          <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gold-600 shrink-0" />
            {t('section_retail_sales')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('subtitle_retail_sales')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title={t('today_retail_sales')}
            value={formatCurrency(todaySales)}
            subtitle={language === 'ta' ? 'கடை ரொக்க விற்பனை' : 'Shop counter billing'}
            icon={ShoppingCart}
            trend={{ value: todaySales > 0 ? 'Live' : '0%', isPositive: true }}
          />
          <StatCard
            title={t('pending_retail_payments')}
            value={formatCurrency(pendingRetailPayments)}
            subtitle={
              pendingRetailPayments > 0
                ? language === 'ta'
                  ? 'கடை வாடிக்கையாளர்களின் சில்லறை பாக்கி'
                  : 'Outstanding customer retail dues'
                : language === 'ta'
                ? 'பாக்கிகள் ஏதுமில்லை'
                : 'No outstanding retail payments'
            }
            icon={DollarSign}
          />
          <StatCard
            title={t('monthly_retail_sales')}
            value={formatCurrency(monthSales)}
            subtitle={language === 'ta' ? 'இந்த மாத மொத்த பில்கள்' : 'Total current month invoice value'}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* SECTION 2: WHOLESALE BUSINESS */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-slate-200/80 pb-2 dark:border-charcoal-800">
          <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100 flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-gold-600 shrink-0" />
            {t('section_wholesale_business')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('subtitle_wholesale_business')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('pending_wholesale_payments')}
            value={formatCurrency(pendingWholesalePayments)}
            subtitle={
              pendingWholesalePayments > 0
                ? language === 'ta'
                  ? 'வரவேண்டிய மொத்த வியாபார பாக்கி'
                  : 'Outstanding wholesale receivables'
                : language === 'ta'
                ? 'பாக்கிகள் ஏதுமில்லை'
                : 'No outstanding wholesale receivables'
            }
            icon={BadgePercent}
          />
          <StatCard
            title={t('active_wholesale_partners')}
            value={`${activeWholesaleCustomers} ${t('pcs')}`}
            subtitle={language === 'ta' ? 'மொத்த வியாபாரக் கணக்குகள்' : 'Credit & consignment accounts'}
            icon={Users}
          />
          <StatCard
            title={t('wholesale_issued_items')}
            value={`${totalWholesaleIssuedItems} ${t('pcs')}`}
            subtitle={language === 'ta' ? 'வியாபாரிகளுக்குக் கொடுத்தவை' : 'Jewellery issued on credit'}
            icon={HandCoins}
          />
          <StatCard
            title={t('pending_returns')}
            value={`${totalPendingReturns} ${t('pcs')}`}
            subtitle={language === 'ta' ? 'வியாபாரிகளிடம் உள்ள மூக்குத்தி/தோடு' : 'Unsold nose rings/ear rings with partners'}
            icon={RotateCcw}
          />
        </div>
      </div>

      {/* SECTION 3: INVENTORY & STOCK */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-slate-200/80 pb-2 dark:border-charcoal-800">
          <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-gold-600 shrink-0" />
            {t('section_inventory_stock')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('subtitle_inventory_stock')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title={t('gold_stock_weight')}
            value={formatWeight(totalGoldWeight)}
            subtitle={language === 'ta' ? 'கடையிலுள்ள 22K/24K தங்கம்' : 'Total net 22K/24K gold in hand'}
            icon={Coins}
          />
          <StatCard
            title={t('silver_stock_weight')}
            value={formatWeight(totalSilverWeight)}
            subtitle={language === 'ta' ? 'கடையிலுள்ள வெள்ளி நகைகள்' : '925 sterling & fine silver'}
            icon={Coins}
          />
          <StatCard
            title={t('stock_valuation')}
            value={formatCurrency(totalStockValue)}
            subtitle={language === 'ta' ? 'கடை நகைகளின் அடக்க மதிப்பு' : 'Showroom stock retail valuation'}
            icon={Boxes}
          />
        </div>
      </div>

      {/* SECTION 4: MONTHLY & FINANCIAL OVERVIEW */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-slate-200/80 pb-2 dark:border-charcoal-800">
          <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gold-600 shrink-0" />
            {t('section_monthly_financial')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('subtitle_monthly_financial')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title={t('total_expenses')}
            value={formatCurrency(totalExpenses)}
            subtitle={language === 'ta' ? 'வாடகை, மின்சாரம், கூலிச் செலவு' : 'Rent, electricity, labour, wages'}
            icon={Receipt}
          />
          <StatCard
            title={t('net_profit')}
            value={formatCurrency(netProfit)}
            subtitle={language === 'ta' ? 'செலவு போக நிகர லாபம்' : 'Gross profit minus shop expenses'}
            icon={Sparkles}
          />
        </div>
      </div>

      {/* SECTION 5: ANALYTICS & CHARTS */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-slate-200/80 pb-2 dark:border-charcoal-800">
          <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gold-600 shrink-0" />
            {t('section_analytics_charts')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('subtitle_analytics_charts')}
          </p>
        </div>

        {/* Dashboard Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Sales Revenue Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                  {language === 'ta' ? 'தினசரி விற்பனை வருவாய் (சில்லறை vs மொத்த விற்பனை)' : 'Daily Sales Revenue (Retail vs Wholesale)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ta' ? 'வாராந்திர விற்பனைப் பகுப்பாய்வு' : 'Weekly sales breakdown in INR'}
                </p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{ backgroundColor: '#1e1f26', borderColor: '#d4af37', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="retail" fill="#d4af37" name={language === 'ta' ? 'சில்லறை விற்பனை' : 'Retail Shop'} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="wholesale" fill="#3c3e4a" name={language === 'ta' ? 'மொத்த விற்பனை' : 'Wholesale Credit'} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution Pie */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              {language === 'ta' ? 'நகை வகைப்பிரிவு (Category)' : 'Product Category Share'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {language === 'ta' ? 'மூக்குத்தி & தோடு பங்கு' : 'Wholesale vs Retail stock mix'}
            </p>

            {categoryDistribution.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-xs text-slate-400">
                No product stock recorded yet.
              </div>
            ) : (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-2">
                  {categoryDistribution.map((c, idx) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                      </div>
                      <span className="font-bold text-charcoal-900 dark:text-slate-100">{c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Business Alerts Banner */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-gold-800/60 dark:bg-gold-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-gold-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 dark:text-gold-300 text-xs">
                {language === 'ta' ? 'கடை எச்சரிக்கைகள் மற்றும் நினைவூட்டல்கள்' : 'System Reminders & Stock Alerts'}
              </h4>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-amber-800 dark:text-gold-400">
                <div>
                  • <strong>{language === 'ta' ? 'குறைந்த இருப்பு எச்சரிக்கை:' : 'Low Stock Alerts:'}</strong>{' '}
                  {lowStockProducts.length > 0
                    ? `${lowStockProducts[0].name} (${lowStockProducts[0].quantity} units remaining)`
                    : 'All inventory levels are optimal.'}
                </div>
                <div>
                  • <strong>{language === 'ta' ? 'மொத்த வியாபார நிலுவை:' : 'Consignment Tracking:'}</strong>{' '}
                  {overdueWholesaleIssues.length > 0
                    ? `${overdueWholesaleIssues[0].customer_name} has pending items overdue.`
                    : 'No overdue consignment returns.'}
                </div>
                <div>
                  • <strong>{language === 'ta' ? 'நிலுவை தொகை பாக்கி:' : 'Pending Settlements:'}</strong>{' '}
                  {pendingWholesaleSettlements.length > 0
                    ? `${pendingWholesaleSettlements[0].customer_name} has ${formatCurrency(pendingWholesaleSettlements[0].balance_due)} due.`
                    : 'All wholesale settlements are clear.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retail vs Wholesale Sales Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                {language === 'ta' ? 'தினசரி விற்பனை வருவாய் (சில்லறை vs மொத்த விற்பனை)' : 'Daily Sales Revenue (Retail vs Wholesale)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ta' ? 'வாராந்திர விற்பனைப் பகுப்பாய்வு' : 'Weekly sales breakdown in INR'}
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesTrendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#1e1f26', borderColor: '#d4af37', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="retail" fill="#d4af37" name={language === 'ta' ? 'சில்லறை விற்பனை' : 'Retail Shop'} radius={[6, 6, 0, 0]} />
                <Bar dataKey="wholesale" fill="#3c3e4a" name={language === 'ta' ? 'மொத்த விற்பனை' : 'Wholesale Credit'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            {language === 'ta' ? 'நகை வகைப்பிரிவு (Category)' : 'Product Category Share'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {language === 'ta' ? 'மூக்குத்தி & தோடு பங்கு' : 'Wholesale vs Retail stock mix'}
          </p>

          {categoryDistribution.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-slate-400">
              No product stock recorded yet.
            </div>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-2">
                {categoryDistribution.map((c, idx) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <span className="font-bold text-charcoal-900 dark:text-slate-100">{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Business Alerts Banner */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-gold-800/60 dark:bg-gold-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-gold-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 dark:text-gold-300 text-xs">
              {language === 'ta' ? 'கடை எச்சரிக்கைகள் மற்றும் நினைவூட்டல்கள்' : 'System Reminders & Stock Alerts'}
            </h4>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-amber-800 dark:text-gold-400">
              <div>
                • <strong>{language === 'ta' ? 'குறைந்த இருப்பு எச்சரிக்கை:' : 'Low Stock Alerts:'}</strong>{' '}
                {lowStockProducts.length > 0
                  ? `${lowStockProducts[0].name} (${lowStockProducts[0].quantity} units remaining)`
                  : 'All inventory levels are optimal.'}
              </div>
              <div>
                • <strong>{language === 'ta' ? 'மொத்த வியாபார நிலுவை:' : 'Consignment Tracking:'}</strong>{' '}
                {overdueWholesaleIssues.length > 0
                  ? `${overdueWholesaleIssues[0].customer_name} has pending items overdue.`
                  : 'No overdue consignment returns.'}
              </div>
              <div>
                • <strong>{language === 'ta' ? 'நிலுவை தொகை பாக்கி:' : 'Pending Settlements:'}</strong>{' '}
                {pendingWholesaleSettlements.length > 0
                  ? `${pendingWholesaleSettlements[0].customer_name} has ${formatCurrency(pendingWholesaleSettlements[0].balance_due)} due.`
                  : 'All wholesale settlements are clear.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

