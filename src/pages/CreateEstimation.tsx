import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReferenceImageGallery } from '@/components/estimations/ReferenceImageGallery';
import { dataService } from '@/lib/dataService';
import {
  Customer,
  Estimation,
  EstimationItem,
  EstimationReferenceImage,
  EstimationType,
  JewelleryType,
  MetalPurity,
  MetalType,
  MetalRate,
  BusinessSettings,
} from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  AlertCircle,
  Sparkles,
  Calculator,
  User,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';

const JEWELLERY_TYPES: JewelleryType[] = [
  'Chain',
  'Necklace',
  'Bangle',
  'Bracelet',
  'Ring',
  'Earrings',
  'Pendant',
  'Mangalsutra',
  'Thali',
  'Nose Ring',
  'Anklet',
  'Hip Chain',
  'Har',
  'Bangles Set',
  'Necklace Set',
  'Custom',
  'Other',
];

export const CreateEstimation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('cloneId');
  const revisionOfId = searchParams.get('revisionOf');
  const customerIdParam = searchParams.get('customerId');

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metalRates, setMetalRates] = useState<MetalRate[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Form State
  const [estimationType, setEstimationType] = useState<EstimationType>('reference_design');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');

  const [estimationDate, setEstimationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [validDays, setValidDays] = useState<number>(7);

  // Locked Gold/Silver Rate Snapshot
  const [gold22kRate, setGold22kRate] = useState<number>(7100);
  const [gold24kRate, setGold24kRate] = useState<number>(7650);
  const [silverRate, setSilverRate] = useState<number>(95);

  // Reference Images
  const [referenceImages, setReferenceImages] = useState<EstimationReferenceImage[]>([]);

  // Items
  const [items, setItems] = useState<EstimationItem[]>([]);

  // Overall Financial adjustments
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(3); // 3% GST on jewellery
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [customerRequirements, setCustomerRequirements] = useState<string>('');

  // Revision context if applicable
  const [parentEstimation, setParentEstimation] = useState<Estimation | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [cList, rList, sData] = await Promise.all([
        dataService.getCustomers(),
        dataService.getMetalRates(),
        dataService.getBusinessSettings(),
      ]);
      setCustomers(cList);
      setMetalRates(rList);
      setSettings(sData);

      if (rList && rList.length > 0) {
        const topRate = rList[0];
        setGold24kRate(topRate.gold_24k_per_gram || 7650);
        setGold22kRate(topRate.gold_22k_per_gram || 7100);
        setSilverRate(topRate.silver_per_gram || 95);
      }

      if (customerIdParam) {
        const cust = cList.find((c) => c.id === customerIdParam);
        if (cust) {
          setSelectedCustomerId(cust.id);
          setCustomerName(cust.full_name);
          setCustomerPhone(cust.phone || '');
          setCustomerAddress(cust.address || '');
          setCustomerEmail(cust.email || '');
        }
      }

      // Check revision or clone
      const sourceId = revisionOfId || cloneId;
      if (sourceId) {
        const source = await dataService.getEstimationById(sourceId);
        if (source) {
          if (revisionOfId) {
            setParentEstimation(source);
          }
          setEstimationType(source.estimation_type);
          setSelectedCustomerId(source.customer_id || '');
          setCustomerName(source.customer_name);
          setCustomerPhone(source.customer_phone || '');
          setCustomerEmail(source.customer_email || '');
          setCustomerAddress(source.customer_address || '');
          setGold22kRate(source.gold_22k_rate);
          setGold24kRate(source.gold_24k_rate);
          setSilverRate(source.silver_rate);
          setTaxPercent(source.tax_percent);
          setDiscountAmount(source.discount_amount);
          setGeneralNotes(source.general_notes || '');
          setCustomerRequirements(source.customer_requirements || '');
          setReferenceImages(source.reference_images || []);
          if (source.items && source.items.length > 0) {
            setItems(source.items.map((it) => ({ ...it, id: `item-${Date.now()}-${Math.random()}` })));
          }
        }
      }
    } catch (err) {
      console.error('Error loading initial estimation data:', err);
    }
  }, [cloneId, revisionOfId, customerIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate item line totals when inputs change
  const updateItem = (index: number, updates: Partial<EstimationItem>) => {
    const updated = [...items];
    const current = { ...updated[index], ...updates };

    // Net Weight
    const gross = Number(current.estimated_gross_weight_g) || 0;
    const stone = Number(current.estimated_stone_weight_g) || 0;
    const net = Math.max(0, gross - stone);
    current.estimated_net_weight_g = net;

    // Rate
    let rate = current.metal_rate_per_gram;
    if (updates.purity || updates.metal_type) {
      if (current.metal_type === 'silver') {
        rate = silverRate;
      } else if (current.purity === '24k') {
        rate = gold24kRate;
      } else if (current.purity === '22k') {
        rate = gold22kRate;
      } else if (current.purity === '18k') {
        rate = Math.round((gold24kRate * 18) / 24);
      } else if (current.purity === '14k') {
        rate = Math.round((gold24kRate * 14) / 24);
      }
      current.metal_rate_per_gram = rate;
    }

    // Metal Value
    const metalVal = net * (current.metal_rate_per_gram || rate);
    current.metal_value = Math.round(metalVal);

    // Wastage / VA
    const wastagePct = Number(current.wastage_percent) || 0;
    const wastageWt = (net * wastagePct) / 100;
    current.wastage_weight_g = Number(wastageWt.toFixed(3));
    current.wastage_value = Math.round(wastageWt * (current.metal_rate_per_gram || rate));

    // Making Charges
    const mcRate = Number(current.making_charge_rate) || 0;
    let mcAmt = 0;
    if (current.making_charge_type === 'per_gram') {
      mcAmt = net * mcRate;
    } else if (current.making_charge_type === 'percentage') {
      mcAmt = (metalVal * mcRate) / 100;
    } else {
      mcAmt = mcRate;
    }
    current.making_charge_amount = Math.round(mcAmt);

    // Total Line
    const stoneChg = Number(current.stone_charge) || 0;
    const otherChg = Number(current.other_charge) || 0;
    const disc = Number(current.discount) || 0;

    current.line_total = Math.round(
      current.metal_value +
        current.wastage_value +
        current.making_charge_amount +
        stoneChg +
        otherChg -
        disc
    );

    updated[index] = current;
    setItems(updated);
  };

  const addItem = () => {
    const newItem: EstimationItem = {
      id: `item-${Date.now()}`,
      item_type: estimationType,
      product_id: null,
      item_name: 'Custom Reference Model',
      jewellery_type: 'Ring',
      metal_type: 'gold',
      purity: '22k',
      quantity: 1,
      estimated_gross_weight_g: 8.0,
      estimated_stone_weight_g: 0,
      estimated_net_weight_g: 8.0,
      metal_rate_per_gram: gold22kRate,
      metal_value: 8.0 * gold22kRate,
      making_charge_type: 'percentage',
      making_charge_rate: 8.0,
      making_charge_amount: Math.round(8.0 * gold22kRate * 0.08),
      wastage_percent: 8.0,
      wastage_weight_g: 0.64,
      wastage_value: Math.round(0.64 * gold22kRate),
      stone_charge: 0,
      other_charge: 0,
      discount: 0,
      line_total: Math.round(8.0 * gold22kRate * 1.16),
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.full_name);
      setCustomerPhone(cust.phone || '');
      setCustomerEmail(cust.email || '');
      setCustomerAddress(cust.address || '');
    }
  };

  // Totals calculations
  const subtotalMetalValue = items.reduce((acc, it) => acc + (it.metal_value || 0), 0);
  const totalWastageValue = items.reduce((acc, it) => acc + (it.wastage_value || 0), 0);
  const totalMakingCharges = items.reduce((acc, it) => acc + (it.making_charge_amount || 0), 0);
  const totalStoneCharges = items.reduce((acc, it) => acc + (it.stone_charge || 0), 0);
  const totalOtherCharges = items.reduce((acc, it) => acc + (it.other_charge || 0), 0);

  const subtotalBeforeTax =
    items.length === 0
      ? 0
      : Math.max(
          0,
          subtotalMetalValue +
            totalWastageValue +
            totalMakingCharges +
            totalStoneCharges +
            totalOtherCharges -
            discountAmount
        );

  const taxAmount = items.length === 0 ? 0 : Math.round((subtotalBeforeTax * (taxPercent || 0)) / 100);
  const rawTotal = items.length === 0 ? 0 : subtotalBeforeTax + taxAmount;
  const roundOff = items.length === 0 ? 0 : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
  const grandTotal = items.length === 0 ? 0 : Math.round(rawTotal);

  const calculateValidUntil = (startDateStr: string, days: number): string => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!customerName.trim()) {
      alert('Please provide customer name.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item.');
      return;
    }

    setLoading(true);
    try {
      const validUntil = calculateValidUntil(estimationDate, validDays);

      let savedEst: Estimation;

      if (revisionOfId && parentEstimation) {
        // Create revision V2 / V3
        savedEst = await dataService.createEstimationRevision(parentEstimation.id, {
          estimation_type: estimationType,
          customer_id: selectedCustomerId || undefined,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_address: customerAddress,
          valid_until: validUntil,
          gold_22k_rate: gold22kRate,
          gold_24k_rate: gold24kRate,
          silver_rate: silverRate,
          subtotal_metal_value: subtotalMetalValue,
          total_making_charges: totalMakingCharges,
          total_wastage_value: totalWastageValue,
          total_stone_charges: totalStoneCharges,
          total_other_charges: totalOtherCharges,
          discount_amount: discountAmount,
          tax_percent: taxPercent,
          tax_amount: taxAmount,
          round_off: roundOff,
          total_estimated_amount: grandTotal,
          items: items.map((it) => ({ ...it, item_type: estimationType })),
          reference_images: referenceImages,
          general_notes: generalNotes,
          customer_requirements: customerRequirements,
          status,
        });
      } else {
        // Create new estimation
        savedEst = await dataService.saveEstimation({
          estimation_type: estimationType,
          customer_id: selectedCustomerId || undefined,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_address: customerAddress,
          estimation_date: estimationDate,
          valid_until: validUntil,
          rate_snapshot_date: new Date().toISOString(),
          gold_22k_rate: gold22kRate,
          gold_24k_rate: gold24kRate,
          silver_rate: silverRate,
          subtotal_metal_value: subtotalMetalValue,
          total_making_charges: totalMakingCharges,
          total_wastage_value: totalWastageValue,
          total_stone_charges: totalStoneCharges,
          total_other_charges: totalOtherCharges,
          discount_amount: discountAmount,
          tax_percent: taxPercent,
          tax_amount: taxAmount,
          round_off: roundOff,
          total_estimated_amount: grandTotal,
          status,
          items: items.map((it) => ({ ...it, item_type: estimationType })),
          reference_images: referenceImages,
          general_notes: generalNotes,
          customer_requirements: customerRequirements,
        });
      }

      navigate(`/estimations/${savedEst.id}`);
    } catch (err: any) {
      console.error('Error saving estimation:', err);
      alert(`Failed to save estimation: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title={
          revisionOfId
            ? `Create Revision (Rev ${(parentEstimation?.version || 1) + 1}) for ${parentEstimation?.estimation_number}`
            : 'New Jewellery Price Estimation'
        }
        subtitle="Customer quotation based on reference design photos or bespoke models. Does NOT affect inventory stock or financial reports."
      />

      {/* Crucial Invariant Notice Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold text-sm">Reference Jewellery Estimation Guardrail:</p>
          <p>
            Customer reference photos and bespoke models are treated as <strong>Reference Designs only</strong>.
            Saving or sending this estimation will <strong>NOT</strong> create an inventory product, will <strong>NOT</strong> deduct stock,
            and will <strong>NOT</strong> record retail sales revenue until converted to a verified manufacturing order and final retail bill.
          </p>
        </div>
      </div>

      {/* Main Grid: Form Left, Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Estimation Type Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Estimation Classification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'reference_design',
                  title: 'Reference Design',
                  sub: 'Customer provided photo/model',
                  badge: 'Recommended',
                },
                {
                  id: 'custom_jewellery',
                  title: 'Custom Jewellery',
                  sub: 'Bespoke workshop design',
                  badge: 'Custom',
                },
                {
                  id: 'inventory_product',
                  title: 'Inventory Product',
                  sub: 'From existing catalogue',
                  badge: 'Catalogue',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEstimationType(opt.id as EstimationType)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    estimationType === opt.id
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-500/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {opt.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-medium">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Customer Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" />
              Customer Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Existing Customer (Optional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Walk-in / Enter New Customer Below --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone || 'No phone'}) - {c.city || 'Walk-in'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meenakshi Sundaram"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile / WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City / Delivery Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Street, Trichy"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Customer Reference Design Photos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              Customer Reference Design Photos
            </h3>
            <ReferenceImageGallery
              images={referenceImages}
              onChange={setReferenceImages}
              readOnly={false}
            />
          </div>

          {/* 4. Estimated Items Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  Estimated Jewellery Specifications
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  All weights are <strong>ESTIMATED</strong>. Final billing will measure exact weights post-crafting.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 space-y-3">
                <Calculator className="w-10 h-10 text-amber-500/70 mx-auto" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    No items added yet.
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                    Click <strong>&quot;+ Add Item&quot;</strong> below or in the top right to add jewellery items, gross weight, wastage, and making charges.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  + Add Item
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Item #{idx + 1} Specifications
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700 text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Item Description / Name
                      </label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                        placeholder="e.g. Antique Temple Haram (Customer Photo Ref)"
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Jewellery Type
                      </label>
                      <select
                        value={item.jewellery_type}
                        onChange={(e) => updateItem(idx, { jewellery_type: e.target.value as JewelleryType })}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        {JEWELLERY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Purity
                      </label>
                      <select
                        value={item.purity}
                        onChange={(e) => updateItem(idx, { purity: e.target.value as MetalPurity })}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="22k">Gold 22K (916)</option>
                        <option value="24k">Gold 24K</option>
                        <option value="18k">Gold 18K</option>
                        <option value="14k">Gold 14K</option>
                        <option value="925_silver">Silver 925</option>
                        <option value="999_silver">Silver 999</option>
                      </select>
                    </div>
                  </div>

                  {/* Weight Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                        Est. Gross Wt (g) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.estimated_gross_weight_g}
                        onChange={(e) =>
                          updateItem(idx, { estimated_gross_weight_g: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Est. Stone Wt (g)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.estimated_stone_weight_g}
                        onChange={(e) =>
                          updateItem(idx, { estimated_stone_weight_g: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-800 dark:text-amber-300 mb-1">
                        Est. Net Wt (g)
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={item.estimated_net_weight_g}
                        className="w-full text-xs py-1.5 px-2 rounded border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Rate (₹/g)
                      </label>
                      <input
                        type="number"
                        value={item.metal_rate_per_gram}
                        onChange={(e) =>
                          updateItem(idx, { metal_rate_per_gram: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Metal Value (₹)
                      </label>
                      <div className="text-xs py-1.5 px-2 rounded bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.metal_value)}
                      </div>
                    </div>
                  </div>

                  {/* Wastage & Crafting Charges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Wastage / VA (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.wastage_percent}
                        onChange={(e) =>
                          updateItem(idx, { wastage_percent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        +{formatCurrency(item.wastage_value)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Making Charges
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={item.making_charge_type}
                          onChange={(e) =>
                            updateItem(idx, { making_charge_type: e.target.value as any })
                          }
                          className="w-16 text-[10px] py-1 px-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <option value="percentage">%</option>
                          <option value="per_gram">/g</option>
                          <option value="flat">₹</option>
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={item.making_charge_rate}
                          onChange={(e) =>
                            updateItem(idx, { making_charge_rate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        +{formatCurrency(item.making_charge_amount)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Stone Charges (₹)
                      </label>
                      <input
                        type="number"
                        value={item.stone_charge}
                        onChange={(e) =>
                          updateItem(idx, { stone_charge: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                        Item Est. Total (₹)
                      </label>
                      <div className="text-xs py-1.5 px-2 rounded bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold">
                        {formatCurrency(item.line_total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* 5. Notes & Customer Requirements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Customer Specifications & Instructions
            </h3>
            <textarea
              rows={3}
              value={customerRequirements}
              onChange={(e) => setCustomerRequirements(e.target.value)}
              placeholder="e.g. Customer requested antique matte polish, ruby stone setting in the pendant, bangle size 2-6, screw back for jhumka earrings..."
              className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Right Col: Rates & Financial Summary Sidebar */}
        <div className="space-y-6">
          {/* Locked Rate Snapshot Card */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/50 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Locked Rate Snapshot
            </h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              These rates will be locked to this quotation and will not retroactively change.
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Gold 22K (916) /g:</span>
                <input
                  type="number"
                  value={gold22kRate}
                  onChange={(e) => setGold22kRate(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-semibold"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Gold 24K /g:</span>
                <input
                  type="number"
                  value={gold24kRate}
                  onChange={(e) => setGold24kRate(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-semibold"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Silver 925 /g:</span>
                <input
                  type="number"
                  value={silverRate}
                  onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-semibold"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Validity (Days):</span>
              <input
                type="number"
                min={1}
                max={30}
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 7)}
                className="w-16 text-right text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-semibold"
              />
            </div>
            <p className="text-[10px] text-gray-500 text-right">
              Valid until: {calculateValidUntil(estimationDate, validDays)}
            </p>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Quotation Breakdown
            </h4>

            <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Subtotal Metal Value:</span>
                <span className="font-medium">{formatCurrency(subtotalMetalValue)}</span>
              </div>

              <div className="flex justify-between">
                <span>Total Wastage / VA:</span>
                <span className="font-medium">{formatCurrency(totalWastageValue)}</span>
              </div>

              <div className="flex justify-between">
                <span>Total Making Charges:</span>
                <span className="font-medium">{formatCurrency(totalMakingCharges)}</span>
              </div>

              {totalStoneCharges > 0 && (
                <div className="flex justify-between">
                  <span>Stone / Gem Charges:</span>
                  <span className="font-medium">{formatCurrency(totalStoneCharges)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                />
              </div>

              <div className="flex justify-between items-center">
                <span>GST Tax ({taxPercent}%):</span>
                <div className="flex items-center gap-2">
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="text-xs py-0.5 px-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <option value={0}>0% (Excl)</option>
                    <option value={3}>3% (GST)</option>
                  </select>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              </div>

              {/* Grand Total Box */}
              <div className="pt-3 border-t-2 border-amber-500/30">
                <div className="bg-gray-900 text-amber-400 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Estimated Total Amount
                    </span>
                    <span className="text-[10px] text-amber-300/80 font-normal">
                      (Subject to final actual weight)
                    </span>
                  </div>
                  <span className="text-xl font-extrabold">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave('sent')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save & Share with Customer'}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave('draft')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium text-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save as Draft
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => navigate('/estimations')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
