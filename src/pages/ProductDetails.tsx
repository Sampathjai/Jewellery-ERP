import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { ArrowLeft, Barcode, QrCode, Printer, Boxes, Tag } from 'lucide-react';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = getLocalDb();

  const product = db.products.find((p) => p.id === id) || db.products[0];

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        subtitle={`${product.sku} • Barcode: ${product.barcode}`}
        breadcrumb={['Home', 'Products', product.name]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/products')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handlePrintLabel}
              className="flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Printer className="h-4 w-4" /> Print Item Tag Label
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Photo & Barcode Label Preview */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-charcoal-800 dark:bg-charcoal-900 p-4">
            <div className="h-64 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-charcoal-800 mb-4">
              {product.primary_photo_url ? (
                <img src={product.primary_photo_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <Boxes className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Print Tag Preview Card */}
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4 text-center dark:border-gold-800/60 dark:bg-gold-950/20">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider dark:text-gold-300">
                Jewellery Tag Label Preview
              </span>
              <div className="mt-2 flex flex-col items-center justify-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm dark:bg-charcoal-900 dark:border-charcoal-800">
                <Barcode className="h-10 w-40 text-charcoal-900 dark:text-slate-100" />
                <span className="font-mono text-[11px] font-bold mt-1 text-charcoal-900 dark:text-slate-100">
                  *{product.barcode}*
                </span>
                <span className="text-xs font-serif font-bold text-amber-900 dark:text-gold-300 mt-1">
                  Shankar Jewellery
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                  {product.sku} | Net: {formatWeight(product.net_weight_g)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Specifications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-charcoal-800">
              <div className="flex items-center gap-2">
                <MetalBadge metal={product.metal_type} />
                <PurityBadge purity={product.purity} />
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-charcoal-800 dark:text-slate-300">
                  {product.category_name}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 uppercase">Status: {product.status}</span>
            </div>

            {/* Weights & Quantities Grid */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Weight Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-charcoal-800 dark:bg-charcoal-800/40">
                  <span className="text-[10px] text-slate-400 block">Gross Weight</span>
                  <span className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    {formatWeight(product.gross_weight_g)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-charcoal-800 dark:bg-charcoal-800/40">
                  <span className="text-[10px] text-slate-400 block">Stone Weight</span>
                  <span className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    {formatWeight(product.stone_weight_g)}
                  </span>
                </div>
                <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-3 dark:border-gold-800 dark:bg-gold-950/40">
                  <span className="text-[10px] text-amber-900 font-bold block dark:text-gold-300">Net Metal Weight</span>
                  <span className="font-serif text-lg font-bold text-amber-900 dark:text-gold-300">
                    {formatWeight(product.net_weight_g)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-charcoal-800 dark:bg-charcoal-800/40">
                  <span className="text-[10px] text-slate-400 block">Available Qty</span>
                  <span className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    {product.quantity} Pcs
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing Specs */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing & Charges</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 p-3 dark:border-charcoal-800">
                  <span className="text-[10px] text-slate-400 block">Making Charge Rate</span>
                  <span className="font-semibold text-charcoal-900 dark:text-slate-100">{formatCurrency(product.making_charge_rate)} ({product.making_charge_type})</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 dark:border-charcoal-800">
                  <span className="text-[10px] text-slate-400 block">Wastage %</span>
                  <span className="font-semibold text-charcoal-900 dark:text-slate-100">{product.wastage_percent}%</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 dark:border-charcoal-800">
                  <span className="text-[10px] text-slate-400 block">Wholesale Valuation</span>
                  <span className="font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(product.wholesale_valuation)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-slate-100 pt-4 dark:border-charcoal-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Notes / Description</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

