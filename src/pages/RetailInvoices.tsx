import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/lib/auth';
import { RetailInvoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildRetailInvoicePDFDoc } from '@/lib/pdfGenerator';
import { sharePdfDocument } from '@/lib/pdfSharing';
import { ShoppingCart, Eye, FileText, Search, Plus, Trash2, AlertTriangle, Share2 } from 'lucide-react';

export const RetailInvoices: React.FC = () => {
  const navigate = useNavigate();
  const { can, role } = useAuth();
  const [invoicesList, setInvoicesList] = useState<RetailInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingInvoice, setDeletingInvoice] = useState<RetailInvoice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canDelete = role === 'super_admin' || role === 'admin' || role === 'manager' || can('billing.delete');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getRetailInvoices();
      setInvoicesList(data);
    } catch (e) {
      console.error('Error loading retail invoices:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'retail_invoices' || tableName === 'general' || tableName === 'products') {
        loadInvoices();
      }
    });
    return () => unsubscribe();
  }, [loadInvoices]);

  const invoices = invoicesList.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleShareRetailPDF = async (inv: RetailInvoice) => {
    try {
      const settings = await dataService.getBusinessSettings();
      const doc = buildRetailInvoicePDFDoc(inv, settings || undefined);
      const res = await sharePdfDocument({
        doc,
        filename: `Shankar-Jewellery-Retail-Invoice-${inv.invoice_number}.pdf`,
        title: `Shankar Jewellery Retail Invoice ${inv.invoice_number}`,
        text: `Shankar Jewellery Retail Invoice ${inv.invoice_number} for ${inv.customer_name || 'Customer'}`,
      });
      if (res.message) {
        showToast(res.message);
      }
    } catch (err) {
      console.error('Error sharing retail invoice:', err);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    try {
      await dataService.deleteRetailInvoice(deletingInvoice.id);
      await loadInvoices();
      showToast(`Retail Invoice ${deletingInvoice.invoice_number} deleted and stock quantity restored.`);
    } catch (err: any) {
      console.error('Error deleting retail invoice:', err);
      showToast(`Error: ${err?.message || 'Failed to delete retail invoice.'}`);
    } finally {
      setDeletingInvoice(null);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-charcoal-900 text-gold-400 px-4 py-3 shadow-xl text-xs font-bold border border-gold-500/40 flex items-center gap-2">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <PageHeader
        title="Retail Invoices"
        subtitle="View finalized retail bills, receipts, print PDF invoices, and manage sales"
        breadcrumb={['Home', 'Retail Invoices']}
        actionBtn={
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Plus className="h-4 w-4" /> New POS Bill
          </button>
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Invoice No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Paid Amount</th>
                <th className="p-3">Payment Status</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Loading retail invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No retail invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                    <td className="p-3 font-mono font-bold text-amber-900 dark:text-gold-300">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="p-3 font-mono">{formatDate(inv.invoice_date)}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{inv.customer_name || 'Walk-in Customer'}</td>
                    <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">{formatCurrency(inv.total_amount)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(inv.paid_amount)}</td>
                    <td className="p-3">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="p-3 uppercase font-bold text-[10px] text-slate-500">{inv.status}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-gold-600 dark:text-slate-300 dark:hover:bg-charcoal-800"
                          title="View Invoice Details"
                        >
                          <Eye className="h-4 w-4" /> View
                        </Link>
                        <button
                          onClick={() => handleShareRetailPDF(inv)}
                          className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-bold text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-950/40"
                          title="Share Invoice as PDF"
                          aria-label="Share invoice as PDF"
                        >
                          <Share2 className="h-4 w-4" /> Share
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeletingInvoice(inv)}
                            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Invoice Confirmation Modal */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                Confirm Invoice Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
              Are you sure you want to delete Invoice <strong className="text-charcoal-900 dark:text-slate-100">{deletingInvoice.invoice_number}</strong> (Total: {formatCurrency(deletingInvoice.total_amount)})?
            </p>
            <div className="rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-6">
              ⚠️ <strong>Stock Reversal Notice:</strong> Deleting this invoice will automatically return all sold item quantities back to product stock inventory.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingInvoice(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInvoice}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Delete Invoice & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
