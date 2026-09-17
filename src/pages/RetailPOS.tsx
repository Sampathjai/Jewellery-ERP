import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarcodeScannerModal } from '@/components/common/BarcodeScannerModal';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { Product, Customer, RetailInvoiceItem, RetailInvoice, BusinessSettings, MetalRate } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { generateRetailInvoicePDF } from '@/lib/pdfGenerator';
import { ShoppingCart, Search, Plus, Trash2, Printer, Barcode, UserCheck, Percent, Sliders, ShieldCheck } from 'lucide-react';

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
      if (tableName === 'customers' || tableName === 'products' || tableName === 'metal_rates' || tableName === 'general') {
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
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'split'>('upi');
  const [notes, setNotes] = useState('');

  const selectedCustomer = customersList.find((c) => c.id === selectedCustomerId) || customersList[0];

  const handleAddProductToCart = (prod: Product) => {
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

  const handleFinalizeBill = async () => {
    if (cartItems.length === 0 || !selectedCustomer) return;

    const prefix = settings?.invoice_prefix || 'INV-2026-';
    const nextNum = settings?.next_invoice_number || 1005;
    const invoiceNo = `${prefix}${nextNum}`;
    const invoiceId = ensureValidUUID();

    const createdInvoice = await dataService.createRetailInvoice(
      {
        id: invoiceId,
        invoice_number: invoiceNo,
        customer_id: ensureValidUUID(selectedCustomer.id),
        customer_name: selectedCustomer.full_name,
        customer_phone: selectedCustomer.phone,
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
        paid_amount: grandTotal,
        balance_due: 0,
        payment_status: 'paid',
        status: 'finalized',
        items: cartItems,
        notes: notes || (gstEnabled ? 'GST Invoice' : 'Bill without GST'),
        created_at: new Date().toISOString(),
      },
      {
        id: ensureValidUUID(),
        invoice_id: invoiceId,
        payment_date: new Date().toISOString().split('T')[0],
        amount: grandTotal,
        payment_mode: paymentMode,
        reference_number: `REF-${Date.now()}`,
      }
    );

    // Auto PDF Generation & Download
    generateRetailInvoicePDF(createdInvoice, settings || undefined);
    navigate(`/invoices/${createdInvoice.id}`);
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
        subtitle="Fast checkout with customer-wise manual GST, wastage, சேதாரம் adjustments, and inventory stock sync"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-lg flex flex-col justify-between min-h-[520px] min-w-0">
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
              <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1 min-w-0">
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
                      <div className="flex items-center gap-2 shrink-0">
                        <strong className="font-serif text-xs text-amber-900 dark:text-gold-300">
                          {formatCurrency(item.line_total)}
                        </strong>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
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

              <div className="flex items-center justify-between gap-2 pt-1">
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

              <div className="flex justify-between items-center border-t border-slate-200 pt-3 dark:border-charcoal-800">
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
                      onClick={() => setPaymentMode(mode)}
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

              <button
                onClick={handleFinalizeBill}
                disabled={cartItems.length === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50 transition-all"
              >
                <Printer className="h-4 w-4" /> Finalize Bill & Print PDF Invoice
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
