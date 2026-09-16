import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import {
  getLocalDb,
  fetchCustomersFromSupabase,
  fetchProductsFromSupabase,
  fetchRetailInvoicesFromSupabase,
  fetchWholesaleIssuesFromSupabase,
  fetchWholesaleSettlementsFromSupabase,
  fetchExpensesFromSupabase,
} from '@/lib/supabase';
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
  const [db, setDb] = useState(getLocalDb());
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCustomersFromSupabase(),
        fetchProductsFromSupabase(),
        fetchRetailInvoicesFromSupabase(),
        fetchWholesaleIssuesFromSupabase(),
        fetchWholesaleSettlementsFromSupabase(),
        fetchExpensesFromSupabase(),
      ]);
      setDb(getLocalDb());
    } catch (e) {
      console.warn('Error loading live dashboard metrics:', e);
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

  // Aggregate metrics from live DB
  const todaySales = (db.retailInvoices || [])
    .filter((i) => i.invoice_date === new Date().toISOString().split('T')[0])
    .reduce((sum, i) => sum + i.total_amount, 0);

  const monthSales = (db.retailInvoices || []).reduce((sum, i) => sum + i.total_amount, 0);

  const totalGoldWeight = db.products
    .filter((p) => p.metal_type === 'gold')
    .reduce((sum, p) => sum + p.net_weight_g * p.quantity, 0);

  const totalSilverWeight = db.products
    .filter((p) => p.metal_type === 'silver')
    .reduce((sum, p) => sum + p.net_weight_g * p.quantity, 0);

  const totalStockValue = db.products.reduce((sum, p) => sum + p.retail_price * p.quantity, 0);

  const activeWholesaleCustomers = db.customers.filter((c) => c.customer_type === 'wholesale').length;

  const totalWholesaleIssuedItems = db.wholesaleIssues
    .filter((w) => w.status === 'active')
    .reduce((sum, w) => sum + w.total_items_issued, 0);

  const totalPendingReturns = db.wholesaleIssues
    .filter((w) => w.status === 'active')
    .reduce(
      (sum, w) =>
        sum +
        w.items.reduce((iSum, item) => iSum + item.quantity_remaining, 0),
      0
    );

  const outstandingWholesaleBalances = db.wholesaleSettlements
    .filter((s) => s.status !== 'paid')
    .reduce((sum, s) => sum + s.balance_due, 0);

  const totalExpenses = (db.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // Compute real gross profit from actual database invoices and wholesale settlements
  const retailGrossProfit = (db.retailInvoices || []).reduce((sum, inv) => {
    const invCost = (inv.items || []).reduce((iSum, item) => iSum + (item.metal_value || 0), 0);
    const profit = Math.max(0, (inv.total_amount || 0) - invCost);
    return sum + profit;
  }, 0);

  const wholesaleGrossProfit = (db.wholesaleSettlements || []).reduce((sum, s) => sum + (s.shop_profit_share || 0), 0);

  const grossProfit = retailGrossProfit + wholesaleGrossProfit;
  const netProfit = Math.max(0, grossProfit - totalExpenses);

  const pendingPayments = (db.retailInvoices || [])
    .filter((i) => i.payment_status !== 'paid')
    .reduce((sum, i) => sum + (i.balance_due || 0), 0);

  // Dynamic Stock & Settlement Alerts from Database
  const lowStockProducts = (db.products || []).filter((p) => p.quantity <= (p.minimum_stock || 5));
  const overdueWholesaleIssues = (db.wholesaleIssues || []).filter(
    (w) => w.status === 'active' && w.expected_return_date && new Date(w.expected_return_date) < new Date()
  );
  const pendingWholesaleSettlements = (db.wholesaleSettlements || []).filter((s) => s.balance_due > 0);

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
    const retailTotal = (db.retailInvoices || [])
      .filter((i) => {
        const dt = new Date(i.invoice_date);
        return dt.getDay() === d.key;
      })
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);

    const wholesaleTotal = (db.wholesaleIssues || [])
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
  (db.products || []).forEach((p) => {
    const cName = p.category_name || 'Jewellery';
    catCountMap.set(cName, (catCountMap.get(cName) || 0) + (p.quantity || 0));
  });

  const totalProdQty = (db.products || []).reduce((sum, p) => sum + (p.quantity || 0), 0);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <ShoppingCart className="h-4 w-4 text-gold-600 mb-1" />
            {t('new_retail_bill')}
          </button>
          <button
            onClick={() => navigate('/products/add')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <Boxes className="h-4 w-4 text-gold-600 mb-1" />
            {t('add_product')}
          </button>
          <button
            onClick={() => navigate('/customers/add')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <Users className="h-4 w-4 text-gold-600 mb-1" />
            {t('add_customer')}
          </button>
          <button
            onClick={() => navigate('/wholesale-issues/new')}
            className="flex flex-col items-center justify-center rounded-xl border border-gold-400/40 bg-gold-50/50 p-2.5 text-center text-xs font-semibold text-amber-900 hover:bg-gold-100 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300"
          >
            <HandCoins className="h-4 w-4 text-gold-600 mb-1" />
            {t('new_wholesale_issue')}
          </button>
          <button
            onClick={() => navigate('/wholesale-returns')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <RotateCcw className="h-4 w-4 text-gold-600 mb-1" />
            {t('receive_return')}
          </button>
          <button
            onClick={() => navigate('/payments')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <DollarSign className="h-4 w-4 text-gold-600 mb-1" />
            {t('record_payment')}
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <Receipt className="h-4 w-4 text-gold-600 mb-1" />
            {t('add_expense')}
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold text-slate-800 hover:border-gold-500 hover:bg-gold-50/50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200"
          >
            <TrendingUp className="h-4 w-4 text-gold-600 mb-1" />
            {t('reports_analytics')}
          </button>
        </div>
      </div>

      {/* 12 Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('today_retail_sales')}
          value={formatCurrency(todaySales)}
          subtitle={language === 'ta' ? 'கடை ரொக்க விற்பனை' : 'Shop counter billing'}
          icon={ShoppingCart}
          highlight
          trend={{ value: todaySales > 0 ? 'Live' : '0%', isPositive: true }}
        />
        <StatCard
          title={t('monthly_retail_sales')}
          value={formatCurrency(monthSales)}
          subtitle={language === 'ta' ? 'இந்த மாத மொத்த பில்கள்' : 'Total current month invoice value'}
          icon={TrendingUp}
        />
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
          highlight
        />
        <StatCard
          title={t('pending_returns')}
          value={`${totalPendingReturns} ${t('pcs')}`}
          subtitle={language === 'ta' ? 'வியாபாரிகளிடம் உள்ள மூக்குத்தி/தோடு' : 'Unsold nose rings/ear rings with partners'}
          icon={RotateCcw}
        />
        <StatCard
          title={t('wholesale_receivables')}
          value={formatCurrency(outstandingWholesaleBalances)}
          subtitle={language === 'ta' ? 'வரவேண்டிய லாப பாக்கி' : 'Pending settlement balance'}
          icon={BadgePercent}
          highlight
        />
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
          highlight
        />
        <StatCard
          title={t('pending_payments')}
          value={formatCurrency(pendingPayments)}
          subtitle={language === 'ta' ? 'சில்லறை பில் பாக்கிகள்' : 'Uncollected retail invoice dues'}
          icon={DollarSign}
        />
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

