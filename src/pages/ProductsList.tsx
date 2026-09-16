import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import { BarcodeScannerModal } from '@/components/common/BarcodeScannerModal';
import { EditProductModal } from '@/components/common/EditProductModal';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { Product } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { Plus, Search, Barcode, Eye, Filter, Boxes, Edit3, Trash2, AlertTriangle } from 'lucide-react';

export const ProductsList: React.FC = () => {
  const navigate = useNavigate();
  const [db, setDb] = useState(getLocalDb());
  const [searchTerm, setSearchTerm] = useState('');
  const [metalFilter, setMetalFilter] = useState<string>('all');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const products = db.products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));

    const matchesMetal = metalFilter === 'all' || p.metal_type === metalFilter;
    return matchesSearch && matchesMetal;
  });

  const handleSaveProduct = (updatedProduct: Product) => {
    const index = db.products.findIndex((p) => p.id === updatedProduct.id);
    if (index !== -1) {
      db.products[index] = updatedProduct;
      saveLocalDb(db);
      setDb({ ...db });
      showToast(`Product "${updatedProduct.name}" updated successfully.`);
    }
  };

  const handleDeleteProduct = () => {
    if (!deletingProduct) return;
    db.products = db.products.filter((p) => p.id !== deletingProduct.id);
    saveLocalDb(db);
    setDb({ ...db });
    showToast(`Product "${deletingProduct.name}" has been deleted.`);
    setDeletingProduct(null);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-charcoal-900 text-gold-400 px-4 py-3 shadow-xl text-xs font-bold border border-gold-500/40 flex items-center gap-2">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <PageHeader
        title="Jewellery Product Catalog"
        subtitle="Manage Gold, Silver, Nose Rings, Ear Rings, Chains, and Custom Items"
        breadcrumb={['Home', 'Products']}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <Barcode className="h-4 w-4 text-gold-600" />
              Scan Barcode
            </button>
            <button
              onClick={() => navigate('/products/add')}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        }
      />

      {/* Search & Metal Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'gold', 'silver'].map((metal) => (
            <button
              key={metal}
              onClick={() => setMetalFilter(metal)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                metalFilter === metal
                  ? 'bg-gold-500 text-charcoal-950 shadow-gold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300'
              }`}
            >
              {metal}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-gold-400 hover:shadow-lg dark:border-charcoal-800 dark:bg-charcoal-900"
          >
            <div>
              {/* Product Photo */}
              <div className="relative h-44 w-full bg-slate-100 dark:bg-charcoal-800">
                {p.primary_photo_url ? (
                  <img src={p.primary_photo_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Boxes className="h-10 w-10 opacity-40" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <MetalBadge metal={p.metal_type} />
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => setEditingProduct(p)}
                    title="Edit Product"
                    className="rounded-lg bg-white/90 p-1.5 text-slate-700 hover:bg-white hover:text-gold-600 shadow-sm dark:bg-charcoal-900/90 dark:text-slate-300"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingProduct(p)}
                    title="Delete Product"
                    className="rounded-lg bg-white/90 p-1.5 text-red-600 hover:bg-red-50 shadow-sm dark:bg-charcoal-900/90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 right-2">
                  <PurityBadge purity={p.purity} />
                </div>
              </div>

              {/* Product Specs */}
              <div className="p-4">
                <span className="font-mono text-[10px] font-bold text-slate-500">{p.sku}</span>
                <h3 className="font-serif text-sm font-bold text-charcoal-900 dark:text-slate-100 line-clamp-1 mt-0.5">
                  {p.name}
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 border-t border-b border-slate-100 py-2 dark:border-charcoal-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Net Weight:</span>
                    <strong className="text-charcoal-900 dark:text-slate-100">{formatWeight(p.net_weight_g)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Stock Qty:</span>
                    <strong className={p.quantity <= p.minimum_stock ? 'text-red-600 font-bold' : ''}>
                      {p.quantity} Pcs
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Wastage %:</span>
                    <strong>{p.wastage_percent}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Making Charge:</span>
                    <strong>{formatCurrency(p.making_charge_rate)}</strong>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Retail Price:</span>
                    <span className="font-serif text-base font-bold text-amber-900 dark:text-gold-300">
                      {formatCurrency(p.retail_price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Wholesale Valuation:</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(p.wholesale_valuation)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Details Link */}
            <div className="border-t border-slate-100 p-3 bg-slate-50 dark:border-charcoal-800 dark:bg-charcoal-800/40 flex justify-between items-center">
              <Link
                to={`/products/${p.id}`}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-gold-600 dark:text-slate-300"
              >
                <Eye className="h-4 w-4" /> View Full Specs & Barcode
              </Link>
            </div>
          </div>
        ))}
      </div>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => setSearchTerm(code)}
      />

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                Confirm Product Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-charcoal-900 dark:text-slate-100">{deletingProduct.name}</strong> ({deletingProduct.sku})? This action will remove it from the product catalog.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
