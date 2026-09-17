import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PhotoUploader } from '@/components/common/PhotoUploader';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { Product, MetalType, MetalPurity } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { ArrowLeft, Save, Plus, Sparkles, AlertCircle } from 'lucide-react';

export const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    category_name: 'Nose Rings',
    metal_type: 'gold' as MetalType,
    actual_touch: 37,
    quantity: 10,
    gross_weight_g: 3.680,
    deduction_weight_g: 1.000,
    stone_weight_g: 0.0,
    primary_photo_url: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Metal Rate calculation based on metal type
  const goldRate = 6850;
  const silverRate = 90;
  const activeRate = formData.metal_type === 'silver' ? silverRate : goldRate;

  // Weight logic
  const grossWt = Math.max(0, formData.gross_weight_g || 0);
  const deductionWt = Math.max(0, formData.deduction_weight_g || 0);
  const netWt = Math.max(0, Number((grossWt - deductionWt).toFixed(3)));

  // Touch and Valuation calculations
  const touch = Math.max(0, Math.min(100, formData.actual_touch || 37));
  const fineGoldG = Number(((netWt * touch) / 100).toFixed(3));

  // Auto wholesale valuation = Fine Gold Equivalent * Metal Rate
  const autoWholesaleValuationPerPiece = Number((fineGoldG * activeRate).toFixed(2));

  // Auto retail price = Wholesale Valuation + standard making charges (15%)
  const autoRetailPricePerPiece = Number((autoWholesaleValuationPerPiece * 1.15).toFixed(2));

  const handleTouchPreset = (presetTouch: number) => {
    setFormData((prev) => ({ ...prev, actual_touch: presetTouch }));
  };

  const validate = () => {
    if (!formData.name.trim()) {
      setErrorMsg('Product name is required.');
      return false;
    }
    if (deductionWt > grossWt) {
      setErrorMsg('Deduction weight cannot exceed gross weight.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const sku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcode = `${Math.floor(8900000 + Math.random() * 99999)}`;

      let purityFallback: MetalPurity = '22k';
      if (formData.metal_type === 'silver') {
        purityFallback = '925_silver';
      } else if (touch >= 99) {
        purityFallback = '24k';
      } else if (touch >= 90) {
        purityFallback = '22k';
      } else if (touch >= 70) {
        purityFallback = '18k';
      }

      await dataService.createProduct({
        id: ensureValidUUID(),
        sku,
        barcode,
        qr_code: `QR-${barcode}`,
        name: formData.name,
        category_name: formData.category_name,
        metal_type: formData.metal_type,
        purity: purityFallback,
        actual_touch: touch,
        gross_weight_g: grossWt,
        deduction_weight_g: deductionWt,
        stone_weight_g: formData.stone_weight_g,
        other_weight_g: 0,
        net_weight_g: netWt,
        unit: 'grams',
        quantity: formData.quantity || 1,
        making_charge_type: 'per_piece',
        making_charge_rate: 150,
        labour_charge: 50,
        wastage_percent: 2.5,
        wastage_weight_g: 0,
        purchase_cost: autoWholesaleValuationPerPiece,
        manufacturing_cost: autoWholesaleValuationPerPiece,
        retail_price: autoRetailPricePerPiece,
        wholesale_valuation: autoWholesaleValuationPerPiece,
        minimum_stock: 2,
        description: formData.description,
        primary_photo_url: formData.primary_photo_url,
        status: 'in_stock',
        created_at: new Date().toISOString(),
      });

      if (addAnother) {
        setFormData((prev) => ({
          ...prev,
          name: '',
          gross_weight_g: 3.68,
          description: '',
        }));
      } else {
        navigate('/products');
      }
    } catch (err: any) {
      console.error('Add Product Error:', err);
      setErrorMsg(err?.message || 'Failed to save product in Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('product_catalog') || "Add Jewellery Item"}
        subtitle="Simple stock entry for goldsmiths: enter weight, touch % & stock quantity"
        breadcrumb={['Home', 'Products', 'Add Product']}
        actionBtn={
          <button
            onClick={() => navigate('/products')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6 max-w-3xl mx-auto">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Basic Product Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 dark:border-charcoal-800">
            Section A — Basic Product Details
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Product Name / ஆபரணம் பெயர் *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Gold Nose Ring, Gold Ear Ring, Silver Nose Ring"
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Category / வகை</label>
              <select
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
              >
                <option value="Nose Rings">Nose Rings (மூக்குத்தி)</option>
                <option value="Ear Rings">Ear Rings (கம்மல்)</option>
                <option value="Rings">Rings (மோதிரம்)</option>
                <option value="Chains">Chains (சங்கிலி)</option>
                <option value="Bangles">Bangles (வளையல்)</option>
                <option value="Other">Other Items</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Metal Type / உலோகம்</label>
              <select
                value={formData.metal_type}
                onChange={(e) => setFormData({ ...formData, metal_type: e.target.value as MetalType })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
              >
                <option value="gold">Gold (தங்கம்)</option>
                <option value="silver">Silver (வெள்ளி)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Stock Quantity (Pcs)</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-bold"
              />
            </div>
          </div>

          {/* Custom Melting Touch Entry */}
          <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-4 dark:border-gold-800 dark:bg-gold-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-900 dark:text-gold-300 uppercase">
                Actual Melting Touch / உண்மையான டச் (%) *
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Custom Numeric Touch</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.actual_touch}
                onChange={(e) => setFormData({ ...formData, actual_touch: Number(e.target.value) })}
                className="w-full sm:w-40 rounded-xl border-2 border-gold-400 p-2.5 text-lg font-bold font-mono text-amber-950 focus:border-gold-600 focus:outline-none dark:bg-charcoal-800 dark:text-gold-300"
              />

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Quick Touch Presets:</span>
                {[37, 40, 70, 91.6, 92, 99.9].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTouchPreset(preset)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold font-mono transition-all ${
                      formData.actual_touch === preset
                        ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-gold-100 dark:bg-charcoal-800 dark:border-charcoal-700 dark:text-slate-300'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weight Entry */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 dark:border-charcoal-800">
            Section B — Weight Entry (Grams)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Gross Weight (g) / மொத்த எடை *
              </label>
              <p className="text-[10px] text-slate-400">Total wt including cardboard/packing</p>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.gross_weight_g}
                onChange={(e) => setFormData({ ...formData, gross_weight_g: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Deduction Weight (g) / கழிவு எடை *
              </label>
              <p className="text-[10px] text-slate-400">Cardboard / packing deduction</p>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.deduction_weight_g}
                onChange={(e) => setFormData({ ...formData, deduction_weight_g: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono font-bold text-red-600 dark:text-red-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Net Weight (g) / நிகர எடை
              </label>
              <p className="text-[10px] text-slate-400">Gross Wt - Deduction (Auto Calculated)</p>
              <input
                type="number"
                readOnly
                value={netWt}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sm font-mono font-bold text-amber-900 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-gold-300"
              />
            </div>
          </div>
        </div>

        {/* Automatic Valuation & Pricing Preview */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Automatic Valuation & Pricing Preview
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              Rate: ₹{activeRate}/g ({formData.metal_type.toUpperCase()})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Net Weight</span>
              <p className="font-mono font-bold text-charcoal-900 dark:text-slate-100 text-sm mt-0.5">
                {netWt.toFixed(3)} g
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Fine Gold Equivalent</span>
              <p className="font-mono font-bold text-amber-900 dark:text-gold-300 text-sm mt-0.5">
                {fineGoldG.toFixed(3)} g
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Auto Wholesale Valuation</span>
              <p className="font-serif font-bold text-amber-900 dark:text-gold-300 text-sm mt-0.5">
                ₹{autoWholesaleValuationPerPiece.toLocaleString('en-IN')} / pc
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Auto Retail Selling Price</span>
              <p className="font-serif font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
                ₹{autoRetailPricePerPiece.toLocaleString('en-IN')} / pc
              </p>
            </div>
          </div>
        </div>

        {/* Photo Uploader */}
        <PhotoUploader
          label="Product Photo (Mobile Camera or Upload)"
          value={formData.primary_photo_url}
          onChange={(url) => setFormData({ ...formData, primary_photo_url: url })}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-charcoal-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-gold-400 bg-gold-50 px-5 py-2.5 text-xs font-bold text-amber-950 hover:bg-gold-100 dark:bg-gold-950/40 dark:text-gold-300 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save & Add Another'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {isSubmitting ? 'Saving Product...' : 'Save Stock Item'}
          </button>
        </div>
      </div>
    </div>
  );
};
