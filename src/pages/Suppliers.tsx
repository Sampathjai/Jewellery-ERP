import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { MetalType, Supplier, Customer, Purchase } from '@/types';
import { MetalBadge } from '@/components/common/MetalBadge';
import { Building2, Phone, MapPin, Plus, Scale, CreditCard } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const navigate = useNavigate();
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [purchasesList, setPurchasesList] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sData, cData, pData] = await Promise.all([
        dataService.getSuppliers(),
        dataService.getCustomers(),
        dataService.getPurchases(),
      ]);
      setSuppliersList(sData);
      setCustomersList(cData);
      setPurchasesList(pData);
    } catch (e) {
      console.warn('Using local fallback for suppliers:', e);
      const db = getLocalDb();
      setSuppliersList(db.suppliers || []);
      setCustomersList(db.customers || []);
      setPurchasesList(db.purchases || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'suppliers' || tableName === 'purchases' || tableName === 'customers' || tableName === 'general') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const db = getLocalDb();
  const rawSuppliers = suppliersList.length > 0 ? suppliersList : (db.suppliers || []);
  const rawCustomers = customersList.length > 0 ? customersList : (db.customers || []);
  const purchases = purchasesList.length > 0 ? purchasesList : (db.purchases || []);

  const supplierCustomers = rawCustomers.filter((c) => c.customer_type === 'supplier');
  const dbSuppliers = rawSuppliers;

  const supplierMap = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      contact: string;
      phone: string;
      address?: string;
      metal: MetalType;
    }
  >();

  dbSuppliers.forEach((s) => {
    supplierMap.set(s.id, {
      id: s.id,
      code: s.supplier_code,
      name: s.supplier_name,
      contact: s.contact_person || s.supplier_name,
      phone: s.phone,
      address: s.address,
      metal: s.primary_metal || 'gold',
    });
  });

  supplierCustomers.forEach((c) => {
    const name = c.shop_name || c.full_name;
    if (!supplierMap.has(c.id)) {
      supplierMap.set(c.id, {
        id: c.id,
        code: c.customer_code.replace('CUST', 'SUP'),
        name: name,
        contact: c.full_name,
        phone: c.phone,
        address: `${c.address || ''} ${c.city || ''}`.trim(),
        metal: 'gold',
      });
    }
  });

  const allSuppliers = Array.from(supplierMap.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Material Suppliers & Refineries"
        subtitle="Registered bullion refineries, gold bar suppliers, and silver raw material vendors"
        breadcrumb={['Home', 'Suppliers']}
        actionBtn={
          <button
            onClick={() => navigate('/customers/add?type=supplier')}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            + Add Supplier / Manufacturer
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allSuppliers.map((s) => {
          const sPurchases = purchases.filter((p) => p.supplier_id === s.id || p.supplier_name === s.name);
          const totalGold = sPurchases
            .filter((p) => p.metal_type === 'gold')
            .reduce((sum, p) => sum + p.net_weight_g, 0);
          const totalSilver = sPurchases
            .filter((p) => p.metal_type === 'silver')
            .reduce((sum, p) => sum + p.net_weight_g, 0);
          const totalCost = sPurchases.reduce((sum, p) => sum + p.total_cost, 0);
          const totalPaid = sPurchases.reduce((sum, p) => sum + p.amount_paid, 0);
          const balance = sPurchases.reduce((sum, p) => sum + p.balance_payable, 0);

          return (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.code}</span>
                  <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mt-0.5">{s.name}</h3>
                  <p className="text-xs text-slate-500">Contact Person: <strong>{s.contact}</strong></p>
                </div>
                <MetalBadge metal={s.metal} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-charcoal-800/50 dark:border-charcoal-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Gold</span>
                  <span className="font-mono font-bold text-amber-900 dark:text-gold-300">{formatWeight(totalGold)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Silver</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatWeight(totalSilver)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Purchased</span>
                  <span className="font-serif font-bold text-charcoal-900 dark:text-slate-100">{formatCurrency(totalCost)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Amount Paid</span>
                  <span className="font-serif font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Balance Due</span>
                  <span className={`font-serif font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(balance)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Entries</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{sPurchases.length} Purchases</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 pt-3 dark:border-charcoal-800">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{s.phone}</span>
                </div>
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{s.address}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
