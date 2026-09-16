import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Purchase, MetalType, MetalPurity, Supplier, Customer } from '@/types';
import { getLocalDb, savePurchaseRecord, updatePurchaseRecord } from '@/lib/supabase';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { PlusCircle, Save, Building2, Calendar, FileText, Scale, Coins, DollarSign, UserPlus, AlertCircle } from 'lucide-react';

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPurchase?: Purchase | null;
}

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editPurchase,
}) => {
  const navigate = useNavigate();
  const db = getLocalDb();

  // Get strictly records registered as Supplier / Manufacturer
  const supplierCustomers = (db.customers || []).filter((c) => c.customer_type === 'supplier');
  const dbSuppliers = db.suppliers || [];

  const supplierMap = new Map<string, { id: string; name: string; phone?: string }>();

  dbSuppliers.forEach((s) => {
    supplierMap.set(s.id, { id: s.id, name: s.supplier_name, phone: s.phone });
  });

  supplierCustomers.forEach((c) => {
    const name = c.shop_name || c.full_name;
    if (!supplierMap.has(c.id)) {
      supplierMap.set(c.id, { id: c.id, name, phone: c.phone });
    }
  });

  const availableSuppliers = Array.from(supplierMap.values());

  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [metalType, setMetalType] = useState<MetalType>('gold');
  const [purity, setPurity] = useState<MetalPurity>('24k');
  const [grossWeightG, setGrossWeightG] = useState<number | ''>('');
  const [deductionWeightG, setDeductionWeightG] = useState<number | ''>(0);
  const [purchaseRatePerGram, setPurchaseRatePerGram] = useState<number | ''>(7420);
  const [amountPaid, setAmountPaid] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'card' | 'gold_916' | 'split'>('bank_transfer');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (editPurchase) {
      setPurchaseDate(editPurchase.purchase_date);
      setSupplierId(editPurchase.supplier_id);
      setSupplierName(editPurchase.supplier_name);
      setSupplierPhone(editPurchase.supplier_phone || '');
      setSupplierInvoiceNumber(editPurchase.supplier_invoice_number);
      setMetalType(editPurchase.metal_type);
      setPurity(editPurchase.purity);
      setGrossWeightG(editPurchase.gross_weight_g);
      setDeductionWeightG(editPurchase.deduction_weight_g);
      setPurchaseRatePerGram(editPurchase.purchase_rate_per_gram);
      setAmountPaid(editPurchase.amount_paid);
      setPaymentMethod(editPurchase.payment_method || 'bank_transfer');
      setNotes(editPurchase.notes || '');
    } else {
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      if (availableSuppliers.length > 0) {
        setSupplierId(availableSuppliers[0].id);
        setSupplierName(availableSuppliers[0].name);
        setSupplierPhone(availableSuppliers[0].phone || '');
      } else {
        setSupplierId('');
        setSupplierName('');
        setSupplierPhone('');
      }
      setSupplierInvoiceNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
      setMetalType('gold');
      setPurity('24k');
      setGrossWeightG('');
      setDeductionWeightG(0);
      setPurchaseRatePerGram(7420);
      setAmountPaid(0);
      setPaymentMethod('bank_transfer');
      setNotes('');
    }
  }, [editPurchase, isOpen]);

  // Handle supplier select change
  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const sup = availableSuppliers.find((s) => s.id === id);
    if (sup) {
      setSupplierName(sup.name);
      setSupplierPhone(sup.phone || '');
    }
  };

  // Handle Metal Change default rate
  const handleMetalChange = (type: MetalType) => {
    setMetalType(type);
    if (type === 'gold') {
      setPurity('24k');
      setPurchaseRatePerGram(7420);
    } else if (type === 'silver') {
      setPurity('925_silver');
      setPurchaseRatePerGram(89.5);
    }
  };

  // Auto Calculations
  const grossNum = typeof grossWeightG === 'number' ? grossWeightG : 0;
  const dedNum = typeof deductionWeightG === 'number' ? deductionWeightG : 0;
  const netWeightG = Math.max(0, grossNum - dedNum);

  const rateNum = typeof purchaseRatePerGram === 'number' ? purchaseRatePerGram : 0;
  const totalCost = netWeightG * rateNum;

  const paidNum = typeof amountPaid === 'number' ? amountPaid : 0;
  const balancePayable = Math.max(0, totalCost - paidNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('Please enter supplier/refinery name');
      return;
    }
    if (netWeightG <= 0) {
      alert('Net weight must be greater than 0');
      return;
    }
    if (rateNum <= 0) {
      alert('Please enter a valid purchase rate per gram');
      return;
    }

    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (balancePayable <= 0) {
      status = 'paid';
    } else if (paidNum > 0) {
      status = 'partial';
    }

    if (editPurchase) {
      const updated: Purchase = {
        ...editPurchase,
        purchase_date: purchaseDate,
        supplier_id: supplierId || `sup-${Date.now()}`,
        supplier_name: supplierName,
        supplier_phone: supplierPhone,
        supplier_invoice_number: supplierInvoiceNumber,
        metal_type: metalType,
        purity,
        gross_weight_g: grossNum,
        deduction_weight_g: dedNum,
        net_weight_g: netWeightG,
        purchase_rate_per_gram: rateNum,
        total_cost: totalCost,
        amount_paid: paidNum,
        balance_payable: balancePayable,
        payment_status: status,
        payment_method: paymentMethod,
        notes,
      };
      updatePurchaseRecord(updated);
    } else {
      const newPurchaseId = `pur-${Date.now()}`;
      const newPurchaseNumber = `PUR-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newPurchase: Purchase = {
        id: newPurchaseId,
        purchase_number: newPurchaseNumber,
        purchase_date: purchaseDate,
        supplier_id: supplierId || `sup-${Date.now()}`,
        supplier_name: supplierName,
        supplier_phone: supplierPhone,
        supplier_invoice_number: supplierInvoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        metal_type: metalType,
        purity,
        gross_weight_g: grossNum,
        deduction_weight_g: dedNum,
        net_weight_g: netWeightG,
        purchase_rate_per_gram: rateNum,
        total_cost: totalCost,
        amount_paid: paidNum,
        balance_payable: balancePayable,
        payment_status: status,
        payment_method: paymentMethod,
        notes,
        stock_added: true,
        created_at: new Date().toISOString(),
      };

      const initialPay = paidNum > 0 ? {
        id: `pur-pay-${Date.now()}`,
        purchase_id: newPurchaseId,
        payment_date: purchaseDate,
        amount: paidNum,
        payment_mode: paymentMethod,
        notes: `Initial payment at purchase creation`,
        created_at: new Date().toISOString(),
      } : undefined;

      savePurchaseRecord(newPurchase, initialPay);
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editPurchase ? `Edit Purchase Entry (${editPurchase.purchase_number})` : 'Record Raw Metal Purchase Entry'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Supplier & Invoice Info Section */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-charcoal-800 dark:bg-charcoal-800/40">
          <div className="flex items-center gap-2 text-amber-900 font-bold dark:text-gold-300">
            <Building2 className="h-4 w-4" />
            <span>Supplier & Refinery Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier / Refinery Name *
              </label>
              {availableSuppliers.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
                  >
                    {availableSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-amber-900 dark:border-gold-800 dark:bg-gold-950/30 dark:text-gold-300 space-y-2">
                  <p className="text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    No suppliers found. Please add a Supplier / Manufacturer in Customer CRM first.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/customers/add?type=supplier');
                    }}
                    className="flex items-center gap-1 rounded-md bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-charcoal-950 shadow-sm hover:bg-gold-600"
                  >
                    <UserPlus className="h-3 w-3" /> + Add Supplier in CRM
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier Bill / Invoice No *
              </label>
              <input
                type="text"
                placeholder="e.g. MRB-2026-891"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-semibold dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Metal Specifications & Weights Section */}
        <div className="rounded-xl border border-gold-300/60 bg-gold-50/40 p-4 space-y-3 dark:border-gold-800/40 dark:bg-gold-950/20">
          <div className="flex items-center gap-2 text-amber-900 font-bold dark:text-gold-300">
            <Scale className="h-4 w-4" />
            <span>Metal Commodity & Weight Details</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Metal Type *
              </label>
              <select
                value={metalType}
                onChange={(e) => handleMetalChange(e.target.value as MetalType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold capitalize dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Purity Standard *
              </label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value as MetalPurity)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              >
                {metalType === 'gold' ? (
                  <>
                    <option value="24k">24K (99.9% Pure)</option>
                    <option value="22k">22K (91.6% Pure)</option>
                    <option value="18k">18K (75.0% Pure)</option>
                  </>
                ) : (
                  <>
                    <option value="925_silver">925 Sterling Silver</option>
                    <option value="999_silver">999 Fine Silver</option>
                  </>
                )}
                <option value="other">Custom Purity</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Gross Weight (g) *
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={grossWeightG}
                onChange={(e) => setGrossWeightG(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-amber-900 dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-gold-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Deduction / Wastage (g)
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={deductionWeightG}
                onChange={(e) => setDeductionWeightG(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Auto Calculated Net Weight Banner */}
          <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-amber-200 dark:bg-charcoal-900 dark:border-charcoal-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Net Purchased Weight (Gross - Deduction):
            </span>
            <span className="font-mono text-sm font-bold text-amber-900 dark:text-gold-300">
              {formatWeight(netWeightG)}
            </span>
          </div>
        </div>

        {/* Pricing & Financial Calculation Section */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-charcoal-800 dark:bg-charcoal-800/40">
          <div className="flex items-center gap-2 text-slate-800 font-bold dark:text-slate-200">
            <Coins className="h-4 w-4 text-gold-600" />
            <span>Pricing & Purchase Payment Calculation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Purchase Rate / Gram (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 7420.00"
                value={purchaseRatePerGram}
                onChange={(e) => setPurchaseRatePerGram(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Amount Paid Now (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-emerald-600 dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold capitalize dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="cash">Cash Payment</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="card">Card Payment</option>
                <option value="gold_916">916 Fine Gold Settlement</option>
                <option value="split">Split Cash + Metal</option>
              </select>
            </div>
          </div>

          {/* Auto Calculated Summary Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 dark:bg-gold-950/30 dark:border-gold-800/40">
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-gold-400 block">Total Purchase Cost</span>
              <span className="font-serif text-lg font-bold text-amber-900 dark:text-gold-300">
                {formatCurrency(totalCost)}
              </span>
            </div>

            <div className={`rounded-lg p-3 border ${balancePayable <= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800'}`}>
              <span className="text-[10px] uppercase font-bold block">
                {balancePayable <= 0 ? 'Fully Paid' : 'Balance Payable to Supplier'}
              </span>
              <span className="font-serif text-lg font-bold">
                {formatCurrency(balancePayable)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes / Remarks */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Purchase Notes / Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 24K pure bar received with refinery hallmark purity certificate"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-charcoal-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <Save className="h-4 w-4" />
            {editPurchase ? 'Update Purchase Record' : 'Save & Record Purchase'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
