import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { getLocalDb, deletePurchaseRecord } from '@/lib/supabase';
import { syncEngine } from '@/lib/syncEngine';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { Purchase } from '@/types';
import { AddPurchaseModal } from '@/components/common/AddPurchaseModal';
import { RecordPurchasePaymentModal } from '@/components/common/RecordPurchasePaymentModal';
import { ViewPurchaseModal } from '@/components/common/ViewPurchaseModal';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  DollarSign,
  Building2,
  Layers,
  Coins,
  Scale,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';

export const Purchases: React.FC = () => {
  const [db, setDb] = useState(() => getLocalDb());
  const [purchasesList, setPurchasesList] = useState<Purchase[]>(db.purchases || []);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'ledger' | 'summary'>('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [metalFilter, setMetalFilter] = useState<'all' | 'gold' | 'silver'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getPurchases();
      setPurchasesList(data);
      setDb(getLocalDb());
    } catch (e) {
      console.warn('Error loading purchases list:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'purchases' || tableName === 'general') {
        loadPurchases();
      }
    });
    return () => unsubscribe();
  }, [loadPurchases]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayPurchase, setSelectedPayPurchase] = useState<Purchase | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewPurchase, setSelectedViewPurchase] = useState<Purchase | null>(null);

  const refreshDb = () => {
    setDb(getLocalDb());
  };

  const purchases: Purchase[] = db.purchases || [];

  const supplierCustomers = (db.customers || []).filter((c) => c.customer_type === 'supplier');
  const dbSuppliers = db.suppliers || [];

  const supplierMap = new Map<string, { id: string; name: string }>();

  dbSuppliers.forEach((s) => {
    supplierMap.set(s.id, { id: s.id, name: s.supplier_name });
  });

  supplierCustomers.forEach((c) => {
    const name = c.shop_name || c.full_name;
    if (!supplierMap.has(c.id)) {
      supplierMap.set(c.id, { id: c.id, name });
    }
  });

  const availableSuppliers = Array.from(supplierMap.values());

  // Filtered Purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier_invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMetal = metalFilter === 'all' || p.metal_type === metalFilter;
    const matchesStatus = statusFilter === 'all' || p.payment_status === statusFilter;
    const matchesSupplier = supplierFilter === 'all' || p.supplier_id === supplierFilter || p.supplier_name === supplierFilter;

    return matchesSearch && matchesMetal && matchesStatus && matchesSupplier;
  });

  // Calculate Aggregates
  const totalGoldWeight = purchases
    .filter((p) => p.metal_type === 'gold')
    .reduce((sum, p) => sum + p.net_weight_g, 0);

  const totalSilverWeight = purchases
    .filter((p) => p.metal_type === 'silver')
    .reduce((sum, p) => sum + p.net_weight_g, 0);

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalAmountPaid = purchases.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalBalancePayable = purchases.reduce((sum, p) => sum + p.balance_payable, 0);

  // Supplier-wise aggregation
  const supplierSummaryMap = new Map<
    string,
    {
      supplier_name: string;
      gold_weight_g: number;
      silver_weight_g: number;
      total_value: number;
      amount_paid: number;
      balance_payable: number;
      count: number;
      last_date: string;
    }
  >();

  purchases.forEach((p) => {
    const key = p.supplier_name;
    const existing = supplierSummaryMap.get(key) || {
      supplier_name: p.supplier_name,
      gold_weight_g: 0,
      silver_weight_g: 0,
      total_value: 0,
      amount_paid: 0,
      balance_payable: 0,
      count: 0,
      last_date: p.purchase_date,
    };

    if (p.metal_type === 'gold') existing.gold_weight_g += p.net_weight_g;
    if (p.metal_type === 'silver') existing.silver_weight_g += p.net_weight_g;
    existing.total_value += p.total_cost;
    existing.amount_paid += p.amount_paid;
    existing.balance_payable += p.balance_payable;
    existing.count += 1;
    if (new Date(p.purchase_date) > new Date(existing.last_date)) {
      existing.last_date = p.purchase_date;
    }

    supplierSummaryMap.set(key, existing);
  });

  const supplierSummaries = Array.from(supplierSummaryMap.values());

  const handleDelete = (purchase: Purchase) => {
    if (
      window.confirm(
        `Are you sure you want to delete purchase entry ${purchase.purchase_number} from ${purchase.supplier_name}?\n\nThis will reverse the inventory stock addition of ${formatWeight(
          purchase.net_weight_g
        )}.`
      )
    ) {
      deletePurchaseRecord(purchase.id);
      refreshDb();
    }
  };

  const handleExportCSV = () => {
    let rows: string[][] = [
      ['Purchase No', 'Purchase Date', 'Supplier Name', 'Invoice No', 'Metal', 'Purity', 'Gross Wt (g)', 'Deduction (g)', 'Net Wt (g)', 'Rate/g (INR)', 'Total Cost (INR)', 'Amount Paid (INR)', 'Balance (INR)', 'Status'],
    ];

    filteredPurchases.forEach((p) => {
      rows.push([
        p.purchase_number,
        p.purchase_date,
        p.supplier_name,
        p.supplier_invoice_number,
        p.metal_type,
        p.purity,
        String(p.gross_weight_g),
        String(p.deduction_weight_g),
        String(p.net_weight_g),
        String(p.purchase_rate_per_gram),
        String(p.total_cost),
        String(p.amount_paid),
        String(p.balance_payable),
        p.payment_status,
      ]);
    });

    const csvString = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvString);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shankar_jewellery_purchases_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Material Gold & Silver Purchases"
        subtitle="Record, maintain, and track supplier refinery raw metal purchases and payments"
        breadcrumb={['Home', 'Purchases']}
        actionBtn={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'ledger' ? 'summary' : 'ledger')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
            >
              <Building2 className="h-4 w-4 text-gold-600" />
              {viewMode === 'ledger' ? 'Maintain Purchases' : 'Purchase Ledger View'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
            </button>
            <button
              onClick={() => {
                setEditingPurchase(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
            >
              <Plus className="h-4 w-4" />
              + Add Purchase
            </button>
          </div>
        }
      />

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Coins className="h-4 w-4 text-amber-600" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Metal Purchased</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-amber-900 dark:text-gold-300">
            {formatWeight(totalGoldWeight)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Gold: {formatWeight(totalGoldWeight)} | Silver: {formatWeight(totalSilverWeight)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <CreditCard className="h-4 w-4 text-gold-600" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Purchase Value</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-charcoal-900 dark:text-slate-100">
            {formatCurrency(totalPurchaseValue)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">{purchases.length} Recorded Purchases</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Paid to Suppliers</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalAmountPaid)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Cleared refinery payments</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20 shadow-sm">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400 mb-1">
            <Building2 className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Balance Payable</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-red-700 dark:text-red-400">
            {formatCurrency(totalBalancePayable)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Outstanding supplier liabilities</p>
        </div>
      </div>

      {viewMode === 'ledger' ? (
        /* Purchase Ledger View */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by supplier name, invoice no, or purchase ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-500 text-[11px]">Filters:</span>
              </div>

              {/* Metal Filter */}
              <select
                value={metalFilter}
                onChange={(e) => setMetalFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
              >
                <option value="all">All Metals</option>
                <option value="gold">Gold Only</option>
                <option value="silver">Silver Only</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>

              {/* Supplier Filter */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
              >
                <option value="all">All Suppliers</option>
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purchase List Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            {filteredPurchases.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No purchases match your current filters. Click "+ Add Purchase" to record entries.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                    <tr>
                      <th className="p-3">Purchase Date</th>
                      <th className="p-3">Supplier Refinery</th>
                      <th className="p-3">Bill No</th>
                      <th className="p-3">Metal / Purity</th>
                      <th className="p-3 text-right">Net Wt</th>
                      <th className="p-3 text-right">Rate/g</th>
                      <th className="p-3 text-right">Total Cost</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Balance</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                    {filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50 transition-colors">
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {formatDate(p.purchase_date)}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-charcoal-900 dark:text-slate-100">{p.supplier_name}</div>
                          {p.supplier_phone && (
                            <span className="text-[10px] text-slate-400 block">{p.supplier_phone}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          #{p.supplier_invoice_number}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <MetalBadge metal={p.metal_type} />
                            <PurityBadge purity={p.purity} />
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                          {formatWeight(p.net_weight_g)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(p.purchase_rate_per_gram)}
                        </td>
                        <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">
                          {formatCurrency(p.total_cost)}
                        </td>
                        <td className="p-3 text-right font-serif font-semibold text-emerald-600">
                          {formatCurrency(p.amount_paid)}
                        </td>
                        <td className="p-3 text-right font-serif font-bold text-red-600">
                          {formatCurrency(p.balance_payable)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              p.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.payment_status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.payment_status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedViewPurchase(p);
                                setIsViewModalOpen(true);
                              }}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-charcoal-800"
                              title="View Purchase Breakdown"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {p.balance_payable > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedPayPurchase(p);
                                  setIsPayModalOpen(true);
                                }}
                                className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="Record Payment"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingPurchase(p);
                                setIsAddModalOpen(true);
                              }}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              title="Edit Purchase"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete Purchase"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Supplier-Wise Summary View */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
              Supplier-Wise Purchase Summary Ledger
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">Supplier Refinery</th>
                    <th className="p-3 text-right">Total Gold (g)</th>
                    <th className="p-3 text-right">Total Silver (g)</th>
                    <th className="p-3 text-right">Total Purchase Value</th>
                    <th className="p-3 text-right">Total Paid</th>
                    <th className="p-3 text-right">Total Balance Payable</th>
                    <th className="p-3 text-center">Entries</th>
                    <th className="p-3 text-right">Last Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {supplierSummaries.map((s) => (
                    <tr key={s.supplier_name} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                        {s.supplier_name}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900 dark:text-gold-300">
                        {formatWeight(s.gold_weight_g)}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatWeight(s.silver_weight_g)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-charcoal-900 dark:text-slate-100">
                        {formatCurrency(s.total_value)}
                      </td>
                      <td className="p-3 text-right font-serif font-semibold text-emerald-600">
                        {formatCurrency(s.amount_paid)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-red-600">
                        {formatCurrency(s.balance_payable)}
                      </td>
                      <td className="p-3 text-center font-semibold">{s.count}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{formatDate(s.last_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddPurchaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshDb}
        editPurchase={editingPurchase}
      />

      <RecordPurchasePaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={refreshDb}
        purchase={selectedPayPurchase}
      />

      <ViewPurchaseModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        purchase={selectedViewPurchase}
      />
    </div>
  );
};
