import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { dataService } from '@/lib/dataService';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { generateRetailInvoicePDF, buildRetailInvoicePDFDoc } from '@/lib/pdfGenerator';
import { sharePdfDocument } from '@/lib/pdfSharing';
import { openWhatsAppClickToChat, buildWhatsAppInvoiceMessage } from '@/lib/whatsapp';
import { RetailInvoice, BusinessSettings } from '@/types';
import { ArrowLeft, Printer, MessageSquare, Download, CheckCircle, Building, Loader2, Share2 } from 'lucide-react';

export const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<RetailInvoice | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharingPDF, setIsSharingPDF] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const s = await dataService.getBusinessSettings();
        setSettings(s);

        if (id && isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase
            .from('retail_invoices')
            .select('*')
            .or(`id.eq.${id},invoice_number.eq.${id}`)
            .maybeSingle();

          if (data) {
            let items: any[] = data.items || [];
            if (!items || items.length === 0) {
              const { data: itemsData } = await supabase
                .from('retail_invoice_items')
                .select('*')
                .eq('invoice_id', data.id);
              if (itemsData && itemsData.length > 0) {
                items = itemsData;
              }
            }
            setInvoice({
              ...data,
              items: items || [],
            } as RetailInvoice);
          }
        }
      } catch (e) {
        console.error('Error fetching invoice details:', e);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [id]);

  const handleShareAsPDF = async () => {
    if (!invoice || isSharingPDF) return;
    setIsSharingPDF(true);
    setShareNotice(null);
    try {
      const doc = buildRetailInvoicePDFDoc(invoice, settings || undefined);
      const res = await sharePdfDocument({
        doc,
        filename: `Shankar-Jewellery-Retail-Invoice-${invoice.invoice_number}.pdf`,
        title: `Shankar Jewellery Retail Invoice ${invoice.invoice_number}`,
        text: `Shankar Jewellery Retail Invoice ${invoice.invoice_number} for ${invoice.customer_name}`,
      });
      if (res.message) {
        setShareNotice(res.message);
        setTimeout(() => setShareNotice(null), 7000);
      }
    } catch (err) {
      console.error('Share PDF error:', err);
    } finally {
      setIsSharingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (invoice) generateRetailInvoicePDF(invoice, settings || undefined);
  };

  const handleShareWhatsApp = () => {
    if (invoice) {
      const msg = buildWhatsAppInvoiceMessage(invoice, settings || undefined);
      openWhatsAppClickToChat(invoice.customer_phone || '+919876543210', msg);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      await dataService.deleteRetailInvoice(invoice.id);
      navigate('/invoices');
    } catch (err: any) {
      alert(`Delete Invoice Failed: ${err?.message || 'Error deleting invoice'}`);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold">
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500 font-bold text-sm">Invoice record not found.</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const invoiceItems = invoice.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice: ${invoice.invoice_number}`}
        subtitle={`Retail Checkout • Date: ${formatDate(invoice.invoice_date)}`}
        breadcrumb={['Home', 'Invoices', invoice.invoice_number]}
        actionBtn={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/invoices')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleShareAsPDF}
              disabled={isSharingPDF}
              aria-label="Share invoice as PDF"
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
            >
              {isSharingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {isSharingPDF ? 'Preparing PDF...' : 'Share as PDF'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Invoice
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Delete Invoice
            </button>
          </div>
        }
      />

      {shareNotice && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-gold-300 max-w-5xl mx-auto flex items-center justify-between shadow-sm">
          <span>{shareNotice}</span>
          <button onClick={() => setShareNotice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold ml-2">✕</button>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <h3 className="font-serif text-lg font-bold text-red-600 mb-2">
              Delete Invoice {invoice.invoice_number}?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to delete this invoice ({formatCurrency(invoice.total_amount)})? This will automatically restore sold quantities back to inventory stock.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete & Restore Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Document Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-lg space-y-6 max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 pb-6 dark:border-charcoal-800 gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
              {settings?.shop_name || 'SHANKAR JEWELLERS'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {settings?.address || 'Main Road'}, {settings?.city || 'Bhavani'}, {settings?.state || 'Tamil Nadu'} - {settings?.pin_code || '638301'}
            </p>
            <p className="text-xs text-slate-500">Phone: {settings?.phone || '+91 98765 43210'} | GSTIN: {settings?.gstin || '33AAAAA0000A1Z5'}</p>
          </div>

          <div className="text-right sm:text-right">
            <span className="rounded-lg bg-gold-500/20 px-3 py-1 font-mono text-sm font-bold text-amber-900 dark:text-gold-300">
              {invoice.invoice_number}
            </span>
            <p className="text-xs text-slate-500 mt-2 font-mono">Date: {formatDate(invoice.invoice_date)}</p>
            <span className="mt-1 inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-charcoal-800 space-y-1">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Billed To:</span>
          <h4 className="font-bold text-charcoal-900 dark:text-slate-100 text-sm">{invoice.customer_name || 'Walk-in Customer'}</h4>
          <p className="text-slate-600 dark:text-slate-300">Phone: {invoice.customer_phone || 'N/A'}</p>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100 font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Item Description</th>
                <th className="p-3">Metal / Purity</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-right">Rate/g</th>
                <th className="p-3 text-right">Metal Value</th>
                <th className="p-3 text-right">Charges</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {invoiceItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500 font-medium italic">
                    No item breakdown lines recorded for this invoice.
                  </td>
                </tr>
              ) : (
                invoiceItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                      {item.product_name_snapshot}
                      {item.sku_snapshot && <span className="block font-mono text-[10px] text-slate-400">SKU: {item.sku_snapshot}</span>}
                    </td>
                    <td className="p-3 font-bold uppercase">{item.metal_type} ({item.purity})</td>
                    <td className="p-3 text-right font-mono">{formatWeight(item.net_weight_g)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(item.metal_rate_snapshot)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(item.metal_value)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency((item.making_charge || 0) + (item.labour_charge || 0) + (item.wastage_value || 0))}</td>
                    <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-4">
          <div className="w-full max-w-xs space-y-2 text-xs border-t border-slate-200 pt-4 dark:border-charcoal-800">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal Metal Value:</span>
              <strong className="font-mono">{formatCurrency(invoice.subtotal_metal_value)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Making & Wastage Charges:</span>
              <strong className="font-mono">{formatCurrency(invoice.total_making_charges + invoice.total_labour_charges + invoice.total_wastage_value)}</strong>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST (3.0%):</span>
              <strong className="font-mono">{formatCurrency(invoice.tax_amount)}</strong>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 text-amber-900 dark:text-gold-300">
              <span>Grand Total:</span>
              <span className="font-serif text-lg">{formatCurrency(invoice.total_amount)}</span>
            </div>

            <div className="mt-3 rounded-xl border border-gold-300/60 bg-gold-50/40 p-3 space-y-1.5 dark:border-gold-800/50 dark:bg-gold-950/30">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Paid:</span>
                <span className="font-mono font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(invoice.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-gold-200/60 pt-1.5 dark:border-gold-800/40">
                <span className="font-serif font-bold text-red-700 dark:text-red-400">Remaining Balance Due:</span>
                <span className="font-serif font-bold text-red-700 dark:text-red-400 text-sm">{formatCurrency(invoice.balance_due ?? Math.max(0, (invoice.total_amount || 0) - (invoice.paid_amount || 0)))}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-slate-500">Payment Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  invoice.payment_status === 'paid' || ((invoice.balance_due === 0 || invoice.balance_due === undefined) && (invoice.paid_amount || 0) > 0)
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : invoice.payment_status === 'partial' || (invoice.paid_amount || 0) > 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {invoice.payment_status === 'paid' || ((invoice.balance_due === 0 || invoice.balance_due === undefined) && (invoice.paid_amount || 0) > 0) ? 'STATUS: PAID' : invoice.payment_status === 'partial' || (invoice.paid_amount || 0) > 0 ? 'STATUS: PARTIALLY PAID' : 'STATUS: UNPAID'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

