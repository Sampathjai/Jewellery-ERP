import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import {
  Customer,
  WholesaleIssue,
  WholesalePayment,
  WholesaleReturn,
  WholesaleSale,
  BusinessSettings,
} from '@/types';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { RecordWholesalePaymentModal } from '@/components/common/RecordWholesalePaymentModal';
import {
  generateWholesaleCustomerStatementPDF,
  generateWholesaleIssuePDF,
  buildCustomerWholesaleIssuePDFDoc,
} from '@/lib/pdfGenerator';
import { sharePdfDocument } from '@/lib/pdfSharing';
import { openWhatsAppClickToChat, buildWhatsAppPaymentReminder, buildWhatsAppWholesaleIssueMessage } from '@/lib/whatsapp';
import {
  ArrowLeft,
  HandCoins,
  RotateCcw,
  Building,
  Eye,
  Coins,
  Download,
  Share2,
  Scale,
  MessageSquare,
  PackageCheck,
  FileText,
  Calendar,
  Sparkles,
  UserCheck,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ShoppingBag,
} from 'lucide-react';

export const WholesaleCustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [issues, setIssues] = useState<WholesaleIssue[]>([]);
  const [payments, setPayments] = useState<WholesalePayment[]>([]);
  const [returnsList, setReturnsList] = useState<WholesaleReturn[]>([]);
  const [salesList, setSalesList] = useState<WholesaleSale[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'returns' | 'holdings' | 'ledger'>('overview');

  // Modal State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedIssueForPayment, setSelectedIssueForPayment] = useState<WholesaleIssue | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [allCusts, allIssues, allPayments, allReturns, allSales, bSettings] = await Promise.all([
        dataService.getCustomers(),
        dataService.getWholesaleIssues(),
        dataService.getWholesalePayments(),
        dataService.getWholesaleReturns(),
        dataService.getWholesaleSales(),
        dataService.getBusinessSettings(),
      ]);

      let foundCust: Customer | null | undefined = allCusts.find((c) => c.id === id || c.customer_code === id);
      if (!foundCust) {
        foundCust = await dataService.getCustomerById(id);
      }

      setSettings(bSettings);
      setIssues(allIssues.filter((i) => i.customer_id === (foundCust?.id || id)));
      setPayments(allPayments.filter((p) => p.customer_id === (foundCust?.id || id)));
      setReturnsList(allReturns.filter((r) => r.customer_id === (foundCust?.id || id)));
      setSalesList(allSales.filter((s) => s.customer_id === (foundCust?.id || id)));

      if (foundCust) {
        setCustomer(foundCust);
      } else {
        // Construct fallback if customer record was deleted or not in table yet
        const matchIssue = allIssues.find((i) => i.customer_id === id);
        if (matchIssue) {
          setCustomer({
            id: matchIssue.customer_id || id,
            customer_code: 'CUST-WS',
            full_name: matchIssue.customer_name || 'Wholesale Partner',
            shop_name: matchIssue.customer_shop || 'Dealer Store',
            customer_type: 'wholesale',
            phone: '',
            whatsapp_number: '',
            email: '',
            address: 'Trichy, Tamil Nadu',
            city: 'Trichy',
            state: 'Tamil Nadu',
            pin_code: '620008',
            credit_limit: 0,
            agreed_profit_percent: matchIssue.agreed_profit_percent || 40,
            profit_sharing_model: matchIssue.agreed_profit_model || 'model_a_profit_percent',
            default_actual_touch: 40,
            default_profit_touch: 10,
            default_billing_touch: 50,
            payment_terms: '30 Days',
            is_active: true,
          });
        }
      }
    } catch (err) {
      console.error('Error loading wholesale customer profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (
        tableName === 'customers' ||
        tableName === 'wholesale_issues' ||
        tableName === 'wholesale_payments' ||
        tableName === 'wholesale_returns' ||
        tableName === 'wholesale_sales'
      ) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  // Calculations
  const totalIssuedQty = issues.reduce((sum, i) => sum + (i.total_items_issued || 0), 0);
  const totalValuation = issues.reduce((sum, i) => sum + (i.total_valuation_amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalReturnedQty = returnsList.reduce((sum, r) => sum + (r.total_quantity_returned || 0), 0);
  const totalReturnedWeight = returnsList.reduce((sum, r) => sum + (r.total_weight_returned_g || 0), 0);
  const pendingDue = Math.max(0, totalValuation - totalPaid);

  // Live holdings calculation: Issued - Returned - Sold per item
  const holdingsItems = useMemo(() => {
    return issues.flatMap((issue) => {
      const items = issue.items || [];
      return items.map((item) => {
        const qtyIssued = item.quantity_issued || 1;
        const remainingQty = item.quantity_remaining ?? qtyIssued;
        const grossW = item.gross_weight_g || 0;
        const dedW = item.deduction_weight_g || 0;
        const netW = item.net_weight_g || (grossW - dedW) || 0;
        const proportionalNetW = (netW / qtyIssued) * remainingQty;
        const totalVal = item.unit_cost_valuation
          ? item.unit_cost_valuation * remainingQty
          : (item.total_issue_value || 0);

        return {
          issueId: issue.id,
          issueNumber: issue.issue_number,
          issueDate: issue.issue_date,
          item,
          remainingQty,
          proportionalNetW,
          totalValuation: totalVal,
        };
      }).filter((h) => h.remainingQty > 0);
    });
  }, [issues]);

  const totalHoldingQty = holdingsItems.reduce((sum, h) => sum + h.remainingQty, 0);

  // Chronological Account Ledger Entries
  const ledgerEntries = useMemo(() => {
    const entries: Array<{
      date: string;
      voucherNo: string;
      type: 'Issue (Debit)' | 'Payment (Credit)' | 'Return (Credit)';
      description: string;
      debitINR: number;
      creditINR: number;
      debitGoldG: number;
      creditGoldG: number;
    }> = [];

    issues.forEach((i) => {
      entries.push({
        date: i.issue_date,
        voucherNo: i.issue_number,
        type: 'Issue (Debit)',
        description: `Wholesale Consignment Stock Issue (${i.total_items_issued} Pcs)`,
        debitINR: i.total_valuation_amount || 0,
        creditINR: 0,
        debitGoldG: i.total_fine_gold_g || 0,
        creditGoldG: 0,
      });
    });

    payments.forEach((p) => {
      entries.push({
        date: p.payment_date,
        voucherNo: p.reference_number || (p.id ? `WPAY-${p.id.slice(0, 6)}` : 'WPAY-REC'),
        type: 'Payment (Credit)',
        description: `Payment Received (${(p.payment_method || 'cash').toUpperCase()} - ${p.reference_number || 'Cash/Gold'})`,
        debitINR: 0,
        creditINR: p.amount || 0,
        debitGoldG: 0,
        creditGoldG: p.gold_weight_g || 0,
      });
    });

    returnsList.forEach((r) => {
      entries.push({
        date: r.return_date,
        voucherNo: r.return_number,
        type: 'Return (Credit)',
        description: `Consignment Stock Returned (${r.total_quantity_returned} Pcs)`,
        debitINR: 0,
        creditINR: 0, // Stock credit handled via holdings
        debitGoldG: 0,
        creditGoldG: 0,
      });
    });

    // Sort chronologically ascending
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balances
    let runningINR = 0;
    let runningGold = 0;
    return entries.map((e) => {
      runningINR += e.debitINR - e.creditINR;
      runningGold += e.debitGoldG - e.creditGoldG;
      return {
        ...e,
        balanceINR: runningINR,
        balanceGoldG: runningGold,
      };
    });
  }, [issues, payments, returnsList]);

  const handleDownloadLedger = () => {
    if (!customer) return;
    generateWholesaleCustomerStatementPDF(customer, payments, issues, settings || undefined);
  };

  const handleShareIssuePDF = async (i: WholesaleIssue) => {
    if (!customer) return;
    const doc = buildCustomerWholesaleIssuePDFDoc(i, customer, settings || undefined);
    await sharePdfDocument({
      doc,
      filename: `Shankar-Jewellery-Invoice-${i.issue_number}.pdf`,
      title: `Shankar Jewellery Invoice ${i.issue_number}`,
      text: `Shankar Jewellery Invoice ${i.issue_number} for ${customer.full_name}`,
    });
  };

  const handleSendWhatsAppReminder = () => {
    if (!customer) return;
    const phone = customer.whatsapp_number || customer.phone || '';
    const msg = buildWhatsAppPaymentReminder(customer.full_name, pendingDue, settings || undefined);
    openWhatsAppClickToChat(phone, msg);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
        <Clock className="h-8 w-8 animate-spin text-gold-500" />
        <p className="text-xs font-bold">Loading Wholesale Partner Account...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Wholesale Partner Profile"
          subtitle="Partner account details and consignment vouchers"
          breadcrumb={['Home', 'Wholesale Partners', 'Profile']}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-charcoal-800 dark:bg-charcoal-900">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            Wholesale Partner Not Found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The requested customer record could not be retrieved from the database. Please check the ID or return to the wholesale directory.
          </p>
          <button
            onClick={() => navigate('/wholesale-customers')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Wholesale Partners
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`${customer.full_name} (${customer.shop_name || 'Dealer Store'})`}
        subtitle={`Wholesale Consignment Account • Code: ${customer.customer_code} • Agreed Touch: ${customer.agreed_customer_touch ?? customer.agreed_profit_percent ?? 40}%`}
        breadcrumb={['Home', 'Wholesale Partners', customer.full_name]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wholesale-customers')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <button
              onClick={handleSendWhatsAppReminder}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <MessageSquare className="h-4 w-4 text-emerald-600" /> WhatsApp Reminder
            </button>

            <button
              onClick={handleDownloadLedger}
              className="flex items-center gap-1.5 rounded-xl border border-gold-400 bg-gold-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-gold-100 dark:bg-gold-950/40 dark:text-gold-300"
            >
              <Download className="h-4 w-4" /> PDF Statement
            </button>

            <button
              onClick={() => {
                setSelectedIssueForPayment(undefined);
                setIsRecordPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Coins className="h-4 w-4" /> Record Payment
            </button>

            <button
              onClick={() => navigate(`/wholesale-issues/new?customerId=${customer.id}`)}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> Issue Stock
            </button>
          </div>
        }
      />

      {/* Customer Profile Banner Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-charcoal-800 dark:bg-charcoal-900">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {customer.photo_url ? (
              <img
                src={customer.photo_url}
                alt={customer.full_name}
                className="h-16 w-16 rounded-full object-cover border-2 border-gold-400 shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold-500 font-serif font-bold text-2xl text-charcoal-950 shadow-gold">
                {customer.full_name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gold-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900 dark:text-gold-300">
                  {customer.customer_code}
                </span>
                <h2 className="font-serif text-xl font-bold text-charcoal-900 dark:text-slate-100">
                  {customer.full_name}
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                  Active Partner
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 font-bold text-amber-800 dark:text-gold-400">
                  <Building className="h-3.5 w-3.5" /> {customer.shop_name || 'Dealer Store'}
                </span>
                •
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {customer.phone || customer.whatsapp_number || 'N/A'}
                </span>
                •
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> {customer.city || 'Trichy'}, {customer.state || 'Tamil Nadu'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gold-50/50 p-4 rounded-xl border border-gold-200 dark:bg-gold-950/20 dark:border-gold-800/40">
            <div>
              <span className="text-[10px] font-bold uppercase text-amber-800 dark:text-gold-400">Agreed Touch</span>
              <p className="font-serif text-lg font-bold text-amber-950 dark:text-gold-300">
                {customer.agreed_customer_touch ?? customer.agreed_profit_percent ?? 40}% Touch
              </p>
            </div>
            <div className="h-8 w-px bg-gold-300 dark:bg-gold-800" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500">Payment Terms</span>
              <p className="font-serif text-sm font-bold text-charcoal-900 dark:text-slate-100">
                {customer.payment_terms || '30 Days'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-charcoal-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" /> Account Overview
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
            activeTab === 'invoices'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" /> Consignment Invoices ({issues.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Coins className="h-4 w-4" /> Payments Received ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
            activeTab === 'returns'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RotateCcw className="h-4 w-4" /> Stock Returns ({returnsList.length})
        </button>

        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
            activeTab === 'holdings'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <PackageCheck className="h-4 w-4" /> Live Holdings ({totalHoldingQty} Pcs)
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
            activeTab === 'ledger'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" /> Statement & Ledger
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gold-300 bg-gold-50/50 p-5 dark:border-gold-800 dark:bg-gold-950/30">
              <span className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase">Total Items Issued</span>
              <h3 className="mt-2 font-serif text-3xl font-bold text-amber-900 dark:text-gold-300">
                {totalIssuedQty} Pcs
              </h3>
              <p className="text-xs text-slate-500">Gold nose rings & ear rings</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Valuation</span>
              <h3 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
                {formatCurrency(totalValuation)}
              </h3>
              <p className="text-xs text-slate-500">Total bill amounts issued</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Payments</span>
              <h3 className="mt-2 font-serif text-3xl font-bold text-emerald-600">
                {formatCurrency(totalPaid)}
              </h3>
              <p className="text-xs text-slate-500">Cash & 916 Pure Gold paid</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Pending Due Balance</span>
              <h3 className="mt-2 font-serif text-3xl font-bold text-red-600">
                {formatCurrency(pendingDue)}
              </h3>
              <p className="text-xs text-slate-500">Outstanding balance due</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                  Recent Consignment Issue Vouchers
                </h3>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="text-xs font-bold text-gold-600 hover:underline"
                >
                  View All ({issues.length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                    <tr>
                      <th className="p-2.5">Issue No</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-right">Items</th>
                      <th className="p-2.5 text-right">Net Wt</th>
                      <th className="p-2.5 text-right">Valuation</th>
                      <th className="p-2.5 text-right">Remaining</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                    {issues.slice(0, 5).map((i) => {
                      const paid = (i.cash_paid || 0) + (i.gold_916_value_paid || 0);
                      const due = i.remaining_balance ?? Math.max(0, i.total_valuation_amount - paid);
                      return (
                        <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                          <td className="p-2.5 font-mono font-bold text-amber-900 dark:text-gold-300">{i.issue_number}</td>
                          <td className="p-2.5 font-mono">{formatDate(i.issue_date)}</td>
                          <td className="p-2.5 text-right font-bold">{i.total_items_issued} Pcs</td>
                          <td className="p-2.5 text-right font-mono">{formatWeight(i.total_net_weight_g)}</td>
                          <td className="p-2.5 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(i.total_valuation_amount)}</td>
                          <td className="p-2.5 text-right font-serif font-bold text-red-600">{formatCurrency(due)}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => navigate(`/wholesale-issues/${i.id}`)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                Partner Information
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-charcoal-800">
                  <span className="text-slate-500">Contact Person</span>
                  <strong className="text-charcoal-900 dark:text-slate-100">{customer.full_name}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-charcoal-800">
                  <span className="text-slate-500">Shop / Firm</span>
                  <strong className="text-charcoal-900 dark:text-slate-100">{customer.shop_name || 'Dealer'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-charcoal-800">
                  <span className="text-slate-500">Phone / WhatsApp</span>
                  <strong className="text-charcoal-900 dark:text-slate-100">{customer.phone || customer.whatsapp_number || 'N/A'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-charcoal-800">
                  <span className="text-slate-500">City / Region</span>
                  <strong className="text-charcoal-900 dark:text-slate-100">{customer.city || 'Trichy'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-charcoal-800">
                  <span className="text-slate-500">GSTIN / Tax ID</span>
                  <strong className="font-mono text-charcoal-900 dark:text-slate-100">{customer.gstin || 'Unregistered'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-charcoal-800">
                  <span className="text-slate-500">Credit Limit</span>
                  <strong className="font-serif text-emerald-600">{formatCurrency(customer.credit_limit || 0)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES / ISSUES */}
      {activeTab === 'invoices' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Wholesale Consignment Touch Bills & Issues
            </h3>
            <button
              onClick={() => navigate('/wholesale-issues/new?customerId=' + customer.id)}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> New Consignment Issue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">Issue No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Net Wt</th>
                  <th className="p-3 text-right">Fine Gold</th>
                  <th className="p-3 text-right">Valuation (INR)</th>
                  <th className="p-3 text-right">Paid (INR)</th>
                  <th className="p-3 text-right">Remaining</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400">
                      No consignment vouchers created for this partner.
                    </td>
                  </tr>
                ) : (
                  issues.map((i) => {
                    const iPaid = (i.cash_paid || 0) + (i.gold_916_value_paid || 0);
                    const iRem = i.remaining_balance ?? Math.max(0, i.total_valuation_amount - iPaid);
                    const isSettled = iRem === 0 && iPaid > 0;

                    return (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                        <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{i.issue_number}</td>
                        <td className="p-3 font-mono">{formatDate(i.issue_date)}</td>
                        <td className="p-3 text-right font-bold">{i.total_items_issued} Pcs</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">{formatWeight(i.total_net_weight_g)}</td>
                        <td className="p-3 text-right font-mono font-bold text-gold-600">{(i.total_fine_gold_g || 0).toFixed(3)} g</td>
                        <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(i.total_valuation_amount)}</td>
                        <td className="p-3 text-right font-serif font-bold text-emerald-600">{formatCurrency(iPaid)}</td>
                        <td className="p-3 text-right font-serif font-bold text-red-600">{formatCurrency(iRem)}</td>
                        <td className="p-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isSettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {isSettled ? 'Settled' : 'Active'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/wholesale-issues/${i.id}`)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="View Voucher"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleShareIssuePDF(i)}
                              className="rounded p-1 text-gold-600 hover:bg-gold-50"
                              title="Share as PDF"
                              aria-label="Share invoice as PDF"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => generateWholesaleIssuePDF(i, customer, settings || undefined)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const msg = buildWhatsAppWholesaleIssueMessage(i, settings || undefined);
                                openWhatsAppClickToChat(customer.whatsapp_number || customer.phone || '', msg);
                              }}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                              title="Send WhatsApp Voucher"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
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
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Payment Transactions Received
            </h3>
            <button
              onClick={() => {
                setSelectedIssueForPayment(undefined);
                setIsRecordPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Coins className="h-4 w-4" /> Record New Payment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Payment Ref</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Cash Amount (INR)</th>
                  <th className="p-3 text-right">Pure Gold (g)</th>
                  <th className="p-3 text-right">Total Settled Value</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      No payments recorded yet for this partner.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono">{formatDate(p.payment_date)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">{p.reference_number || (p.id ? `WPAY-${p.id.slice(0, 6)}` : 'WPAY-REC')}</td>
                      <td className="p-3 uppercase font-bold text-slate-600">{p.payment_method}</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(p.cash_amount || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold text-gold-600">{p.gold_weight_g ? `${p.gold_weight_g.toFixed(3)} g` : '-'}</td>
                      <td className="p-3 text-right font-serif font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                      <td className="p-3 text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RETURNS */}
      {activeTab === 'returns' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Stock Returns History
            </h3>
            <button
              onClick={() => navigate('/wholesale-returns/new')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <RotateCcw className="h-4 w-4 text-gold-600" /> Record New Return
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">Return No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Qty Returned</th>
                  <th className="p-3 text-right">Weight Returned (g)</th>
                  <th className="p-3">Condition / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {returnsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400">
                      No returned stock records found.
                    </td>
                  </tr>
                ) : (
                  returnsList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{r.return_number}</td>
                      <td className="p-3 font-mono">{formatDate(r.return_date)}</td>
                      <td className="p-3 text-right font-bold text-charcoal-900 dark:text-slate-100">{r.total_quantity_returned} Pcs</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">{formatWeight(r.total_weight_returned_g)}</td>
                      <td className="p-3 text-slate-500">{r.condition_notes || 'Good Condition Stock Return'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HOLDINGS */}
      {activeTab === 'holdings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Live Stock Currently Held with {customer.full_name}
            </h3>
            <span className="rounded-full bg-gold-100 px-3 py-1 font-mono text-xs font-bold text-amber-900">
              Total Live Stock: {totalHoldingQty} Pcs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">Voucher Ref</th>
                  <th className="p-3">Product Description</th>
                  <th className="p-3 text-right">Purity / Touch</th>
                  <th className="p-3 text-right">Holding Qty</th>
                  <th className="p-3 text-right">Live Net Weight</th>
                  <th className="p-3 text-right">Valuation (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {holdingsItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                      No active consignment holdings remaining with this dealer.
                    </td>
                  </tr>
                ) : (
                  holdingsItems.map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{h.issueNumber}</td>
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{h.item.product_name}</td>
                      <td className="p-3 text-right font-mono font-bold text-gold-600">{h.item.actual_touch || customer.agreed_customer_touch || 40}% Touch</td>
                      <td className="p-3 text-right font-bold text-amber-900 dark:text-gold-300">{h.remainingQty} Pcs</td>
                      <td className="p-3 text-right font-mono font-bold">{formatWeight(h.proportionalNetW)}</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(h.totalValuation)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: LEDGER */}
      {activeTab === 'ledger' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Account Statement & Running Ledger
            </h3>
            <button
              onClick={handleDownloadLedger}
              className="flex items-center gap-1.5 rounded-xl border border-gold-400 bg-gold-50 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-gold-100"
            >
              <Download className="h-4 w-4" /> Download PDF Statement
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher / Ref</th>
                  <th className="p-3">Transaction Description</th>
                  <th className="p-3 text-right">Debit (INR)</th>
                  <th className="p-3 text-right">Credit (INR)</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                      No ledger transactions found.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-mono">{formatDate(e.date)}</td>
                      <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">{e.voucherNo}</td>
                      <td className="p-3">{e.description}</td>
                      <td className="p-3 text-right font-serif font-bold text-red-600">{e.debitINR > 0 ? formatCurrency(e.debitINR) : '-'}</td>
                      <td className="p-3 text-right font-serif font-bold text-emerald-600">{e.creditINR > 0 ? formatCurrency(e.creditINR) : '-'}</td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(e.balanceINR)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Wholesale Payment Modal */}
      {isRecordPaymentModalOpen && customer && (
        <RecordWholesalePaymentModal
          isOpen={isRecordPaymentModalOpen}
          onClose={() => {
            setIsRecordPaymentModalOpen(false);
            setSelectedIssueForPayment(undefined);
          }}
          customer={customer}
          issue={selectedIssueForPayment}
          onPaymentRecorded={() => {
            setIsRecordPaymentModalOpen(false);
            setSelectedIssueForPayment(undefined);
            loadData();
          }}
        />
      )}
    </div>
  );
};
