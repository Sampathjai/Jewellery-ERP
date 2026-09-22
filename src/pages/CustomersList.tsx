import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { Customer } from '@/types';
import { useAuth } from '@/lib/auth';
import { openWhatsAppClickToChat, buildWhatsAppPaymentReminder } from '@/lib/whatsapp';
import { Plus, Search, MessageSquare, Phone, MapPin, Eye, Building, Edit, Trash2, AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';

export const CustomersList: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManageCustomers = can('manage_customers');

  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState<{ customer: Customer; hasTransactions: boolean } | null>(null);
  const [customerToRestore, setCustomerToRestore] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingTx, setIsCheckingTx] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isCustomerArchived = useCallback((c: Customer): boolean => {
    return (
      c.is_active === false ||
      (c as any).is_active === 'false' ||
      (c as any).status === 'archived' ||
      (c as any).isArchived === true
    );
  }, []);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await dataService.getCustomers();
      setCustomersList(data);
    } catch (e: any) {
      console.error('Error loading customers list:', e);
      setErrorMsg(e?.message || 'Failed to load customers from Supabase PostgreSQL.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'customers' || tableName === 'general') {
        loadCustomers();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadCustomers]);

  const customers = customersList.filter((c) => {
    const isArchived = isCustomerArchived(c);
    const matchesArchived = showArchived ? true : !isArchived;
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.shop_name && c.shop_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || c.customer_type === filterType;
    return matchesArchived && matchesSearch && matchesType;
  });

  const handleWhatsAppReminder = (customer: Customer) => {
    const msg = buildWhatsAppPaymentReminder(customer.full_name, customer.credit_limit || 0);
    openWhatsAppClickToChat(customer.whatsapp_number || customer.phone, msg);
    dataService.logWhatsAppMessage({
      customer_name: customer.full_name,
      phone: customer.whatsapp_number || customer.phone,
      template_type: 'payment_reminder',
      message_body: msg,
      status: 'sent',
    });
  };

  const handleInitiateDelete = async (customer: Customer) => {
    if (!canManageCustomers) {
      setErrorMsg('Permission Denied: You do not have permission to delete or archive customers.');
      return;
    }
    setIsCheckingTx(true);
    setErrorMsg('');
    try {
      const hasTx = await dataService.checkCustomerHasTransactions(customer.id);
      setDeleteTarget({ customer, hasTransactions: hasTx });
    } catch (e) {
      setDeleteTarget({ customer, hasTransactions: true });
    } finally {
      setIsCheckingTx(false);
    }
  };

  const handleConfirmDelete = async (forceArchive: boolean) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await dataService.deleteCustomer(deleteTarget.customer.id, forceArchive);
      setSuccessMsg(res.message);
      setDeleteTarget(null);
      await loadCustomers();
    } catch (e: any) {
      console.error('Delete/Archive customer error:', e);
      setErrorMsg(e?.message || 'Unable to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreCustomer = async () => {
    if (!customerToRestore) return;
    if (!canManageCustomers) {
      setErrorMsg('Permission Denied: You do not have permission to unarchive customers.');
      setCustomerToRestore(null);
      return;
    }
    setIsRestoring(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await dataService.restoreCustomer(customerToRestore.id);
      setSuccessMsg('Customer restored successfully.');
      setCustomerToRestore(null);
      await loadCustomers();
    } catch (e: any) {
      console.error('Restore customer error:', e);
      setErrorMsg('Failed to restore customer. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer CRM"
        subtitle="Manage retail buyers, wholesale credit partners, and suppliers"
        breadcrumb={['Home', 'Customers']}
        actionBtn={
          <button
            onClick={() => navigate('/customers/add')}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Plus className="h-4 w-4" />
            Add New Customer
          </button>
        }
      />

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-bold text-sm mb-1">⚠️ Error</p>
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, shop or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {['all', 'retail', 'wholesale', 'supplier'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-xl px-3.5 py-2 min-h-[36px] shrink-0 text-xs font-semibold capitalize transition-all ${
                filterType === type
                  ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              {type}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 ml-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300 text-gold-600 focus:ring-gold-500"
            />
            Show Archived
          </label>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => {
          const isArchived = isCustomerArchived(c);
          return (
            <div
              key={c.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all hover:border-gold-400 hover:shadow-lg dark:bg-charcoal-900 ${
                isArchived
                  ? 'border-red-200/80 bg-slate-50/50 dark:border-red-900/30 dark:bg-charcoal-900/60 opacity-80'
                  : 'border-slate-200 dark:border-charcoal-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={c.full_name} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 font-serif font-bold text-lg">
                        {c.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:bg-charcoal-800 dark:text-slate-300">
                        {c.customer_code}
                      </span>
                      <h3 className="mt-1 font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                        {c.full_name}
                      </h3>
                      {c.shop_name && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-gold-400 mt-0.5">
                          <Building className="h-3.5 w-3.5" />
                          <span>{c.shop_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        c.customer_type === 'wholesale'
                          ? 'bg-gold-500/20 text-amber-900 dark:text-gold-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-charcoal-800 dark:text-slate-300'
                      }`}
                    >
                      {c.customer_type}
                    </span>
                    {isArchived && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700 uppercase">
                        Archived
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                  {c.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.city}, {c.state || 'TN'}</span>
                    </div>
                  )}
                  {c.customer_type === 'wholesale' && (
                    <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-charcoal-800">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Agreed Customer Touch:</span>
                        <strong className="text-amber-900 dark:text-gold-300">
                          {c.agreed_customer_touch ?? c.agreed_profit_percent ?? 40}% Touch
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-charcoal-800">
                <Link
                  to={`/customers/${c.id}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-gold-600 dark:text-slate-300"
                >
                  <Eye className="h-4 w-4 text-gold-500" />
                  View Profile & Ledger
                </Link>

                <div className="flex items-center gap-2">
                  {isArchived ? (
                    <>
                      <button
                        onClick={() => setCustomerToRestore(c)}
                        className="flex items-center gap-1 rounded-xl border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm"
                        title="Restore / Unarchive Customer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Restore
                      </button>

                      <button
                        onClick={() => handleWhatsAppReminder(c)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        WhatsApp
                      </button>

                      <button
                        onClick={() => handleInitiateDelete(c)}
                        disabled={isCheckingTx}
                        className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400 disabled:opacity-50"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to={`/customers/edit/${c.id}`}
                        className="flex items-center gap-1 rounded-xl border border-gold-400 bg-gold-50 px-2.5 py-1 text-xs font-bold text-amber-950 hover:bg-gold-100 dark:bg-gold-950/40 dark:text-gold-300"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Link>

                      <button
                        onClick={() => handleWhatsAppReminder(c)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        WhatsApp
                      </button>

                      <button
                        onClick={() => handleInitiateDelete(c)}
                        disabled={isCheckingTx}
                        className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400 disabled:opacity-50"
                        title="Archive or Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restore/Unarchive Customer Confirmation Modal */}
      {customerToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                Restore Customer?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to restore customer <strong className="text-charcoal-900 dark:text-slate-100">{customerToRestore.full_name}</strong> ({customerToRestore.customer_code})? They will become an active customer again.
            </p>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              💡 <strong>Ledger & History Preserved:</strong> All historical invoices, payments, credit limits, WhatsApp details, and account ledger balances will remain intact.
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-charcoal-800">
              <button
                type="button"
                onClick={() => setCustomerToRestore(null)}
                disabled={isRestoring}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreCustomer}
                disabled={isRestoring}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {isRestoring ? 'Restoring...' : 'Restore Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete or Archive Customer Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 space-y-4">
            {deleteTarget.hasTransactions ? (
              <>
                <div className="flex items-center gap-3 text-amber-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    Customer Has Transaction History
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This customer has existing payment or transaction records and cannot be permanently deleted without affecting historical data.
                </p>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  💡 <strong>Protected History:</strong> Wholesale payments, invoices, returns, credit limits, and accounting ledger history are preserved permanently.
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-charcoal-800">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  {isCustomerArchived(deleteTarget.customer) ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(null)}
                      className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
                    >
                      Keep Archived
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(true)}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
                    >
                      {isDeleting ? 'Archiving...' : 'Archive Customer'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-red-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    Delete Customer?
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Are you sure you want to permanently delete this customer <strong className="text-charcoal-900 dark:text-slate-100">{deleteTarget.customer.full_name}</strong> ({deleteTarget.customer.customer_code})?
                </p>

                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  ⚠️ <strong>Permanent Deletion:</strong> This customer has no financial records or transactions. The record will be permanently deleted.
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-charcoal-800">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(false)}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Customer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


