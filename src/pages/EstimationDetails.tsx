import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReferenceImageGallery } from '@/components/estimations/ReferenceImageGallery';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { Estimation, BusinessSettings } from '@/types';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { downloadEstimationPDF, shareEstimationPDF } from '@/lib/estimationPdfGenerator';
import { buildWhatsAppEstimationMessage, openWhatsAppClickToChat } from '@/lib/whatsapp';
import {
  FileText,
  Download,
  Share2,
  MessageCircle,
  Copy,
  CheckCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
  User,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  History,
  Trash2,
} from 'lucide-react';

export const EstimationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [revisions, setRevisions] = useState<Estimation[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Convert to order modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [orderNotes, setOrderNotes] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [est, sData] = await Promise.all([
        dataService.getEstimationById(id),
        dataService.getBusinessSettings(),
      ]);
      setEstimation(est);
      setSettings(sData);

      if (est) {
        const rootId = est.root_estimation_id || est.id;
        const revList = await dataService.getEstimationRevisions(rootId);
        setRevisions(revList);
      }
    } catch (err) {
      console.error('Error loading estimation details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    const unsub = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'estimations' || tableName === 'custom_orders' || tableName === 'general') {
        loadData();
      }
    });
    return () => unsub();
  }, [loadData]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading estimation details...</div>;
  }

  if (!estimation) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Estimation not found.</p>
        <button
          type="button"
          onClick={() => navigate('/estimations')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-600 text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Estimations
        </button>
      </div>
    );
  }

  const isExpired = new Date(estimation.valid_until) < new Date() && estimation.status !== 'converted_to_order';

  const handleStatusChange = async (newStatus: any) => {
    setActionLoading(true);
    try {
      await dataService.updateEstimationStatus(estimation.id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(`Error updating status: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    await downloadEstimationPDF(estimation, settings || undefined);
  };

  const handleSharePDF = async () => {
    await shareEstimationPDF(estimation, settings || undefined);
  };

  const handleWhatsApp = () => {
    if (!estimation.customer_phone) {
      alert('No customer phone number available.');
      return;
    }
    const msg = buildWhatsAppEstimationMessage(estimation, settings || undefined);
    openWhatsAppClickToChat(estimation.customer_phone, msg);
  };

  const handleConvertToOrder = async () => {
    setActionLoading(true);
    try {
      const order = await dataService.convertEstimationToCustomOrder(
        estimation.id,
        advancePaid,
        deliveryDate,
        orderNotes
      );
      setShowConvertModal(false);
      navigate(`/custom-orders/${order.id}`);
    } catch (err: any) {
      alert(`Failed to convert estimation to order: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this estimation? This action cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      await dataService.deleteEstimation(estimation.id);
      navigate('/estimations');
    } catch (err: any) {
      alert(`Failed to delete: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/estimations')}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {estimation.estimation_number}
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Rev {estimation.version}
              </span>
              {isExpired ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Expired
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {estimation.status}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Quotation Date: {formatDate(estimation.estimation_date)} | Valid Until:{' '}
              <strong className={isExpired ? 'text-red-600' : ''}>
                {formatDate(estimation.valid_until)}
              </strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>

          <button
            type="button"
            onClick={handleSharePDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>

          {estimation.customer_phone && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Quote
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(`/estimations/new?revisionOf=${estimation.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" /> Create Revision (Rev {estimation.version + 1})
          </button>

          {estimation.status !== 'converted_to_order' && (
            <button
              type="button"
              onClick={() => {
                setAdvancePaid(Math.round(estimation.total_estimated_amount * 0.3));
                setShowConvertModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
            >
              <ArrowRight className="w-4 h-4" /> Convert to Custom Order
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Delete estimation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Revision History Switcher (if revisions exist) */}
      {revisions.length > 1 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 rounded-xl p-3 flex items-center gap-2 overflow-x-auto">
          <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 shrink-0">
            Revision History:
          </span>
          <div className="flex items-center gap-2">
            {revisions.map((rev) => (
              <button
                key={rev.id}
                type="button"
                onClick={() => navigate(`/estimations/${rev.id}`)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  rev.id === estimation.id
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Rev {rev.version} ({formatDate(rev.estimation_date)}) -{' '}
                {formatCurrency(rev.total_estimated_amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Converted Order Banner if applicable */}
      {estimation.converted_order_id && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
              This quotation has been converted into an active manufacturing Custom Order!
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/custom-orders/${estimation.converted_order_id}`)}
            className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline"
          >
            View Order <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Details Left, Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details & Locked Rate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" /> Customer Information
              </h4>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {estimation.customer_name}
              </p>
              {estimation.customer_phone && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Phone: {estimation.customer_phone}
                </p>
              )}
              {estimation.customer_email && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Email: {estimation.customer_email}
                </p>
              )}
              {estimation.customer_address && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Address: {estimation.customer_address}
                </p>
              )}
            </div>

            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/50 p-4 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> Locked Rate Snapshot
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Gold 22K (916): <strong>{formatCurrency(estimation.gold_22k_rate)} /g</strong>
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Gold 24K: <strong>{formatCurrency(estimation.gold_24k_rate)} /g</strong>
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Silver 925: <strong>{formatCurrency(estimation.silver_rate)} /g</strong>
              </p>
              <span className="text-[10px] text-gray-500 block pt-1 border-t border-amber-200/60">
                Locked at quotation creation (unchanged by market flux)
              </span>
            </div>
          </div>

          {/* Reference Jewellery Images Gallery */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Customer Reference Design Photographs
              </h3>
              <span className="text-[11px] text-gray-400">
                {estimation.reference_images?.length || 0} Photos Attached
              </span>
            </div>
            <ReferenceImageGallery images={estimation.reference_images || []} readOnly={true} />
          </div>

          {/* Items Specifications Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Estimated Jewellery Item Specifications
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Description & Purity</th>
                    <th className="py-2.5 px-3 text-right">Est. Gross (g)</th>
                    <th className="py-2.5 px-3 text-right">Est. Stone (g)</th>
                    <th className="py-2.5 px-3 text-right">Est. Net (g)</th>
                    <th className="py-2.5 px-3 text-right">Rate/g</th>
                    <th className="py-2.5 px-3 text-right">Metal Val</th>
                    <th className="py-2.5 px-3 text-right">Wastage / VA</th>
                    <th className="py-2.5 px-3 text-right">Making Chg</th>
                    <th className="py-2.5 px-3 text-right">Item Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(estimation.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {it.item_name}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {it.purity.toUpperCase()} | {it.jewellery_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatWeight(it.estimated_gross_weight_g)}</td>
                      <td className="py-2.5 px-3 text-right">{formatWeight(it.estimated_stone_weight_g)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700 dark:text-amber-400">
                        {formatWeight(it.estimated_net_weight_g)}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(it.metal_rate_per_gram)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(it.metal_value)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {it.wastage_percent}% ({formatCurrency(it.wastage_value)})
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatCurrency(it.making_charge_amount + (it.stone_charge || 0))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(it.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Requirements & Instructions */}
          {(estimation.customer_requirements || estimation.general_notes) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Customer Requirements & Craftsmanship Notes
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {estimation.customer_requirements || estimation.general_notes}
              </p>
            </div>
          )}

          {/* Disclaimer Box */}
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
            <h5 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Important Estimation Terms & Disclaimer
            </h5>
            <ul className="list-disc list-inside text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
              <li>This document is a price estimate only and does not constitute a sale, bill, or receipt.</li>
              <li>Customer reference photos are visual guidelines. Handcrafted bespoke jewellery may have subtle variations.</li>
              <li>All weights shown are <strong>ESTIMATED</strong>. Final billing will measure actual gross and net weights.</li>
              <li>Rate snapshot is valid until {formatDate(estimation.valid_until)}.</li>
            </ul>
          </div>
        </div>

        {/* Right Sidebar: Financial Breakdown & Status Controls */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Quotation Summary
            </h4>

            <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Subtotal Metal Value:</span>
                <span className="font-medium">{formatCurrency(estimation.subtotal_metal_value)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Wastage / VA:</span>
                <span className="font-medium">{formatCurrency(estimation.total_wastage_value)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Making Charges:</span>
                <span className="font-medium">{formatCurrency(estimation.total_making_charges)}</span>
              </div>
              {estimation.total_stone_charges > 0 && (
                <div className="flex justify-between">
                  <span>Stone / Gem Charges:</span>
                  <span className="font-medium">{formatCurrency(estimation.total_stone_charges)}</span>
                </div>
              )}
              {estimation.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(estimation.discount_amount)}</span>
                </div>
              )}
              {estimation.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>Estimated GST ({estimation.tax_percent}%):</span>
                  <span className="font-medium">{formatCurrency(estimation.tax_amount)}</span>
                </div>
              )}

              {/* Total Card */}
              <div className="pt-3 border-t-2 border-amber-500/30">
                <div className="bg-gray-900 text-amber-400 rounded-xl p-4 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                    Estimated Total Price
                  </span>
                  <span className="text-2xl font-black block">
                    {formatCurrency(estimation.total_estimated_amount)}
                  </span>
                  <span className="text-[10px] text-amber-300/70 font-normal">
                    (Final billing calculated on completion weight)
                  </span>
                </div>
              </div>
            </div>

            {/* Status change selector */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                Update Estimation Status:
              </label>
              <select
                disabled={actionLoading || estimation.status === 'converted_to_order'}
                value={estimation.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent / Quoted</option>
                <option value="approved">Approved by Customer</option>
                <option value="cancelled">Cancelled</option>
                <option value="converted_to_order" disabled>
                  Converted to Order
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Convert to Custom Order Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Convert Estimation to Custom Order
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This moves the customer reference design into the <strong>Manufacturing Workshop</strong>.
              Inventory stock will still NOT be reduced until the jewel is completed, weighed, and billed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Total:
                </label>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 p-2 rounded-lg bg-gray-100 dark:bg-gray-900">
                  {formatCurrency(estimation.total_estimated_amount)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Advance Payment Received (₹):
                </label>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-semibold"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Remaining Est. Balance: {formatCurrency(Math.max(0, estimation.total_estimated_amount - advancePaid))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Expected Delivery Date:
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Workshop Instructions / Notes:
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Expedited crafting for wedding, special ruby stone setting..."
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowConvertModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConvertToOrder}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                {actionLoading ? 'Converting...' : 'Confirm & Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
