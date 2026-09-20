import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarcodeScannerModal } from '@/components/common/BarcodeScannerModal';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { Product, Customer, RetailInvoiceItem, RetailInvoice, BusinessSettings, MetalRate } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { ShoppingCart, Search, Plus, Minus, Trash2, Printer, Barcode, UserCheck, Percent, Sliders, ShieldCheck, CheckCircle } from 'lucide-react';

export const RetailPOS: React.FC = () => {
  const navigate = useNavigate();
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [metalRate, setMetalRate] = useState<MetalRate | null>(null);

  const loadPosData = useCallback(async () => {
    try {
      const [cData, pData, sData, rData] = await Promise.all([
        dataService.getCustomers(),
        dataService.getProducts(),
        dataService.getBusinessSettings(),
        dataService.getMetalRates(),
      ]);
      setCustomersList(cData);
      setProductsList(pData);
      setSettings(sData);

      if (rData && rData.length > 0) {
        const topRate = rData[0];
        setMetalRate(topRate);
        setManualGoldRate(topRate.gold_24k_per_gram);
        setManualSilverRate(topRate.silver_per_gram);
      }

      if (cData.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(cData[0].id);
      }
    } catch (e) {
      console.error('Error loading POS data:', e);
    }
  }, []);

  useEffect(() => {
    loadPosData();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'customers' || tableName === 'products' || tableName === 'metal_rates' || tableName === 'business_settings' || tableName === 'general') {
        loadPosData();
      }
    });
    return () => unsubscribe();
  }, [loadPosData]);

  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cartItems, setCartItems] = useState<RetailInvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Customer-Wise Manual Billing Adjustments
  const [manualGoldRate, setManualGoldRate] = useState<number>(7450);
  const [manualSilverRate, setManualSilverRate] = useState<number>(89.5);
  const [manualWastageVal, setManualWastageVal] = useState<number>(0);
  const [manualWastageUnit, setManualWastageUnit] = useState<'percent' | 'grams'>('percent');
  const [manualSetharamVal, setManualSetharamVal] = useState<number>(0); // சேதாரம்
  const [manualSetharamUnit, setManualSetharamUnit] = useState<'percent' | 'inr'>('inr');
  const [manualMakingCharge, setManualMakingCharge] = useState<number>(0);
  const [gstEnabled, setGstEnabled] = useState<boolean>(false); // Manual GST control
  const [manualGstPercent, setManualGstPercent] = useState<number>(3.0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'split'>('upi');
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [isCustomPaid, setIsCustomPaid] = useState<boolean>(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitBank, setSplitBank] = useState<number>(0);

  const [notes, setNotes] = useState('');

  const selectedCustomer = customersList.find((c) => c.id === selectedCustomerId) || customersList[0];

  const [stockError, setStockError] = useState<string | null>(null);

  const showStockError = (msg: string) => {
    setStockError(msg);
    setTimeout(() => setStockError(null), 3500);
  };

  const handleAddProductToCart = (prod: Product) => {
    const availQty = prod.quantity ?? 0;
    const existingItem = cartItems.find((item) => item.product_id === prod.id);
    const currentCartQty = existingItem ? existingItem.quantity : 0;

    if (availQty <= 0) {
      showStockError(`Product "${prod.name}" is currently out of stock (0 units).`);
      return;
    }

    if (currentCartQty + 1 > availQty) {
      showStockError(`Insufficient stock for "${prod.name}". Only ${availQty} units are available.`);
      return;
    }

    const isGold = prod.metal_type === 'gold';
    const ratePerGram = isGold ? manualGoldRate : manualSilverRate;
    const metalVal = Number((prod.net_weight_g * ratePerGram).toFixed(2));
    const makingCharge = (prod.making_charge_rate || 0) + (prod.labour_charge || 0);
    const itemWastageVal = Number(((prod.net_weight_g * (prod.wastage_percent || 0) * ratePerGram) / 100).toFixed(2));
    const finalVal = metalVal + makingCharge + itemWastageVal;

    const existingIndex = cartItems.findIndex((item) => item.product_id === prod.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].line_total = updated[existingIndex].quantity * finalVal;
      setCartItems(updated);
    } else {
      const newItem: RetailInvoiceItem = {
        id: ensureValidUUID(),
        invoice_id: '',
        product_id: prod.id,
        product_name_snapshot: prod.name,
        sku_snapshot: prod.sku,
        metal_type: prod.metal_type,
        purity: prod.purity,
        gross_weight_g: prod.gross_weight_g,
        stone_weight_g: prod.stone_weight_g || 0,
        net_weight_g: prod.net_weight_g,
        quantity: 1,
        metal_rate_snapshot: ratePerGram,
        metal_value: metalVal,
        making_charge: prod.making_charge_rate || 0,
        labour_charge: prod.labour_charge || 0,
        wastage_percent: prod.wastage_percent || 0,
        wastage_weight_g: prod.wastage_weight_g || 0,
        wastage_value: itemWastageVal,
        discount: 0,
        line_total: finalVal,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter((i) => i.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const itemToUpdate = cartItems.find((i) => i.id === itemId);
    if (itemToUpdate && delta > 0) {
      const prod = productsList.find((p) => p.id === itemToUpdate.product_id);
      const availQty = prod?.quantity ?? 999;
      if (itemToUpdate.quantity + delta > availQty) {
        showStockError(`Insufficient stock for "${prod?.name || 'this item'}". Available: ${availQty} units.`);
        return;
      }
    }

    setCartItems((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const unitPrice = item.line_total / item.quantity;
            return {
              ...item,
              quantity: newQty,
              line_total: Number((newQty * unitPrice).toFixed(2)),
            };
          }
          return item;
        })
        .filter(Boolean) as RetailInvoiceItem[]
    );
  };

  // Calculations
  const subtotalMetalValue = cartItems.reduce((sum, item) => sum + item.metal_value * item.quantity, 0);
  const itemMakingCharges = cartItems.reduce((sum, item) => sum + (item.making_charge + item.labour_charge) * item.quantity, 0);
  const totalGrossWeight = cartItems.reduce((sum, item) => sum + item.gross_weight_g * item.quantity, 0);
  const totalNetWeight = cartItems.reduce((sum, item) => sum + item.net_weight_g * item.quantity, 0);

  // Manual Wastage
  const customWastageAmount =
    manualWastageUnit === 'percent'
      ? (subtotalMetalValue * manualWastageVal) / 100
      : manualWastageVal * manualGoldRate;

  // Manual Setharam (சேதாரம்)
  const customSetharamAmount =
    manualSetharamUnit === 'percent'
      ? (subtotalMetalValue * manualSetharamVal) / 100
      : manualSetharamVal;

  const combinedMakingAndWastage = itemMakingCharges + customWastageAmount + customSetharamAmount + manualMakingCharge;
  const rawSubtotal = subtotalMetalValue + combinedMakingAndWastage;
  const taxableSubtotal = Math.max(0, rawSubtotal - discountAmount);
  const taxAmount = gstEnabled ? (taxableSubtotal * manualGstPercent) / 100 : 0;
  const grandTotal = Math.round(taxableSubtotal + taxAmount);

  // Track paid amount defaults when grandTotal changes
  useEffect(() => {
    if (!isCustomPaid && paymentMode !== 'split') {
      setCustomPaidAmount(grandTotal);
    }
  }, [grandTotal, isCustomPaid, paymentMode]);

  // Payment Calculations
  const totalPaidAmount = paymentMode === 'split'
    ? (splitCash || 0) + (splitUpi || 0) + (splitCard || 0) + (splitBank || 0)
    : (isCustomPaid ? customPaidAmount : grandTotal);

  const remainingBalance = Math.max(0, grandTotal - totalPaidAmount);

  let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (remainingBalance === 0 && totalPaidAmount > 0) {
    paymentStatus = 'paid';
  } else if (totalPaidAmount > 0) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalizeBill = async () => {
    if (cartItems.length === 0) {
      alert('Please add at least one product item to the bill before finalizing.');
      return;
    }

    if (totalPaidAmount > grandTotal) {
      alert(`Payment amount (${formatCurrency(totalPaidAmount)}) cannot exceed Grand Total (${formatCurrency(grandTotal)}).`);
      return;
    }

    const activeCustomer = selectedCustomer || {
      id: ensureValidUUID(),
      full_name: 'Walk-in / Cash Customer',
      phone: '9999999999',
      city: 'Trichy',
      total_purchases: 0,
      loyalty_points: 0,
    };

    const custName = (activeCustomer.full_name || (activeCustomer as any).name || 'Walk-in / Cash Customer').trim() || 'Walk-in Customer';
    const custPhone = (activeCustomer.phone || '').trim();

    setIsSubmitting(true);

    try {
      const prefix = settings?.invoice_prefix || 'INV-2026-';
      const nextNum = settings?.next_invoice_number || 1005;
      const invoiceNo = `${prefix}${nextNum}`;
      const invoiceId = ensureValidUUID();

      const createdInvoice = await dataService.createRetailInvoice(
        {
          id: invoiceId,
          invoice_number: invoiceNo,
          customer_id: activeCustomer.id ? ensureValidUUID(activeCustomer.id) : undefined,
          customer_name: custName,
          customer_phone: custPhone,
          invoice_date: new Date().toISOString().split('T')[0],
          subtotal_metal_value: subtotalMetalValue,
          total_making_charges: itemMakingCharges + manualMakingCharge + customSetharamAmount,
          total_labour_charges: 0,
          total_wastage_value: customWastageAmount,
          discount_amount: discountAmount,
          tax_percent: gstEnabled ? manualGstPercent : 0,
          tax_amount: taxAmount,
          round_off: 0,
          total_amount: grandTotal,
          paid_amount: totalPaidAmount,
          balance_due: remainingBalance,
          payment_status: paymentStatus,
          status: 'finalized',
          items: cartItems,
          notes: notes || (gstEnabled ? 'GST Invoice' : 'Bill without GST'),
          created_at: new Date().toISOString(),
        },
        {
          id: ensureValidUUID(),
          invoice_id: invoiceId,
          payment_date: new Date().toISOString().split('T')[0],
          amount: totalPaidAmount,
          payment_mode: paymentMode,
          reference_number: `REF-${Date.now()}`,
        }
      );

      navigate(`/invoices/${createdInvoice.id}`);
    } catch (err: any) {
      console.error('Finalize bill error:', err);
      alert(`Error Finalizing Bill: ${err?.message || 'Failed to create invoice'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = productsList.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
  );

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        title="Retail POS Billing Counter"
        subtitle="Fast checkout with customer-wise manual GST, wastage, சேதாரம் adjustments, real-time balance calculations, and inventory stock sync"
        breadcrumb={['Home', 'Retail POS']}
        actionBtn={
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            <Barcode className="h-4 w-4 text-gold-600" />
            Scan Barcode
          </button>
        }
      />

      {stockError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900 shadow-md dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
          <span>⚠️</span> {stockError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* Left 7 Cols: Product Selector & Customer Select */}
        <div className="lg:col-span-7 space-y-4 min-w-0">
          {/* Customer Selection Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <UserCheck className="h-5 w-5 shrink-0 text-gold-600" />
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Selected Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="mt-0.5 w-full truncate rounded-lg border-0 bg-transparent text-xs font-bold text-charcoal-900 focus:outline-none dark:text-slate-100 cursor-pointer"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => navigate('/customers/add')}
              className="flex items-center justify-center gap-1.5 shrink-0 rounded-xl bg-slate-100 px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300 w-full sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5" /> New Customer
            </button>
          </div>

          {/* Product Search & Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-3 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search jewellery by name, SKU or scan barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1 min-w-0">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProductToCart(p)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-gold-500 hover:bg-gold-50/40 cursor-pointer dark:border-charcoal-800 dark:bg-charcoal-800/40 min-w-0"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="font-bold text-xs text-charcoal-900 dark:text-slate-100 truncate">{p.name}</h4>
                    <span className="text-[10px] text-slate-500 block truncate">
                      Net: {formatWeight(p.net_weight_g)} • Stock: {p.quantity} Pcs
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-serif text-xs font-bold text-amber-900 dark:text-gold-300 block">
                      {formatCurrency(p.retail_price)}
                    </span>
                    <span className="rounded bg-gold-500 px-2 py-0.5 text-[9px] font-bold text-charcoal-950 inline-block mt-1">
                      + Add
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CUSTOMER-WISE MANUAL BILLING ADJUSTMENTS CARD */}
          <div className="rounded-2xl border border-gold-400/40 bg-gold-50/30 p-4 dark:border-gold-800/40 dark:bg-gold-950/20 shadow-sm space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-gold-200/60 pb-2 dark:border-gold-800/40">
              <h4 className="font-serif text-xs font-bold text-amber-950 dark:text-gold-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="h-4 w-4 text-gold-600" />
                Customer-Wise Billing Adjustments (Manual Control)
              </h4>
              <span className="text-[10px] font-semibold text-slate-500">
                Applied only to current bill
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* Wastage */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Wastage</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.1"
                    value={manualWastageVal}
                    onChange={(e) => setManualWastageVal(Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                  />
                  <select
                    value={manualWastageUnit}
                    onChange={(e) => setManualWastageUnit(e.target.value as 'percent' | 'grams')}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-[11px] font-bold dark:border-charcoal-700 dark:bg-charcoal-800"
                  >
                    <option value="percent">%</option>
                    <option value="grams">Grams</option>
                  </select>
                </div>
              </div>

              {/* சேதாரம் / Additional Charge */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">சேதாரம் / Extra</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.1"
                    value={manualSetharamVal}
                    onChange={(e) => setManualSetharamVal(Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                  />
                  <select
                    value={manualSetharamUnit}
                    onChange={(e) => setManualSetharamUnit(e.target.value as 'percent' | 'inr')}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-[11px] font-bold dark:border-charcoal-700 dark:bg-charcoal-800"
                  >
                    <option value="inr">₹</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>

              {/* GST Toggle Switch */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">GST Charge</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setGstEnabled(!gstEnabled)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition-all ${
                      gstEnabled
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600 dark:bg-charcoal-800 dark:text-slate-400'
                    }`}
                  >
                    {gstEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                  {gstEnabled && (
                    <input
                      type="number"
                      step="0.1"
                      value={manualGstPercent}
                      onChange={(e) => setManualGstPercent(Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 bg-white p-1 text-center text-xs font-bold dark:border-charcoal-700 dark:bg-charcoal-800"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Cart & Bill Summary */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-lg flex flex-col justify-between min-h-[560px] min-w-0">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart className="h-5 w-5 text-gold-600 shrink-0" />
                  <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 truncate">
                    Bill Items ({cartItems.length})
                  </h3>
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-400 shrink-0">
                  Gold 24K: ₹{manualGoldRate}/g
                </span>
              </div>

              {/* Cart Table */}
              <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto pr-1 min-w-0">
                {cartItems.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center text-slate-400 text-xs">
                    <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                    <span>Cart is empty. Select products to add.</span>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 text-xs dark:border-charcoal-800 dark:bg-charcoal-800/40 min-w-0 gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-charcoal-900 dark:text-slate-100 truncate">{item.product_name_snapshot}</h5>
                        <p className="text-[10px] text-slate-500 truncate">
                          {formatWeight(item.net_weight_g)} @ ₹{item.metal_rate_snapshot}/g
                        </p>
                      </div>

                      {/* Quantity Add / Minus Controls */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-charcoal-800 rounded-lg p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-charcoal-700 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Decrease Quantity (-)"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 font-bold font-mono text-xs text-charcoal-900 dark:text-slate-100 min-w-[18px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-charcoal-700 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Increase Quantity (+)"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <strong className="font-serif text-xs text-amber-900 dark:text-gold-300">
                          {formatCurrency(item.line_total)}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bill Financial Summary */}
            <div className="border-t border-slate-200 pt-3 dark:border-charcoal-800 space-y-2 text-xs min-w-0">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Metal Value Subtotal:</span>
                <strong className="text-charcoal-900 dark:text-slate-100">{formatCurrency(subtotalMetalValue)}</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Making, Wastage & சேதாரம்:</span>
                <strong className="text-charcoal-900 dark:text-slate-100">{formatCurrency(combinedMakingAndWastage)}</strong>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-slate-600 dark:text-slate-400">Discount (INR):</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 p-1 text-right text-xs font-bold dark:border-charcoal-800 dark:bg-charcoal-800"
                />
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST ({gstEnabled ? `${manualGstPercent}%` : 'Disabled'}):</span>
                <strong className="text-charcoal-900 dark:text-slate-100">{formatCurrency(taxAmount)}</strong>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-2.5 dark:border-charcoal-800">
                <span className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">Grand Total:</span>
                <span className="font-serif text-2xl font-bold text-amber-900 dark:text-gold-300">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Payment Mode Selector */}
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Mode</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['cash', 'upi', 'card', 'split'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode);
                        if (mode !== 'split' && !isCustomPaid) {
                          setCustomPaidAmount(grandTotal);
                        }
                      }}
                      className={`rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                        paymentMode === mode
                          ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                          : 'bg-slate-100 text-slate-600 dark:bg-charcoal-800 dark:text-slate-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Mode Breakdown Inputs */}
              {paymentMode === 'split' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 space-y-2 dark:border-charcoal-800 dark:bg-charcoal-800/40 mt-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Split Payment Breakdown (₹)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold">Cash (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={splitCash || ''}
                        onChange={(e) => setSplitCash(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 p-1.5 text-right font-mono text-xs font-bold dark:border-charcoal-700 dark:bg-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold">UPI (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={splitUpi || ''}
                        onChange={(e) => setSplitUpi(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 p-1.5 text-right font-mono text-xs font-bold dark:border-charcoal-700 dark:bg-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold">Card (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={splitCard || ''}
                        onChange={(e) => setSplitCard(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 p-1.5 text-right font-mono text-xs font-bold dark:border-charcoal-700 dark:bg-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold">Bank (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={splitBank || ''}
                        onChange={(e) => setSplitBank(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 p-1.5 text-right font-mono text-xs font-bold dark:border-charcoal-700 dark:bg-charcoal-900"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Payment Received ({paymentMode.toUpperCase()}):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPaidAmount(grandTotal);
                          setIsCustomPaid(true);
                        }}
                        className="rounded bg-gold-100 px-2 py-0.5 text-[9px] font-bold text-amber-900 hover:bg-gold-200 dark:bg-gold-950/60 dark:text-gold-300"
                      >
                        Full ({formatCurrency(grandTotal)})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPaidAmount(0);
                          setIsCustomPaid(true);
                        }}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-400"
                      >
                        Clear (₹0)
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={customPaidAmount}
                    onChange={(e) => {
                      setCustomPaidAmount(Number(e.target.value));
                      setIsCustomPaid(true);
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2 text-right font-mono text-sm font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                  />
                </div>
              )}

              {/* PROMINENT PAYMENT BALANCE & STATUS CARD */}
              <div className="mt-3 rounded-2xl border border-gold-400/60 bg-gold-50/50 p-3.5 dark:border-gold-800/50 dark:bg-gold-950/30 space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Paid:</span>
                  <span className="font-mono font-bold text-charcoal-900 dark:text-slate-100 text-sm">
                    {formatCurrency(totalPaidAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-gold-200/80 pt-2 dark:border-gold-800/60">
                  <span className="font-serif font-bold text-red-700 dark:text-red-400 text-sm">
                    Remaining Balance Due:
                  </span>
                  <span className="font-serif font-extrabold text-red-700 dark:text-red-400 text-base">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gold-200/50 dark:border-gold-800/30">
                  <span className="text-slate-500 font-semibold">Payment Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                      paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : paymentStatus === 'partial'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {paymentStatus === 'paid' ? 'STATUS: PAID' : paymentStatus === 'partial' ? 'STATUS: PARTIALLY PAID' : 'STATUS: UNPAID'}
                  </span>
                </div>
              </div>

              {/* Overpayment Warning */}
              {totalPaidAmount > grandTotal && (
                <div className="rounded-xl bg-red-100 p-2.5 text-center text-[11px] font-bold text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200">
                  ⚠️ Payment amount ({formatCurrency(totalPaidAmount)}) cannot exceed Invoice Total ({formatCurrency(grandTotal)}).
                </div>
              )}

              <button
                onClick={handleFinalizeBill}
                disabled={cartItems.length === 0 || isSubmitting || totalPaidAmount > grandTotal}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal-950 border-t-transparent" />
                    <span>Finalizing Invoice...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" /> <span>Finalize & Generate Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          const match = productsList.find((p) => p.barcode === code || p.sku === code);
          if (match) handleAddProductToCart(match);
        }}
      />
    </div>
  );
};
