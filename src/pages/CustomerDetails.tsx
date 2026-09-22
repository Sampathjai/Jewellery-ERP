import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { openWhatsAppClickToChat, buildWhatsAppPaymentReminder } from '@/lib/whatsapp';
import { CameraModal } from '@/components/common/CameraModal';
import { Customer, BusinessSettings } from '@/types';
import {
  ArrowLeft,
  MessageSquare,
  Printer,
  Building,
  HandCoins,
  Camera,
  Upload,
  Trash2,
  Edit,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface LedgerEntry {
  id: string;
  date: string;
  reference: string;
  type: string;
  typeBadgeClass: string;
  debit: number;
  credit: number;
  runningBalance?: number;
}

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [goldRate, setGoldRate] = useState<number>(6850);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditingTouch, setIsEditingTouch] = useState(false);
  const [touchInput, setTouchInput] = useState<number>(40);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Clear previous state and load customer ledger asynchronously whenever id changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setCustomer(null);
    setLedgerEntries([]);
    setTotalOutstanding(0);

    const loadCustomerData = async () => {
      if (!id) {
        if (isMounted) setIsLoading(false);
        return;
      }

      let targetCustomer: Customer | null = null;
      let invoices: any[] = [];
      let wholesaleIssues: any[] = [];
      let wholesaleReturns: any[] = [];
      let settlements: any[] = [];
      let wholesalePayments: any[] = [];
      let retailPayments: any[] = [];

      try {
        const [rates, sData] = await Promise.all([
          dataService.getMetalRates(),
          dataService.getBusinessSettings(),
        ]);
        if (rates?.[0]?.gold_22k_per_gram) setGoldRate(rates[0].gold_22k_per_gram);
        if (sData) setSettings(sData);
      } catch (e) {
        console.error('Error fetching settings/rates for customer details:', e);
      }

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: supaCust } = await supabase
            .from('customers')
            .select('*')
            .or(`id.eq.${id},customer_code.eq.${id}`)
            .maybeSingle();

          if (supaCust) {
            targetCustomer = supaCust;
            const custId = supaCust.id;

            const [
              { data: sInvoices },
              { data: sIssues },
              { data: sReturns },
              { data: sSettlements },
              { data: sWPayments },
              { data: sRPayments },
            ] = await Promise.all([
              supabase.from('retail_invoices').select('*').eq('customer_id', custId),
              supabase.from('wholesale_issues').select('*').eq('customer_id', custId),
              supabase.from('wholesale_returns').select('*').eq('customer_id', custId),
              supabase.from('wholesale_settlements').select('*').eq('customer_id', custId),
              supabase.from('wholesale_payments').select('*').eq('customer_id', custId),
              supabase.from('retail_payments').select('*').eq('customer_id', custId),
            ]);

            if (sInvoices) invoices = sInvoices;
            if (sIssues) wholesaleIssues = sIssues;
            if (sReturns) wholesaleReturns = sReturns;
            if (sSettlements) settlements = sSettlements;
            if (sWPayments) wholesalePayments = sWPayments;
            if (sRPayments) retailPayments = sRPayments;
          }
        } catch (err) {
          console.error('Error querying customer data from Supabase:', err);
        }
      }

      const rawEntries: LedgerEntry[] = [];
      if (!targetCustomer) {
        if (isMounted) setIsLoading(false);
        return;
      }
      const custId = targetCustomer.id;

      // Retail Invoices (Debit)
      invoices.forEach((inv) => {
        if (inv.customer_id === custId) {
          rawEntries.push({
            id: `inv-${inv.id}`,
            date: inv.invoice_date,
            reference: inv.invoice_number,
            type: 'Retail Invoice',
            typeBadgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
            debit: inv.total_amount || 0,
            credit: 0,
          });
        }
      });

      // Retail Payments Received (Credit)
      retailPayments.forEach((pay) => {
        if (pay.customer_id === custId) {
          rawEntries.push({
            id: `rpay-${pay.id}`,
            date: pay.payment_date,
            reference: pay.reference_number || `RPAY-${pay.id.slice(0, 6)}`,
            type: 'Payment Received',
            typeBadgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
            debit: 0,
            credit: pay.amount || 0,
          });
        }
      });

      // Wholesale Issues
      wholesaleIssues.forEach((issue) => {
        if (issue.customer_id === custId) {
          if (issue.total_cash_value && issue.total_cash_value > 0) {
            rawEntries.push({
              id: `wiss-${issue.id}`,
              date: issue.issue_date,
              reference: issue.issue_number,
              type: 'Wholesale Issue',
              typeBadgeClass: 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300',
              debit: issue.total_cash_value,
              credit: 0,
            });
          }
          if (issue.cash_paid && issue.cash_paid > 0) {
            rawEntries.push({
              id: `wiss-cash-${issue.id}`,
              date: issue.issue_date,
              reference: `${issue.issue_number}-ADV`,
              type: 'Advance Cash',
              typeBadgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
              debit: 0,
              credit: issue.cash_paid,
            });
          }
        }
      });

      // Wholesale Returns (Credit)
      wholesaleReturns.forEach((ret) => {
        if (ret.customer_id === custId) {
          const returnVal = (ret.total_weight_returned_g || 0) * goldRate;
          rawEntries.push({
            id: `wret-${ret.id}`,
            date: ret.return_date,
            reference: ret.return_number,
            type: 'Stock Return',
            typeBadgeClass: 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
            debit: 0,
            credit: returnVal,
          });
        }
      });

      // Wholesale Settlements
      settlements.forEach((st) => {
        if (st.customer_id === custId) {
          if (st.net_payable_to_shop && st.net_payable_to_shop > 0) {
            rawEntries.push({
              id: `st-deb-${st.id}`,
              date: st.settlement_date,
              reference: st.settlement_number,
              type: 'Wholesale Settlement',
              typeBadgeClass: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300',
              debit: st.net_payable_to_shop,
              credit: 0,
            });
          }
          if (st.amount_paid && st.amount_paid > 0) {
            rawEntries.push({
              id: `st-cred-${st.id}`,
              date: st.settlement_date,
              reference: `${st.settlement_number}-PAY`,
              type: 'Settlement Payment',
              typeBadgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
              debit: 0,
              credit: st.amount_paid,
            });
          }
        }
      });

      // Wholesale Payments Received (Credit)
      wholesalePayments.forEach((pay) => {
        if (pay.customer_id === custId) {
          rawEntries.push({
            id: `wpay-${pay.id}`,
            date: pay.payment_date,
            reference: pay.reference_number || `PMT-${pay.id.slice(0, 6)}`,
            type: 'Payment Received',
            typeBadgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
            debit: 0,
            credit: pay.amount || 0,
          });
        }
      });

      // Sort chronologically (oldest first for accounting ledger)
      rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let currentBal = 0;
      const compiled = rawEntries.map((entry) => {
        currentBal += entry.debit - entry.credit;
        return { ...entry, runningBalance: currentBal };
      });

      if (isMounted) {
        setCustomer(targetCustomer);
        setTouchInput(targetCustomer.agreed_customer_touch ?? targetCustomer.agreed_profit_percent ?? 40);
        setLedgerEntries(compiled);
        setTotalOutstanding(currentBal);
        setIsLoading(false);
      }
    };

    loadCustomerData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSaveTouch = async () => {
    if (!customer) return;
    try {
      const updated = await dataService.updateCustomer(customer.id, {
        agreed_customer_touch: touchInput,
        agreed_profit_percent: touchInput,
      });
      setCustomer(updated);
    } catch (e) {
      alert('Failed to save agreed touch: ' + (e as Error).message);
    }
    setIsEditingTouch(false);
  };

  const handleUpdatePhoto = async (newPhotoUrl: string) => {
    if (!customer) return;
    try {
      const updated = await dataService.updateCustomer(customer.id, {
        photo_url: newPhotoUrl,
      });
      setCustomer(updated);
    } catch (e) {
      alert('Failed to update photo: ' + (e as Error).message);
    }
  };

  const handleRemovePhoto = () => {
    handleUpdatePhoto('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds maximum limit of 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleUpdatePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!customer) return;
    const msg = buildWhatsAppPaymentReminder(customer.full_name, totalOutstanding, settings || undefined);
    openWhatsAppClickToChat(customer.whatsapp_number || customer.phone, msg);
  };

  const handleUnarchiveCustomer = async () => {
    if (!customer) return;
    try {
      const updated = await dataService.restoreCustomer(customer.id);
      setCustomer(updated);
      alert(`Customer "${customer.full_name}" unarchived successfully.`);
    } catch (e: any) {
      alert(e?.message || 'Failed to unarchive customer.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center space-x-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
        <span className="text-sm font-medium">Loading customer profile & ledger...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Customer profile not found.
      </div>
    );
  }

  const isArchived = customer.is_active === false || (customer as any).is_active === 'false' || (customer as any).status === 'archived';

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => handleUpdatePhoto(dataUrl)}
        title={`Take Photo for ${customer.full_name}`}
      />

      <PageHeader
        title={customer.full_name}
        subtitle={`${customer.customer_code} • ${customer.shop_name || 'Retail Buyer'}`}
        breadcrumb={['Home', 'Customers', customer.full_name]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {isArchived ? (
              <button
                onClick={handleUnarchiveCustomer}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm"
              >
                <RotateCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Unarchive Customer
              </button>
            ) : (
              <button
                onClick={() => navigate(`/customers/edit/${customer.id}`)}
                className="flex items-center gap-1 rounded-xl border border-gold-400 bg-gold-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-gold-100 dark:bg-gold-950/40 dark:text-gold-300"
              >
                <Edit className="h-4 w-4 text-gold-600" /> Edit Profile
              </button>
            )}
            <button
              onClick={handlePrintLedger}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <Printer className="h-4 w-4" /> Print Ledger
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Statement
            </button>
          </div>
        }
      />

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Photo Viewport & Controls */}
              <div className="relative group shrink-0">
                {customer.photo_url ? (
                  <img
                    src={customer.photo_url}
                    alt={customer.full_name}
                    className="h-24 w-24 rounded-2xl object-cover border-2 border-gold-400 shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-600 font-serif font-bold text-3xl border-2 border-gold-300">
                    {customer.full_name.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-charcoal-800 dark:text-slate-300">
                    {customer.customer_code}
                  </span>
                  <span className="rounded-full bg-gold-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
                    {customer.customer_type} Account
                  </span>
                </div>

                <h2 className="mt-1 font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
                  {customer.full_name}
                </h2>

                {customer.shop_name && (
                  <p className="text-xs font-bold text-amber-800 dark:text-gold-400 flex items-center gap-1.5 mt-0.5">
                    <Building className="h-3.5 w-3.5" /> {customer.shop_name}
                  </p>
                )}

                {/* Photo Management Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3 py-1.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
                  >
                    <Camera className="h-3.5 w-3.5" /> Take New Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Photo
                  </button>

                  {customer.photo_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs dark:border-charcoal-800">
            <div>
              <span className="text-slate-400">Mobile Phone:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.phone}</p>
            </div>
            <div>
              <span className="text-slate-400">WhatsApp Number:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.whatsapp_number || customer.phone}</p>
            </div>
            <div>
              <span className="text-slate-400">City / Location:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.city || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400">Address:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.address || 'N/A'}</p>
            </div>
            {customer.customer_type === 'wholesale' && (
              <div>
                <span className="text-slate-400">Agreed Customer Touch (%):</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-bold text-amber-900 dark:text-gold-300">
                    {customer.agreed_customer_touch ?? customer.agreed_profit_percent ?? 40}% Touch
                  </p>
                  <button
                    onClick={() => setIsEditingTouch(true)}
                    className="rounded bg-gold-100 p-1 text-[10px] font-bold text-amber-950 hover:bg-gold-200 dark:bg-gold-950/40 dark:text-gold-300"
                    title="Edit Agreed Customer Touch"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ledger Balance Card */}
        <div className="rounded-2xl border border-gold-400/40 bg-gradient-to-br from-gold-50/70 via-white to-amber-50/40 p-6 dark:border-gold-800/60 dark:from-gold-950/40 dark:via-charcoal-900 dark:to-gold-900/20 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
              Account Ledger Balance
            </span>
            <h3 className="mt-3 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
              {formatCurrency(totalOutstanding)}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {totalOutstanding === 0 ? 'No outstanding balance' : 'Current Net Receivables Due'}
            </p>
          </div>

          <div className="mt-6 border-t border-gold-200 pt-4 dark:border-gold-800/40 space-y-2">
            <button
              onClick={() => navigate('/wholesale-settlements')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> Create Settlement Statement
            </button>
          </div>
        </div>
      </div>

      {/* Customer Ledger Transaction Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
          Customer Transaction Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Reference / Voucher</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Debit (INR)</th>
                <th className="p-3 text-right">Credit (INR)</th>
                <th className="p-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">No transactions yet.</p>
                    <p className="text-xs text-slate-500">
                      This customer has no invoices, payments, returns, wholesale issues, or ledger entries.
                    </p>
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono">{formatDate(entry.date)}</td>
                    <td className="p-3 font-semibold text-charcoal-900 dark:text-slate-100">
                      {entry.reference}
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${entry.typeBadgeClass}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-900 dark:text-gold-300">
                      {formatCurrency(entry.runningBalance || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Agreed Customer Touch Modal */}
      {isEditingTouch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-2">
              Edit Wholesale Customer Terms
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update the agreed touch percentage for <strong className="text-charcoal-900 dark:text-slate-100">{customer.full_name}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Agreed Customer Touch (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={touchInput}
                  onChange={(e) => setTouchInput(Number(e.target.value))}
                  placeholder="Enter agreed touch (e.g. 40%)"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold text-amber-950 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-charcoal-800 pt-4 mt-6">
              <button
                onClick={() => setIsEditingTouch(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTouch}
                className="rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                Save Agreed Touch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
