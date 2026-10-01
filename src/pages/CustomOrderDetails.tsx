import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReferenceImageGallery } from '@/components/estimations/ReferenceImageGallery';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { CustomOrder, CustomOrderStatus } from '@/types';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';

type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer';
import {
  ArrowLeft,
  Sparkles,
  Hammer,
  Clock,
  PackageCheck,
  Truck,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  User,
  Scale,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export const CustomOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<CustomOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Convert to Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [actualGrossWt, setActualGrossWt] = useState<number>(0);
  const [actualStoneWt, setActualStoneWt] = useState<number>(0);
  const [actualMetalRate, setActualMetalRate] = useState<number>(0);
  const [actualMakingCharges, setActualMakingCharges] = useState<number>(0);
  const [actualWastageValue, setActualWastageValue] = useState<number>(0);
  const [actualStoneCharges, setActualStoneCharges] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await dataService.getCustomOrderById(id);
      setOrder(data);

      if (data) {
        // Pre-fill actual weights from estimated items
        const estNet = (data.items || []).reduce((acc, it) => acc + (it.estimated_net_weight_g || 0), 0);
        const estGross = (data.items || []).reduce((acc, it) => acc + (it.estimated_gross_weight_g || 0), 0);
        const estStone = (data.items || []).reduce((acc, it) => acc + (it.estimated_stone_weight_g || 0), 0);
        const estRate = data.items?.[0]?.metal_rate_per_gram || 7100;
        const estMC = (data.items || []).reduce((acc, it) => acc + (it.making_charge_amount || 0), 0);
        const estWastage = (data.items || []).reduce((acc, it) => acc + (it.wastage_value || 0), 0);
        const estStoneChg = (data.items || []).reduce((acc, it) => acc + (it.stone_charge || 0), 0);

        setActualGrossWt(data.actual_gross_weight_g || estGross);
        setActualStoneWt(data.actual_stone_weight_g || estStone);
        setActualMetalRate(data.actual_metal_rate || estRate);
        setActualMakingCharges(data.actual_making_charges || estMC);
        setActualWastageValue(data.actual_wastage_value || estWastage);
        setActualStoneCharges(data.actual_stone_charges || estStoneChg);
      }
    } catch (err) {
      console.error('Error loading custom order:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
    const unsub = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'custom_orders' || tableName === 'retail_invoices' || tableName === 'general') {
        loadOrder();
      }
    });
    return () => unsub();
  }, [loadOrder]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading custom order...</div>;
  }

  if (!order) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Order not found.</p>
        <button
          type="button"
          onClick={() => navigate('/custom-orders')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-600 text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Custom Orders
        </button>
      </div>
    );
  }

  const handleStatusUpdate = async (newStatus: CustomOrderStatus) => {
    setActionLoading(true);
    try {
      await dataService.updateCustomOrderStatus(order.id, newStatus);
      await loadOrder();
    } catch (err: any) {
      alert(`Error updating order status: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const actualNetWt = Math.max(0, actualGrossWt - actualStoneWt);
  const actualMetalValue = Math.round(actualNetWt * actualMetalRate);
  const actualSubtotal =
    actualMetalValue + actualWastageValue + actualMakingCharges + actualStoneCharges;
  const actualGST = Math.round(actualSubtotal * 0.03); // 3% GST
  const finalCalculatedTotal = actualSubtotal + actualGST;
  const finalBalanceDue = Math.max(0, finalCalculatedTotal - order.advance_paid);

  const handleGenerateInvoice = async () => {
    if (actualNetWt <= 0) {
      alert('Actual net weight must be greater than 0.');
      return;
    }
    setActionLoading(true);
    try {
      const result = await dataService.convertCustomOrderToInvoice(
        order.id,
        {
          actual_gross_weight_g: actualGrossWt,
          actual_stone_weight_g: actualStoneWt,
          actual_net_weight_g: actualNetWt,
          actual_metal_rate: actualMetalRate,
          actual_making_charges: actualMakingCharges,
          actual_wastage_value: actualWastageValue,
          actual_stone_charges: actualStoneCharges,
          final_invoice_amount: finalCalculatedTotal,
        },
        paymentMode,
        paymentReference
      );
      setShowInvoiceModal(false);
      navigate(`/invoices/${result.invoice.id}`);
    } catch (err: any) {
      alert(`Failed to generate retail invoice: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/custom-orders')}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {order.order_number}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase">
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Converted from Estimation:{' '}
              <strong
                className="text-amber-600 hover:underline cursor-pointer"
                onClick={() => navigate(`/estimations/${order.estimation_id}`)}
              >
                {order.estimation_number}
              </strong>{' '}
              | Order Date: {formatDate(order.order_date)}
            </p>
          </div>
        </div>

        {/* Action button if ready for billing */}
        <div className="flex items-center gap-2">
          {order.converted_invoice_id ? (
            <button
              type="button"
              onClick={() => navigate(`/invoices/${order.converted_invoice_id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
            >
              <FileText className="w-4 h-4" /> View Final Retail Invoice
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              <Scale className="w-4 h-4" /> Record Actual Weight & Bill
            </button>
          )}
        </div>
      </div>

      {/* Progress Status Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Manufacturing Lifecycle Status
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'design_confirmed', label: '1. Design Confirmed', icon: Clock },
            { id: 'manufacturing', label: '2. In Workshop', icon: Hammer },
            { id: 'ready', label: '3. Crafting Ready', icon: PackageCheck },
            { id: 'delivered', label: '4. Delivered & Billed', icon: Truck },
          ].map((st) => {
            const Icon = st.icon;
            const isCurrent = order.status === st.id;
            return (
              <button
                key={st.id}
                type="button"
                disabled={actionLoading || order.converted_invoice_id != null}
                onClick={() => handleStatusUpdate(st.id as CustomOrderStatus)}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-xs">{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Reference Design Photos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Reference Design Photos (Goldsmith Workshop Guide)
            </h3>
            <ReferenceImageGallery images={order.reference_images || []} readOnly={true} />
          </div>

          {/* Items & Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Order Specifications
            </h3>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {it.item_name}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      {it.purity.toUpperCase()} | {it.jewellery_type}
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      Est. Gross: {it.estimated_gross_weight_g}g | Est. Net: <strong>{it.estimated_net_weight_g}g</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(it.line_total)}
                  </span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Workshop Notes
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Customer & Payment Financials */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Order Financials
            </h4>

            <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Estimated Total:</span>
                <span className="font-semibold">{formatCurrency(order.estimated_total)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Advance Paid:</span>
                <span>{formatCurrency(order.advance_paid)}</span>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between text-amber-700 dark:text-amber-400 font-bold text-sm">
                <span>Remaining Balance Due:</span>
                <span>{formatCurrency(order.balance_due)}</span>
              </div>
            </div>

            {order.expected_delivery_date && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs">
                <span className="text-gray-500 block">Expected Delivery:</span>
                <strong className="text-amber-900 dark:text-amber-200">
                  {formatDate(order.expected_delivery_date)}
                </strong>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Customer Details
            </h4>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-xs text-gray-600 dark:text-gray-400">Phone: {order.customer_phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Convert to Final Retail Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Record Actual Weights & Generate Retail Bill
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Enter the exact finished measurements recorded on the calibrated scale.
              This will generate an official Retail Invoice and deduct inventory material movement.
            </p>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Actual Gross Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={actualGrossWt}
                    onChange={(e) => setActualGrossWt(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Actual Stone Weight (g)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={actualStoneWt}
                    onChange={(e) => setActualStoneWt(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  Actual Net Weight:
                </span>
                <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                  {actualNetWt.toFixed(3)} g
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Gold / Silver Rate (₹/g)
                  </label>
                  <input
                    type="number"
                    value={actualMetalRate}
                    onChange={(e) => setActualMetalRate(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Actual Metal Value (₹)
                  </label>
                  <div className="text-xs p-2 rounded-lg bg-gray-100 dark:bg-gray-900 font-semibold">
                    {formatCurrency(actualMetalValue)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Wastage (₹)
                  </label>
                  <input
                    type="number"
                    value={actualWastageValue}
                    onChange={(e) => setActualWastageValue(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Making Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={actualMakingCharges}
                    onChange={(e) => setActualMakingCharges(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Stone Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={actualStoneCharges}
                    onChange={(e) => setActualStoneCharges(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Billing Calculation Breakdown */}
              <div className="p-3 bg-gray-900 text-white rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal + GST (3%):</span>
                  <span>{formatCurrency(finalCalculatedTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Less Advance Paid:</span>
                  <span>-{formatCurrency(order.advance_paid)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold text-sm pt-1 border-t border-gray-800">
                  <span>Final Balance to Collect:</span>
                  <span>{formatCurrency(finalBalanceDue)}</span>
                </div>
              </div>

              {/* Payment Mode for Balance */}
              {finalBalanceDue > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / GPay / PhonePe</option>
                      <option value="card">Card / POS</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Transaction Ref (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI Ref / Cheque No"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowInvoiceModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleGenerateInvoice}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {actionLoading ? 'Finalizing...' : 'Finalize & Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
