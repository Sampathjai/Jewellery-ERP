import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb, fetchCustomersFromSupabase } from '@/lib/supabase';
import { syncEngine } from '@/lib/syncEngine';
import { Customer } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { openWhatsAppClickToChat, buildWhatsAppWholesaleIssueMessage } from '@/lib/whatsapp';
import { HandCoins, Plus, Search, Building, Phone, MapPin, Eye, MessageSquare, BadgePercent } from 'lucide-react';

export const WholesaleCustomers: React.FC = () => {
  const navigate = useNavigate();
  const [db, setDb] = useState(getLocalDb());
  const [customersList, setCustomersList] = useState<Customer[]>(db.customers || []);
  const [searchTerm, setSearchTerm] = useState('');

  const loadWholesaleCustomers = useCallback(async () => {
    try {
      const data = await fetchCustomersFromSupabase();
      setCustomersList(data);
      setDb(getLocalDb());
    } catch (e) {
      console.warn('Error loading wholesale customers:', e);
    }
  }, []);

  useEffect(() => {
    loadWholesaleCustomers();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'customers' || tableName === 'wholesale_issues' || tableName === 'general') {
        loadWholesaleCustomers();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadWholesaleCustomers]);

  const wholesaleCustomers = customersList.filter(
    (c) =>
      c.customer_type === 'wholesale' &&
      (c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.shop_name && c.shop_name.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Consignment Partners"
        subtitle="Manage credit consignment dealers for nose rings and ear rings profit-sharing supply"
        breadcrumb={['Home', 'Wholesale Partners']}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wholesale-issues/new')}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> New Consignment Issue
            </button>
          </div>
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by wholesale partner or shop name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wholesaleCustomers.map((c) => {
          const customerIssues = db.wholesaleIssues.filter((w) => w.customer_id === c.id && w.status === 'active');
          const totalItemsIssued = customerIssues.reduce((sum, w) => sum + w.total_items_issued, 0);

          return (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border border-gold-300/60 bg-white p-5 transition-all hover:border-gold-500 hover:shadow-lg dark:border-gold-800/40 dark:bg-charcoal-900"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={c.full_name} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-gold-300" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 font-serif font-bold text-lg border border-gold-300">
                        {c.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="rounded bg-gold-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900 dark:text-gold-300">
                        {c.customer_code}
                      </span>
                      <h3 className="mt-1 font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
                        {c.full_name}
                      </h3>
                      <p className="text-xs font-bold text-amber-800 dark:text-gold-400 flex items-center gap-1 mt-0.5">
                        <Building className="h-3.5 w-3.5" /> {c.shop_name || 'Dealer'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                    Active Partner
                  </span>
                </div>

                <div className="mt-4 space-y-2 rounded-xl bg-gold-50/50 p-3 text-xs dark:bg-gold-950/20">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Agreed Customer Touch:</span>
                    <strong className="text-amber-950 dark:text-gold-300 font-bold">
                      {c.agreed_customer_touch ?? c.agreed_profit_percent ?? 40}% Touch
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consignment Stock:</span>
                    <strong className="font-bold text-charcoal-900 dark:text-slate-100">{totalItemsIssued || 80} Items Issued</strong>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{c.phone} • {c.city || 'TN'}</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-charcoal-800">
                <Link
                  to={`/wholesale-customers/${c.id}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-gold-600 dark:text-slate-300"
                >
                  <Eye className="h-4 w-4" /> View Account & Issues
                </Link>

                <button
                  onClick={() => navigate(`/wholesale-issues/new?customerId=${c.id}`)}
                  className="flex items-center gap-1 rounded-xl bg-gold-500 px-3 py-1.5 text-[11px] font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
                >
                  <HandCoins className="h-3.5 w-3.5" /> Issue Items
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

