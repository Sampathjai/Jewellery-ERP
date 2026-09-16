import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { generateRetailInvoicePDF } from '@/lib/pdfGenerator';
import { openWhatsAppClickToChat, buildWhatsAppInvoiceMessage } from '@/lib/whatsapp';
import { ArrowLeft, Printer, MessageSquare, Download, CheckCircle, Building } from 'lucide-react';

export const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = getLocalDb();

  const invoice = db.retailInvoices.find((i) => i.id === id) || db.retailInvoices[0];

  const handleDownloadPDF = () => {
    generateRetailInvoicePDF(invoice, db.settings);
  };

  const handleShareWhatsApp = () => {
    const msg = buildWhatsAppInvoiceMessage(invoice, db.settings);
    openWhatsAppClickToChat(invoice.customer_phone || '+919876543210', msg);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice: ${invoice.invoice_number}`}
        subtitle={`Retail Checkout • Date: ${formatDate(invoice.invoice_date)}`}
        breadcrumb={['Home', 'Invoices', invoice.invoice_number]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/invoices')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Invoice
            </button>
          </div>
        }
      />

      {/* Invoice Document Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-lg space-y-6 max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 pb-6 dark:border-charcoal-800 gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
              {db.settings.shop_name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {db.settings.address}, {db.settings.city}, {db.settings.state} - {db.settings.pin_code}
            </p>
            <p className="text-xs text-slate-500">Phone: {db.settings.phone} | GSTIN: {db.settings.gstin}</p>
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
              {invoice.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-3">{idx + 1}</td>
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">
                    {item.product_name_snapshot}
                    <span className="block font-mono text-[10px] text-slate-400">SKU: {item.sku_snapshot}</span>
                  </td>
                  <td className="p-3 font-bold uppercase">{item.metal_type} ({item.purity})</td>
                  <td className="p-3 text-right font-mono">{formatWeight(item.net_weight_g)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(item.metal_rate_snapshot)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(item.metal_value)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(item.making_charge + item.labour_charge + item.wastage_value)}</td>
                  <td className="p-3 text-right font-serif font-bold text-amber-900 dark:text-gold-300">
                    {formatCurrency(item.line_total)}
                  </td>
                </tr>
              ))}
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
          </div>
        </div>
      </div>
    </div>
  );
};

