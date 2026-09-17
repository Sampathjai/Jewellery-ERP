import React, { useState } from 'react';
import { Product, MetalType, MetalPurity } from '@/types';
import { X, Save } from 'lucide-react';

interface EditProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Product>({ ...product });

  if (!isOpen) return null;

  const handleChange = (field: keyof Product, value: any) => {
    const updated = { ...formData, [field]: value };
    if (field === 'gross_weight_g' || field === 'stone_weight_g' || field === 'other_weight_g') {
      const gross = Number(updated.gross_weight_g) || 0;
      const stone = Number(updated.stone_weight_g) || 0;
      const other = Number(updated.other_weight_g) || 0;
      updated.net_weight_g = Math.max(0, gross - stone - other);
    }
    setFormData(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-charcoal-900 p-6 shadow-2xl border border-slate-200 dark:border-charcoal-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-charcoal-800 pb-4 mb-4">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
            Edit Product — {product.sku}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">SKU Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Metal Type</label>
              <select
                value={formData.metal_type}
                onChange={(e) => handleChange('metal_type', e.target.value as MetalType)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Purity</label>
              <select
                value={formData.purity}
                onChange={(e) => {
                  const p = e.target.value as MetalPurity;
                  let t = formData.actual_touch;
                  if (p === '24k') t = 99.9;
                  else if (p === '22k') t = 91.6;
                  else if (p === '18k') t = 75.0;
                  else if (p === '70_touch') t = 70.0;
                  else if (p === '14k') t = 58.5;
                  else if (p === '40_touch') t = 40.0;
                  else if (p === '37_touch') t = 37.5;
                  setFormData((prev) => ({ ...prev, purity: p, actual_touch: t }));
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              >
                <option value="24k">24K (999 Fine Gold)</option>
                <option value="22k">22K (916 KDM)</option>
                <option value="18k">18K (750)</option>
                <option value="70_touch">70 Touch (70% Purity)</option>
                <option value="14k">14K (585)</option>
                <option value="40_touch">40 Touch (40% Purity)</option>
                <option value="37_touch">37 Touch (37.5% / 9K Purity)</option>
                <option value="925_silver">925 Sterling Silver</option>
                <option value="999_silver">999 Fine Silver</option>
                <option value="other">Other / Custom Touch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Actual Touch (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.actual_touch || 91.6}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  let p: MetalPurity = formData.purity;
                  if (t >= 99) p = '24k';
                  else if (t >= 90) p = '22k';
                  else if (t >= 74) p = '18k';
                  else if (t >= 65) p = '70_touch';
                  else if (t >= 50) p = '14k';
                  else if (t >= 39) p = '40_touch';
                  else if (t >= 30) p = '37_touch';
                  setFormData((prev) => ({ ...prev, actual_touch: t, purity: p }));
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-amber-700 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Stock Qty (Pcs)</label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Gross Weight (g)</label>
              <input
                type="number"
                step="0.001"
                value={formData.gross_weight_g}
                onChange={(e) => handleChange('gross_weight_g', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Stone Weight (g)</label>
              <input
                type="number"
                step="0.001"
                value={formData.stone_weight_g}
                onChange={(e) => handleChange('stone_weight_g', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Net Weight (g)</label>
              <input
                type="number"
                step="0.001"
                readOnly
                value={formData.net_weight_g}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono font-bold text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Wastage %</label>
              <input
                type="number"
                step="0.01"
                value={formData.wastage_percent}
                onChange={(e) => handleChange('wastage_percent', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Making Charge (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.making_charge_rate}
                onChange={(e) => handleChange('making_charge_rate', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Retail Price (₹)</label>
              <input
                type="number"
                step="1"
                value={formData.retail_price}
                onChange={(e) => handleChange('retail_price', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-amber-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-gold-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-charcoal-800 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Save className="h-4 w-4" /> Save Product Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

