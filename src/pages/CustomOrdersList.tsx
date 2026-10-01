import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { CustomOrder, CustomOrderStatus } from '@/types';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import {
  Sparkles,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  Hammer,
  PackageCheck,
  Truck,
  ArrowRight,
  FileText,
} from 'lucide-react';

export const CustomOrdersList: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomOrderStatus>('all');

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const list = await dataService.getCustomOrders();
      setOrders(list);
    } catch (err) {
      console.error('Error loading custom orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const unsub = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'custom_orders' || tableName === 'general') {
        loadOrders();
      }
    });
    return () => unsub();
  }, [loadOrders]);

  const filtered = orders.filter((ord) => {
    if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = ord.order_number.toLowerCase().includes(q);
      const matchEst = ord.estimation_number.toLowerCase().includes(q);
      const matchCust = (ord.customer_name || '').toLowerCase().includes(q);
      if (!matchNum && !matchEst && !matchCust) return false;
    }
    return true;
  });

  const getStatusBadge = (status: CustomOrderStatus) => {
    switch (status) {
      case 'design_confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" /> Design Confirmed
          </span>
        );
      case 'manufacturing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Hammer className="w-3 h-3" /> In Workshop
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <PackageCheck className="w-3 h-3" /> Ready for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            <Truck className="w-3 h-3" /> Delivered & Billed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Custom Jewellery Orders"
        subtitle="Track bespoke workshop craftsmanship converted from customer reference estimations through to final retail billing."
        actionBtn={
          <button
            type="button"
            onClick={() => navigate('/estimations')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Convert from Estimations
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'design_confirmed', label: 'Confirmed' },
              { id: 'manufacturing', label: 'In Workshop' },
              { id: 'ready', label: 'Ready' },
              { id: 'delivered', label: 'Delivered' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search order no, customer, estimation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Loading custom orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Hammer className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              No custom orders found. Convert an estimation to get started.
            </p>
            <button
              type="button"
              onClick={() => navigate('/estimations')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              View Estimations
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Design Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Est. Ref</th>
                  <th className="py-3 px-4 text-right">Est. Total</th>
                  <th className="py-3 px-4 text-right">Advance Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Delivery Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((ord) => {
                  const firstImg = ord.reference_images?.[0];
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div
                          className="font-bold text-gray-900 dark:text-gray-100 hover:text-amber-600 cursor-pointer"
                          onClick={() => navigate(`/custom-orders/${ord.id}`)}
                        >
                          {ord.order_number}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(ord.order_date)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {firstImg ? (
                          <div
                            onClick={() => navigate(`/custom-orders/${ord.id}`)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 cursor-pointer"
                          >
                            <img
                              src={firstImg.image_url}
                              alt="Design Ref"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No image</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {ord.customer_name}
                        </div>
                        {ord.customer_phone && (
                          <div className="text-[11px] text-gray-500">{ord.customer_phone}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="text-amber-600 hover:underline cursor-pointer font-medium"
                          onClick={() => navigate(`/estimations/${ord.estimation_id}`)}
                        >
                          {ord.estimation_number}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(ord.estimated_total)}
                      </td>

                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        {formatCurrency(ord.advance_paid)}
                      </td>

                      <td className="py-3 px-4 text-right text-amber-700 dark:text-amber-400 font-bold">
                        {formatCurrency(ord.balance_due)}
                      </td>

                      <td className="py-3 px-4">
                        {ord.expected_delivery_date ? formatDate(ord.expected_delivery_date) : 'N/A'}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(ord.status)}</td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/custom-orders/${ord.id}`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          title="View Order"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
