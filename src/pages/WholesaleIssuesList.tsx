import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { WholesaleIssue, Customer, BusinessSettings } from '@/types';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { openWhatsAppClickToChat, buildWhatsAppWholesaleIssueMessage } from '@/lib/whatsapp';
import { generateWholesaleIssuePDF } from '@/lib/pdfGenerator';
import { RecordWholesalePaymentModal } from '@/components/common/RecordWholesalePaymentModal';
import {
  HandCoins,
  Search,
  Eye,
  MessageSquare,
  Download,
  Filter,
  Coins,
  Building,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

export const WholesaleIssuesList: React.FC = () => {
  const navigate = useNavigate();
  const [issuesList, setIssuesList] = useState<WholesaleIssue[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [selectedIssueForPayment, setSelectedIssueForPayment] = useState<WholesaleIssue | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wIssues, custs, bSettings] = await Promise.all([
        dataService.getWholesaleIssues(),
        dataService.getCustomers(),
        dataService.getBusinessSettings(),
      ]);
      setIssuesList(wIssues);
      setCustomersList(custs);
      setSettings(bSettings);
    } catch (err) {
      console.error('Error loading wholesale consignment issues:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'wholesale_issues' || tableName === 'customers' || tableName === 'wholesale_payments') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const filteredIssues = issuesList.filter((issue) => {
    const custName = (issue.customer_name || '').toLowerCase();
    const shopName = (issue.customer_shop || '').toLowerCase();
    const issueNum = (issue.issue_number || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = custName.includes(query) || shopName.includes(query) || issueNum.includes(query);
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? issue.status === 'active' || (issue.remaining_balance ?? 0) > 0
        : issue.status === 'settled' || (issue.remaining_balance ?? 0) === 0;

    return matchesSearch && matchesStatus;
  });

  const totalActiveVouchers = issuesList.filter((i) => i.status === 'active').length;
  const totalIssuedQty = filteredIssues.reduce((sum, i) => sum + (i.total_items_issued || 0), 0);
  const totalValuation = filteredIssues.reduce((sum, i) => sum + (i.total_valuation_amount || 0), 0);
  const totalOutstandingDue = filteredIssues.reduce((sum, i) => {
    const paid = (i.cash_paid || 0) + (i.gold_916_value_paid || 0);
    const due = i.remaining_balance ?? Math.max(0, (i.total_valuation_amount || 0) - paid);
    return sum + due;
  }, 0);

  const handleOpenPayment = (issue: WholesaleIssue) => {
    const cust = customersList.find((c) => c.id === issue.customer_id) || {
      id: issue.customer_id || 'cust-fallback',
      customer_code: 'CUST-WS',
      full_name: issue.customer_name || 'Wholesale Partner',
      shop_name: issue.customer_shop || 'Dealer Store',
      customer_type: 'wholesale',
      phone: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: 'Trichy',
      state: 'Tamil Nadu',
      pin_code: '620008',
      credit_limit: 0,
      agreed_profit_percent: issue.agreed_profit_percent || 40,
      profit_sharing_model: issue.agreed_profit_model || 'model_a_profit_percent',
      default_actual_touch: 40,
      default_profit_touch: 10,
      default_billing_touch: 50,
      payment_terms: '30 Days',
      is_active: true,
    };
    setSelectedIssueForPayment(issue);
    setPaymentCustomer(cust as Customer);
    setIsPaymentModalOpen(true);
  };

  const handleWhatsAppReminder = (issue: WholesaleIssue) => {
    const cust = customersList.find((c) => c.id === issue.customer_id);
    const phone = cust?.whatsapp_number || cust?.phone || '';
    const msg = buildWhatsAppWholesaleIssueMessage(issue, settings || undefined);
    openWhatsAppClickToChat(phone, msg);
  };

  const handleDownloadPDF = async (issue: WholesaleIssue) => {
    const cust = customersList.find((c) => c.id === issue.customer_id) || {
      id: issue.customer_id || 'cust-fallback',
      customer_code: 'CUST-WS',
      full_name: issue.customer_name || 'Wholesale Partner',
      shop_name: issue.customer_shop || 'Dealer Store',
      customer_type: 'wholesale',
      phone: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: 'Trichy',
      state: 'Tamil Nadu',
      pin_code: '620008',
      credit_limit: 0,
      agreed_profit_percent: issue.agreed_profit_percent || 40,
      profit_sharing_model: issue.agreed_profit_model || 'model_a_profit_percent',
      default_actual_touch: 40,
      default_profit_touch: 10,
      default_billing_touch: 50,
      payment_terms: '30 Days',
      is_active: true,
    };
    generateWholesaleIssuePDF(issue, cust as Customer, settings || undefined);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Wholesale Consignment Invoices & Vouchers"
        subtitle="Manage consignment Touch bills, stock dispatches, settlements & customer dues"
        breadcrumb={['Home', 'Wholesale Consignment', 'Invoice Management']}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wholesale-returns/new')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300"
            >
              <RotateCcw className="h-4 w-4 text-gold-600" /> Record Return
            </button>
            <button
              onClick={() => navigate('/wholesale-issues/new')}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> Issue Wholesale Stock
            </button>
          </div>
        }
      />

      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Active Consignments</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
            {totalActiveVouchers} Vouchers
          </h3>
          <p className="text-xs text-slate-500">Currently out on consignment</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Items Issued</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-amber-900 dark:text-gold-300">
            {totalIssuedQty} Pcs
          </h3>
          <p className="text-xs text-slate-500">Gold nose rings & ear rings</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Consignment Valuation</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
            {formatCurrency(totalValuation)}
          </h3>
          <p className="text-xs text-slate-500">Total bill amounts issued</p>
        </div>

        <div className="rounded-2xl border border-gold-300 bg-gold-50/50 p-5 dark:border-gold-800 dark:bg-gold-950/30">
          <span className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase">Outstanding Due</span>
          <h3 className="mt-2 font-serif text-3xl font-bold text-red-600">
            {formatCurrency(totalOutstandingDue)}
          </h3>
          <p className="text-xs text-slate-500">Pending payment balance</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by issue no, dealer or shop name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300"
          >
            <option value="all">All Vouchers</option>
            <option value="active">Active / Due</option>
            <option value="settled">Fully Settled</option>
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Issue No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Wholesale Partner</th>
                <th className="p-3 text-right">Items Issued</th>
                <th className="p-3 text-right">Net Wt (g)</th>
                <th className="p-3 text-right">Fine Gold (g)</th>
                <th className="p-3 text-right">Valuation (INR)</th>
                <th className="p-3 text-right">Paid (INR)</th>
                <th className="p-3 text-right">Remaining Due</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400">
                    Loading consignment invoices...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400 font-medium">
                    No wholesale consignment invoices found.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((i) => {
                  const paidCash = i.cash_paid || 0;
                  const paidGold = i.gold_916_value_paid || 0;
                  const totalPaid = paidCash + paidGold;
                  const due = i.remaining_balance ?? Math.max(0, (i.total_valuation_amount || 0) - totalPaid);
                  const isSettled = due === 0 && totalPaid > 0;

                  return (
                    <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">
                        <Link to={`/wholesale-issues/${i.id}`} className="hover:underline">
                          {i.issue_number}
                        </Link>
                      </td>
                      <td className="p-3 font-mono">{formatDate(i.issue_date)}</td>
                      <td className="p-3">
                        <div className="font-bold text-charcoal-900 dark:text-slate-100">
                          {i.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Building className="h-3 w-3" /> {i.customer_shop || 'Dealer'}
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold">{i.total_items_issued} Pcs</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                        {formatWeight(i.total_net_weight_g)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gold-600">
                        {(i.total_fine_gold_g || 0).toFixed(3)} g
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">
                        {formatCurrency(i.total_valuation_amount)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-emerald-600">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-red-600">
                        {formatCurrency(due)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isSettled ? 'Fully Settled' : 'Consignment Active'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/wholesale-issues/${i.id}`)}
                            title="View Consignment Voucher"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-charcoal-900 dark:hover:bg-charcoal-800 dark:hover:text-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(i)}
                            title="Download PDF Invoice"
                            className="rounded-lg p-1.5 text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-950/40"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleWhatsAppReminder(i)}
                            title="Send WhatsApp Payment Reminder"
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          {due > 0 && (
                            <button
                              onClick={() => handleOpenPayment(i)}
                              title="Record Payment Settlement"
                              className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                            >
                              <Coins className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Wholesale Payment Modal */}
      {isPaymentModalOpen && paymentCustomer && (
        <RecordWholesalePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          customer={paymentCustomer}
          issue={selectedIssueForPayment || undefined}
          onPaymentRecorded={() => {
            setIsPaymentModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};
